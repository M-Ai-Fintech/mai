import type {
  AgentDefinition,
  CalculationBinding,
} from "./definitions/index.ts";
import { canonicalizePostParseRecord } from "./definitions/post_parse_data_policy.ts";
import { calculationBindingFor } from "./governed_capability_binding.ts";
import type {
  GovernedCalculationOutput,
  GovernedCalculationPortRegistry,
} from "./governed_calculation_ports.ts";
import {
  GOVERNED_STEP_CLAIMS_KEY,
  readDurableStepClaims,
} from "./governed_step_receipts.ts";
import type { GovernedProposalRequest } from "./governed_agent.ts";
import type {
  AgentRuntimeReadService,
  RuntimeReadResult,
} from "../agent_runtime/reads.ts";
import type {
  ResultRecord,
  RuntimeLineage,
  SourceVersionReference,
  StepRecord,
  ToolActivityRecord,
} from "../agent_runtime/model.ts";
import { deduplicateSourceVersions } from "../agent_runtime/model.ts";
import type {
  RuntimeStepExecutor,
  StepExecutionContext,
  StepExecutionOutput,
} from "../agent_runtime/runner.ts";

export type GovernedProposalRuntimeReader = Pick<
  AgentRuntimeReadService,
  "getRun" | "getStep" | "listToolActivities" | "listResults"
>;

export class DurableProposalStepExecutor implements RuntimeStepExecutor {
  constructor(
    private readonly request: GovernedProposalRequest,
    private readonly delegate: RuntimeStepExecutor,
    private readonly reads: GovernedProposalRuntimeReader,
    private readonly calculations: GovernedCalculationPortRegistry,
  ) {}

  async execute(
    step: StepRecord,
    context: StepExecutionContext,
  ): Promise<StepExecutionOutput> {
    const claims = readDurableStepClaims(step);
    assertDefinitionClaim(claims.definition, this.request.definition);
    if (step.kind === "compute") {
      return await this.executeCalculation(step, context, claims);
    }
    return await this.executeProposal(step, context, claims);
  }

  private async executeProposal(
    step: StepRecord,
    context: StepExecutionContext,
    claims: ReturnType<typeof readDurableStepClaims>,
  ): Promise<StepExecutionOutput> {
    const output = await this.delegate.execute(step, context);
    if (output.kind !== "proposal" && output.kind !== "reversible_draft") {
      throw new Error(
        `Governed proposal step "${step.stepId}" returned kind "${output.kind}"; expected a proposal artifact.`,
      );
    }
    return await this.decorateOutput(step, context, claims, output);
  }

  private async executeCalculation(
    step: StepRecord,
    context: StepExecutionContext,
    claims: ReturnType<typeof readDurableStepClaims>,
  ): Promise<StepExecutionOutput> {
    const binding = exactCalculationBinding(this.request, step, claims);
    const output = await this.runCalculationPort(binding, step, context);
    return await this.decorateOutput(step, context, claims, {
      kind: "proposal",
      value: output.value,
      lineage: { toolActivityIds: [], evidence: [] },
      cost: output.cost,
    });
  }

  private runCalculationPort(
    binding: CalculationBinding,
    step: StepRecord,
    context: StepExecutionContext,
  ): Promise<GovernedCalculationOutput> {
    const port = this.calculations.resolve(binding.purePort);
    if (
      port === undefined || port.name !== binding.purePort ||
      port.deterministic !== true
    ) {
      throw new Error(
        `Calculation pure port "${binding.purePort}" is unavailable; expected an injected deterministic implementation.`,
      );
    }
    return port.execute({
      capability: this.request.capability,
      binding,
      input: step.input.request,
      step,
      context,
    });
  }

  private async decorateOutput(
    step: StepRecord,
    context: StepExecutionContext,
    claims: ReturnType<typeof readDurableStepClaims>,
    output: StepExecutionOutput,
  ): Promise<StepExecutionOutput> {
    const value = canonicalizePostParseRecord(
      output.value,
      `step.${step.stepId}.output`,
    );
    const lineage = await this.readLineage(step, context, claims);
    return {
      kind: output.kind,
      value,
      lineage,
      cost: output.cost,
      artifact: output.artifact,
    };
  }

