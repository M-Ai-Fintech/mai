import { assertEquals, assertRejects } from "@std/assert";
import {
  AgentRuntimeProvenanceVerifier,
  createGovernedSpecialist,
  createSpecialistDefinitionCatalog,
  type GovernedExecutionContext,
  type GovernedProposalPort,
  type GovernedProposalRequest,
  type GovernedProposalResponse,
  GovernedProvenanceError,
  type GovernedRuntimeReceiptReader,
} from "../../src/agent/governed.ts";
import type {
  AgentDefinition,
  AgentSourceVersionReference,
} from "../../src/agent/definitions/index.ts";
import type { RuntimeReadResult } from "../../src/agent_runtime/reads.ts";
import type { SourceVersionChecker } from "../../src/agent_runtime/runner.ts";
import type {
  ResultRecord,
  RunRecord,
  RuntimeScope,
  SourceVersionReference,
  ToolActivityRecord,
} from "../../src/agent_runtime/model.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";

class NamedRecordingProposalPort implements GovernedProposalPort {
  constructor(private readonly response: GovernedProposalResponse) {}

  propose(
    _request: GovernedProposalRequest,
  ): Promise<GovernedProposalResponse> {
    return Promise.resolve(this.response);
  }
}

class NamedFakeAgentRuntimeReadService implements GovernedRuntimeReceiptReader {
  readonly calls: string[] = [];

  constructor(
    private readonly run: RunRecord,
    private readonly activities: readonly ToolActivityRecord[],
    private readonly results: readonly ResultRecord[],
    private readonly afterActivity?: () => void,
  ) {}

  getRun(
    context: RequestContext,
    actor: RunRecord["actor"],
    runId: RunRecord["runId"],
  ): Promise<RuntimeReadResult<RunRecord>> {
    this.calls.push(`run:${runId}`);
    return Promise.resolve(
      this.authorized(context, actor, runId)
        ? { kind: "loaded", value: this.run, decision: {} as never }
        : this.notFound(),
    );
  }

  getToolActivity(
    context: RequestContext,
    actor: RunRecord["actor"],
    activityId: string,
  ): Promise<RuntimeReadResult<ToolActivityRecord>> {
    this.calls.push(`activity:${activityId}`);
    const activity = this.activities.find((item) =>
      item.activityId === activityId
    );
    const receipt = activity !== undefined &&
        this.authorized(context, actor, this.run.runId)
      ? { kind: "loaded" as const, value: activity, decision: {} as never }
      : this.notFound<ToolActivityRecord>();
    if (receipt.kind === "loaded") this.afterActivity?.();
    return Promise.resolve(receipt);
  }

  listResults(
    context: RequestContext,
    actor: RunRecord["actor"],
    runId: RunRecord["runId"],
  ): Promise<RuntimeReadResult<ResultRecord[]>> {
    this.calls.push(`results:${runId}`);
    return Promise.resolve(
      this.authorized(context, actor, runId)
        ? { kind: "loaded", value: [...this.results], decision: {} as never }
        : this.notFound(),
    );
  }

  private authorized(
    context: RequestContext,
    actor: RunRecord["actor"],
    runId: RunRecord["runId"],
  ): boolean {
    return runId === this.run.runId &&
      actor.actorId === this.run.actor.actorId &&
      context.actorId === actor.actorId &&
      context.tenantId === this.run.scope.tenantId &&
      context.workspaceId === this.run.scope.workspaceId &&
      context.dealId === this.run.scope.dealId;
  }

  private notFound<T>(): RuntimeReadResult<T> {
    return { kind: "protected_not_found", response: {} as never };
  }
}

class NamedFlippingSourceVersionChecker implements SourceVersionChecker {
  readonly checks: SourceVersionReference[] = [];
  private current = true;

  flipStale(): void {
    this.current = false;
  }

  isCurrent(reference: SourceVersionReference): Promise<boolean> {
    this.checks.push(reference);
    return Promise.resolve(this.current);
  }
}

