import { assertEquals } from "@std/assert";
import {
  createInitialLifecycle,
  createMilestone,
  DealLifecycleError,
  milestoneId,
  transitionLifecycle,
  transitionMilestone,
} from "../../src/deal_management/lifecycle/model.ts";
import {
  DEAL_LIFECYCLE_TRANSITIONS,
  MILESTONE_TRANSITIONS,
} from "../../src/deal_management/lifecycle/transition_tables.ts";
import { requiredTenantId, requiredWorkspaceId } from "./support.ts";

const scope = {
  tenantId: requiredTenantId("tenant_northstar"),
  workspaceId: requiredWorkspaceId("workspace_alpha"),
};

function lifecycle() {
  return createInitialLifecycle({
    dealId: "deal_lifecycle-model" as never,
    ...scope,
    version: 1,
  });
}

Deno.test("lifecycle tables expose explicit forward and terminal edges", () => {
  assertEquals(
    DEAL_LIFECYCLE_TRANSITIONS.map(({ from, to }) => `${from}->${to}`),
    [
      "draft->sourcing",
      "sourcing->due_diligence",
      "due_diligence->negotiation",
      "negotiation->closing",
      "closing->completed",
      "draft->archived",
      "sourcing->archived",
      "due_diligence->archived",
      "negotiation->archived",
      "closing->archived",
      "completed->archived",
    ],
  );
  assertEquals(
    MILESTONE_TRANSITIONS.map(({ from, to }) => `${from}->${to}`),
    [
      "planned->active",
      "planned->blocked",
      "planned->cancelled",
      "active->completed",
      "active->blocked",
      "active->cancelled",
      "blocked->active",
      "blocked->cancelled",
    ],
  );
  assertEquals(DEAL_LIFECYCLE_TRANSITIONS.at(-1)?.to, "archived");
  assertEquals(
    MILESTONE_TRANSITIONS.some(({ from }) => from === "completed"),
    false,
  );
});

Deno.test("lifecycle transitions enforce milestones as prerequisites", () => {
  const sourcing = transitionLifecycle(lifecycle(), {
    toState: "sourcing",
  }).aggregate;
  const blocked = expectLifecycleError(
    () => transitionLifecycle(sourcing, { toState: "due_diligence" }),
  );
  assertEquals(blocked.lifecycleCode, "PREREQUISITE_BLOCKED");
  assertEquals(blocked.details[0]?.key, "target_identified");

  const target = createMilestone(sourcing, {
    id: milestoneId("milestone_target_identified"),
    key: "target_identified",
    title: "Target identified",
    now: "2026-08-04T12:00:00.000Z",
  }).aggregate;
  const active = transitionMilestone(target, {
    milestoneId: milestoneId("milestone_target_identified"),
    toState: "active",
    now: "2026-08-04T12:01:00.000Z",
  }).aggregate;
  const completed = transitionMilestone(active, {
    milestoneId: milestoneId("milestone_target_identified"),
    toState: "completed",
    now: "2026-08-04T12:02:00.000Z",
  }).aggregate;
  const next = transitionLifecycle(completed, {
    toState: "due_diligence",
  }).aggregate;

  assertEquals(next.state, "due_diligence");
  assertEquals(next.milestones[0]?.state, "completed");
});

Deno.test("lifecycle model rejects invalid, duplicate, missing, and impossible inputs", () => {
  const initial = lifecycle();
  const invalid = expectLifecycleError(
    () => transitionLifecycle(initial, { toState: "closing" }),
  );
  assertEquals(invalid.lifecycleCode, "INVALID_TRANSITION");

  const first = createMilestone(initial, {
    id: milestoneId("milestone_duplicate"),
    key: "target_identified",
    title: "Target",
    now: "2026-08-04T12:00:00.000Z",
  }).aggregate;
  const duplicate = expectLifecycleError(
    () =>
      createMilestone(first, {
        id: milestoneId("milestone_duplicate"),
        key: "target_identified",
        title: "Duplicate",
        now: "2026-08-04T12:00:00.000Z",
      }),
  );
  assertEquals(duplicate.lifecycleCode, "DUPLICATE_MILESTONE");

  const missing = expectLifecycleError(
    () =>
      transitionMilestone(first, {
        milestoneId: milestoneId("milestone_missing"),
        toState: "active",
        now: "2026-08-04T12:00:00.000Z",
      }),
  );
  assertEquals(missing.lifecycleCode, "MILESTONE_NOT_FOUND");

  const impossible = expectLifecycleError(
    () =>
      createMilestone(initial, {
        id: milestoneId("milestone_impossible"),
        key: "self_blocked",
        title: "Self blocked",
        prerequisites: [{ key: "self_blocked", state: "completed" }],
        now: "2026-08-04T12:00:00.000Z",
      }),
  );
  assertEquals(impossible.lifecycleCode, "IMPOSSIBLE_PREREQUISITE");
});

Deno.test("completed and archived lifecycle states are terminal", () => {
  const completed = { ...lifecycle(), state: "completed" as const };
  const archived = { ...lifecycle(), state: "archived" as const };
  for (const aggregate of [completed, archived]) {
    const error = expectLifecycleError(
      () => transitionLifecycle(aggregate, { toState: "sourcing" }),
    );
    assertEquals(error.lifecycleCode, "INVALID_TRANSITION");
  }
  assertEquals([completed.state, archived.state], ["completed", "archived"]);
});

function expectLifecycleError(action: () => unknown): DealLifecycleError {
  try {
    action();
  } catch (error) {
    if (error instanceof DealLifecycleError) return error;
    throw error;
  }
  throw new Error("Expected a DealLifecycleError, but the action completed.");
}
