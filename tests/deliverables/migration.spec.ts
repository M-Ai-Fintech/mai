import { assertEquals, assertMatch, assertThrows } from "@std/assert";
import { assertExportAuthorized } from "../../src/deliverables/authorization.ts";
import {
  approveContent,
  authorizeRelease,
  createDeliverable,
  createDeliverableVersion,
  createDeliveryReceipt,
  createManifest,
  createSourceSnapshot,
  markSourceStale,
  PostgresDeliverablesRepository,
  submitForReview,
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
import { deliverablesMigrations } from "../../src/deliverables/migrations/index.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test("deliverables migration is additive, owned, and retention-safe", () => {
  assertEquals(deliverablesMigrations.length, 1);
  const [migration] = deliverablesMigrations;
  assertEquals(migration.owner, "deliverables");
  assertEquals(migration.schema, "deliverables");
  assertEquals(migration.id, "deliverables-0001");
  assertMatch(migration.forwardNotes, /additive/i);
  assertMatch(migration.rollbackNotes, /retain/i);
  for (const statement of migration.statements) {
    assertEquals(statement.schema, "deliverables");
    assertEquals(/\bplatform\./i.test(statement.sql), false);
    assertEquals(/\bdocuments\./i.test(statement.sql), false);
    assertEquals(/\baudit_activity\./i.test(statement.sql), false);
  }
});

Deno.test({
  name:
    "deliverables migration creates immutable source, release, manifest, and receipt tables",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    try {
      await resetDeliverablesSchema(pool);
      await new PostgresMigrationRunner(pool).apply([
        ...platformMigrations,
        ...deliverablesMigrations,
      ]);
      await assertDeliverablesSchema(pool);
      await assertRepositoryRoundTrip(pool);
    } finally {
      await pool.query("DROP SCHEMA IF EXISTS deliverables CASCADE");
      await pool.query(
        "DELETE FROM platform.migration_ledger WHERE context_owner = $1",
        ["deliverables"],
      ).catch(() => {});
      await pool.end();
    }
  },
});

type IntegrationPool = ReturnType<typeof createPostgresIntegrationTestPool>;

async function resetDeliverablesSchema(pool: IntegrationPool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS deliverables CASCADE");
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner = $1",
    ["deliverables"],
  ).catch(() => {});
}