const proposedOutput = {
  success: true,
  response: "Review proposal prepared from exact evidence.",
  timestamp: "2026-08-08T12:00:00.000Z",
};

Deno.test("runtime provenance adapter derives exact lineage from authorized receipts", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("broker-orchestrator-agent");
  const execution = executionContext();
  const receipts = runtimeReceiptFixture(definition, execution);
  const reads = new NamedFakeAgentRuntimeReadService(
    receipts.run,
    [receipts.activity],
    [receipts.result],
    undefined,
  );
  const sources = new NamedFlippingSourceVersionChecker();
  const result = await createGovernedSpecialist(
    catalog,
    definition.id,
    new NamedRecordingProposalPort(
      runtimeProposalResponse(
        receipts.activity.activityId,
        receipts.result.lineage.evidence,
      ),
    ),
    new AgentRuntimeProvenanceVerifier(reads, sources),
    execution,
  ).propose({
    input: { dealId: "deal_horizon", query: "Review." },
    capability: "evidence.search",
  });

  assertEquals(result.lineage.tools, [{
    name: "governed.evidence.search",
    activityId: "activity_exact_evidence",
    capability: "read",
    status: "succeeded",
  }]);
  assertEquals(result.lineage.evidence, [{
    sourceType: "document_version",
    sourceId: "docv_contract_v2",
    version: 2 as never,
    checksum: "a".repeat(64),
  }]);
  assertEquals(result.lineage.model.model, "gemini-3.5-flash");
  assertEquals(reads.calls, [
    "run:run_governed",
    "results:run_governed",
    "activity:activity_exact_evidence",
  ]);
  assertEquals(sources.checks, [{
    sourceType: "document_version",
    sourceId: "docv_contract_v2",
    version: 2 as never,
    checksum: "a".repeat(64),
  }]);
});

Deno.test("runtime provenance adapter rejects invented, cross-run, stale, and mismatched receipts", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("broker-orchestrator-agent");
  const execution = executionContext();
  const base = runtimeReceiptFixture(definition, execution);
  const response = runtimeProposalResponse(
    base.activity.activityId,
    base.result.lineage.evidence,
  );

  const missingReader = new NamedFakeAgentRuntimeReadService(
    base.run,
    [],
    [base.result],
  );
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, response, missingReader).propose(
        agentRequest(),
      ),
    GovernedProvenanceError,
    "unavailable",
  );

  const crossRunActivity = { ...base.activity, runId: "run_other" as never };
  const crossRunReader = new NamedFakeAgentRuntimeReadService(
    base.run,
    [crossRunActivity],
    [base.result],
  );
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, response, crossRunReader).propose(
        agentRequest(),
      ),
    GovernedProvenanceError,
    "another run",
  );

  const staleReader = new NamedFakeAgentRuntimeReadService(
    { ...base.run, state: "invalidated" },
    [base.activity],
    [base.result],
  );
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, response, staleReader).propose(
        agentRequest(),
      ),
    GovernedProvenanceError,
    "stale",
  );

  const mismatchedResult = {
    ...base.result,
    lineage: {
      ...base.result.lineage,
      prompt: { ...definition.prompt, templateVersion: "0.9.0" },
    },
  } as ResultRecord;
  const mismatchedReader = new NamedFakeAgentRuntimeReadService(
    base.run,
    [base.activity],
    [mismatchedResult],
  );
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, response, mismatchedReader).propose(
        agentRequest(),
      ),
    GovernedProvenanceError,
    "prompt receipt",
  );
});

