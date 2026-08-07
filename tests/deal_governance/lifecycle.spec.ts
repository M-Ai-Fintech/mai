import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { DealGovernanceError } from "../../src/deal_governance/errors.ts";
import {
  commandContext,
  idempotency,
  testClock,
  testComposition,
} from "./helpers.ts";

Deno.test("Deal Governance lifecycle previews are version-bound and start retention at archive", async () => {
  const clock = testClock();
  const composition = testComposition(clock);
  const context = commandContext(clock);
  const createCommand = {
    type: "create_governance",
    context,
    idempotencyKey: idempotency("create-lifecycle"),
  } as const;
  const created = await composition.service.createGovernance(createCommand);
  clock.set("2026-08-07T12:05:00.000Z");
  const replay = await composition.service.createGovernance({
    ...createCommand,
    context: commandContext(clock),
  });
  assertEquals(replay.id, created.id);
  assertEquals(replay.version, created.version);
  clock.set("2026-08-07T12:00:00.000Z");
  const assigned = await composition.service.assignRetention({
    type: "assign_retention",
    context,
    idempotencyKey: idempotency("retention-lifecycle"),
    expectedVersion: created.version,
    policySource: "records-policy",
    policyVersion: "2026.1",
    retainedCategories: ["documents", "audit"],
    retentionStartEvent: "archive",
    retentionUntil: "2026-08-10T00:00:00.000Z",
    disposition: "retain_complete_record",
  });
  assertEquals(assigned.retentionStartAt, undefined);
  const current = await composition.service.read(context);
  assertEquals(current.governance.version, 2);
  assertEquals(current.governance.retentionAssignmentId, assigned.id);

  const pausePreview = await composition.service.previewTransition(
    context,
    "pause",
  );
  assertEquals(pausePreview.outcome, "allowed");
  const paused = await composition.service.transitionGovernance({
    type: "transition_governance",
    context,
    idempotencyKey: idempotency("pause-lifecycle"),
    action: "pause",
    expectedVersion: current.governance.version,
    preview: pausePreview,
  });
  const archivePreview = await composition.service.previewTransition(
    context,
    "archive",
  );
  const archived = await composition.service.transitionGovernance({
    type: "transition_governance",
    context,
    idempotencyKey: idempotency("archive-lifecycle"),
    action: "archive",
    expectedVersion: paused.version,
    preview: archivePreview,
  });
  assertEquals(archived.state, "archived");
  const archivedRead = await composition.service.read(context);
  assertEquals(archivedRead.retention?.retentionStartAt, clock.now());

  await assertRejects(
    () =>
      composition.service.transitionGovernance({
        type: "transition_governance",
        context,
        idempotencyKey: idempotency("wrong-preview-action"),
        action: "restore",
        expectedVersion: archived.version,
        preview: archivePreview,
      }),
    DealGovernanceError,
    "expected action",
  );
});

Deno.test("active legal holds dominate termination and require separate human release", async () => {
  const clock = testClock();
  const composition = testComposition(clock);
  const context = commandContext(clock);
  const created = await composition.service.createGovernance({
    type: "create_governance",
    context,
    idempotencyKey: idempotency("create-hold"),
  });
  const hold = await composition.service.placeLegalHold({
    type: "place_legal_hold",
    context,
    idempotencyKey: idempotency("place-hold"),
    categories: ["documents"],
    reason: "Pending regulatory inquiry",
  });
  const blockedPreview = await composition.service.previewTransition(
    context,
    "terminate",
  );
  assertEquals(blockedPreview.outcome, "blocked");
  assertEquals(blockedPreview.blockers[0]?.code, "ACTIVE_LEGAL_HOLD");
  await assertRejects(
    () =>
      composition.service.transitionGovernance({
        type: "transition_governance",
        context,
        idempotencyKey: idempotency("blocked-termination"),
        action: "terminate",
        expectedVersion: created.version + 1,
        preview: blockedPreview,
      }),
    DealGovernanceError,
    "active legal hold",
  );

  const released = await composition.service.releaseLegalHold({
    type: "release_legal_hold",
    context: commandContext(clock, "actor_legal-reviewer"),
    idempotencyKey: idempotency("release-hold"),
    holdId: hold.id,
    expectedVersion: hold.version,
  });
  assertEquals(released.state, "released");
  const allowed = await composition.service.previewTransition(
    context,
    "terminate",
  );
  assertEquals(allowed.outcome, "allowed");
  const terminated = await composition.service.transitionGovernance({
    type: "transition_governance",
    context,
    idempotencyKey: idempotency("terminate-after-release"),
    action: "terminate",
    expectedVersion: created.version + 2,
    preview: allowed,
  });
  assertEquals(terminated.state, "terminated");
  assertStringIncludes(
    composition.repository.events.map((event) => event.eventType).join(","),
    "LegalHoldReleased",
  );
  assert(terminated.activeLegalHoldIds.length === 0);
});

Deno.test("failed governance transactions roll back aggregates and evidence", async () => {
  const clock = testClock();
  const composition = testComposition(clock);
  await assertRejects(
    () =>
      composition.repository.transaction(async (store) => {
        const aggregate = {
          aggregateType: "deal_governance" as const,
          id: "governance_rollback" as never,
          scope: {
            tenantId: "tenant_governance-test" as never,
            workspaceId: "workspace_governance-test" as never,
            dealId: "deal_governance-test" as never,
          },
          version: 1 as never,
          state: "active" as const,
          activeLegalHoldIds: [],
          createdAt: clock.now(),
          updatedAt: clock.now(),
        };
        await store.saveGovernance(aggregate);
        await store.appendEvent({
          eventId: "event_rollback",
          scope: aggregate.scope,
          actorId: "actor_requester" as never,
          actorKind: "human",
          correlationId: "cor_rollback",
          aggregateVersion: 1 as never,
          eventType: "RollbackProbe",
          schemaVersion: 1,
          payload: {},
          occurredAt: clock.now(),
        });
        throw new Error("rollback probe");
      }),
    Error,
    "rollback probe",
  );
  const result = await composition.repository.transaction((store) =>
    store.findGovernance({
      tenantId: "tenant_governance-test" as never,
      workspaceId: "workspace_governance-test" as never,
      dealId: "deal_governance-test" as never,
    })
  );
  assertEquals(result, undefined);
  assertEquals(composition.repository.events.length, 0);
});
