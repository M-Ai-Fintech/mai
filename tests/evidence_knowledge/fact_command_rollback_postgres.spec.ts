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
    "PostgreSQL audit failure rolls back all authoritative side effects and leaves zero partial rows",
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
      appendAudit: () =>
        Promise.reject(new Error("Simulated audit insertion failure")),
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

    const factId = required("fact_audit-rb", parseFactId);
    const versionOne = required("factver_audit-rb1", parseFactVersionId);

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
      statement: "Audit RB stmt",
      category: "financial",
      status: "proposed",
      versionNumber: 1,
      citationIds: [citation.citationId],
      createdAt: INJECTED_TIME,
    });

    await transactions.run(async (transaction) => {
      await repository.insertFact(transaction, fact);
      await repository.insertFactVersion(transaction, v1);
    });

    const command = {
      context,
      scope,
      factId,
      factVersionId: versionOne,
      expectedAggregateVersion: aggregateVersion(1),
      targetStatus: "approved" as const,
      idempotencyKey: "audit-fail-key",
      payloadDigest: "c".repeat(64),
    };

    await assertRejects(
      () => service.transition(command),
      Error,
      "Simulated audit insertion failure",
    );

    // Assert Fact row unchanged
    const factRes = await pool.query<{
      status: string;
      aggregate_version: number;
      current_fact_version_id: string | null;
    }>(
      `SELECT status, aggregate_version, current_fact_version_id FROM evidence_knowledge.facts WHERE fact_id=$1`,
      [factId],
    );
    assertEquals(factRes.rows[0].status, "proposed");
    assertEquals(Number(factRes.rows[0].aggregate_version), 1);
    assertEquals(factRes.rows[0].current_fact_version_id, null);

    // Assert all side effect tables have 0 rows for this command
    const counts = await pool.query<{
      history: string;
      provenance: string;
      provenanceLinks: string;
      invalidation: string;
      commandIdempotency: string;
      commandHistory: string;
      outbox: string;
      auditEvents: string;
    }>(
      `SELECT
        (SELECT count(*)::text FROM evidence_knowledge.fact_transition_history WHERE fact_id=$1) AS history,
        (SELECT count(*)::text FROM evidence_knowledge.fact_transition_provenance WHERE fact_id=$1) AS provenance,
        (SELECT count(*)::text FROM evidence_knowledge.provenance_links WHERE source_id=$1 OR target_id=$1) AS "provenanceLinks",
        (SELECT count(*)::text FROM evidence_knowledge.invalidations WHERE source_id=$1) AS invalidation,
        (SELECT count(*)::text FROM evidence_knowledge.command_idempotency WHERE target_id=$1) AS "commandIdempotency",
        (SELECT count(*)::text FROM evidence_knowledge.command_idempotency_history WHERE target_id=$1) AS "commandHistory",
        (SELECT count(*)::text FROM platform.outbox WHERE aggregate_type='EvidenceFact' AND aggregate_id=$1) AS outbox,
        (SELECT count(*)::text FROM audit_activity.audit_events WHERE (payload->>'idempotencyKey')='audit-fail-key') AS "auditEvents"`,
      [factId],
    );

    assertEquals(counts.rows[0], {
      history: "0",
      provenance: "0",
      provenanceLinks: "0",
      invalidation: "0",
      commandIdempotency: "0",
      commandHistory: "0",
      outbox: "0",
      auditEvents: "0",
    });

    await reset(pool);
    await pool.end();
  },
});

Deno.test({
  name:
    "PostgreSQL authorization rejection and stale version rejection create zero audit or Fact mutation",
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

    let allowAuth = false;
    const authorization: FactCommandAuthorizationPort = {
      authorize: () =>
        Promise.resolve(
          allowAuth
            ? {
              allowed: true,
              policyDecisionId: "policy_dec_rej",
              authoritySnapshot: {
                snapshotId: "authsnap_rej",
                actorId: required("actor_alice", parseActorId),
                actorKind: "human",
                policyVersion: "v1",
                scope: fixtureScope(),
                capturedAt: INJECTED_TIME,
              } as AuthoritySnapshot,
            }
            : { allowed: false },
        ),
    };

    const service = new AtomicFactCommandService(authorization, store);
    const scope = fixtureScope();
    const context = requiredContext(scope);

    const citation = fixtureCitation(scope);
    await transactions.run((transaction) =>
      repository.insertCitation(transaction, citation)
    );

    const factId = required("fact_audit-rej", parseFactId);
    const versionOne = required("factver_audit-rej1", parseFactVersionId);

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
      statement: "Audit rej stmt",
      category: "financial",
      status: "proposed",
      versionNumber: 1,
      citationIds: [citation.citationId],
      createdAt: INJECTED_TIME,
    });

    await transactions.run(async (transaction) => {
      await repository.insertFact(transaction, fact);
      await repository.insertFactVersion(transaction, v1);
    });

    // 1. Authorization rejection
    const commandForbidden = {
      context,
      scope,
      factId,
      factVersionId: versionOne,
      expectedAggregateVersion: aggregateVersion(1),
      targetStatus: "approved" as const,
      idempotencyKey: "audit-forbidden-key",
      payloadDigest: "d".repeat(64),
    };
    await assertRejects(
      () => service.transition(commandForbidden),
      Error,
      "FORBIDDEN",
    );

    const factAfterAuthRej = await pool.query<{
      status: string;
      aggregate_version: number;
    }>(
      `SELECT status, aggregate_version FROM evidence_knowledge.facts WHERE fact_id=$1`,
      [factId],
    );
    assertEquals(factAfterAuthRej.rows[0].status, "proposed");
    assertEquals(Number(factAfterAuthRej.rows[0].aggregate_version), 1);

    const auditCountAuthRej = await pool.query<{ count: string }>(
      `SELECT count(*)::text FROM audit_activity.audit_events WHERE (payload->>'idempotencyKey')='audit-forbidden-key'`,
    );
    assertEquals(auditCountAuthRej.rows[0].count, "0");

    // 2. Stale aggregate version rejection
    allowAuth = true;
    const commandStale = {
      context,
      scope,
      factId,
      factVersionId: versionOne,
      expectedAggregateVersion: aggregateVersion(999),
      targetStatus: "approved" as const,
      idempotencyKey: "audit-stale-key",
      payloadDigest: "e".repeat(64),
    };
    await assertRejects(
      () => service.transition(commandStale),
      Error,
      "VERSION_CONFLICT",
    );

    const factAfterStaleRej = await pool.query<{
      status: string;
      aggregate_version: number;
    }>(
      `SELECT status, aggregate_version FROM evidence_knowledge.facts WHERE fact_id=$1`,
      [factId],
    );
    assertEquals(factAfterStaleRej.rows[0].status, "proposed");
    assertEquals(Number(factAfterStaleRej.rows[0].aggregate_version), 1);

    const auditCountStaleRej = await pool.query<{ count: string }>(
      `SELECT count(*)::text FROM audit_activity.audit_events WHERE (payload->>'idempotencyKey')='audit-stale-key'`,
    );
    assertEquals(auditCountStaleRej.rows[0].count, "0");

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
