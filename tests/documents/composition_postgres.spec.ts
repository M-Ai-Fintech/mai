import { assertEquals } from "@std/assert";
import pg from "pg";
import { createDocumentsComposition } from "../../src/documents/composition.ts";
import { deriveDocumentIdempotencyKey } from "../../src/documents/jobs.ts";
import {
  createDocument,
  type DocumentScope,
} from "../../src/documents/model.ts";
import { parseDocumentId } from "../../src/documents/ids.ts";
import { documentsMigrations } from "../../src/documents/migrations/index.ts";
import {
  parseActorId,
  parseAggregateVersion,
  parseCorrelationId,
  parseDealId,
  parseIdempotencyKey,
  parseTenantId,
  parseWorkspaceId,
  type RequestContext,
} from "../../src/platform/api/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name:
    "document durable IDs retain actor and full tenant-workspace-deal command scope",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await resetDatabase(pool);
    const composition = createDocumentsComposition({
      pool,
      authorization: new AllowDocumentsAuthorization(),
      clock: { now: () => new Date("2026-08-04T12:00:00.000Z") },
    });
    try {
      const scope = fixtureScope(
        "tenant_acme",
        "workspace_dealroom",
        "deal_horizon",
      );
      const otherDeal = fixtureScope(
        "tenant_acme",
        "workspace_dealroom",
        "deal_other",
      );
      const otherTenant = fixtureScope(
        "tenant_other",
        "workspace_dealroom",
        "deal_horizon",
      );
      for (
        const [documentId, documentScope] of [
          ["doc_contract", scope],
          ["doc_deal", otherDeal],
          ["doc_tenant", otherTenant],
        ] as const
      ) {
        const document = createDocument({
          documentId: requiredId(documentId, parseDocumentId),
          scope: documentScope,
          name: `${documentId}.pdf`,
          mimeType: "application/pdf",
          classification: "legal",
          aggregateVersion: 1,
          createdAt: timestamp("2026-08-04T12:00:00.000Z"),
          updatedAt: timestamp("2026-08-04T12:00:00.000Z"),
        });
        await composition.transactions.run((transaction) =>
          composition.repository.insertDocument(transaction, document)
        );
      }

      const first = await process(
        composition,
        context(scope, "actor_reviewer", "cor_first"),
        "doc_contract",
        "docver_contract-v1",
        { mode: "extract" },
      );
      const replay = await process(
        composition,
        context(scope, "actor_reviewer", "cor_replay"),
        "doc_contract",
        "docver_contract-v1",
        { mode: "extract" },
      );
      assertEquals(first.status, "accepted");
      assertEquals(replay.status, "replayed");
      assertEquals(first.jobId, replay.jobId);

      const otherActor = await process(
        composition,
        context(scope, "actor_second", "cor_actor"),
        "doc_contract",
        "docver_contract-v1",
        { mode: "extract" },
      );
      const otherDealJob = await process(
        composition,
        context(otherDeal, "actor_reviewer", "cor_deal"),
        "doc_deal",
        "docver_deal-v1",
        { mode: "extract" },
      );
      const otherTenantJob = await process(
        composition,
        context(otherTenant, "actor_reviewer", "cor_tenant"),
        "doc_tenant",
        "docver_tenant-v1",
        { mode: "extract" },
      );
      assertEquals(
        new Set([
          first.jobId,
          otherActor.jobId,
          otherDealJob.jobId,
          otherTenantJob.jobId,
        ]).size,
        4,
      );

      const conflict = await process(
        composition,
        context(otherTenant, "actor_second", "cor_conflict"),
        "doc_tenant",
        "docver_tenant-v1",
        { mode: "conflict-base" },
      );
      assertEquals(conflict.status, "accepted");
      const conflictingRetry = await process(
        composition,
        context(otherTenant, "actor_second", "cor_conflict-retry"),
        "doc_tenant",
        "docver_tenant-v1",
        { mode: "conflicting-payload" },
        conflict.idempotencyKey,
      );
      assertEquals(conflictingRetry.status, "error:IDEMPOTENCY_CONFLICT");

      const jobs = await pool.query<
        { job_id: string; tenant_id: string; initiating_actor_id: string }
      >(
        `SELECT job_id, tenant_id, initiating_actor_id
         FROM platform.jobs ORDER BY job_id`,
      );
      assertEquals(jobs.rows.length, 5);
      assertEquals(new Set(jobs.rows.map(({ job_id }) => job_id)).size, 5);
      assertEquals(
        jobs.rows.filter(({ initiating_actor_id }) =>
          initiating_actor_id === "actor_reviewer"
        ).length,
        3,
      );
      assertEquals(
        new Set(jobs.rows.map(({ tenant_id }) => tenant_id)).size,
        2,
      );
    } finally {
      await composition.close();
      await resetDatabase(pool);
      await pool.end();
    }
  },
});

class AllowDocumentsAuthorization {
  authorize(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

async function process(
  composition: ReturnType<typeof createDocumentsComposition>,
  requestContext: RequestContext,
  documentId: string,
  documentVersionId: string,
  payload: Readonly<Record<string, unknown>>,
  suppliedKey?: string,
): Promise<{
  readonly status: string;
  readonly jobId: string;
  readonly idempotencyKey: string;
}> {
  const key = suppliedKey ?? await deriveDocumentIdempotencyKey({
    actorId: requestContext.actorId,
    commandType: "documents.process",
    targetType: "document",
    targetId: documentId,
  });
  const result = await composition.application.command(requestContext, {
    action: "process",
    commandType: "documents.process",
    documentId: requiredId(documentId, parseDocumentId),
    expectedVersion: requiredId(1, parseAggregateVersion),
    idempotencyKey: requiredId(key, parseIdempotencyKey),
    payload: { ...payload, documentVersionId, version: 1 },
    inputVersionReferences: [{
      aggregateType: "DocumentVersion",
      aggregateId: documentVersionId,
      version: requiredId(1, parseAggregateVersion),
      documentId,
    }],
  });
  if (result.kind === "error") {
    return {
      status: `error:${result.error.error.code}`,
      jobId: "",
      idempotencyKey: key,
    };
  }
  if (result.value.status === "in_progress") {
    return { status: "in_progress", jobId: "", idempotencyKey: key };
  }
  return {
    status: result.value.status,
    jobId: result.value.job.jobId,
    idempotencyKey: key,
  };
}

async function resetDatabase(pool: pg.Pool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS documents CASCADE");
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner = $1",
    ["documents"],
  ).catch(() => {});
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...documentsMigrations,
  ]);
  await pool.query(
    "TRUNCATE platform.job_attempts, platform.jobs, platform.outbox, platform.idempotency_records CASCADE",
  );
}

function context(
  scope: DocumentScope,
  actor: string,
  correlation: string,
): RequestContext {
  return {
    actorId: requiredId(actor, parseActorId),
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: requiredId(correlation, parseCorrelationId),
    origin: "http",
  };
}

function fixtureScope(
  tenant: string,
  workspace: string,
  deal: string,
): DocumentScope {
  return {
    tenantId: requiredId(tenant, parseTenantId),
    workspaceId: requiredId(workspace, parseWorkspaceId),
    dealId: requiredId(deal, parseDealId),
  };
}

function timestamp(value: string): Date {
  return new Date(value);
}

function requiredId<TResult>(
  value: string | number,
  parse: (
    value: unknown,
  ) => { readonly ok: true; readonly value: TResult } | { readonly ok: false },
): TResult {
  const result = parse(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${String(value)}" is invalid.`);
}
