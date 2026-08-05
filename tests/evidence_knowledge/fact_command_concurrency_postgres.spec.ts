import { assertEquals, assertInstanceOf } from "@std/assert";
import pg from "pg";
import { OutboxRepository } from "../../src/platform/events/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  parseAggregateVersion,
  parseRequestContext,
} from "../../src/platform/api/v1.ts";
import type { DocumentVersion } from "../../src/documents/version.ts";
import { parseDocumentVersionId } from "../../src/documents/ids.ts";
import { EvidenceKnowledgeRepository } from "../../src/evidence_knowledge/repository.ts";
import { PostgresFactTransitionStore } from "../../src/evidence_knowledge/fact_command_repository.ts";
import { AtomicFactCommandService } from "../../src/evidence_knowledge/fact_commands.ts";
import type {
  ExactDocumentVersionVerificationPort,
  VerifiedExactDocumentVersion,
} from "../../src/evidence_knowledge/document_version_verification.ts";
import { evidenceKnowledgeMigrations } from "../../src/evidence_knowledge/migrations/index.ts";
import { createCitation } from "../../src/evidence_knowledge/citation.ts";
import {
  createExactDocumentVersionReference,
  createFact,
  createFactVersion,
  type EvidenceScope,
  type ExactDocumentVersionReference,
} from "../../src/evidence_knowledge/model.ts";
import {
  parseCitationId,
  parseFactId,
  parseFactVersionId,
} from "../../src/evidence_knowledge/v1.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import { VersionConflictError } from "../../src/platform/persistence/concurrency.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ??
  mai106DatabaseUrl();

class BarrierVerifier implements ExactDocumentVersionVerificationPort {
  private lockAcquiredResolver?: () => void;
  readonly lockAcquiredPromise = new Promise<void>((resolve) => {
    this.lockAcquiredResolver = resolve;
  });

  private releaseResolver?: () => void;
  readonly releasePromise = new Promise<void>((resolve) => {
    this.releaseResolver = resolve;
  });

  constructor(private readonly expectedDocVersion: DocumentVersion) {}

  async verify(
    scope: EvidenceScope,
    reference: ExactDocumentVersionReference,
  ): Promise<VerifiedExactDocumentVersion> {
    if (
      reference.documentVersionId !==
        this.expectedDocVersion.documentVersionId ||
      scope.tenantId !== this.expectedDocVersion.scope.tenantId
    ) {
      throw new Error("Verification mismatch.");
    }
    this.lockAcquiredResolver?.();
    await this.releasePromise;
    return Object.freeze({
      scope,
      reference,
      version: this.expectedDocVersion,
    });
  }

  release(): void {
    this.releaseResolver?.();
  }
}

