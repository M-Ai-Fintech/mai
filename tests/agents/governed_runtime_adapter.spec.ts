import { assertEquals, assertRejects } from "@std/assert";
import {
  agentProposalResultSchema,
  AgentRuntimeProvenanceVerifier,
  createAgentRuntimeGovernedSpecialist,
  createGovernedSpecialist,
  createSpecialistDefinitionCatalog,
  type GovernedExecutionContext,
  type GovernedProposalPort,
  type GovernedProposalRequest,
  type GovernedProposalResponse,
  GovernedProvenanceError,
} from "../../src/agent/governed.ts";
import { AgentRuntimeReadService } from "../../src/agent_runtime/reads.ts";
import { InMemoryAgentRuntimeStore } from "../../src/agent_runtime/repository.ts";
import { AgentRuntimeProposalService } from "../../src/agent_runtime/proposal_service.ts";
import {
  CalculationPortRegistry,
  type GovernedCalculationPort,
} from "../../src/agent/governed_calculation_ports.ts";
import type {
  RuntimeActor,
  RuntimeScope,
  SourceVersionReference,
  StepRecord,
} from "../../src/agent_runtime/model.ts";
import type {
  RuntimeStepExecutor,
  SourceVersionChecker,
  StepExecutionContext,
  StepExecutionOutput,
} from "../../src/agent_runtime/runner.ts";
import {
  type AuthorizedToolInvocation,
  type ToolDefinition,
  ToolGateway,
} from "../../src/agent_runtime/tool_gateway.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import {
  AllowingAuthorization,
} from "../agent_runtime/authorization_support.ts";
import { exactReference } from "./governed_evidence_fakes.ts";

Deno.test("durable governed adapter produces schema-valid proposals for all eight specialists", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const runtime = createRuntime();
  const cases = [
    ["broker-orchestrator-agent", "evidence.search"],
    ["deal-matching-agent", "calculation.portfolio"],
    ["financial-risk-agent", "calculation.financial-risk"],
    ["general-dd-agent", "evidence.search"],
    ["legal-closing-agent", "calculation.term-sheet"],
    ["legal-dd-agent", "evidence.search"],
    ["negotiation-agent", "calculation.term-sheet"],
    ["sourcing-kyb-agent", "evidence.search"],
  ] as const;

  for (const [index, [id, capability]] of cases.entries()) {
    const execution = executionContext(`run_adapter_${index}`);
    const result = await createAgentRuntimeGovernedSpecialist(
      catalog,
      id,
      runtime.dependencies,
      execution,
    ).propose({
      input: {
        dealId: execution.scope.dealId,
        query: "Prepare a bounded proposal.",
      },
      capability,
    });
    assertEquals(result.status, "proposed");
    assertEquals(result.artifact.authoritative, false);
    assertEquals(result.artifact.reversible, true);
    assertEquals(agentProposalResultSchema.safeParse(result).success, true);
    assertEquals(result.lineage.definition.id, id);
    if (capability.startsWith("calculation.")) {
      assertEquals(result.lineage.calculation?.capability, capability);
      assertEquals(
        result.lineage.calculation?.stepId,
        `step_${execution.runId}-0`,
      );
    } else {
      assertEquals(result.lineage.tools.length, 1);
      assertEquals(result.lineage.tools[0].name, "governed.evidence.search");
    }
  }
});

