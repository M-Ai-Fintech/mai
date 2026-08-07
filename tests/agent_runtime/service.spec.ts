import { assertEquals, assertRejects } from "@std/assert";
import { InMemoryAgentRuntimeStore } from "../../src/agent_runtime/repository.ts";
import { AgentRuntimeService } from "../../src/agent_runtime/service.ts";
import type {
  PlanStepDefinition,
  RuntimeActor,
} from "../../src/agent_runtime/model.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";

Deno.test("mission creation replays the same idempotent command", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const service = new AgentRuntimeService(store, new FixedClock());
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

Deno.test("active plan queue creates durable ordered steps and lineage", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const service = new AgentRuntimeService(store, new FixedClock());
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
    transaction.listSteps(run.runId)
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

function fixtureContext(): RequestContext {
  return {
    actorId: "actor_alpha" as never,
    tenantId: "tenant_alpha" as never,
    workspaceId: "workspace_alpha" as never,
    correlationId: "cor_alpha" as never,
    origin: "http",
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
