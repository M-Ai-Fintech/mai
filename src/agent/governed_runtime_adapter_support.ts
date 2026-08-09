import type { AgentDefinition } from "./definitions/index.ts";
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
import type {
  RuntimeStepExecutor,
  StepExecutionContext,
  StepExecutionOutput,
} from "../agent_runtime/runner.ts";

export type GovernedProposalRuntimeReader = Pick<
  AgentRuntimeReadService,
  "getStep" | "listToolActivities" | "listResults"
>;

export class DurableProposalStepExecutor implements RuntimeStepExecutor {
  constructor(
    private readonly request: GovernedProposalRequest,
    private readonly delegate: RuntimeStepExecutor,
    private readonly reads: GovernedProposalRuntimeReader,
  ) {}

  async execute(
    step: StepRecord,
    context: StepExecutionContext,
  ): Promise<StepExecutionOutput> {
    const output = await this.delegate.execute(step, context);
    if (output.kind !== "proposal" && output.kind !== "reversible_draft") {
      throw new Error(
        `Governed proposal step "${step.stepId}" returned kind "${output.kind}"; expected a proposal artifact.`,
      );
    }
    const claims = readDurableStepClaims(step);
    assertDefinitionClaim(claims.definition, this.request.definition);
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
    return {
      kind: output.kind,
      value: output.value,
      lineage: governedLineage(context, step, claims, activities, results),
      cost: output.cost,
      artifact: output.artifact,
    };
  }
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
    evidence: uniqueEvidence(results),
  };
}

function uniqueEvidence(
  results: readonly ResultRecord[],
): readonly SourceVersionReference[] {
  const references = results.flatMap((result) => result.lineage.evidence);
  const unique = new Map<string, SourceVersionReference>();
  for (const reference of references) {
    unique.set(sourceKey(reference), reference);
  }
  return [...unique.values()];
}

function sourceKey(reference: SourceVersionReference): string {
  return `${reference.sourceType}:${reference.sourceId}:${reference.version}:${
    reference.checksum ?? ""
  }`;
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
  return {
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
  };
}
