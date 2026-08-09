import type {
  AgentDefinition,
  AgentDefinitionId,
} from "./definitions/index.ts";
import type { DefinitionCatalog } from "./definitions/index.ts";
import {
  createGovernedSpecialist,
  type GovernedExecutionContext,
  type GovernedProposalPort,
  type GovernedProposalRequest,
  type GovernedProposalResponse,
  type GovernedSpecialistAgent,
} from "./governed_agent.ts";
import {
  calculationBindingFor,
  DURABLE_CAPABILITY_BINDINGS,
  type DurableCapabilityBinding,
} from "./governed_capability_binding.ts";
import {
  type GovernedCalculationPortRegistry,
  hasCalculationPort,
} from "./governed_calculation_ports.ts";
import {
  AgentRuntimeProvenanceVerifier,
  type GovernedRuntimeReceiptReader,
} from "./governed_provenance.ts";
import {
  DurableProposalStepExecutor,
  type GovernedProposalRuntimeReader,
  governedStepInput,
} from "./governed_runtime_adapter_support.ts";
import { mapGovernedToolInput } from "./governed_runtime_adapter_input.ts";
import { AgentRuntimeProposalService } from "../agent_runtime/proposal_service.ts";
import type { RuntimeClock } from "../agent_runtime/service.ts";
import type {
  PlanStepDefinition,
  RunRecord,
  SourceVersionReference,
} from "../agent_runtime/model.ts";
import type { AgentRuntimeStore } from "../agent_runtime/repository.ts";
import {
  AgentRuntimeRunner,
  type RuntimeStepExecutor,
  type SourceVersionChecker,
} from "../agent_runtime/runner.ts";
import { ToolGateway } from "../agent_runtime/tool_gateway.ts";

export interface GovernedRuntimeAdapterDependencies
  extends GovernedRuntimeReceiptReader, GovernedProposalRuntimeReader {
  readonly proposalService: AgentRuntimeProposalService;
  readonly store: AgentRuntimeStore;
  readonly clock: RuntimeClock;
  readonly sources: SourceVersionChecker;
  readonly gateway: ToolGateway;
  readonly executor: RuntimeStepExecutor;
  readonly calculations: GovernedCalculationPortRegistry;
  readonly workerId?: string;
  readonly leaseMilliseconds?: number;
}

/** Executes one proposal through durable mission, plan, run, step, and result records. */
export class AgentRuntimeGovernedProposalPort implements GovernedProposalPort {
  constructor(
    private readonly dependencies: GovernedRuntimeAdapterDependencies,
  ) {}

  async propose(
    request: GovernedProposalRequest,
  ): Promise<GovernedProposalResponse> {
    if (!executionMatchesDefinition(request)) {
      return denied(
        request,
        "Execution definition does not match the selected definition.",
      );
    }
    const calculation = calculationBindingFor(
      request.definition,
      request.capability,
    );
    const tool = DURABLE_CAPABILITY_BINDINGS[request.capability];
    if (calculation === undefined && tool === undefined) {
      return unavailable(
        request,
        "Capability has no durable tool or calculation binding.",
      );
    }
    const mappedInput = mapGovernedToolInput(
      request.capability,
      request.input,
      request.execution.scope,
    );
    if (mappedInput.status === "unavailable") {
      return unavailable(request, mappedInput.reason);
    }
    const steps = proposalSteps(request, tool, calculation, mappedInput.input);
    const run = await this.dependencies.proposalService.submit(
      request.execution.context,
      request.execution.actor,
      proposalInput(request, steps),
    );
    const durableRun = await submittedRun(this.dependencies, request, run);
    if (durableRun === undefined) {
      return unavailable(request, "Durable proposal run is unavailable.");
    }
    if (durableRun.state === "succeeded") {
      return await exactProposalResult(
        this.dependencies,
        request,
        run.runId,
        steps,
      );
    }
    if (
      calculation !== undefined &&
      !hasCalculationPort(this.dependencies.calculations, calculation)
    ) {
      return unavailable(
        request,
        `Calculation pure port "${calculation.purePort}" is unavailable; expected an injected deterministic implementation.`,
      );
    }
    const runner = new AgentRuntimeRunner(
      this.dependencies.store,
      this.dependencies.clock,
      this.dependencies.sources,
      this.dependencies.gateway,
      new DurableProposalStepExecutor(
        request,
        this.dependencies.executor,
        this.dependencies,
        this.dependencies.calculations,
      ),
    );
    const outcome = await runner.executeRun(
      this.dependencies.workerId ?? "governed-proposal-worker",
      this.dependencies.leaseMilliseconds ?? 60_000,
      run.runId,
    );
    if (outcome.status !== "succeeded") {
      return unavailable(
        request,
        `Durable proposal run ended with status "${outcome.status}".`,
      );
    }
    if (outcome.runId !== run.runId) {
      return unavailable(
        request,
        `Durable proposal runner completed run "${outcome.runId}" instead of submitted run "${run.runId}".`,
      );
    }
    return await exactProposalResult(
      this.dependencies,
      request,
      run.runId,
      steps,
    );
  }
}