Deno.test("calculation verification rejects a rebinding hidden behind lineage.capability", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const runtime = createRuntime();
  const execution = executionContext("run_calculation_rebinding");
  const result = await createAgentRuntimeGovernedSpecialist(
    catalog,
    "deal-matching-agent",
    runtime.dependencies,
    execution,
  ).propose({
    input: { dealId: execution.scope.dealId, query: "Calculate portfolio." },
    capability: "calculation.portfolio",
  });
  assertEquals(result.status, "proposed");
  const resultId = await onlyResult(
    runtime.store,
    execution.scope,
    execution.runId,
  );
  const step = await onlyStep(runtime.store, execution.scope, execution.runId);
  const durableResult = await runtime.store.transaction((transaction) =>
    transaction.findResult(execution.scope, resultId as never)
  );
  if (durableResult === undefined) {
    throw new Error(`Result "${resultId}" disappeared.`);
  }
  await runtime.store.transaction(async (transaction) => {
    await transaction.createStep({
      ...step,
      action: "caller_claimed_operation",
    });
    await transaction.recordResult({
      ...durableResult,
      lineage: {
        ...durableResult.lineage,
        capability: "calculation.portfolio",
      },
    });
  });
  const verifier = new AgentRuntimeProvenanceVerifier(
    runtime.reads,
    runtime.sources,
  );
  await assertRejects(
    () =>
      createGovernedSpecialist(
        catalog,
        "deal-matching-agent",
        new NamedResultPort(resultId),
        verifier,
        execution,
      ).propose({
        input: {
          dealId: execution.scope.dealId,
          query: "Calculate portfolio.",
        },
        capability: "calculation.portfolio",
      }),
    GovernedProvenanceError,
    "pure operation receipt",
  );
});

Deno.test("adapter executes the submitted run without claiming an older queue entry", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const runtime = createRuntime();
  const competing = executionContext("run_competing_queued");
  await runtime.dependencies.proposalService.submit(
    competing.context,
    competing.actor,
    proposalInputFor(competing),
  );
  const requested = executionContext("run_requested_after_competing");
  const result = await createAgentRuntimeGovernedSpecialist(
    catalog,
    "broker-orchestrator-agent",
    runtime.dependencies,
    requested,
  ).propose({
    input: { dealId: requested.scope.dealId, query: "Review." },
    capability: "evidence.search",
  });

  assertEquals(result.status, "proposed");
  const competingRun = await runtime.store.transaction((transaction) =>
    transaction.findRun(competing.scope, competing.runId)
  );
  assertEquals(competingRun?.state, "queued");
});

Deno.test("adapter returns unavailable before submitting missing exact document input", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const runtime = createRuntime();
  const execution = executionContext("run_missing_exact_input");
  const result = await createAgentRuntimeGovernedSpecialist(
    catalog,
    "general-dd-agent",
    runtime.dependencies,
    execution,
  ).propose({
    input: {
      dealId: execution.scope.dealId,
      query: "Read metadata.",
      context: {},
    },
    capability: "document.metadata.read",
  });

  assertEquals(result.status, "unavailable");
  assertEquals(
    await runtime.store.transaction((transaction) =>
      transaction.listSteps(execution.scope, execution.runId)
    ),
    [],
  );
});

Deno.test("adapter persists typed exact document input for the production tool", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const runtime = createRuntime();
  const execution = executionContext("run_exact_document_input");
  const result = await createAgentRuntimeGovernedSpecialist(
    catalog,
    "general-dd-agent",
    runtime.dependencies,
    execution,
  ).propose({
    input: {
      dealId: execution.scope.dealId,
      query: "Read metadata.",
      context: { reference: exactReference },
    },
    capability: "document.metadata.read",
  });

  assertEquals(result.status, "unavailable");
  const steps = await runtime.store.transaction((transaction) =>
    transaction.listSteps(execution.scope, execution.runId)
  );
  assertEquals(steps[0]?.input, {
    scope: execution.scope,
    reference: exactReference,
  });
});

Deno.test("adapter persists typed citation source input for the production tool", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const runtime = createRuntime();
  const execution = executionContext("run_exact_citation_input");
  const source = {
    ...exactReference,
    location: { kind: "page", page: 4 },
    classification: "legal",
    processingVersion: "extract-v1",
  };
  const result = await createAgentRuntimeGovernedSpecialist(
    catalog,
    "general-dd-agent",
    runtime.dependencies,
    execution,
  ).propose({
    input: {
      dealId: execution.scope.dealId,
      query: "Propose citation.",
      context: { source, excerpt: "Signed consent." },
    },
    capability: "citation.propose",
  });

  assertEquals(result.status, "unavailable");
  const steps = await runtime.store.transaction((transaction) =>
    transaction.listSteps(execution.scope, execution.runId)
  );
  assertEquals(steps[0]?.input, {
    scope: execution.scope,
    source,
    excerpt: "Signed consent.",
  });
});

