import { assertEquals, assertRejects } from "@std/assert";
import pg from "pg";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  parseActorId,
  parseAggregateVersion,
  parseDealId,
  parseRequestContext,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import { parseDocumentVersionId } from "../../src/documents/ids.ts";
import { EvidenceKnowledgeRepository } from "../../src/evidence_knowledge/repository.ts";
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
  AtomicFactCommandService,
  type FactCommandAuthorizationPort,
} from "../../src/evidence_knowledge/fact_commands.ts";
import { PostgresFactTransitionStore } from "../../src/evidence_knowledge/fact_command_repository.ts";
import { loadEffectiveFactVersionStatus } from "../../src/evidence_knowledge/fact_version_status.ts";
import type { AuthoritySnapshot } from "../../src/audit_activity/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import { OutboxRepository } from "../../src/platform/events/v1.ts";

const databaseUrl = Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ??
  postgresIntegrationTestDatabaseUrl();

class TestVerifier implements ExactDocumentVersionVerificationPort {
  verify(
    _context: unknown,
    scope: EvidenceScope,
    reference: ExactDocumentVersionReference,
  ): Promise<VerifiedExactDocumentVersion> {
    return Promise.resolve(Object.freeze({
      scope,
      reference,
      version: {
        documentVersionId: reference.documentVersionId,
        scope,
        checksum: reference.checksum,
        classification: reference.classification,
      } as never,
    }));
  }
}

