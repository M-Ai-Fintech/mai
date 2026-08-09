import { assertEquals } from "@std/assert";
import {
  createAgentRuntimeGovernedSpecialist,
  createSpecialistDefinitionCatalog,
  type GovernedExecutionContext,
  type GovernedProposalRequest,
} from "../../src/agent/governed.ts";
import type {
  AgentDefinition,
  CalculationBinding,
} from "../../src/agent/definitions/index.ts";
import {
  CalculationPortRegistry,
  type GovernedCalculationOutput,
  type GovernedCalculationPort,
} from "../../src/agent/governed_calculation_ports.ts";
import { governedStepInput } from "../../src/agent/governed_runtime_adapter_support.ts";
import { calculationBindingFor } from "../../src/agent/governed_capability_binding.ts";
import { AgentRuntimeReadService } from "../../src/agent_runtime/reads.ts";
import { InMemoryAgentRuntimeStore } from "../../src/agent_runtime/repository.ts";
import {
  AgentRuntimeProposalService,
  type SubmitProposalInput,
} from "../../src/agent_runtime/proposal_service.ts";
import {
  AgentRuntimeRunner,
  type RuntimeStepExecutor,
  type SourceVersionChecker,
  type StepExecutionContext,
  type StepExecutionOutput,
} from "../../src/agent_runtime/runner.ts";
import type {
  RuntimeActor,
  RuntimeScope,
  SourceVersionReference,
  StepRecord,
} from "../../src/agent_runtime/model.ts";
import {
  type AuthorizedToolInvocation,
  type ToolDefinition,
  ToolGateway,
} from "../../src/agent_runtime/tool_gateway.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import { AllowingAuthorization } from "../agent_runtime/authorization_support.ts";

Deno.test("succeeded proposal replay returns the exact durable result without rerun", async () => {
  const runtime = createRuntime();
  const execution = executionContext("run_replay_succeeded");
  const request = {
    input: proposalInput(execution),
    capability: "calculation.portfolio",
  };
  const agent = createAgentRuntimeGovernedSpecialist(
    createSpecialistDefinitionCatalog(),
    "deal-matching-agent",
    runtime.dependencies,
    execution,
  );

  const first = await agent.propose(request);
  const firstId = await onlyResult(runtime.store, execution);
  const replayDependencies = {
    ...runtime.dependencies,
    calculations: new CalculationPortRegistry([]),
  };
  const second = await createAgentRuntimeGovernedSpecialist(
    createSpecialistDefinitionCatalog(),
    "deal-matching-agent",
    replayDependencies,
    execution,
  ).propose(request);
  const resultIds = await resultIdsFor(runtime.store, execution);

  assertEquals(second, first);
  assertEquals(resultIds, [firstId]);
  assertEquals(runtime.port.calls, 1);
  assertEquals(runtime.executor.calls, 0);
});

Deno.test("queued idempotent replay executes the exact run and pure port", async () => {
  const runtime = createRuntime();
  const execution = executionContext("run_replay_queued");
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("deal-matching-agent");
  const capability = "calculation.portfolio";
  const binding = calculationBindingFor(definition, capability);
  if (binding === undefined) throw new Error("portfolio binding is missing");
  const input = proposalInput(execution);
  await runtime.dependencies.proposalService.submit(
    execution.context,
    execution.actor,
    queuedCalculationInput(execution, definition, input, capability, binding),
  );

  const result = await createAgentRuntimeGovernedSpecialist(
    catalog,
    "deal-matching-agent",
    runtime.dependencies,
    execution,
  ).propose({ input, capability });

  assertEquals(result.status, "proposed");
  assertEquals(runtime.port.calls, 1);
  assertEquals(runtime.executor.calls, 0);
  const run = await runtime.store.transaction((transaction) =>
    transaction.findRun(execution.scope, execution.runId)
  );
  assertEquals(run?.state, "succeeded");
});