  private async readLineage(
    step: StepRecord,
    context: StepExecutionContext,
    claims: ReturnType<typeof readDurableStepClaims>,
  ): Promise<RuntimeLineage> {
    const activities = await loaded(
      this.reads.listToolActivities(
        this.request.execution.context,
        this.request.execution.actor,
        context.run.runId,
      ),
      "tool activity lineage",
    );
    const results = await loaded(
      this.reads.listResults(
        this.request.execution.context,
        this.request.execution.actor,
        context.run.runId,
      ),
      "tool result lineage",
    );
    return governedLineage(context, step, claims, activities, results);
  }
}

function exactCalculationBinding(
  request: GovernedProposalRequest,
  step: StepRecord,
  claims: ReturnType<typeof readDurableStepClaims>,
): CalculationBinding {
  const binding = calculationBindingFor(request.definition, request.capability);
  if (
    binding === undefined || step.name !== binding.operation ||
    step.action !== binding.action || !sameCalculationBinding(
      claims.calculation,
      binding,
    )
  ) {
    throw new Error(
      `Calculation step "${step.stepId}" lacks the exact definition-bound pure operation receipt.`,
    );
  }
  return binding;
}

function sameCalculationBinding(
  left: CalculationBinding | undefined,
  right: CalculationBinding,
): boolean {
  return left !== undefined && left.capability === right.capability &&
    left.purePort === right.purePort && left.operation === right.operation &&
    left.action === right.action;
}

function governedLineage(
  context: StepExecutionContext,
  step: StepRecord,
  claims: ReturnType<typeof readDurableStepClaims>,
  activities: readonly ToolActivityRecord[],
  results: readonly ResultRecord[],
): RuntimeLineage {
  const model = context.run.model;
  if (model === undefined) {
    throw new Error(
      `Governed proposal run "${context.run.runId}" lacks a model receipt.`,
    );
  }
  return {
    definition: claims.definition,
    definitionId: claims.definition.id,
    definitionVersion: claims.definition.version,
    prompt: claims.prompt,
    modelPolicyReference: claims.modelPolicyReference,
    model: { ...model, policyReference: claims.modelPolicyReference },
    ...(claims.calculation === undefined
      ? {}
      : { calculation: { ...claims.calculation, stepId: step.stepId } }),
    toolActivityIds: activities.filter((activity) =>
      activity.state === "succeeded"
    ).map((activity) => activity.activityId),
    evidence: aggregateRuntimeEvidence(results),
  };
}

export function aggregateRuntimeEvidence(
  results: readonly ResultRecord[],
): readonly SourceVersionReference[] {
  return deduplicateSourceVersions(
    results.flatMap((result) => result.lineage.evidence),
  );
}

function assertDefinitionClaim(
  claim: { readonly id: string; readonly version: string },
  definition: AgentDefinition,
): void {
  if (claim.id === definition.id && claim.version === definition.version) {
    return;
  }
  throw new Error(
    `Governed step definition "${claim.id}@${claim.version}" does not match "${definition.id}@${definition.version}".`,
  );
}

async function loaded<T>(
  result: Promise<RuntimeReadResult<T>>,
  label: string,
): Promise<T> {
  const receipt = await result;
  if (receipt.kind === "loaded") return receipt.value;
  throw new Error(`Governed ${label} is unavailable or unauthorized.`);
}

export function governedStepInput(
  request: GovernedProposalRequest,
  calculation?: AgentDefinition["calculationBindings"][number],
): Readonly<Record<string, unknown>> {
  return canonicalizePostParseRecord({
    [GOVERNED_STEP_CLAIMS_KEY]: {
      definition: {
        id: request.definition.id,
        version: request.definition.version,
      },
      prompt: request.definition.prompt,
      modelPolicyReference: request.definition.modelPolicy.policyReference,
      capability: request.capability,
      ...(calculation === undefined ? {} : { calculation }),
    },
    request: request.input,
  }, "durable.step.input");
}
