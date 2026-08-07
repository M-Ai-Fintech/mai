import { assertEquals, assertRejects } from "@std/assert";
import { InMemoryAgentRuntimeStore } from "../../src/agent_runtime/repository.ts";
import { AgentRuntimeService } from "../../src/agent_runtime/service.ts";
import type {
  PlanStepDefinition,
  RuntimeActor,
} from "../../src/agent_runtime/model.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import { RuntimeAuthorizationDeniedError } from "../../src/agent_runtime/authorization.ts";
import {
  AllowingAuthorization,
  DenyingAuthorization,
} from "./authorization_support.ts";

Deno.test("mission creation replays the same idempotent command", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const service = new AgentRuntimeService(
    store,
    new FixedClock(),
    new AllowingAuthorization(),
  );
  const context = fixtureContext();
  const actor = fixtureActor();
  const input = {
    missionId: "mission_alpha" as never,
    objective: "Review evidence",
    idempotencyKey: "command_alpha",
  };

  const first = await service.createMission(context, actor, input);
  const replay = await service.createMission(context, actor, input);

  assertEquals(replay.missionId, first.missionId);
  assertEquals(store.events.map(({ eventType }) => eventType), [
    "mission.created",
  ]);
  await assertRejects(
    () =>
      service.createMission(context, actor, {
        ...input,
        objective: "Changed objective",
      }),
    Error,
    "payload digest changed",
  );
});

Deno.test("runtime commands reject an actor not bound to the request context", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const service = new AgentRuntimeService(
    store,
    new FixedClock(),
    new AllowingAuthorization(),
  );

  await assertRejects(
    () =>
      service.createMission(fixtureContext(), {
        actorId: "actor_other" as never,
        kind: "human",
        state: "active",
      }, {
        missionId: "mission_mismatch" as never,
        objective: "Should not be created",
        idempotencyKey: "command_mismatch",
      }),
    Error,
    "actor",
  );
});

Deno.test("runtime commands require platform authorization beyond actor declarations", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new FixedClock();
  const service = new AgentRuntimeService(
    store,
    clock,
    new AllowingAuthorization(),
  );
  await assertRejects(
    () =>
      service.createMission(fixtureContext(), {
        actorId: "actor_alpha" as never,
        kind: "human",
        state: "inactive",
      }, {
        missionId: "mission_inactive" as never,
        objective: "Must be denied",
        idempotencyKey: "command_inactive",
      }),
    RuntimeAuthorizationDeniedError,
    "ACTOR_INACTIVE",
  );

  const actor = fixtureActor();
  await service.createMission(fixtureContext(), actor, {
    missionId: "mission_cancel_auth" as never,
    objective: "Protect cancellation",
    idempotencyKey: "command_cancel_auth",
  });
  await service.proposePlan(
    fixtureContext(),
    actor,
    "mission_cancel_auth" as never,
    {
      planId: "plan_cancel_auth" as never,
      version: 1,
      sourceVersions: [],
      steps: [],
    },
  );
  await service.activatePlan(
    fixtureContext(),
    actor,
    "plan_cancel_auth" as never,
  );
  const run = await service.queueRun(
    fixtureContext(),
    actor,
    "plan_cancel_auth" as never,
    {
      runId: "run_cancel_auth" as never,
      correlationId: "cor_cancel_auth" as never,
      idempotencyKey: "command_run_cancel_auth",
      sourceVersions: [],
    },
  );
  const deniedService = new AgentRuntimeService(
    store,
    clock,
    new DenyingAuthorization(),
  );
  await assertRejects(
    () => deniedService.requestCancellation(fixtureContext(), actor, run.runId),
    RuntimeAuthorizationDeniedError,
    "GRANT_REVOKED",
  );
  const stored = await store.transaction((transaction) =>
    transaction.findRun(run.scope, run.runId)
  );
  assertEquals(stored?.cancellationRequestedAt, undefined);
});

Deno.test("active plan queue creates durable ordered steps and lineage", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const service = new AgentRuntimeService(
    store,
    new FixedClock(),
    new AllowingAuthorization(),
  );
  const context = fixtureContext();
  const actor = fixtureActor();
  await service.createMission(context, actor, {
    missionId: "mission_beta" as never,
    objective: "Draft recommendation",
    idempotencyKey: "command_beta",
  });
  await service.proposePlan(context, actor, "mission_beta" as never, {
    planId: "plan_beta" as never,
    version: 1,
    sourceVersions: [],
    steps: [fixtureStep(1, "read"), fixtureStep(2, "draft")],
  });
  await service.activatePlan(context, actor, "plan_beta" as never);

  const run = await service.queueRun(context, actor, "plan_beta" as never, {
    runId: "run_beta" as never,
    correlationId: "cor_beta" as never,
    idempotencyKey: "command_run_beta",
    sourceVersions: [],
  });
  const steps = await store.transaction((transaction) =>
    transaction.listSteps(run.scope, run.runId)
  );

  assertEquals(steps.map(({ ordinal, state }) => ({ ordinal, state })), [
    { ordinal: 1, state: "queued" },
    { ordinal: 2, state: "queued" },
  ]);
  assertEquals(store.events.map(({ eventType }) => eventType), [
    "mission.created",
    "plan.proposed",
    "plan.activated",
    "run.queued",
  ]);
});

Deno.test("run queue rejects an active plan from another exact scope", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const service = new AgentRuntimeService(
    store,
    new FixedClock(),
    new AllowingAuthorization(),
  );
  const context = fixtureContext();
  const actor = fixtureActor();

  await service.createMission(context, actor, {
    missionId: "mission_scope" as never,
    objective: "Keep scope bound",
    idempotencyKey: "command_scope",
  });
  await service.proposePlan(context, actor, "mission_scope" as never, {
    planId: "plan_scope" as never,
    version: 1,
    sourceVersions: [],
    steps: [],
  });
  await service.activatePlan(context, actor, "plan_scope" as never);

  await assertRejects(
    () =>
      service.queueRun(
        fixtureContext({
          workspaceId: "workspace_other" as never,
          dealId: "deal_other" as never,
          correlationId: "cor_other" as never,
        }),
        actor,
        "plan_scope" as never,
        {
          runId: "run_scope" as never,
          correlationId: "cor_other" as never,
          idempotencyKey: "command_scope_run",
          sourceVersions: [],
        },
      ),
    Error,
    "scope",
  );
});

function fixtureStep(ordinal: number, name: string): PlanStepDefinition {
  return {
    ordinal,
    name,
    kind: ordinal === 1 ? "tool" : "model",
    toolName: ordinal === 1 ? "proposal_tool" : undefined,
    action: ordinal === 1 ? "read" : undefined,
    resourceKind: ordinal === 1 ? "evidence" : undefined,
    resourceId: ordinal === 1 ? "evidence_alpha" : undefined,
    sourceVersions: [],
    input: { ordinal },
  };
}

function fixtureContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    actorId: "actor_alpha" as never,
    tenantId: "tenant_alpha" as never,
    workspaceId: "workspace_alpha" as never,
    correlationId: "cor_alpha" as never,
    origin: "http",
    ...overrides,
  };
}

function fixtureActor(): RuntimeActor {
  return { actorId: "actor_alpha" as never, kind: "human", state: "active" };
}

class FixedClock {
  now(): Date {
    return new Date("2026-08-07T12:00:00.000Z");
  }
}
