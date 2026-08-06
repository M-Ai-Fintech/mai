import { assertEquals, assertRejects } from "@std/assert";
import {
  createDocument,
  createObjectReference,
} from "../../src/documents/model.ts";
import {
  createDocumentSource,
  createProviderMarker,
} from "../../src/documents/source.ts";
import { createDocumentVersion } from "../../src/documents/version.ts";
import {
  parseConnectorAccountId,
  parseDocumentId,
  parseDocumentSourceId,
  parseDocumentVersionId,
  parseObjectReferenceId,
} from "../../src/documents/ids.ts";
import { documentsMigrations } from "../../src/documents/migrations/index.ts";
import { DocumentsRepository } from "../../src/documents/repository.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import { VersionConflictError } from "../../src/platform/persistence/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name:
    "documents repository appends immutable versions and protects scope reads",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await resetDocumentsSchema(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...documentsMigrations,
    ]);
    const transactions = new PostgresTransactionRunner(pool);
    const repository = new DocumentsRepository();
    const scope = fixtureScope();
    const document = fixtureDocument(scope);
    const source = fixtureSource(scope);
    const objectReference = fixtureObject(scope);
    const version = fixtureVersion(scope, source, objectReference);

    await transactions.run(async (transaction) => {
      await repository.insertDocument(transaction, document);
      await repository.insertSource(transaction, source);
      await repository.insertObjectReference(transaction, objectReference);
      await repository.appendVersion(transaction, version);
    });

    const loaded = await transactions.run((transaction) =>
      repository.findDocument(transaction, scope, document.documentId)
    );
    assertEquals(loaded?.currentVersionId, version.documentVersionId);
    assertEquals(loaded?.aggregateVersion, 2);

    const hidden = await transactions.run((transaction) =>
      repository.findDocument(transaction, {
        ...scope,
        dealId: requiredId("deal_other", parseDealId),
      }, document.documentId)
    );
    assertEquals(hidden, undefined);

    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.appendVersion(transaction, version)
        ),
      Error,
      "duplicate",
    );
    await resetDocumentsSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name: "documents source cursor uses an optimistic version fence",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...documentsMigrations,
    ]);
    const transactions = new PostgresTransactionRunner(pool);
    const repository = new DocumentsRepository();
    const source = fixtureSource(fixtureScope());
    await transactions.run((transaction) =>
      repository.insertSource(transaction, source)
    );

    const updated = await transactions.run((transaction) =>
      repository.updateSourceCursor(
        transaction,
        source.scope,
        source.sourceId,
        1,
        "cursor-2",
        "provider-v2",
        timestamp("2026-08-03T12:01:00.000Z"),
      )
    );
    assertEquals(updated.aggregateVersion, 2);
    assertEquals(updated.cursor, "cursor-2");
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.updateSourceCursor(
            transaction,
            source.scope,
            source.sourceId,
            1,
            "cursor-stale",
            "provider-v3",
            timestamp("2026-08-03T12:02:00.000Z"),
          )
        ),
      VersionConflictError,
      "VERSION_CONFLICT",
    );
    await resetDocumentsSchema(pool);
    await pool.end();
  },
});

function fixtureScope() {
  return {
    tenantId: requiredId("tenant_acme", parseTenantId),
    workspaceId: requiredId("workspace_dealroom", parseWorkspaceId),
    dealId: requiredId("deal_horizon", parseDealId),
  };
}

function fixtureDocument(scope: ReturnType<typeof fixtureScope>) {
  return createDocument({
    documentId: requiredId("doc_contract", parseDocumentId),
    scope,
    name: "Contract.pdf",
    mimeType: "application/pdf",
    classification: "legal",
    aggregateVersion: 1,
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
    updatedAt: timestamp("2026-08-03T12:00:00.000Z"),
  });
}

function fixtureSource(scope: ReturnType<typeof fixtureScope>) {
  const provider = createProviderMarker("fixture");
  return createDocumentSource({
    sourceId: requiredId("source_room", parseDocumentSourceId),
    scope,
    connectorAccount: {
      connectorAccountId: requiredId(
        "connector_fixture",
        parseConnectorAccountId,
      ),
      tenantId: scope.tenantId,
      provider,
    },
    provider,
    providerWorkspaceId: "room-1",
    providerDocumentId: "provider-doc-1",
    providerVersion: "v1",
    aggregateVersion: 1,
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
    updatedAt: timestamp("2026-08-03T12:00:00.000Z"),
  });
}

function fixtureObject(scope: ReturnType<typeof fixtureScope>) {
  return createObjectReference({
    objectReferenceId: requiredId("object_contract-v1", parseObjectReferenceId),
    scope,
    objectKey: "documents/doc_contract/docver_contract-v1",
    storageVersion: "storage-v1",
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    byteLength: 12,
    mediaType: "application/pdf",
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
  });
}

function fixtureVersion(
  scope: ReturnType<typeof fixtureScope>,
  source: ReturnType<typeof fixtureSource>,
  objectReference: ReturnType<typeof fixtureObject>,
) {
  return createDocumentVersion({
    documentVersionId: requiredId("docver_contract-v1", parseDocumentVersionId),
    documentId: requiredId("doc_contract", parseDocumentId),
    scope,
    versionNumber: 1,
    source,
    provider: source.provider,
    checksum: objectReference.checksum,
    classification: "legal",
    objectReference,
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
  });
}

function timestamp(value: string): Date {
  return new Date(value);
}

function requiredId<T>(
  value: string,
  parse: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parse(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}

async function resetDocumentsSchema(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS documents CASCADE");
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner = $1",
    ["documents"],
  ).catch(() => {});
}