async function assertDeliverablesSchema(pool: IntegrationPool): Promise<void> {
  const tables = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'deliverables' ORDER BY table_name`,
  );
  assertEquals(tables.rows.map(({ table_name }) => table_name), [
    "approvals",
    "deliverable_versions",
    "deliverables",
    "distribution_receipts",
    "export_manifests",
    "exports",
    "redaction_overlays",
    "release_authorizations",
    "source_snapshots",
    "stale_marks",
  ]);
  const triggers = await pool.query<{ trigger_name: string }>(
    `SELECT DISTINCT trigger_name FROM information_schema.triggers
     WHERE event_object_schema = 'deliverables' ORDER BY trigger_name`,
  );
  assertEquals(triggers.rows.length, 9);
}

async function assertRepositoryRoundTrip(pool: IntegrationPool): Promise<void> {
  const repository = new PostgresDeliverablesRepository();
  const transactionRunner = new PostgresTransactionRunner(pool);
  const deliverable = fixtureDeliverable();
  const snapshot = fixtureSnapshot(deliverable.scope);
  const draft = createDeliverableVersion({
    versionId: required("delivver_postgres-v1", parseDeliverableVersionId),
    deliverable,
    versionNumber: 1,
    versionLabel: "v1",
    sourceSnapshot: snapshot,
    content: { summary: "Stored exact version" },
    classifications: { summary: "public" },
    createdBy: deliverable.createdBy,
    createdAt: fixtureDate("2026-08-07T10:00:00.000Z"),
  });
  const approved = approveContent(submitForReview(draft, deliverable.ownerId), {
    approvalId: "approval_postgres-v1",
    actorId: deliverable.ownerId,
    actorKind: "human",
    decision: "approved",
    decidedAt: fixtureDate("2026-08-07T11:00:00.000Z"),
  });
  const authorization = authorizeRelease(approved.version, {
    authorizationId: "release_postgres-v1",
    actorId: deliverable.ownerId,
    actorKind: "human",
    audience: {
      audienceType: "internal_committee",
      purpose: "committee_review",
      recipientIds: ["actor_reviewer"],
    },
    approvedFormats: ["pdf"],
    confidentiality: "internal_restricted",
    authorizedAt: fixtureDate("2026-08-07T12:00:00.000Z"),
  });
  const manifest = await createManifest({
    manifestId: required("manifest_postgres-v1", parseManifestId),
    exportId: "export_postgres-v1-pdf",
    versionId: approved.version.versionId,
    sourceSnapshotId: snapshot.snapshotId,
    artifactReference: "object://deliverables/postgres-v1.pdf",
    artifactChecksum: "a".repeat(64),
    audience: authorization.audience,
    redactedFields: [],
    createdAt: fixtureDate("2026-08-07T13:00:00.000Z"),
  });
  const receipt = createDeliveryReceipt({
    receiptId: "receipt_postgres-v1",
    exportId: manifest.exportId,
    recipientId: "actor_reviewer",
    purpose: "committee_review",
    idempotencyKey: "idem_postgres-v1",
    nextAttemptAt: fixtureDate("2026-08-07T13:05:00.000Z"),
  });
  await transactionRunner.run(async (transaction) => {
    await repository.insertDeliverable(transaction, deliverable);
    await repository.insertSourceSnapshot(transaction, snapshot);
    await repository.insertVersion(transaction, approved.version);
    await repository.appendStaleMark(
      transaction,
      markSourceStale(approved.version, {
        staleMarkId: "stale_postgres-v1-source",
        actorId: deliverable.ownerId,
        reason: "source_version_superseded",
        changedSourceIds: ["docver_postgres-v4"],
        markedAt: fixtureDate("2026-08-07T12:30:00.000Z"),
      }),
      deliverable.scope,
    );
    await repository.appendApproval(
      transaction,
      approved.approval,
      deliverable.scope,
    );
    await repository.appendReleaseAuthorization(
      transaction,
      authorization,
      deliverable.scope,
    );
    await repository.insertExport(transaction, {
      exportId: manifest.exportId,
      versionId: approved.version.versionId,
      scope: deliverable.scope,
      releaseAuthorizationId: authorization.authorizationId,
      format: "pdf",
      filename: "postgres-v1.pdf",
      createdAt: manifest.createdAt,
    });
    await repository.insertManifest(transaction, manifest, deliverable.scope);
    await repository.insertReceipt(
      transaction,
      receipt,
      deliverable.scope,
      manifest.createdAt,
    );
  });
  const loaded = await transactionRunner.run((transaction) =>
    repository.findVersion(
      transaction,
      deliverable.scope,
      approved.version.versionId,
    )
  );
  assertEquals(loaded?.versionId, approved.version.versionId);
  assertEquals(
    loaded?.sourceSnapshot.references[0].documentVersionId,
    "docver_postgres-v3",
  );
  assertEquals(loaded?.reviewSubmittedBy, deliverable.ownerId);
  assertEquals(loaded?.freshnessState, "stale");
  assertThrows(
    () =>
      assertExportAuthorized(
        loaded!,
        authorization,
        "pdf",
        fixtureDate("2026-08-07T13:00:00.000Z"),
      ),
    Error,
    "stale",
  );
  const loadedAuthorization = await transactionRunner.run((transaction) =>
    repository.findReleaseAuthorization(
      transaction,
      deliverable.scope,
      approved.version.versionId,
      authorization.authorizationId,
    )
  );
  assertEquals(loadedAuthorization?.audience.recipientIds, ["actor_reviewer"]);
}

function fixtureDeliverable() {
  const scope = fixtureScope();
  return createDeliverable({
    deliverableId: required("deliverable_postgres", parseDeliverableId),
    scope,
    deliverableType: "diligence_report",
    title: "PostgreSQL Diligence Report",
    ownerId: required("actor_owner", parseActorId),
    defaultAudienceType: "internal_committee",
    confidentiality: "internal_restricted",
    createdBy: required("actor_owner", parseActorId),
    createdAt: fixtureDate("2026-08-07T09:00:00.000Z"),
    updatedAt: fixtureDate("2026-08-07T09:00:00.000Z"),
  });
}

function fixtureSnapshot(scope: ReturnType<typeof fixtureScope>) {
  return createSourceSnapshot({
    snapshotId: required("snapshot_postgres-v1", parseSourceSnapshotId),
    scope,
    sourceCutoffAt: fixtureDate("2026-08-07T08:00:00.000Z"),
    references: [{
      sourceObjectType: "DocumentVersion",
      sourceObjectId: "docver_postgres-v3",
      sourceObjectVersion: 3,
      documentVersionId: "docver_postgres-v3",
      checksum: "b".repeat(64),
      accessLevel: "internal_restricted",
    }],
    createdBy: required("actor_owner", parseActorId),
    createdAt: fixtureDate("2026-08-07T08:00:00.000Z"),
  });
}

function fixtureScope() {
  return {
    tenantId: required("tenant_postgres", parseTenantId),
    workspaceId: required("workspace_postgres", parseWorkspaceId),
    dealId: required("deal_postgres", parseDealId),
  };
}

function fixtureDate(value: string): Date {
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
