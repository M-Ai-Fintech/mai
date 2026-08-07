import { assertEquals, assertThrows } from "@std/assert";
import {
  assertDistributionAuthorized,
  assertExportAuthorized,
} from "../../src/deliverables/authorization.ts";
import {
  DistributionReceiptService,
  type DistributionTransport,
  type ReceiptStore,
} from "../../src/deliverables/distribution.ts";
import { createDeliveryReceipt } from "../../src/deliverables/receipts.ts";
import {
  authorizeRelease,
  type DeliverableVersion,
  type ReleaseAuthorization,
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
} from "../../src/deliverables/ids.ts";
import {
  approveContent,
  createDeliverable,
  createDeliverableVersion,
  recordReleaseAuthorization,
  submitForReview,
} from "../../src/deliverables/v1.ts";

Deno.test("export authorization rejects agent authority and stale versions", () => {
  const version = approvedVersion();
  const authorization = releaseAuthorization(version, "actor_owner");
  assertThrows(
    () =>
      assertExportAuthorized(
        version,
        { ...authorization, actorKind: "agent" },
        "pdf",
        now(),
      ),
    Error,
    "human",
  );
  assertThrows(
    () =>
      assertExportAuthorized(
        { ...version, freshnessState: "stale" },
        authorization,
        "pdf",
        now(),
      ),
    Error,
    "stale",
  );
});

Deno.test("distribution authorization is version, purpose, and recipient scoped", () => {
  const version = approvedVersion();
  const authorization = releaseAuthorization(version, "actor_owner");
  assertDistributionAuthorized(
    version,
    authorization,
    "actor_reviewer",
    "committee_review",
    "pdf",
    now(),
  );
  assertThrows(
    () =>
      assertDistributionAuthorized(
        version,
        authorization,
        "actor_other",
        "committee_review",
        "pdf",
        now(),
      ),
    Error,
    "recipient",
  );
});

Deno.test("distribution receipts retry a retryable failure and preserve idempotency", async () => {
  const store = new MemoryReceiptStore();
  const transport = new RetryOnceTransport();
  const service = new DistributionReceiptService(store, transport);
  const request = {
    receiptId: "receipt_diligence-v1",
    exportId: "export_diligence-v1-pdf",
    recipientId: "actor_reviewer",
    purpose: "committee_review" as const,
    idempotencyKey: "idem_diligence-receipt",
    nextAttemptAt: now("2026-08-07T14:05:00.000Z"),
  };

  const first = await service.attempt(request);
  assertEquals(first.state, "retry_scheduled");
  assertEquals(first.attemptCount, 1);
  const second = await service.attempt(request);
  assertEquals(second.state, "sent");
  assertEquals(transport.calls, 2);
  assertEquals((await service.attempt(request)).state, "sent");
  assertEquals(transport.calls, 2);
});

class MemoryReceiptStore implements ReceiptStore {
  private receipt: ReturnType<typeof createDeliveryReceipt> | undefined;

  find(exportId: string, recipientId: string, purpose: string) {
    if (
      this.receipt?.exportId === exportId &&
      this.receipt.recipientId === recipientId &&
      this.receipt.purpose === purpose
    ) return Promise.resolve(this.receipt);
    return Promise.resolve(undefined);
  }

  insert(receipt: ReturnType<typeof createDeliveryReceipt>): Promise<void> {
    this.receipt = receipt;
    return Promise.resolve();
  }

  update(
    receipt: ReturnType<typeof createDeliveryReceipt>,
    expectedAttemptCount: number,
  ): Promise<void> {
    if (this.receipt?.attemptCount !== expectedAttemptCount) {
      throw new Error("receipt attempt fence failed");
    }
    this.receipt = receipt;
    return Promise.resolve();
  }
}

class RetryOnceTransport implements DistributionTransport {
  calls = 0;

  deliver(): Promise<void> {
    this.calls += 1;
    if (this.calls === 1) throw new Error("network unavailable");
    return Promise.resolve();
  }
}

function approvedVersion(): DeliverableVersion {
  const deliverable = createDeliverable({
    deliverableId: required("deliverable_diligence", parseDeliverableId),
    scope: {
      tenantId: required("tenant_acme", parseTenantId),
      workspaceId: required("workspace_dealroom", parseWorkspaceId),
      dealId: required("deal_horizon", parseDealId),
    },
    deliverableType: "diligence_report",
    title: "Diligence Report",
    ownerId: required("actor_owner", parseActorId),
    defaultAudienceType: "internal_committee",
    confidentiality: "internal_restricted",
    createdBy: required("actor_owner", parseActorId),
    createdAt: now(),
    updatedAt: now(),
  });
  const draft = createDeliverableVersion({
    versionId: required("delivver_diligence-v1", parseDeliverableVersionId),
    deliverable,
    versionNumber: 1,
    versionLabel: "v1",
    sourceSnapshot: {
      snapshotId: "snapshot_diligence-v1" as never,
      scope: deliverable.scope,
      sourceCutoffAt: now(),
      references: [{
        sourceObjectType: "DocumentVersion",
        sourceObjectId: "docver_contract-v3",
        sourceObjectVersion: 3,
        documentVersionId: "docver_contract-v3",
        accessLevel: "internal_restricted",
      }],
      createdBy: deliverable.createdBy,
      createdAt: now(),
    },
    content: { summary: "Approved" },
    classifications: { summary: "public" },
    createdBy: deliverable.createdBy,
    createdAt: now(),
  });
  const approved = approveContent(submitForReview(draft, deliverable.ownerId), {
    approvalId: "approval_diligence-v1",
    actorId: deliverable.ownerId,
    actorKind: "human",
    decision: "approved",
    decidedAt: now(),
  }).version;
  return recordReleaseAuthorization(
    approved,
    releaseAuthorization(approved, "actor_owner"),
  );
}

function releaseAuthorization(
  version: DeliverableVersion,
  actor: string,
): ReleaseAuthorization {
  return authorizeRelease(version, {
    authorizationId: "release_diligence-v1",
    actorId: required(actor, parseActorId),
    actorKind: "human",
    audience: {
      audienceType: "internal_committee",
      purpose: "committee_review",
      recipientIds: ["actor_reviewer"],
    },
    approvedFormats: ["pdf"],
    confidentiality: "internal_restricted",
    authorizedAt: now("2026-08-07T12:00:00.000Z"),
  });
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

function now(value = "2026-08-07T14:00:00.000Z"): Date {
  return new Date(value);
}
