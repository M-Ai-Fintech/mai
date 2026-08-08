import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { DealGovernanceError } from "../../src/deal_governance/errors.ts";
import {
  commandContext,
  idempotency,
  testClock,
  testComposition,
} from "./helpers.ts";

Deno.test("mandatory retention blocks archive even when a prior preview was allowed", async () => {
  const clock = testClock();
  const prepared = await terminatedWithRetention(clock, false);
  const preview = await prepared.composition.service.previewTransition(
    prepared.context,
    "archive",
  );
  assertEquals(preview.outcome, "allowed");
  await prepared.composition.service.assignRetention({
    type: "assign_retention",
    context: prepared.context,
    idempotencyKey: idempotency("make-retention-mandatory"),
    expectedVersion: prepared.terminated.version,
    policySource: "records-policy",
    policyVersion: "2026.2",
    retainedCategories: ["documents"],
    retentionStartEvent: "termination",
    retentionUntil: "2026-08-10T00:00:00.000Z",
    disposition: "retain_complete_record",
    mandatory: true,
  });
  await assertRejects(
    () =>
      prepared.composition.service.transitionGovernance({
        type: "transition_governance",
        context: prepared.context,
        idempotencyKey: idempotency("archive-after-retention-change"),
        action: "archive",
        expectedVersion: prepared.terminated.version,
        previewId: preview.previewId,
      }),
    DealGovernanceError,
    "Retention remains active",
  );
});

Deno.test("expired persisted previews are rejected at transition time", async () => {
  const clock = testClock();
  const prepared = await terminatedWithRetention(clock, false);
  const preview = await prepared.composition.service.previewTransition(
    prepared.context,
    "archive",
  );
  clock.set("2026-08-08T12:01:00.000Z");
  await assertRejects(
    () =>
      prepared.composition.service.transitionGovernance({
        type: "transition_governance",
        context: commandContext(clock),
        idempotencyKey: idempotency("expired-archive-preview"),
        action: "archive",
        expectedVersion: prepared.terminated.version,
        previewId: preview.previewId,
      }),
    DealGovernanceError,
    "expired",
  );
});

Deno.test("preview IDs cannot cross governance scopes", async () => {
  const clock = testClock();
  const first = testComposition(clock);
  const firstContext = commandContext(clock);
  const firstCreated = await first.service.createGovernance({
    type: "create_governance",
    context: firstContext,
    idempotencyKey: idempotency("scope-first-create"),
  });
  const otherContext = {
    ...firstContext,
    request: {
      ...firstContext.request,
      dealId: "deal_governance-other" as typeof firstContext.request.dealId,
      correlationId:
        "cor_scope-other" as typeof firstContext.request.correlationId,
    },
  };
  await first.service.createGovernance({
    type: "create_governance",
    context: otherContext,
    idempotencyKey: idempotency("scope-other-create"),
  });
  const otherPreview = await first.service.previewTransition(
    otherContext,
    "pause",
  );
  await assertRejects(
    () =>
      first.service.transitionGovernance({
        type: "transition_governance",
        context: firstContext,
        idempotencyKey: idempotency("scope-crossing-preview"),
        action: "pause",
        expectedVersion: firstCreated.version,
        previewId: otherPreview.previewId,
      }),
    DealGovernanceError,
    "current governance scope",
  );
});

Deno.test("aggregate version and action remain bound to the persisted preview", async () => {
  const clock = testClock();
  const prepared = await terminatedWithRetention(clock, false);
  const archivePreview = await prepared.composition.service.previewTransition(
    prepared.context,
    "archive",
  );
  const hold = await prepared.composition.service.placeLegalHold({
    type: "place_legal_hold",
    context: prepared.context,
    idempotencyKey: idempotency("preview-race-hold"),
    categories: ["documents"],
    reason: "Preview race test",
  });
  await assertRejects(
    () =>
      prepared.composition.service.transitionGovernance({
        type: "transition_governance",
        context: prepared.context,
        idempotencyKey: idempotency("stale-preview-after-hold"),
        action: "archive",
        expectedVersion: prepared.terminated.version + 1,
        previewId: archivePreview.previewId,
      }),
    DealGovernanceError,
    "targets version",
  );
  assertEquals(hold.state, "active");
});

Deno.test("a current server-issued preview still transitions successfully", async () => {
  const clock = testClock();
  const prepared = await terminatedWithRetention(clock, false);
  const preview = await prepared.composition.service.previewTransition(
    prepared.context,
    "archive",
  );
  const archived = await prepared.composition.service.transitionGovernance({
    type: "transition_governance",
    context: prepared.context,
    idempotencyKey: idempotency("current-archive-preview"),
    action: "archive",
    expectedVersion: prepared.terminated.version,
    previewId: preview.previewId,
  });
  assertEquals(archived.state, "archived");
});

async function terminatedWithRetention(
  clock: ReturnType<typeof testClock>,
  mandatory: boolean,
) {
  const composition = testComposition(clock);
  const context = commandContext(clock);
  const created = await composition.service.createGovernance({
    type: "create_governance",
    context,
    idempotencyKey: idempotency(`create-terminated-${mandatory}`),
  });
  const assigned = await composition.service.assignRetention({
    type: "assign_retention",
    context,
    idempotencyKey: idempotency(`assign-terminated-${mandatory}`),
    expectedVersion: created.version,
    policySource: "records-policy",
    policyVersion: "2026.1",
    retainedCategories: ["documents"],
    retentionStartEvent: "termination",
    retentionUntil: "2026-08-10T00:00:00.000Z",
    disposition: "retain_complete_record",
    mandatory,
  });
  const terminatePreview = await composition.service.previewTransition(
    context,
    "terminate",
  );
  const terminated = await composition.service.transitionGovernance({
    type: "transition_governance",
    context,
    idempotencyKey: idempotency(`terminate-${mandatory}`),
    action: "terminate",
    expectedVersion: created.version + 1,
    previewId: terminatePreview.previewId,
  });
  assertStringIncludes(assigned.id, "retention_");
  return { composition, context, terminated };
}