async function submittedRun(
  reads: GovernedProposalRuntimeReader,
  request: GovernedProposalRequest,
  run: RunRecord,
): Promise<RunRecord | undefined> {
  const receipt = await reads.getRun(
    request.execution.context,
    request.execution.actor,
    run.runId,
  );
  return receipt.kind === "loaded" && receipt.value.runId === run.runId
    ? receipt.value
    : undefined;
}

export function createAgentRuntimeGovernedSpecialist(
  catalog: DefinitionCatalog,
  id: AgentDefinitionId,
  dependencies: GovernedRuntimeAdapterDependencies,
  execution: GovernedExecutionContext,
  version?: string,
): GovernedSpecialistAgent {
  const proposals = new AgentRuntimeGovernedProposalPort(dependencies);
  const provenance = new AgentRuntimeProvenanceVerifier(
    dependencies,
    dependencies.sources,
  );
  return createGovernedSpecialist(
    catalog,
    id,
    proposals,
    provenance,
    execution,
    version,
  );
}

function proposalInput(
  request: GovernedProposalRequest,
  steps: readonly PlanStepDefinition[],
) {
  const runId = request.execution.runId;
  return {
    missionId: `mission_${runId}` as never,
    planId: `plan_${runId}` as never,
    runId,
    objective: `Prepare governed proposal for ${request.definition.id}.`,
    planVersion: 1,
    steps,
    correlationId: request.execution.context.correlationId,
    idempotencyKey: `governed-proposal:${runId}`,
    sourceVersions: [] as readonly SourceVersionReference[],
    model: {
      provider: request.definition.modelPolicy.provider,
      model: request.definition.modelPolicy.model,
      modelVersion: request.definition.modelPolicy.modelVersion,
      policyReference: request.definition.modelPolicy.policyReference,
    },
  };
}

function proposalSteps(
  request: GovernedProposalRequest,
  tool: DurableCapabilityBinding | undefined,
  calculation: AgentDefinition["calculationBindings"][number] | undefined,
  toolInput: Readonly<Record<string, unknown>>,
): PlanStepDefinition[] {
  if (calculation !== undefined) return [calculationStep(request, calculation)];
  if (tool === undefined) return [];
  return [toolStep(tool, toolInput), proposalStep(request)];
}

function calculationStep(
  request: GovernedProposalRequest,
  binding: AgentDefinition["calculationBindings"][number],
): PlanStepDefinition {
  return {
    ordinal: 0,
    name: binding.operation,
    kind: "compute",
    action: binding.action,
    input: governedStepInput(request, binding),
    sourceVersions: [],
  };
}

function toolStep(
  binding: DurableCapabilityBinding,
  input: Readonly<Record<string, unknown>>,
): PlanStepDefinition {
  return {
    ordinal: 0,
    name: binding.toolName,
    kind: "tool",
    toolName: binding.toolName,
    action: binding.action,
    resourceKind: "agent_tool",
    resourceId: binding.toolName,
    input,
    sourceVersions: [],
  };
}

function proposalStep(request: GovernedProposalRequest): PlanStepDefinition {
  return {
    ordinal: 1,
    name: "governed-proposal",
    kind: "model",
    input: governedStepInput(request),
    sourceVersions: [],
  };
}

async function exactProposalResult(
  reads: GovernedProposalRuntimeReader,
  request: GovernedProposalRequest,
  runId: string,
  steps: readonly PlanStepDefinition[],
): Promise<GovernedProposalResponse> {
  const finalStepId = `step_${runId}-${steps.at(-1)?.ordinal}`;
  const results = await reads.listResults(
    request.execution.context,
    request.execution.actor,
    runId as never,
  );
  if (results.kind !== "loaded") {
    return unavailable(request, "Durable proposal result is unavailable.");
  }
  const result = results.value.find((candidate) =>
    candidate.stepId === finalStepId
  );
  return result === undefined
    ? unavailable(
      request,
      `Durable proposal run "${runId}" has no final result.`,
    )
    : { status: "proposed", resultId: result.resultId };
}

function executionMatchesDefinition(request: GovernedProposalRequest): boolean {
  return request.execution.definition.id === request.definition.id &&
    request.execution.definition.version === request.definition.version;
}

function denied(
  request: GovernedProposalRequest,
  reason: string,
): GovernedProposalResponse {
  return { status: "denied", capability: request.capability, reason };
}

function unavailable(
  request: GovernedProposalRequest,
  reason: string,
): GovernedProposalResponse {
  return { status: "unavailable", capability: request.capability, reason };
}
