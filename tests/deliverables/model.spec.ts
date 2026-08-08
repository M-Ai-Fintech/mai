import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import {
  approveContent,
  authorizeRelease,
  type ContentClassification,
  createDeliverable,
  createDeliverableVersion,
  createManifest,
  createSourceSnapshot,
  type DeliverableVersion,
  isVersionStale,
  markReleased,
  markSourceStale,
  recordReleaseAuthorization,
  redactContentForRecipient,
  type RedactionPolicy,
  scopeContainsRecipient,
  type SourceSnapshot,
  submitForReview,
  transitionReceipt,
} from "../../src/deliverables/v1.ts";
import {
  parseActorId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import {
  parseDeliverableId,
  parseDeliverableVersionId,
  parseManifestId,
  parseSourceSnapshotId,
} from "../../src/deliverables/ids.ts";

Deno.test("deliverables use semantic identifiers and reject issue-shaped resources", () => {
  assert(parseDeliverableId("deliverable_diligence").ok);
  assert(parseDeliverableVersionId("delivver_diligence-v1").ok);
  assert(parseManifestId("manifest_diligence-v1").ok);
  assertFalse(parseDeliverableId("legacy-task-id").ok);
});

Deno.test("source snapshots freeze exact document versions and checksums", () => {
  const snapshot = sourceSnapshot();
  assertEquals(snapshot.references[0].documentVersionId, "docver_contract-v3");
  assertEquals(snapshot.references[0].checksum, "a".repeat(64));
  assert(Object.isFrozen(snapshot));
  assert(Object.isFrozen(snapshot.references));
});

Deno.test("generated versions stay drafts until human content approval and release", () => {
  const draft = deliverableVersion();
  const review = submitForReview(draft, actor("actor_reviewer"));
  const approved = approveContent(review, {
    approvalId: "approval_diligence-v1",
    actorId: actor("actor_reviewer"),
    actorKind: "human",
    decidedAt: now("2026-08-07T12:00:00.000Z"),
    decision: "approved",
  });

  assertThrows(
    () => authorizeRelease(review, releaseRequest()),
    Error,
    "content approval",
  );
  const authorization = authorizeRelease(approved.version, releaseRequest());
  assertEquals(authorization.versionId, approved.version.versionId);
  assertEquals(authorization.audience.audienceType, "internal_committee");
  assertEquals(approved.version.contentApprovalState, "approved");
  const authorized = recordReleaseAuthorization(
    approved.version,
    authorization,
  );
  assertEquals(authorized.releaseState, "authorized");
  assertEquals(markReleased(authorized).releaseState, "released");
});

Deno.test("source changes append stale marks without rewriting released history", () => {
  const version = deliverableVersion();
  const mark = markSourceStale(version, {
    staleMarkId: "stale_diligence-v1-source",
    actorId: actor("actor_system"),
    reason: "document_version_superseded",
    changedSourceIds: ["docver_contract-v4"],
    markedAt: now("2026-08-07T13:00:00.000Z"),
  });

  assertEquals(version.freshnessState, "current");
  assert(isVersionStale(version, [mark]));
  assertEquals(mark.versionId, version.versionId);
});

Deno.test("redaction removes restricted fields and never returns them to an unauthorized recipient", async () => {
  const content = {
    summary: "Approved summary",
    bankAccount: "restricted-value",
  };
  const classifications: ContentClassification = {
    summary: "public",
    bankAccount: "restricted",
  };
  const policy: RedactionPolicy = {
    policyId: "redaction_client",
    audienceType: "client",
    purpose: "client_review",
    rules: [{
      fieldPath: "bankAccount",
      reason: "restricted_source",
    }],
  };
  const sanitized = await redactContentForRecipient(
    content,
    classifications,
    policy,
    { audienceType: "client", purpose: "client_review" },
  );

  assertEquals(sanitized.content.summary, "Approved summary");
  assertFalse(Object.hasOwn(sanitized.content, "bankAccount"));
  assertEquals(sanitized.overlay.fields, ["bankAccount"]);
  assertThrows(
    () =>
      redactContentForRecipient(
        content,
        classifications,
        { ...policy, rules: [] },
        { audienceType: "client", purpose: "client_review" },
      ),
    Error,
    "restricted field",
  );
});

Deno.test("recipient scope is explicit for purpose and recipient identity", () => {
  const scope = {
    audienceType: "internal_committee" as const,
    purpose: "committee_review" as const,
    recipientIds: ["actor_reviewer"],
  };
  assert(scopeContainsRecipient(scope, "actor_reviewer", "committee_review"));
  assertFalse(scopeContainsRecipient(scope, "actor_other", "committee_review"));
  assertFalse(scopeContainsRecipient(scope, "actor_reviewer", "client_review"));
});

Deno.test("manifests are immutable and receipts preserve retry history", async () => {
  const manifest = await createManifest({
    manifestId: required("manifest_diligence-v1", parseManifestId),
    exportId: "export_diligence-v1-pdf",
    versionId: required("delivver_diligence-v1", parseDeliverableVersionId),
    sourceSnapshotId: sourceSnapshot().snapshotId,
    artifactReference: "object://deliverables/diligence-v1.pdf",
    artifactChecksum: "b".repeat(64),
    audience: {
      audienceType: "internal_committee",
      purpose: "committee_review",
    },
    redactedFields: ["bankAccount"],
    createdAt: now("2026-08-07T14:00:00.000Z"),
  });
  assert(Object.isFrozen(manifest));
  assertEquals(manifest.redactedFields, ["bankAccount"]);
  const retry = transitionReceipt({
    receiptId: "receipt_diligence-v1",
    exportId: "export_diligence-v1-pdf",
    recipientId: "actor_reviewer",
    purpose: "committee_review",
    idempotencyKey: "idem_diligence-receipt",
    state: "pending",
    attemptCount: 0,
  }, { state: "retry_scheduled", failureCode: "PROVIDER_UNAVAILABLE" });
  assertEquals(retry.attemptCount, 1);
  assertEquals(retry.failureCode, "PROVIDER_UNAVAILABLE");
});

function deliverableVersion(): DeliverableVersion {
  const deliverable = createDeliverable({
    deliverableId: required("deliverable_diligence", parseDeliverableId),
    scope: scope(),
    deliverableType: "diligence_report",
    title: "Diligence Report",
    ownerId: actor("actor_owner"),
    defaultAudienceType: "internal_committee",
    confidentiality: "internal_restricted",
    createdBy: actor("actor_owner"),
    createdAt: now("2026-08-07T10:00:00.000Z"),
    updatedAt: now("2026-08-07T10:00:00.000Z"),
  });
  return createDeliverableVersion({
    versionId: required("delivver_diligence-v1", parseDeliverableVersionId),
    deliverable,
    versionNumber: 1,
    versionLabel: "v1",
    sourceSnapshot: sourceSnapshot(),
    content: { summary: "Approved summary", bankAccount: "restricted-value" },
    classifications: { summary: "public", bankAccount: "restricted" },
    createdBy: actor("actor_owner"),
    createdAt: now("2026-08-07T10:05:00.000Z"),
  });
}

function sourceSnapshot(): SourceSnapshot {
  return createSourceSnapshot({
    snapshotId: required("snapshot_diligence-v1", parseSourceSnapshotId),
    scope: scope(),
    sourceCutoffAt: now("2026-08-07T10:00:00.000Z"),
    references: [{
      sourceObjectType: "DocumentVersion",
      sourceObjectId: "docver_contract-v3",
      sourceObjectVersion: 3,
      documentId: "doc_contract",
      documentVersionId: "docver_contract-v3",
      checksum: "a".repeat(64),
      accessLevel: "internal_restricted",
    }],
    createdBy: actor("actor_owner"),
    createdAt: now("2026-08-07T10:00:00.000Z"),
  });
}

function releaseRequest() {
  return {
    authorizationId: "release_diligence-v1",
    actorId: actor("actor_owner"),
    actorKind: "human" as const,
    audience: {
      audienceType: "internal_committee" as const,
      purpose: "committee_review" as const,
      recipientIds: ["actor_reviewer"],
    },
    approvedFormats: ["pdf" as const],
    confidentiality: "internal_restricted" as const,
    authorizedAt: now("2026-08-07T12:05:00.000Z"),
  };
}

function scope() {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}

function actor(value: string) {
  return required(value, parseActorId);
}

function now(value: string): Date {
  return new Date(value);
}

function required<T>(
  value: string,
  parser: (candidate: unknown) =>
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