Deno.test({
  name:
    "fact command PostgreSQL concurrency enforces single winner and rolls back loser",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await resetSchema(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...evidenceKnowledgeMigrations,
    ]);

    const transactions = new PostgresTransactionRunner(pool);
    const repository = new EvidenceKnowledgeRepository();
    const scope = fixtureScope();
    const citation = fixtureCitation(scope);

    await transactions.run(async (transaction) => {
      await repository.insertCitation(transaction, citation);
      await repository.insertFact(
        transaction,
        createFact({
          factId: required("fact_command", parseFactId),
          scope,
          category: "financial",
          status: "proposed",
          aggregateVersion: 1,
          createdAt: fixtureNow(),
        }),
      );
      await repository.insertFactVersion(
        transaction,
        createFactVersion({
          factVersionId: required("factver_command-v1", parseFactVersionId),
          factId: required("fact_command", parseFactId),
          scope,
          statement: "Concurrent fact test",
          category: "financial",
          status: "proposed",
          versionNumber: 1,
          citationIds: [citation.citationId],
          createdAt: fixtureNow(),
        }),
      );
    });

    const contextResult = parseRequestContext({
      actorId: "actor_alice",
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      dealId: scope.dealId,
      correlationId: "cor_concurrency-test",
      origin: "http",
    });
    if (!contextResult.ok) {
      throw new Error("Fixture request context is invalid.");
    }

    const versionOne = requiredAggregateVersion(1);
    const docVersion: DocumentVersion = {
      documentVersionId: citation.source.documentVersionId,
      scope,
      checksum: citation.source.checksum,
      classification: citation.source.classification,
    } as DocumentVersion;

    const barrierVerifier = new BarrierVerifier(docVersion);
    const service = new AtomicFactCommandService(
      { authorize: () => Promise.resolve(true) },
      new PostgresFactTransitionStore({
        transactions,
        evidence: repository,
        verifier: barrierVerifier,
        outbox: new OutboxRepository(),
        clock: { now: () => fixtureNow() },
      }),
    );

    const command1 = {
      context: contextResult.value,
      scope,
      factId: required("fact_command", parseFactId),
      factVersionId: required("factver_command-v1", parseFactVersionId),
      expectedAggregateVersion: versionOne,
      targetStatus: "approved" as const,
      idempotencyKey: "race-cmd-1",
      payloadDigest: "1".repeat(64),
    };

    const command2 = {
      context: contextResult.value,
      scope,
      factId: required("fact_command", parseFactId),
      factVersionId: required("factver_command-v1", parseFactVersionId),
      expectedAggregateVersion: versionOne,
      targetStatus: "approved" as const,
      idempotencyKey: "race-cmd-2",
      payloadDigest: "2".repeat(64),
    };

    const promise1 = service.transition(command1);
    await barrierVerifier.lockAcquiredPromise;

    const promise2 = service.transition(command2);
    barrierVerifier.release();

    const [result1, result2] = await Promise.allSettled([promise1, promise2]);

    assertEquals(result1.status, "fulfilled");
    if (result1.status === "fulfilled") {
      assertEquals(result1.value.fact.status, "approved");
      assertEquals(result1.value.fact.aggregateVersion, 2);
      assertEquals(result1.value.replayed, false);
    }

    assertEquals(result2.status, "rejected");
    if (result2.status === "rejected") {
      assertInstanceOf(result2.reason, VersionConflictError);
    }

    const dbState = await pool.query<{
      historyCount: string;
      provenanceCount: string;
      invalidationCount: string;
      outboxCount: string;
      idempotencyCount: string;
      idempotencyHistoryCount: string;
      factStatus: string;
      factVersion: string;
    }>(
      `SELECT
        (SELECT count(*)::text FROM evidence_knowledge.fact_transition_history) AS "historyCount",
        (SELECT count(*)::text FROM evidence_knowledge.fact_transition_provenance) AS "provenanceCount",
        (SELECT count(*)::text FROM evidence_knowledge.invalidations) AS "invalidationCount",
        (SELECT count(*)::text FROM platform.outbox WHERE event_type='evidence.fact-status-transitioned') AS "outboxCount",
        (SELECT count(*)::text FROM evidence_knowledge.command_idempotency) AS "idempotencyCount",
        (SELECT count(*)::text FROM evidence_knowledge.command_idempotency_history) AS "idempotencyHistoryCount",
        (SELECT status FROM evidence_knowledge.facts WHERE fact_id='fact_command') AS "factStatus",
        (SELECT aggregate_version::text FROM evidence_knowledge.facts WHERE fact_id='fact_command') AS "factVersion"`,
    );

    const row = dbState.rows[0];
    assertEquals(row.factStatus, "approved");
    assertEquals(row.factVersion, "2");
    assertEquals(row.historyCount, "1");
    assertEquals(row.provenanceCount, "1");
    assertEquals(row.invalidationCount, "1");
    assertEquals(row.outboxCount, "1");
    assertEquals(row.idempotencyCount, "1");
    assertEquals(row.idempotencyHistoryCount, "1");

    const losingIdempotency = await pool.query(
      `SELECT count(*)::text AS count FROM evidence_knowledge.command_idempotency WHERE idempotency_key='race-cmd-2'`,
    );
    assertEquals(losingIdempotency.rows[0].count, "0");

    await resetSchema(pool);
    await pool.end();
  },
});

async function resetSchema(pool: pg.Pool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS evidence_knowledge CASCADE");
  await pool.query(
    "DELETE FROM platform.outbox WHERE event_type='evidence.fact-status-transitioned'",
  ).catch(() => {});
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner=$1",
    ["evidence_knowledge"],
  ).catch(() => {});
}

function fixtureScope() {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}

function fixtureCitation(scope: ReturnType<typeof fixtureScope>) {
  return createCitation({
    citationId: required("citation_command", parseCitationId),
    scope,
    source: createExactDocumentVersionReference({
      documentVersionId: required("docver_command-v1", parseDocumentVersionId),
      checksum: { algorithm: "sha256", value: "e".repeat(64) },
      location: { kind: "page", page: 1 },
      classification: "financial",
      processingVersion: "extractor-v1",
    }),
    excerpt: "Concurrent fact test",
    freshness: { state: "current", checkedAt: fixtureNow() },
    createdAt: fixtureNow(),
  });
}

function fixtureNow(): Date {
  return new Date("2026-08-04T12:00:00.000Z");
}

function requiredAggregateVersion(value: number) {
  const result = parseAggregateVersion(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture aggregate version "${value}" is invalid.`);
}

function required<T>(
  value: string,
  parser: (value: unknown) => { ok: true; value: T } | { ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