Deno.test({
  name:
    "fact commands atomically persist idempotency, history, provenance, invalidation, audit, and outbox evidence",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await reset(pool);

    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      ...evidenceKnowledgeMigrations,
    ]);

    const transactions = new PostgresTransactionRunner(pool);
    const repository = new EvidenceKnowledgeRepository();
    const verifier = new TestVerifier();
    const outbox = new OutboxRepository();
    const clock = { now: () => now() };

    const store = new PostgresFactTransitionStore({
      transactions,
      evidence: repository,
      verifier,
      outbox,
      clock,
    });

    const authorization: FactCommandAuthorizationPort = {
      authorize: () =>
        Promise.resolve({
          allowed: true,
          policyDecisionId: "policy_dec_test",
          authoritySnapshot: {
            snapshotId: "authsnap_test",
            actorId: required("actor_alice", parseActorId),
            actorKind: "human",
            policyVersion: "v1",
            scope: fixtureScope(),
            capturedAt: now(),
          } as AuthoritySnapshot,
        }),
    };

    const service = new AtomicFactCommandService(authorization, store);

    const scope = fixtureScope();
    const contextResult = parseRequestContext({
      actorId: "actor_alice",
      identityId: "identity_alice123",
      sessionId: "session_alice456",
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      dealId: scope.dealId,
      correlationId: "cor_fact-command",
      origin: "http",
    });
    if (!contextResult.ok) throw new Error("Context setup failed.");
    const context = contextResult.value;

    const citation = fixtureCitation(scope);
    await transactions.run((transaction) =>
      repository.insertCitation(transaction, citation)
    );

    const factId = required("fact_command-test", parseFactId);
    const versionOne = required("factver_command-v1", parseFactVersionId);
    const versionTwo = required("factver_command-v2", parseFactVersionId);

    const fact = createFact({
      factId,
      scope,
      category: "financial",
      status: "proposed",
      aggregateVersion: 1,
      createdAt: now(),
    });

    const v1 = createFactVersion({
      factVersionId: versionOne,
      factId,
      scope,
      statement: "Fact statement 1",
      category: "financial",
      status: "proposed",
      versionNumber: 1,
      citationIds: [citation.citationId],
      createdAt: now(),
    });

    const v2 = createFactVersion({
      factVersionId: versionTwo,
      factId,
      scope,
      statement: "Fact statement 2",
      category: "financial",
      status: "proposed",
      versionNumber: 2,
      citationIds: [citation.citationId],
      createdAt: now(),
    });

    await transactions.run(async (transaction) => {
      await repository.insertFact(transaction, fact);
      await repository.insertFactVersion(transaction, v1);
      await repository.insertFactVersion(transaction, v2);
    });

    const command = {
      context,
      scope,
      factId,
      factVersionId: versionOne,
      expectedAggregateVersion: aggregateVersion(1),
      targetStatus: "approved" as const,
      idempotencyKey: "approve-command-v1",
      payloadDigest: "c".repeat(64),
    };

    const approvedV1 = await service.transition(command);
    assertEquals(approvedV1.fact.status, "approved");
    assertEquals(approvedV1.fact.currentFactVersionId, "factver_command-v1");

    const replayedV1 = await service.transition(command);
    assertEquals(replayedV1.replayed, true);

    const approvedReplacement = await service.transition({
      ...command,
      factVersionId: versionTwo,
      expectedAggregateVersion: aggregateVersion(2),
      idempotencyKey: "approve-command-v2",
      payloadDigest: "e".repeat(64),
    });
    assertEquals(approvedReplacement.fact.status, "approved");
    assertEquals(
      approvedReplacement.fact.currentFactVersionId,
      "factver_command-v1",
    );
    assertEquals(approvedReplacement.fact.aggregateVersion, 3);

    const superseded = await service.transition({
      ...command,
      expectedAggregateVersion: aggregateVersion(3),
      targetStatus: "superseded",
      replacementFactVersionId: versionTwo,
      rationale: "Replacing v1 with v2 for post-merge review correction",
      idempotencyKey: "supersede-command-v1",
      payloadDigest: "d".repeat(64),
    });
    assertEquals(superseded.fact.status, "approved");
    assertEquals(superseded.fact.currentFactVersionId, "factver_command-v2");
    assertEquals(superseded.fact.aggregateVersion, 4);

    assertEquals(
      await transactions.run((transaction) =>
        loadEffectiveFactVersionStatus(
          transaction,
          scope,
          required("factver_command-v1", parseFactVersionId),
          "proposed",
        )
      ),
      "superseded",
    );

    const counts = await pool.query<
      {
        history: string;
        provenance: string;
        invalidation: string;
        outbox: string;
        commandHistory: string;
        auditEvents: string;
      }
    >(
      `SELECT (SELECT count(*)::text FROM evidence_knowledge.fact_transition_history) AS history, (SELECT count(*)::text FROM evidence_knowledge.fact_transition_provenance) AS provenance, (SELECT count(*)::text FROM evidence_knowledge.invalidations) AS invalidation, (SELECT count(*)::text FROM platform.outbox WHERE event_type='evidence.fact-status-transitioned') AS outbox, (SELECT count(*)::text FROM evidence_knowledge.command_idempotency_history) AS "commandHistory", (SELECT count(*)::text FROM audit_activity.audit_events WHERE aggregate_type='EvidenceFact') AS "auditEvents"`,
    );
    assertEquals(counts.rows[0], {
      history: "3",
      provenance: "3",
      invalidation: "3",
      outbox: "3",
      commandHistory: "3",
      auditEvents: "3",
    });

    const auditRows = await pool.query<{
      actor_id: string;
      payload: Record<string, unknown>;
      occurred_at: Date;
    }>(
      `SELECT actor_id, payload, occurred_at FROM audit_activity.audit_events WHERE aggregate_type='EvidenceFact' ORDER BY position ASC`,
    );
    assertEquals(auditRows.rows.length, 3);
    assertEquals(auditRows.rows[0].actor_id, "actor_alice");
    assertEquals(auditRows.rows[0].payload.policyDecisionId, "policy_dec_test");
    assertEquals(auditRows.rows[0].payload.identityId, "identity_alice123");
    assertEquals(auditRows.rows[0].payload.sessionId, "session_alice456");
    assertEquals(
      auditRows.rows[2].payload.resultingCurrentFactVersionId,
      "factver_command-v2",
    );
    assertEquals(
      auditRows.rows[2].payload.rationale,
      "Replacing v1 with v2 for post-merge review correction",
    );

    await reset(pool);
    await pool.end();
  },
});