Deno.test("runtime provenance adapter rejects receipts that become stale after loading", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("broker-orchestrator-agent");
  const execution = executionContext();
  const base = runtimeReceiptFixture(definition, execution);
  const sources = new NamedFlippingSourceVersionChecker();
  const reads = new NamedFakeAgentRuntimeReadService(
    base.run,
    [base.activity],
    [base.result],
    sources.flipStale.bind(sources),
  );

  await assertRejects(
    () =>
      createRuntimeAdapterAgent(
        catalog,
        runtimeProposalResponse(
          base.activity.activityId,
          base.result.lineage.evidence,
        ),
        reads,
        sources,
      ).propose(agentRequest()),
    GovernedProvenanceError,
    "stale or unavailable",
  );
  assertEquals(sources.checks, [{
    sourceType: "document_version",
    sourceId: "docv_contract_v2",
    version: 2 as never,
    checksum: "a".repeat(64),
  }]);
  assertEquals(reads.calls, [
    "run:run_governed",
    "results:run_governed",
    "activity:activity_exact_evidence",
  ]);
});

function createRuntimeAdapterAgent(
  catalog: ReturnType<typeof createSpecialistDefinitionCatalog>,
  response: GovernedProposalResponse,
  reads: GovernedRuntimeReceiptReader,
  sources = new NamedFlippingSourceVersionChecker(),
) {
  return createGovernedSpecialist(
    catalog,
    "broker-orchestrator-agent",
    new NamedRecordingProposalPort(response),
    new AgentRuntimeProvenanceVerifier(reads, sources),
    executionContext(),
  );
}

function agentRequest(): { input: Record<string, string>; capability: string } {
  return {
    input: { dealId: "deal_horizon", query: "Review." },
    capability: "evidence.search",
  };
}

function runtimeProposalResponse(
  activityId: string,
  evidence: readonly AgentSourceVersionReference[],
): GovernedProposalResponse {
  return {
    status: "proposed",
    value: proposedOutput,
    provenanceClaims: {
      tools: [{ activityId }],
      evidence,
    },
  };
}

function runtimeReceiptFixture(
  definition: AgentDefinition,
  execution: GovernedExecutionContext,
): {
  run: RunRecord;
  activity: ToolActivityRecord;
  result: ResultRecord;
} {
  const now = new Date("2026-08-08T12:00:00.000Z");
  const activity = {
    activityId: "activity_exact_evidence" as never,
    runId: execution.runId,
    stepId: "step_receipt" as never,
    toolName: "governed.evidence.search",
    action: "read",
    resourceKind: "evidence",
    resourceId: "docv_contract_v2",
    requestDigest: "digest_receipt",
    state: "succeeded" as const,
    createdAt: now,
    completedAt: now,
  } as ToolActivityRecord;
  const result = {
    resultId: "result_receipt" as never,
    runId: execution.runId,
    stepId: activity.stepId,
    kind: "proposal" as const,
    value: proposedOutput,
    lineage: {
      prompt: definition.prompt,
      model: {
        provider: definition.modelPolicy.provider,
        model: definition.modelPolicy.model,
        modelVersion: definition.modelPolicy.modelVersion,
      },
      toolActivityIds: [activity.activityId],
      evidence: [{
        sourceType: "document_version",
        sourceId: "docv_contract_v2",
        version: 2 as never,
        checksum: "a".repeat(64),
      }],
    },
    cost: {} as never,
    createdAt: now,
  } as ResultRecord;
  const run = {
    runId: execution.runId,
    scope: execution.scope,
    actor: execution.actor,
    state: "succeeded" as const,
    model: {
      provider: definition.modelPolicy.provider,
      model: definition.modelPolicy.model,
      modelVersion: definition.modelPolicy.modelVersion,
    },
  } as RunRecord;
  return { run, activity, result };
}

function executionContext(
  runId: string = "run_governed",
): GovernedExecutionContext {
  const scope: RuntimeScope = {
    tenantId: "tenant_horizon" as never,
    workspaceId: "workspace_horizon" as never,
    dealId: "deal_horizon" as never,
  };
  const context: RequestContext = {
    actorId: "actor_governed" as never,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: "cor_governed" as never,
    origin: "internal",
  };
  return {
    context,
    actor: { actorId: context.actorId, kind: "ai", state: "active" },
    scope,
    runId: runId as never,
  };
}