Deno.test("concurrent exact claim fails closed without invoking an executor", async () => {
  const runtime = createRuntime();
  const execution = executionContext("run_replay_contended");
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("deal-matching-agent");
  const capability = "calculation.portfolio";
  const binding = calculationBindingFor(definition, capability);
  if (binding === undefined) throw new Error("portfolio binding is missing");
  await runtime.dependencies.proposalService.submit(
    execution.context,
    execution.actor,
    queuedCalculationInput(
      execution,
      definition,
      proposalInput(execution),
      capability,
      binding,
    ),
  );
  const now = runtime.clock.now();
  const claimed = await runtime.store.transaction((transaction) =>
    transaction.claimRunById(execution.runId, {
      workerId: "other-worker",
      now,
      leaseUntil: new Date(now.getTime() + 60_000),
    })
  );
  if (claimed === undefined) {
    throw new Error("contention setup did not claim run");
  }
  const runner = new AgentRuntimeRunner(
    runtime.store,
    runtime.clock,
    runtime.sources,
    runtime.gateway,
    runtime.executor,
  );

  const outcome = await runner.executeRun(
    "governed-worker",
    60_000,
    execution.runId,
  );

  assertEquals(outcome, { status: "busy", runId: execution.runId });
  assertEquals(runtime.executor.calls, 0);
});

Deno.test("missing definition-bound pure port is unavailable", async () => {
  const runtime = createRuntime(new CalculationPortRegistry([]));
  const execution = executionContext("run_missing_pure_port");
  const result = await createAgentRuntimeGovernedSpecialist(
    createSpecialistDefinitionCatalog(),
    "deal-matching-agent",
    runtime.dependencies,
    execution,
  ).propose({
    input: proposalInput(execution),
    capability: "calculation.portfolio",
  });

  assertEquals(result.status, "unavailable");
  assertEquals(
    result.artifact.value.reason,
    'Calculation pure port "portfolio-selection" is unavailable; expected an injected deterministic implementation.',
  );
  assertEquals(runtime.port.calls, 0);
});

Deno.test("wrong definition-bound pure port is unavailable", async () => {
  const runtime = createRuntime(
    new CalculationPortRegistry([new CountingCalculationPort("wrong-port")]),
  );
  const execution = executionContext("run_wrong_pure_port");
  const result = await createAgentRuntimeGovernedSpecialist(
    createSpecialistDefinitionCatalog(),
    "deal-matching-agent",
    runtime.dependencies,
    execution,
  ).propose({
    input: proposalInput(execution),
    capability: "calculation.portfolio",
  });

  assertEquals(result.status, "unavailable");
  assertEquals(runtime.port.calls, 0);
});

function createRuntime(calculations?: CalculationPortRegistry) {
  const store = new InMemoryAgentRuntimeStore();
  const authorization = new AllowingAuthorization();
  const clock = new FixedClock();
  const reads = new AgentRuntimeReadService(store, authorization);
  const proposalService = new AgentRuntimeProposalService(
    store,
    clock,
    authorization,
  );
  const gateway = new ToolGateway([new NamedEvidenceTool()], authorization);
  const sources = new CurrentSources();
  const executor = new CountingProposalExecutor();
  const port = new CountingCalculationPort("portfolio-selection");
  const registry = calculations ?? new CalculationPortRegistry([port]);
  return {
    store,
    clock,
    gateway,
    sources,
    executor,
    port,
    dependencies: {
      proposalService,
      store,
      clock,
      sources,
      gateway,
      executor,
      calculations: registry,
      getRun: reads.getRun.bind(reads),
      getResult: reads.getResult.bind(reads),
      getStep: reads.getStep.bind(reads),
      getToolActivity: reads.getToolActivity.bind(reads),
      listToolActivities: reads.listToolActivities.bind(reads),
      listResults: reads.listResults.bind(reads),
    },
  };
}

