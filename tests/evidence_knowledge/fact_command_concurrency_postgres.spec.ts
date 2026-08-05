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
import { auditActivityMigrations } from "../../src/audit_activity/migrations/index.ts";
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
  parseActorId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
  type RequestContext,
} from "../../src/platform/api/v1.ts";
import { VersionConflictError } from "../../src/platform/persistence/concurrency.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";
import type { AuthoritySnapshot } from "../../src/audit_activity/v1.ts";

const databaseUrl = Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ??
  mai106DatabaseUrl();

class SimpleVerifier implements ExactDocumentVersionVerificationPort {
  constructor(private readonly expectedDocVersion: DocumentVersion) {}

  verify(
    _context: RequestContext,
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
    return Promise.resolve(Object.freeze({
      scope,
      reference,
      version: this.expectedDocVersion,
    }));
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
      ...auditActivityMigrations,
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

    const verifier = new SimpleVerifier(docVersion);

    let writer1Pid = 0;
    let writer2Pid = 0;

    let writer1LockResolver: (() => void) | undefined;
    const writer1LockPromise = new Promise<void>((r) => {
      writer1LockResolver = r;
    });

    let releaseWriter1Resolver: (() => void) | undefined;
    const releaseWriter1Promise = new Promise<void>((r) => {
      releaseWriter1Resolver = r;
    });

    const authSnapshot = fixtureAuthoritySnapshot(scope);
    const authPort = {
      authorize: () =>
        Promise.resolve({
          allowed: true as const,
          authoritySnapshot: authSnapshot,
        }),
    };

    const store = new PostgresFactTransitionStore({
      transactions,
      evidence: repository,
      verifier,
      outbox: new OutboxRepository(),
      clock: { now: () => fixtureNow() },
      onTransactionStarted: (_command, pid) => {
        if (_command.idempotencyKey === "race-cmd-1") {
          writer1Pid = pid;
        } else if (_command.idempotencyKey === "race-cmd-2") {
          writer2Pid = pid;
        }
        return Promise.resolve();
      },
      onFactLockAcquired: async (command) => {
        if (command.idempotencyKey === "race-cmd-1") {
          writer1LockResolver?.();
          await releaseWriter1Promise;
        }
      },
    });

    const service = new AtomicFactCommandService(authPort, store);

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
    await writer1LockPromise;

    const promise2 = service.transition(command2);

    let blocked = false;
    for (let i = 0; i < 50; i++) {
      if (writer2Pid > 0) {
        const blockingResult = await pool.query<{ blockingPid: number }>(
          'SELECT unnest(pg_blocking_pids($1)) AS "blockingPid"',
          [writer2Pid],
        );
        const blockingPids = blockingResult.rows.map((r) => r.blockingPid);
        if (blockingPids.includes(writer1Pid)) {
          blocked = true;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    assertEquals(
      blocked,
      true,
      `Writer 2 (PID ${writer2Pid}) must block specifically on Writer 1 (PID ${writer1Pid}) before releasing Writer 1`,
    );

    releaseWriter1Resolver?.();

    const [result1, result2] = await Promise.allSettled([promise1, promise2]);

    assertEquals(result1.status, "fulfilled");
    if (result1.status === "fulfilled") {
      assertEquals(result1.value.fact.status, "approved");
      assertEquals(
        result1.value.fact.currentFactVersionId,
        "factver_command-v1",
      );
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
      auditCount: string;
      factStatus: string;
      currentFactVersionId: string;
      factVersion: string;
    }>(
      `SELECT
        (SELECT count(*)::text FROM evidence_knowledge.fact_transition_history) AS "historyCount",
        (SELECT count(*)::text FROM evidence_knowledge.fact_transition_provenance) AS "provenanceCount",
        (SELECT count(*)::text FROM evidence_knowledge.invalidations) AS "invalidationCount",
        (SELECT count(*)::text FROM platform.outbox WHERE event_type='evidence.fact-status-transitioned') AS "outboxCount",
        (SELECT count(*)::text FROM evidence_knowledge.command_idempotency) AS "idempotencyCount",
        (SELECT count(*)::text FROM evidence_knowledge.command_idempotency_history) AS "idempotencyHistoryCount",
        (SELECT count(*)::text FROM audit_activity.audit_events WHERE aggregate_type='EvidenceFact') AS "auditCount",
        (SELECT status FROM evidence_knowledge.facts WHERE fact_id='fact_command') AS "factStatus",
        (SELECT current_fact_version_id FROM evidence_knowledge.facts WHERE fact_id='fact_command') AS "currentFactVersionId",
        (SELECT aggregate_version::text FROM evidence_knowledge.facts WHERE fact_id='fact_command') AS "factVersion"`,
    );

    const row = dbState.rows[0];
    assertEquals(row.factStatus, "approved");
    assertEquals(row.currentFactVersionId, "factver_command-v1");
    assertEquals(row.factVersion, "2");
    assertEquals(row.historyCount, "1");
    assertEquals(row.provenanceCount, "1");
    assertEquals(row.invalidationCount, "1");
    assertEquals(row.outboxCount, "1");
    assertEquals(row.idempotencyCount, "1");
    assertEquals(row.idempotencyHistoryCount, "1");
    assertEquals(row.auditCount, "1");

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
  await pool.query("DROP SCHEMA IF EXISTS audit_activity CASCADE");
  await pool.query(
    "DELETE FROM platform.outbox WHERE event_type='evidence.fact-status-transitioned'",
  ).catch(() => {});
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner IN ($1, $2)",
    ["evidence_knowledge", "audit_activity"],
  ).catch(() => {});
}

function fixtureScope(): EvidenceScope {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}

function fixtureCitation(scope: EvidenceScope) {
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

function fixtureAuthoritySnapshot(scope: EvidenceScope): AuthoritySnapshot {
  return {
    snapshotId: "authsnap_test",
    actorId: required("actor_alice", parseActorId),
    actorKind: "human",
    policyVersion: "v1",
    scope,
    capturedAt: fixtureNow(),
  };
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