function createRuntime() {
  const store = new InMemoryAgentRuntimeStore();
  const authorization = new AllowingAuthorization();
  const clock = new FixedClock();
  const reads = new AgentRuntimeReadService(store, authorization);
  const proposalService = new AgentRuntimeProposalService(
    store,
    clock,
    authorization,
  );
  const gateway = new ToolGateway(
    [new NamedEvidenceTool()],
    authorization,
  );
  const sources = new CurrentSources();
  const executor = new NamedProposalExecutor();
  const calculations = new CalculationPortRegistry([
    new NamedCalculationPort("portfolio-selection"),
    new NamedCalculationPort("synergy-pricing"),
    new NamedCalculationPort("financial-value-calculations"),
    new NamedCalculationPort("negotiation-proposal-optimizer"),
  ]);
  return {
    store,
    reads,
    sources,
    dependencies: {
      proposalService,
      store,
      clock,
      sources,
      gateway,
      executor,
      calculations,
      getRun: reads.getRun.bind(reads),
      getResult: reads.getResult.bind(reads),
      getStep: reads.getStep.bind(reads),
      getToolActivity: reads.getToolActivity.bind(reads),
      listToolActivities: reads.listToolActivities.bind(reads),
      listResults: reads.listResults.bind(reads),
    },
  };
}

function proposalInputFor(execution: GovernedExecutionContext) {
  return {
    missionId: `mission_${execution.runId}` as never,
    planId: `plan_${execution.runId}` as never,
    runId: execution.runId,
    objective: "Prepare a competing proposal.",
    planVersion: 1,
    steps: [],
    correlationId: execution.context.correlationId,
    idempotencyKey: `competing:${execution.runId}`,
    sourceVersions: [],
    model: {
      provider: "google",
      model: "gemini-3.5-flash",
      modelVersion: "3.5",
      policyReference: "agent-model-policy/v1",
    },
  };
}

class NamedProposalExecutor implements RuntimeStepExecutor {
  execute(
    _step: StepRecord,
    _context: StepExecutionContext,
  ): Promise<StepExecutionOutput> {
    return Promise.resolve({
      kind: "proposal",
      value: {
        success: true,
        response: "Named durable proposal.",
        timestamp: "2026-08-09T12:00:00.000Z",
      },
      lineage: { toolActivityIds: [], evidence: [] },
      cost: emptyCost(),
    });
  }
}

class NamedCalculationPort implements GovernedCalculationPort {
  readonly deterministic = true as const;

  constructor(readonly name: string) {}

  execute(): Promise<StepExecutionOutput> {
    return Promise.resolve({
      kind: "proposal",
      value: {
        success: true,
        response: `Calculation ${this.name}.`,
        timestamp: "2026-08-09T12:00:00.000Z",
      },
      lineage: { toolActivityIds: [], evidence: [] },
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

class NamedResultPort implements GovernedProposalPort {
  constructor(private readonly resultId: string) {}

  propose(
    _request: GovernedProposalRequest,
  ): Promise<GovernedProposalResponse> {
    return Promise.resolve({ status: "proposed", resultId: this.resultId });
  }
}

async function onlyResult(
  store: InMemoryAgentRuntimeStore,
  scope: RuntimeScope,
  runId: string,
): Promise<string> {
  const results = await store.transaction((transaction) =>
    transaction.listResults(scope, runId as never)
  );
  const result = results.at(-1);
  if (result === undefined) throw new Error(`Run "${runId}" has no result.`);
  return result.resultId;
}

async function onlyStep(
  store: InMemoryAgentRuntimeStore,
  scope: RuntimeScope,
  runId: string,
): Promise<StepRecord> {
  const steps = await store.transaction((transaction) =>
    transaction.listSteps(scope, runId as never)
  );
  const step = steps[0];
  if (step === undefined) throw new Error(`Run "${runId}" has no step.`);
  return step;
}

function executionContext(runId: string): GovernedExecutionContext {
  const scope: RuntimeScope = {
    tenantId: "tenant_adapter" as never,
    workspaceId: "workspace_adapter" as never,
    dealId: "deal_adapter" as never,
  };
  const context: RequestContext = {
    actorId: "actor_adapter" as never,
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
