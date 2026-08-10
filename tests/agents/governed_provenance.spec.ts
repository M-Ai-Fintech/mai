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
import type { AgentDefinition } from "../../src/agent/definitions/index.ts";
import type { SourceVersionChecker } from "../../src/agent_runtime/runner.ts";
import type {
  ResultRecord,
  RunRecord,
  RuntimeScope,
  SourceVersionReference,
  ToolActivityRecord,
} from "../../src/agent_runtime/model.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import {
  governedStep,
  NamedFakeAgentRuntimeReadService,
} from "./governed_provenance_fakes.ts";

class NamedRecordingProposalPort implements GovernedProposalPort {
  constructor(private readonly response: GovernedProposalResponse) {}

  propose(
    _request: GovernedProposalRequest,
  ): Promise<GovernedProposalResponse> {
    return Promise.resolve(this.response);
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

Deno.test("runtime provenance reads the exact result and derives complete lineage", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("broker-orchestrator-agent");
  const execution = executionContext();
  const receipts = runtimeReceiptFixture(definition, execution);
  const reads = new NamedFakeAgentRuntimeReadService(
    [receipts.run],
    [receipts.activity],
    receipts.result,
  );
  const sources = new NamedFlippingSourceVersionChecker();
  const result = await createGovernedSpecialist(
    catalog,
    definition.id,
    new NamedRecordingProposalPort(
      runtimeProposalResponse(receipts.result.resultId),
    ),
    new AgentRuntimeProvenanceVerifier(reads, sources),
    execution,
  ).propose({
    input: { dealId: "deal_horizon", query: "Review." },
    capability: "evidence.search",
  });

  assertEquals(result.artifact.value, proposedOutput);
  assertEquals(result.artifact.kind, "proposal");
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
    "result:result_receipt",
    "step:step_receipt",
    "activity:activity_exact_evidence",
    "run:run_governed",
  ]);
  assertEquals(sources.checks, [{
    sourceType: "document_version",
    sourceId: "docv_contract_v2",
    version: 2 as never,
    checksum: "a".repeat(64),
  }]);
});

Deno.test("durable provenance preserves a semantic financial-risk evidence receipt", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("broker-orchestrator-agent");
  const execution = executionContext();
  const base = runtimeReceiptFixture(definition, execution);
  const exactVersion = `${"a".repeat(64)}:evidence_alpha`;
  const result = {
    ...base.result,
    lineage: {
      ...base.result.lineage,
      evidence: [{
        ...base.result.lineage.evidence[0],
        sourceType: "evidence",
        sourceId: "evidence_alpha",
        version: exactVersion,
        checksum: undefined,
      }],
    },
  } as ResultRecord;
  const sources = new NamedFlippingSourceVersionChecker();
  const verified = await createRuntimeAdapterAgent(
    catalog,
    result.resultId,
    new NamedFakeAgentRuntimeReadService(
      [base.run],
      [base.activity],
      result,
    ),
    sources,
    execution,
  ).propose(agentRequest());

  assertEquals(verified.lineage.evidence[0]?.version, exactVersion);
  assertEquals(sources.checks[0]?.version, exactVersion);
});

Deno.test("runtime provenance rejects missing, cross-run, stale, wrong-kind, and mismatched results", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("broker-orchestrator-agent");
  const execution = executionContext();
  const base = runtimeReceiptFixture(definition, execution);

  const missingReader = new NamedFakeAgentRuntimeReadService(
    [base.run],
    [],
    base.result,
  );
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, base.result.resultId, missingReader)
        .propose(
          agentRequest(),
        ),
    GovernedProvenanceError,
    "unavailable",
  );

  const crossRunActivity = { ...base.activity, runId: "run_other" as never };
  const crossRunReader = new NamedFakeAgentRuntimeReadService(
    [base.run],
    [crossRunActivity],
    base.result,
  );
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, base.result.resultId, crossRunReader)
        .propose(
          agentRequest(),
        ),
    GovernedProvenanceError,
    "another run",
  );

  const staleReader = new NamedFakeAgentRuntimeReadService(
    [{ ...base.run, state: "invalidated" }],
    [base.activity],
    base.result,
  );
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, base.result.resultId, staleReader)
        .propose(
          agentRequest(),
        ),
    GovernedProvenanceError,
    "not succeeded",
  );

  const wrongKindReader = new NamedFakeAgentRuntimeReadService(
    [base.run],
    [base.activity],
    { ...base.result, kind: "calculation" },
  );
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, base.result.resultId, wrongKindReader)
        .propose(
          agentRequest(),
        ),
    GovernedProvenanceError,
    "unsupported kind",
  );

  const mismatchedResult = {
    ...base.result,
    lineage: {
      ...base.result.lineage,
      prompt: { ...definition.prompt, templateVersion: "0.9.0" },
    },
  } as ResultRecord;
  const mismatchedReader = new NamedFakeAgentRuntimeReadService(
    [base.run],
    [base.activity],
    mismatchedResult,
    undefined,
    governedStep(base.result),
  );
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, base.result.resultId, mismatchedReader)
        .propose(
          agentRequest(),
        ),
    GovernedProvenanceError,
    "model or prompt",
  );
});

