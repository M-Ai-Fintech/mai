import { assertRejects } from "@std/assert";
import {
  AgentRuntimeProvenanceVerifier,
  createSpecialistDefinitionCatalog,
  GovernedProvenanceError,
  type GovernedRuntimeReceiptReader,
} from "../../src/agent/governed.ts";
import type { AgentDefinition } from "../../src/agent/definitions/index.ts";
import type { RuntimeReadResult } from "../../src/agent_runtime/reads.ts";
import type { SourceVersionChecker } from "../../src/agent_runtime/runner.ts";
import type {
  ResultRecord,
  RunRecord,
  RuntimeActor,
  RuntimeScope,
  SourceVersionReference,
  ToolActivityRecord,
} from "../../src/agent_runtime/model.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";

Deno.test("metadata capability rejects an evidence-search durable receipt", async () => {
  const definition = createSpecialistDefinitionCatalog().current(
    "general-dd-agent",
  );
  const execution = fixtureExecution(definition);
  const receipts = fixtureReceipts(definition, execution);
  const verifier = new AgentRuntimeProvenanceVerifier(
    new NamedCapabilityReceiptReader(
      receipts.run,
      receipts.result,
      receipts.activity,
    ),
    new CurrentSourceVersionChecker(),
  );

  await assertRejects(
    () =>
      verifier.verify({
        execution,
        capability: "document.metadata.read",
        definition,
        resultId: receipts.result.resultId,
      }),
    GovernedProvenanceError,
    "not bound",
  );
});

class NamedCapabilityReceiptReader implements GovernedRuntimeReceiptReader {
  constructor(
    private readonly run: RunRecord,
    private readonly result: ResultRecord,
    private readonly activity: ToolActivityRecord,
  ) {}

  getRun(): Promise<RuntimeReadResult<RunRecord>> {
    return Promise.resolve(loaded(this.run));
  }

  getResult(): Promise<RuntimeReadResult<ResultRecord>> {
    return Promise.resolve(loaded(this.result));
  }

  getToolActivity(): Promise<RuntimeReadResult<ToolActivityRecord>> {
    return Promise.resolve(loaded(this.activity));
  }
}

class CurrentSourceVersionChecker implements SourceVersionChecker {
  isCurrent(_reference: SourceVersionReference): Promise<boolean> {
    return Promise.resolve(true);
  }
}

function loaded<T>(value: T): RuntimeReadResult<T> {
  return { kind: "loaded", value, decision: {} as never };
}

function fixtureReceipts(
  definition: AgentDefinition,
  execution: ReturnType<typeof fixtureExecution>,
): { run: RunRecord; result: ResultRecord; activity: ToolActivityRecord } {
  const now = new Date("2026-08-08T12:00:00.000Z");
  const activity = {
    activityId: "activity_capability_binding" as never,
    runId: execution.runId,
    stepId: "step_capability_binding" as never,
    toolName: "governed.evidence.search",
    action: "search_evidence",
    resourceKind: "evidence",
    resourceId: "docv_contract_v2",
    requestDigest: "digest_capability_binding",
    state: "succeeded" as const,
    createdAt: now,
    completedAt: now,
  } as ToolActivityRecord;
  const source = {
    sourceType: "document_version",
    sourceId: "docv_contract_v2",
    version: 2 as never,
    checksum: "a".repeat(64),
  };
  const result = {
    resultId: "result_capability_binding" as never,
    runId: execution.runId,
    stepId: activity.stepId,
    kind: "proposal" as const,
    value: { success: true },
    lineage: {
      definition: { id: definition.id, version: definition.version },
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
      evidence: [source],
    },
    cost: {} as never,
    createdAt: now,
  } as ResultRecord;
  const run = {
    runId: execution.runId,
    scope: execution.scope,
    actor: execution.actor,
    state: "succeeded" as const,
    aggregateVersion: 1 as never,
    model: {
      provider: definition.modelPolicy.provider,
      model: definition.modelPolicy.model,
      modelVersion: definition.modelPolicy.modelVersion,
    },
  } as unknown as RunRecord;
  return { run, result, activity };
}

function fixtureExecution(definition: AgentDefinition) {
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
    correlationId: "cor_capability_binding" as never,
    origin: "internal",
  };
  const actor: RuntimeActor = {
    actorId: context.actorId,
    kind: "ai",
    state: "active",
  };
  return {
    context,
    actor,
    scope,
    runId: "run_capability_binding" as never,
    definition: { id: definition.id, version: definition.version },
  };
}