Deno.test({
  name: "PostgreSQL audit failure rolls back complete fact transaction",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await reset(pool);

    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      ...evidenceKnowledgeMigrations,
    ]);

    const transactions = new PostgresTransactionRunner(pool);
    const repository = new EvidenceKnowledgeRepository();
    const verifier = new TestVerifier();
    const outbox = new OutboxRepository();
    const clock = { now: () => now() };

    const store = new PostgresFactTransitionStore({
      transactions,
      evidence: repository,
      verifier,
      outbox,
      clock,
      appendAudit: () => Promise.reject(new Error("Simulated audit failure")),
    });

    const authorization: FactCommandAuthorizationPort = {
      authorize: () =>
        Promise.resolve({
          allowed: true,
          policyDecisionId: "policy_dec_fail",
          authoritySnapshot: {
            snapshotId: "authsnap_fail",
            actorId: required("actor_alice", parseActorId),
            actorKind: "human",
            policyVersion: "v1",
            scope: fixtureScope(),
            capturedAt: now(),
          } as AuthoritySnapshot,
        }),
    };

    const service = new AtomicFactCommandService(authorization, store);

    const scope = fixtureScope();
    const contextResult = parseRequestContext({
      actorId: "actor_alice",
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      dealId: scope.dealId,
      correlationId: "cor_fact-rollback",
      origin: "http",
    });
    if (!contextResult.ok) throw new Error("Context setup failed.");

    const citation = fixtureCitation(scope);
    await transactions.run((transaction) =>
      repository.insertCitation(transaction, citation)
    );

    const factId = required("fact_command-rb", parseFactId);
    const versionOne = required("factver_command-rb1", parseFactVersionId);

    const fact = createFact({
      factId,
      scope,
      category: "financial",
      status: "proposed",
      aggregateVersion: 1,
      createdAt: now(),
    });

    const v1 = createFactVersion({
      factVersionId: versionOne,
      factId,
      scope,
      statement: "Fact statement RB",
      category: "financial",
      status: "proposed",
      versionNumber: 1,
      citationIds: [citation.citationId],
      createdAt: now(),
    });

    await transactions.run(async (transaction) => {
      await repository.insertFact(transaction, fact);
      await repository.insertFactVersion(transaction, v1);
    });

    const command = {
      context: contextResult.value,
      scope,
      factId,
      factVersionId: versionOne,
      expectedAggregateVersion: aggregateVersion(1),
      targetStatus: "approved" as const,
      idempotencyKey: "approve-command-rb",
      payloadDigest: "b".repeat(64),
    };

    await assertRejects(
      () => service.transition(command),
      Error,
      "Simulated audit failure",
    );

    // Fact state remains proposed, current_fact_version_id remains null, 0 history/audit/outbox rows appended
    const factRes = await pool.query<{
      status: string;
      current_fact_version_id: string | null;
    }>(
      `SELECT status, current_fact_version_id FROM evidence_knowledge.facts WHERE fact_id=$1`,
      [factId],
    );
    assertEquals(factRes.rows[0].status, "proposed");
    assertEquals(factRes.rows[0].current_fact_version_id, null);

    const counts = await pool.query<{
      history: string;
      invalidation: string;
      outbox: string;
      auditEvents: string;
    }>(
      `SELECT (SELECT count(*)::text FROM evidence_knowledge.fact_transition_history WHERE fact_id=$1) AS history, (SELECT count(*)::text FROM evidence_knowledge.invalidations) AS invalidation, (SELECT count(*)::text FROM platform.outbox WHERE event_type='evidence.fact-status-transitioned') AS outbox, (SELECT count(*)::text FROM audit_activity.audit_events WHERE aggregate_type='EvidenceFact') AS "auditEvents"`,
      [factId],
    );
    assertEquals(counts.rows[0], {
      history: "0",
      invalidation: "0",
      outbox: "0",
      auditEvents: "0",
    });

    await reset(pool);
    await pool.end();
  },
});

async function reset(pool: pg.Pool): Promise<void> {
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
    excerpt: "Command fact",
    freshness: { state: "current", checkedAt: now() },
    createdAt: now(),
  });
}
function now(): Date {
  return new Date("2026-08-04T12:00:00.000Z");
}

function aggregateVersion(value: number) {
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