Deno.test("runtime provenance rejects invented result IDs and result ID rebinding", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("broker-orchestrator-agent");
  const execution = executionContext();
  const base = runtimeReceiptFixture(definition, execution);
  const reads = new NamedFakeAgentRuntimeReadService(
    [base.run],
    [base.activity],
    base.result,
  );
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, "result_invented", reads).propose(
        agentRequest(),
      ),
    GovernedProvenanceError,
    "unavailable",
  );

  const rebound = { ...base.result, resultId: "result_other" as never };
  const reboundReader = new NamedFakeAgentRuntimeReadService(
    [base.run],
    [base.activity],
    rebound,
  );
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, base.result.resultId, reboundReader)
        .propose(
          agentRequest(),
        ),
    GovernedProvenanceError,
    "unavailable",
  );
});

Deno.test("runtime provenance rejects receipts that become stale after loading", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("broker-orchestrator-agent");
  const execution = executionContext();
  const base = runtimeReceiptFixture(definition, execution);
  const sources = new NamedFlippingSourceVersionChecker();
  const reads = new NamedFakeAgentRuntimeReadService(
    [base.run],
    [base.activity],
    base.result,
    sources.flipStale.bind(sources),
  );

  await assertRejects(
    () =>
      createRuntimeAdapterAgent(
        catalog,
        base.result.resultId,
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
    "result:result_receipt",
    "step:step_receipt",
    "activity:activity_exact_evidence",
  ]);
});

Deno.test("runtime provenance rejects concurrent run invalidation after freshness awaits", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("broker-orchestrator-agent");
  const execution = executionContext();
  const base = runtimeReceiptFixture(definition, execution);
  const invalidated = {
    ...base.run,
    aggregateVersion: 4 as never,
    state: "invalidated" as const,
  };
  const reads = new NamedFakeAgentRuntimeReadService(
    [base.run, invalidated],
    [base.activity],
    base.result,
  );

  await assertRejects(
    () =>
      createRuntimeAdapterAgent(catalog, base.result.resultId, reads).propose(
        agentRequest(),
      ),
    GovernedProvenanceError,
    "not succeeded",
  );
  assertEquals(reads.calls, [
    "run:run_governed",
    "result:result_receipt",
    "step:step_receipt",
    "activity:activity_exact_evidence",
    "run:run_governed",
  ]);
});

Deno.test("runtime provenance deduplicates identical evidence and rejects checksum conflicts", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const definition = catalog.current("broker-orchestrator-agent");
  const execution = executionContext("run_evidence_duplicates");
  const base = runtimeReceiptFixture(definition, execution);
  const duplicate = {
    ...base.result,
    lineage: {
      ...base.result.lineage,
      evidence: [
        ...base.result.lineage.evidence,
        ...base.result.lineage.evidence,
      ],
    },
  } as ResultRecord;
  const duplicateResult = await createRuntimeAdapterAgent(
    catalog,
    duplicate.resultId,
    new NamedFakeAgentRuntimeReadService(
      [base.run],
      [base.activity],
      duplicate,
    ),
    new NamedFlippingSourceVersionChecker(),
    execution,
  ).propose(agentRequest());

  assertEquals(duplicateResult.lineage.evidence, [{
    sourceType: "document_version",
    sourceId: "docv_contract_v2",
    version: 2,
    checksum: "a".repeat(64),
  }]);

  const conflict = {
    ...base.result,
    lineage: {
      ...base.result.lineage,
      evidence: [
        ...base.result.lineage.evidence,
        { ...base.result.lineage.evidence[0], checksum: "b".repeat(64) },
      ],
    },
  } as ResultRecord;
  await assertRejects(
    () =>
      createRuntimeAdapterAgent(
        catalog,
        conflict.resultId,
        new NamedFakeAgentRuntimeReadService(
          [base.run],
          [base.activity],
          conflict,
        ),
        new NamedFlippingSourceVersionChecker(),
        execution,
      ).propose(agentRequest()),
    GovernedProvenanceError,
    "conflicts",
  );
});

function createRuntimeAdapterAgent(
  catalog: ReturnType<typeof createSpecialistDefinitionCatalog>,
  resultId: string,
  reads: GovernedRuntimeReceiptReader,
  sources = new NamedFlippingSourceVersionChecker(),
  execution = executionContext(),
) {
  return createGovernedSpecialist(
    catalog,
    "broker-orchestrator-agent",
    new NamedRecordingProposalPort(runtimeProposalResponse(resultId)),
    new AgentRuntimeProvenanceVerifier(reads, sources),
    execution,
  );
}

function agentRequest(): { input: Record<string, string>; capability: string } {
  return {
    input: { dealId: "deal_horizon", query: "Review." },
    capability: "evidence.search",
  };
}

function runtimeProposalResponse(resultId: string): GovernedProposalResponse {
  return { status: "proposed", resultId };
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
    action: "search_evidence",
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
      definition: {
        id: definition.id,
        version: definition.version,
      },
      definitionId: definition.id,
      definitionVersion: definition.version,
      modelPolicyReference: definition.modelPolicy.policyReference,
      prompt: definition.prompt,
      model: {
        provider: definition.modelPolicy.provider,
        model: definition.modelPolicy.model,
        modelVersion: definition.modelPolicy.modelVersion,
        policyReference: definition.modelPolicy.policyReference,
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
    aggregateVersion: 3 as never,
    model: {
      provider: definition.modelPolicy.provider,
      model: definition.modelPolicy.model,
      modelVersion: definition.modelPolicy.modelVersion,
      policyReference: definition.modelPolicy.policyReference,
    },
  } as unknown as RunRecord;
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
