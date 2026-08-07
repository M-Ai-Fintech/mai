import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  AgentRuntimeReadService,
  AgentRuntimeService,
  RuntimeActorContextMismatchError,
} from "../../src/agent_runtime/v1.ts";
import { RuntimeScopeRequiredError } from "../../src/agent_runtime/model.ts";
import {
  InMemoryAgentRuntimeStore,
} from "../../src/agent_runtime/repository.ts";
import type {
  ArtifactRecord,
  ResultRecord,
  RuntimeActor,
  RuntimeAttemptRecord,
  StepRecord,
  ToolActivityRecord,
} from "../../src/agent_runtime/model.ts";
import {
  AllowingAuthorization,
  DenyingAuthorization,
} from "./authorization_support.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";

Deno.test("protected runtime reads deny unauthorized and cross-scope identifiers", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new FixedClock();
  const actor = fixtureActor();
  const context = fixtureContext();
  const service = new AgentRuntimeService(
    store,
    clock,
    new AllowingAuthorization(),
  );
  await service.createMission(context, actor, {
    missionId: "mission_read" as never,
    objective: "Read protected runtime state",
    idempotencyKey: "idem_read_mission",
  });
  await service.proposePlan(context, actor, "mission_read" as never, {
    planId: "plan_read" as never,
    version: 1,
    sourceVersions: [],
    steps: [],
  });
  await service.activatePlan(context, actor, "plan_read" as never);
  const run = await service.queueRun(context, actor, "plan_read" as never, {
    runId: "run_read" as never,
    correlationId: "cor_read" as never,
    idempotencyKey: "idem_read_run",
    sourceVersions: [],
  });
  await addChildren(store, run);

  const reads = new AgentRuntimeReadService(store, new AllowingAuthorization());
  const otherContext = fixtureContext({
    workspaceId: "workspace_other" as never,
    dealId: "deal_other" as never,
    correlationId: "cor_other" as never,
  });
  const crossScopeResults = await Promise.all([
    reads.getMission(otherContext, actor, "mission_read" as never),
    reads.getPlan(otherContext, actor, "plan_read" as never),
    reads.getRun(otherContext, actor, run.runId),
    reads.getStep(otherContext, actor, "step_read" as never),
    reads.getToolActivity(otherContext, actor, "activity_read"),
    reads.getResult(otherContext, actor, "result_read"),
    reads.getArtifact(otherContext, actor, "artifact_read"),
    reads.getAttempt(otherContext, actor, "attempt_read"),
    reads.listSteps(otherContext, actor, run.runId),
    reads.listToolActivities(otherContext, actor, run.runId),
    reads.listResults(otherContext, actor, run.runId),
    reads.listArtifacts(otherContext, actor, run.runId),
    reads.listAttempts(otherContext, actor, run.runId),
  ]);
  assert(crossScopeResults.every(({ kind }) => kind === "protected_not_found"));

  const denied = new AgentRuntimeReadService(store, new DenyingAuthorization());
  const deniedRead = await denied.getRun(context, actor, run.runId);
  assertEquals(deniedRead.kind, "protected_not_found");
  await assertRejects(
    () =>
      reads.getRun(
        context,
        { ...actor, actorId: "actor_other" as never },
        run.runId,
      ),
    RuntimeActorContextMismatchError,
  );
});

Deno.test("protected runtime reads reject incomplete deal scope before authorization or loading", async () => {
  const reads = new AgentRuntimeReadService(
    new InMemoryAgentRuntimeStore(),
    new AllowingAuthorization(),
  );
  await assertRejects(
    () =>
      reads.getMission(
        fixtureContext({ workspaceId: undefined, dealId: undefined }),
        fixtureActor(),
        "mission_missing_scope" as never,
      ),
    RuntimeScopeRequiredError,
  );
});

async function addChildren(
  store: InMemoryAgentRuntimeStore,
  run: Awaited<ReturnType<AgentRuntimeService["queueRun"]>>,
): Promise<void> {
  const now = new Date("2026-08-07T12:00:00.000Z");
  const step: StepRecord = {
    stepId: "step_read" as never,
    runId: run.runId,
    ordinal: 1,
    name: "read",
    kind: "tool",
    toolName: "proposal_tool",
    action: "read",
    resourceKind: "evidence",
    resourceId: "evidence_read",
    input: {},
    sourceVersions: [],
    state: "succeeded",
    attemptCount: 1,
    resultId: "result_read" as never,
    createdAt: now,
    updatedAt: now,
  };
  const activity: ToolActivityRecord = {
    activityId: "activity_read" as never,
    runId: run.runId,
    stepId: step.stepId,
    toolName: "proposal_tool",
    action: "read",
    resourceKind: "evidence",
    resourceId: "evidence_read",
    requestDigest: "digest_read",
    state: "succeeded",
    createdAt: now,
    completedAt: now,
  };
  const result: ResultRecord = {
    resultId: "result_read" as never,
    runId: run.runId,
    stepId: step.stepId,
    kind: "read",
    value: { protected: true },
    lineage: { toolActivityIds: [activity.activityId], evidence: [] },
    cost: {
      currency: "USD",
      inputTokens: 0,
      outputTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
    },
    createdAt: now,
  };
  const artifact: ArtifactRecord = {
    artifactId: "artifact_read" as never,
    resultId: result.resultId,
    runId: run.runId,
    stepId: step.stepId,
    artifactType: "draft",
    contentReference: "memory://read",
    contentDigest: "digest",
    state: "draft",
    sourceVersions: [],
    createdAt: now,
  };
  const attempt: RuntimeAttemptRecord = {
    attemptId: "attempt_read",
    scope: "step",
    subjectId: step.stepId,
    runId: run.runId,
    attemptNumber: 1,
    recordKind: "completed",
    workerId: "worker_read",
    leaseExpiresAt: now,
    startedAt: now,
    completedAt: now,
    outcome: "succeeded",
  };
  await store.transaction(async (transaction) => {
    await transaction.createStep(step);
    await transaction.recordToolActivity(activity);
    await transaction.recordResult(result);
    await transaction.recordArtifact(artifact);
    await transaction.appendAttempt(attempt);
  });
}

function fixtureContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    actorId: "actor_read" as never,
    tenantId: "tenant_read" as never,
    workspaceId: "workspace_read" as never,
    dealId: "deal_read" as never,
    correlationId: "cor_read" as never,
    origin: "http",
    ...overrides,
  };
}

function fixtureActor(): RuntimeActor {
  return { actorId: "actor_read" as never, kind: "human", state: "active" };
}

class FixedClock {
  now(): Date {
    return new Date("2026-08-07T12:00:00.000Z");
  }
}
