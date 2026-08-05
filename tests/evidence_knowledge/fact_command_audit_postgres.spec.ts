import { assertEquals } from "@std/assert";
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
import type { AuthoritySnapshot } from "../../src/audit_activity/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";
import { OutboxRepository } from "../../src/platform/events/v1.ts";

const databaseUrl = Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ??
  mai106DatabaseUrl();
const INJECTED_TIME = new Date("2026-08-04T12:00:00.000Z");

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
    "PostgreSQL complete field-level Fact audit verification, timestamp equality, and replay stability",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await reset(pool);
    await applyMigrations(pool);

    const transactions = new PostgresTransactionRunner(pool);
    const repository = new EvidenceKnowledgeRepository();
    const verifier = new TestVerifier();
    const outbox = new OutboxRepository();
    const clock = { now: () => INJECTED_TIME };
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
          policyDecisionId: "policy_dec_audit_test",
          authoritySnapshot: {
            snapshotId: "authsnap_audit_test",
            actorId: required("actor_alice", parseActorId),
            actorKind: "human",
            policyVersion: "v1",
            scope: fixtureScope(),
            capturedAt: INJECTED_TIME,
          } as AuthoritySnapshot,
        }),
    };

    const service = new AtomicFactCommandService(authorization, store);
    const scope = fixtureScope();
    const context = requiredContext(scope);

    const citation = fixtureCitation(scope);
    await transactions.run((transaction) =>
      repository.insertCitation(transaction, citation)
    );

    const factId = required("fact_audit-test", parseFactId);
    const versionOne = required("factver_audit-v1", parseFactVersionId);
    const versionTwo = required("factver_audit-v2", parseFactVersionId);

    const fact = createFact({
      factId,
      scope,
      category: "financial",
      status: "proposed",
      aggregateVersion: 1,
      createdAt: INJECTED_TIME,
    });
    const v1 = createFactVersion({
      factVersionId: versionOne,
      factId,
      scope,
      statement: "Stmt 1",
      category: "financial",
      status: "proposed",
      versionNumber: 1,
      citationIds: [citation.citationId],
      createdAt: INJECTED_TIME,
    });
    const v2 = createFactVersion({
      factVersionId: versionTwo,
      factId,
      scope,
      statement: "Stmt 2",
      category: "financial",
      status: "proposed",
      versionNumber: 2,
      citationIds: [citation.citationId],
      createdAt: INJECTED_TIME,
    });

    await transactions.run(async (transaction) => {
      await repository.insertFact(transaction, fact);
      await repository.insertFactVersion(transaction, v1);
      await repository.insertFactVersion(transaction, v2);
    });

    const approveCmd = {
      context,
      scope,
      factId,
      factVersionId: versionOne,
      expectedAggregateVersion: aggregateVersion(1),
      targetStatus: "approved" as const,
      idempotencyKey: "audit-approve-v1",
      payloadDigest: "a".repeat(64),
    };
    await service.transition(approveCmd);

    const approveV2Cmd = {
      context,
      scope,
      factId,
      factVersionId: versionTwo,
      expectedAggregateVersion: aggregateVersion(2),
      targetStatus: "approved" as const,
      idempotencyKey: "audit-approve-v2",
      payloadDigest: "c".repeat(64),
    };
    await service.transition(approveV2Cmd);

    const supersedeCmd = {
      context,
      scope,
      factId,
      factVersionId: versionOne,
      expectedAggregateVersion: aggregateVersion(3),
      targetStatus: "superseded" as const,
      replacementFactVersionId: versionTwo,
      rationale:
        "   Replacing v1 with v2 for complete audit test verification   ",
      idempotencyKey: "audit-supersede-v1",
      payloadDigest: "b".repeat(64),
    };
    await service.transition(supersedeCmd);

    const auditRes = await pool.query<{
      actor_id: string;
      actor_kind: string;
      origin: string;
      correlation_id: string;
      authority_snapshot: {
        snapshotId: string;
        policyVersion: string;
        actorKind: string;
      };
      evidence_snapshot: {
        capturedAt: string;
        references: Array<{
          sourceType: string;
          sourceId: string;
          sourceVersion: string;
        }>;
      };
      payload: {
        policyDecisionId: string;
        identityId: string;
        sessionId: string;
        beforeAggregateVersion: number;
        afterAggregateVersion: number;
        beforeFactStatus: string;
        afterFactStatus: string;
        previousCurrentFactVersionId: string;
        resultingCurrentFactVersionId: string;
        rationale: string;
        outcome: string;
      };
      occurred_at: Date;
    }>(
      `SELECT actor_id, actor_kind, origin, correlation_id, authority_snapshot, evidence_snapshot, payload, occurred_at FROM audit_activity.audit_events WHERE aggregate_type='EvidenceFact' AND (payload->>'idempotencyKey')=$1`,
      ["audit-supersede-v1"],
    );

    assertEquals(auditRes.rows.length, 1);
    const audit = auditRes.rows[0];

    // Assert all 20 required audit fields
    assertEquals(audit.actor_id, "actor_alice");
    assertEquals(audit.payload.identityId, "identity_alice123");
    assertEquals(audit.payload.sessionId, "session_alice456");
    assertEquals(audit.origin, "http");
    assertEquals(audit.correlation_id, "cor_audit-test");
    assertEquals(audit.payload.policyDecisionId, "policy_dec_audit_test");
    assertEquals(audit.authority_snapshot.snapshotId, "authsnap_audit_test");
    assertEquals(audit.authority_snapshot.policyVersion, "v1");
    assertEquals(audit.authority_snapshot.actorKind, "human");
    assertEquals(audit.actor_kind, "human");
    assertEquals(audit.payload.beforeAggregateVersion, 3);
    assertEquals(audit.payload.afterAggregateVersion, 4);
    assertEquals(audit.payload.beforeFactStatus, "approved");
    assertEquals(audit.payload.afterFactStatus, "approved");
    assertEquals(
      audit.payload.previousCurrentFactVersionId,
      "factver_audit-v1",
    );
    assertEquals(
      audit.payload.resultingCurrentFactVersionId,
      "factver_audit-v2",
    );
    assertEquals(audit.evidence_snapshot.references, [
      {
        sourceType: "citation",
        sourceId: "citation_command",
        sourceVersion: "1",
      },
    ]);
    assertEquals(
      audit.payload.rationale,
      "Replacing v1 with v2 for complete audit test verification",
    );
    assertEquals(audit.payload.outcome, "success");
    assertEquals(
      new Date(audit.occurred_at).getTime(),
      INJECTED_TIME.getTime(),
    );
    assertEquals(
      new Date(audit.evidence_snapshot.capturedAt).getTime(),
      INJECTED_TIME.getTime(),
    );

    // Verify all authoritative transition timestamps equal injected clock value
    const historyTs = await pool.query<{ created_at: Date }>(
      `SELECT created_at FROM evidence_knowledge.fact_transition_history WHERE fact_id=$1 AND command_key='audit-supersede-v1'`,
      [factId],
    );
    assertEquals(
      new Date(historyTs.rows[0].created_at).getTime(),
      INJECTED_TIME.getTime(),
    );

    const provTs = await pool.query<{ created_at: Date }>(
      `SELECT created_at FROM evidence_knowledge.fact_transition_provenance WHERE fact_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [factId],
    );
    assertEquals(
      new Date(provTs.rows[0].created_at).getTime(),
      INJECTED_TIME.getTime(),
    );

    const invalTs = await pool.query<{ created_at: Date }>(
      `SELECT created_at FROM evidence_knowledge.invalidations WHERE source_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [versionOne],
    );
    assertEquals(
      new Date(invalTs.rows[0].created_at).getTime(),
      INJECTED_TIME.getTime(),
    );

    const commandIdemTs = await pool.query<{ completed_at: Date }>(
      `SELECT completed_at FROM evidence_knowledge.command_idempotency WHERE idempotency_key='audit-supersede-v1'`,
    );
    assertEquals(
      new Date(commandIdemTs.rows[0].completed_at).getTime(),
      INJECTED_TIME.getTime(),
    );

    const commandHistoryTs = await pool.query<{ completed_at: Date }>(
      `SELECT completed_at FROM evidence_knowledge.command_idempotency_history WHERE idempotency_key='audit-supersede-v1'`,
    );
    assertEquals(
      new Date(commandHistoryTs.rows[0].completed_at).getTime(),
      INJECTED_TIME.getTime(),
    );

    const outboxTs = await pool.query<
      { occurred_at: Date; available_at: Date }
    >(
      `SELECT occurred_at, available_at FROM platform.outbox WHERE event_type='evidence.fact-status-transitioned' AND correlation_id='cor_audit-test' ORDER BY occurred_at DESC LIMIT 1`,
    );
    assertEquals(
      new Date(outboxTs.rows[0].occurred_at).getTime(),
      INJECTED_TIME.getTime(),
    );
    assertEquals(
      new Date(outboxTs.rows[0].available_at).getTime(),
      INJECTED_TIME.getTime(),
    );

    // Verify exact replay does not append another audit row
    const countBeforeReplay = await pool.query<{ count: string }>(
      `SELECT count(*)::text FROM audit_activity.audit_events WHERE aggregate_type='EvidenceFact'`,
    );
    const replayResult = await service.transition(supersedeCmd);
    assertEquals(replayResult.replayed, true);

    const countAfterReplay = await pool.query<{ count: string }>(
      `SELECT count(*)::text FROM audit_activity.audit_events WHERE aggregate_type='EvidenceFact'`,
    );
    assertEquals(
      countAfterReplay.rows[0].count,
      countBeforeReplay.rows[0].count,
    );

    await reset(pool);
    await pool.end();
  },
});

async function applyMigrations(pool: pg.Pool): Promise<void> {
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...auditActivityMigrations,
    ...evidenceKnowledgeMigrations,
  ]);
}

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

function requiredContext(scope: ReturnType<typeof fixtureScope>) {
  const result = parseRequestContext({
    actorId: "actor_alice",
    identityId: "identity_alice123",
    sessionId: "session_alice456",
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: "cor_audit-test",
    origin: "http",
  });
  if (!result.ok) throw new Error("Context setup failed.");
  return result.value;
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
    freshness: { state: "current", checkedAt: INJECTED_TIME },
    createdAt: INJECTED_TIME,
  });
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