function queuedCalculationInput(
  execution: GovernedExecutionContext,
  definition: AgentDefinition,
  input: Record<string, unknown>,
  capability: string,
  binding: CalculationBinding,
): SubmitProposalInput {
  const request: GovernedProposalRequest = {
    definition,
    execution: {
      ...execution,
      definition: { id: definition.id, version: definition.version },
    },
    input,
    capability,
  };
  return {
    missionId: `mission_${execution.runId}` as never,
    planId: `plan_${execution.runId}` as never,
    runId: execution.runId,
    objective: `Prepare governed proposal for ${definition.id}.`,
    planVersion: 1,
    steps: [{
      ordinal: 0,
      name: binding.operation,
      kind: "compute" as const,
      action: binding.action,
      input: governedStepInput(request, binding),
      sourceVersions: [],
    }],
    correlationId: execution.context.correlationId,
    idempotencyKey: `governed-proposal:${execution.runId}`,
    sourceVersions: [],
    model: {
      provider: definition.modelPolicy.provider,
      model: definition.modelPolicy.model,
      modelVersion: definition.modelPolicy.modelVersion,
      policyReference: definition.modelPolicy.policyReference,
    },
  };
}

function proposalInput(
  execution: GovernedExecutionContext,
): Record<string, unknown> {
  return { dealId: execution.scope.dealId, query: "Calculate portfolio." };
}

async function onlyResult(
  store: InMemoryAgentRuntimeStore,
  execution: GovernedExecutionContext,
): Promise<string> {
  const ids = await resultIdsFor(store, execution);
  const resultId = ids[0];
  if (resultId === undefined) {
    throw new Error(`Run "${execution.runId}" has no result.`);
  }
  return resultId;
}

async function resultIdsFor(
  store: InMemoryAgentRuntimeStore,
  execution: GovernedExecutionContext,
): Promise<string[]> {
  const results = await store.transaction((transaction) =>
    transaction.listResults(execution.scope, execution.runId)
  );
  return results.map((result) => result.resultId);
}

class CountingProposalExecutor implements RuntimeStepExecutor {
  calls = 0;

  execute(
    _step: StepRecord,
    _context: StepExecutionContext,
  ): Promise<StepExecutionOutput> {
    this.calls++;
    return Promise.resolve({
      kind: "proposal",
      value: { success: true, response: "model", timestamp: "2026-08-09" },
      lineage: { toolActivityIds: [], evidence: [] },
      cost: emptyCost(),
    });
  }
}

class CountingCalculationPort implements GovernedCalculationPort {
  readonly deterministic = true as const;
  calls = 0;

  constructor(readonly name: string) {}

  execute(): Promise<GovernedCalculationOutput> {
    this.calls++;
    return Promise.resolve({
      value: {
        success: true,
        response: "typed calculation",
        timestamp: "2026-08-09",
      },
      cost: emptyCost(),
    });
  }
}

class NamedEvidenceTool implements ToolDefinition {
  readonly name = "governed.evidence.search";
  readonly capability = "read" as const;

  execute(_request: AuthorizedToolInvocation) {
    return Promise.resolve({
      kind: "read" as const,
      value: { status: "ok", results: [] },
      discoveredSourceVersions: [],
    });
  }
}

class CurrentSources implements SourceVersionChecker {
  isCurrent(_reference: SourceVersionReference): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class FixedClock {
  now(): Date {
    return new Date("2026-08-09T12:00:00.000Z");
  }
}

function executionContext(runId: string): GovernedExecutionContext {
  const scope: RuntimeScope = {
    tenantId: "tenant_replay" as never,
    workspaceId: "workspace_replay" as never,
    dealId: "deal_replay" as never,
  };
  const context: RequestContext = {
    actorId: "actor_replay" as never,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: `cor_${runId}` as never,
    origin: "job",
  };
  const actor: RuntimeActor = {
    actorId: context.actorId,
    kind: "ai",
    state: "active",
  };
  return { context, actor, scope, runId: runId as never };
}

function emptyCost() {
  return {
    currency: "USD",
    inputTokens: 0,
    outputTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
  };
}
