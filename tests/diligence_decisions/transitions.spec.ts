import { assertEquals, assertRejects } from "@std/assert";
import {
  applyDecisionHistory,
  createDecisionHistoryEntry,
  createDecisionProjection,
  createDecisionRecord,
  createExactEvidenceBasis,
  DiligenceDecisionError,
  parseActor,
  parseDealId,
  parseDecisionHistoryId,
  parseDecisionRecordId,
  parseDecisionRequestId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/diligence_decisions/v1.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import { parseAggregateVersion } from "../../src/platform/api/v1.ts";

Deno.test("stale invalidation cannot change a newer decision projection", async () => {
  const projection = createDecisionProjection({
    requestId: required("decision_request_tax", parseDecisionRequestId),
    currentRecordId: required("decision_record_tax", parseDecisionRecordId),
    state: "active",
    version: aggregateVersion(2),
    updatedAt: now(),
  });
  const entry = createDecisionHistoryEntry({
    id: required("decision_history_stale", parseDecisionHistoryId),
    requestId: projection.requestId,
    recordId: projection.currentRecordId,
    kind: "invalidated",
    scope: scope(),
    actor: humanActor("actor_approver"),
    authority: authority("actor_approver"),
    basisDigest: "b".repeat(64),
    expectedProjectionVersion: aggregateVersion(1),
    reason: "The exact source was invalidated.",
    createdAt: now(),
  });

  const error = await assertRejects(
    () =>
      Promise.resolve().then(() =>
        applyDecisionHistory(projection, entry, now())
      ),
    Error,
  );
  assertEquals((error as DiligenceDecisionError).code, "STALE_INVALIDATION");
});

Deno.test("supersession changes only the projection and appends a new history entry", () => {
  const oldRecord = createDecisionRecord({
    id: required("decision_record_old", parseDecisionRecordId),
    requestId: required("decision_request_tax", parseDecisionRequestId),
    scope: scope(),
    outcome: "approved",
    actor: humanActor("actor_approver"),
    requestVersion: aggregateVersion(2),
    basis: exactBasis(),
    authority: authority("actor_approver"),
    recordedAt: now(),
  });
  const projection = createDecisionProjection({
    requestId: oldRecord.requestId,
    currentRecordId: oldRecord.id,
    state: "active",
    version: aggregateVersion(1),
    updatedAt: now(),
  });
  const entry = createDecisionHistoryEntry({
    id: required("decision_history_replace", parseDecisionHistoryId),
    requestId: oldRecord.requestId,
    recordId: oldRecord.id,
    replacementRecordId: required("decision_record_new", parseDecisionRecordId),
    kind: "superseded",
    scope: scope(),
    actor: humanActor("actor_approver"),
    authority: authority("actor_approver"),
    basisDigest: "b".repeat(64),
    expectedProjectionVersion: aggregateVersion(1),
    reason: "A newer reviewed basis supersedes the prior disposition.",
    createdAt: now(),
  });

  const next = applyDecisionHistory(projection, entry, now());
  assertEquals(next.state, "superseded");
  assertEquals(next.currentRecordId, "decision_record_new");
  assertEquals(oldRecord.outcome, "approved");
});

function exactBasis() {
  return createExactEvidenceBasis({
    scope: scope(),
    references: [{
      kind: "fact_version",
      factVersionId: "factver_tax-v1" as never,
    }],
    basisDigest: "b".repeat(64),
    capturedAt: now(),
  });
}

function scope() {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}

function now(): Date {
  return new Date("2026-08-07T12:00:00.000Z");
}

function humanActor(id: string): ActorReference {
  const actorResult = parseActor(id);
  if (!actorResult.ok) throw new Error(`Fixture actor "${id}" is invalid.`);
  return { id: actorResult.value, kind: "human", state: "active" };
}

function authority(id: string) {
  return {
    snapshotId: "authority_approver",
    actorId: required(id, parseActor),
    policyVersion: "policy-v1",
    scope: scope(),
    capturedAt: now(),
  };
}

function aggregateVersion(value: number) {
  const result = parseAggregateVersion(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture version "${value}" is invalid.`);
}

function required<T>(
  value: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
