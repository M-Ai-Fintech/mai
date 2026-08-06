import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import pg from "pg";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  parseDealId,
  parseRequestContext,
  parseTenantId,
  parseWorkspaceId,
  type RequestContext,
} from "../../src/platform/api/v1.ts";
import type { DocumentVersion } from "../../src/documents/version.ts";
import { parseDocumentVersionId } from "../../src/documents/ids.ts";
import { EvidenceKnowledgeRepository } from "../../src/evidence_knowledge/repository.ts";
import { PostgresVerifiedEvidenceWriteService } from "../../src/evidence_knowledge/citation_service.ts";
import type {
  ExactDocumentVersionVerificationPort,
  VerifiedExactDocumentVersion,
} from "../../src/evidence_knowledge/document_version_verification.ts";
import { evidenceKnowledgeMigrations } from "../../src/evidence_knowledge/migrations/index.ts";
import { auditActivityMigrations } from "../../src/audit_activity/migrations/index.ts";
import { createCitation } from "../../src/evidence_knowledge/citation.ts";
import {
  createEvidenceRecord,
  createExactDocumentVersionReference,
  type EvidenceScope,
  type ExactDocumentVersionReference,
} from "../../src/evidence_knowledge/model.ts";
import {
  parseCitationId,
  parseEvidenceId,
} from "../../src/evidence_knowledge/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ??
  postgresIntegrationTestDatabaseUrl();

class TestVerifier implements ExactDocumentVersionVerificationPort {
  verify(
    _context: RequestContext,
    scope: EvidenceScope,
    reference: ExactDocumentVersionReference,
  ): Promise<VerifiedExactDocumentVersion> {
    const docVersion: DocumentVersion = {
      documentVersionId: reference.documentVersionId,
      scope,
      checksum: reference.checksum,
      classification: reference.classification,
    } as DocumentVersion;
    return Promise.resolve(Object.freeze({
      scope,
      reference,
      version: docVersion,
    }));
  }
}

Deno.test({
  name:
    "PostgreSQL evidence write concurrent identical Citation and Evidence replay",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await resetSchema(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      ...evidenceKnowledgeMigrations,
    ]);

    const transactions1 = new PostgresTransactionRunner(pool);
    const transactions2 = new PostgresTransactionRunner(pool);
    const repository = new EvidenceKnowledgeRepository();
    const verifier = new TestVerifier();
    const auth = { authorize: () => Promise.resolve(true) };
    const citationBarrier = createBarrier(2);
    const service1 = new PostgresVerifiedEvidenceWriteService(
      transactions1,
      repository,
      verifier,
      auth,
      { onBeforeInsertCitation: () => citationBarrier.enter() },
    );
    const service2 = new PostgresVerifiedEvidenceWriteService(
      transactions2,
      repository,
      verifier,
      auth,
      { onBeforeInsertCitation: () => citationBarrier.enter() },
    );

    const scope = fixtureScope();
    const context = fixtureContext(scope);
    const citation = fixtureCitation(scope, "citation_ident-conc");
    const evidence = fixtureEvidence(scope, citation, "evidence_ident-conc");

    const writePromise = Promise.allSettled([
      service1.createEvidence(context, evidence),
      service2.createEvidence(context, evidence),
    ]);

    await citationBarrier.awaitReached();
    citationBarrier.release();

    const results = await writePromise;

    assertEquals(results[0].status, "fulfilled");
    assertEquals(results[1].status, "fulfilled");

    const counts = await queryCounts(pool);
    assertEquals(counts.citationCount, "1");
    assertEquals(counts.evidenceCount, "1");

    await resetSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name: "PostgreSQL evidence write concurrent conflicting Citation",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await resetSchema(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      ...evidenceKnowledgeMigrations,
    ]);

    const transactions1 = new PostgresTransactionRunner(pool);
    const transactions2 = new PostgresTransactionRunner(pool);
    const repository = new EvidenceKnowledgeRepository();
    const verifier = new TestVerifier();
    const auth = { authorize: () => Promise.resolve(true) };
    const citationBarrier = createBarrier(2);
    const service1 = new PostgresVerifiedEvidenceWriteService(
      transactions1,
      repository,
      verifier,
      auth,
      { onBeforeInsertCitation: () => citationBarrier.enter() },
    );
    const service2 = new PostgresVerifiedEvidenceWriteService(
      transactions2,
      repository,
      verifier,
      auth,
      { onBeforeInsertCitation: () => citationBarrier.enter() },
    );

    const scope = fixtureScope();
    const context = fixtureContext(scope);
    const citation1 = fixtureCitation(scope, "citation_conf-conc");
    const citation2 = createCitation({
      ...citation1,
      excerpt: "Conflicting excerpt during concurrent write",
    });

    const writePromise = Promise.allSettled([
      service1.createCitation(context, citation1),
      service2.createCitation(context, citation2),
    ]);

    await citationBarrier.awaitReached();
    citationBarrier.release();

    const results = await writePromise;

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assertEquals(fulfilled.length, 1);
    assertEquals(rejected.length, 1);
    assertMatch(
      (rejected[0] as PromiseRejectedResult).reason.message,
      /payload changed; expected immutable replay/,
    );

    const counts = await queryCounts(pool);
    assertEquals(counts.citationCount, "1");

    await resetSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name: "PostgreSQL evidence write concurrent conflicting Evidence",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await resetSchema(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      ...evidenceKnowledgeMigrations,
    ]);

    const transactions1 = new PostgresTransactionRunner(pool);
    const transactions2 = new PostgresTransactionRunner(pool);
    const repository = new EvidenceKnowledgeRepository();
    const verifier = new TestVerifier();
    const auth = { authorize: () => Promise.resolve(true) };
    const evidenceBarrier = createBarrier(2);
    const service1 = new PostgresVerifiedEvidenceWriteService(
      transactions1,
      repository,
      verifier,
      auth,
      { onBeforeInsertEvidence: () => evidenceBarrier.enter() },
    );
    const service2 = new PostgresVerifiedEvidenceWriteService(
      transactions2,
      repository,
      verifier,
      auth,
      { onBeforeInsertEvidence: () => evidenceBarrier.enter() },
    );

    const scope = fixtureScope();
    const context = fixtureContext(scope);
    const citation1 = fixtureCitation(scope, "citation_ev-conf1");
    const citation2 = fixtureCitation(scope, "citation_ev-conf2");

    const evidence1 = fixtureEvidence(scope, citation1, "evidence_conf-conc");
    const evidence2 = fixtureEvidence(scope, citation2, "evidence_conf-conc");

    const writePromise = Promise.allSettled([
      service1.createEvidence(context, evidence1),
      service2.createEvidence(context, evidence2),
    ]);

    await evidenceBarrier.awaitReached();
    evidenceBarrier.release();

    const results = await writePromise;

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assertEquals(fulfilled.length, 1);
    assertEquals(rejected.length, 1);
    assertMatch(
      (rejected[0] as PromiseRejectedResult).reason.message,
      /payload changed; expected immutable replay/,
    );

    const counts = await queryCounts(pool);
    assertEquals(counts.evidenceCount, "1");

    await resetSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name: "PostgreSQL evidence write cross-scope Citation conflict rejection",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await resetSchema(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...auditActivityMigrations,
      ...evidenceKnowledgeMigrations,
    ]);

    const transactions = new PostgresTransactionRunner(pool);
    const repository = new EvidenceKnowledgeRepository();
    const verifier = new TestVerifier();
    const auth = { authorize: () => Promise.resolve(true) };
    const service = new PostgresVerifiedEvidenceWriteService(
      transactions,
      repository,
      verifier,
      auth,
    );

    const scope1 = fixtureScope();
    const scope2: EvidenceScope = {
      tenantId: required("tenant_other", parseTenantId),
      workspaceId: required("workspace_other", parseWorkspaceId),
      dealId: required("deal_other", parseDealId),
    };
    const context1 = fixtureContext(scope1);
    const context2 = fixtureContext(scope2);

    const citation1 = fixtureCitation(scope1, "citation_cross-scope");
    const citationCrossScope = fixtureCitation(scope2, "citation_cross-scope");

    await service.createCitation(context1, citation1);

    await assertRejects(
      () => service.createCitation(context2, citationCrossScope),
      Error,
      "payload changed; expected immutable replay",
    );

    const counts = await queryCounts(pool);
    assertEquals(counts.citationCount, "1");

    await resetSchema(pool);
    await pool.end();
  },
});

async function queryCounts(pool: pg.Pool) {
  const res = await pool.query<
    { citationCount: string; evidenceCount: string }
  >(
    `SELECT
      (SELECT count(*)::text FROM evidence_knowledge.citations) AS "citationCount",
      (SELECT count(*)::text FROM evidence_knowledge.evidence_records) AS "evidenceCount"`,
  );
  return res.rows[0];
}

async function resetSchema(pool: pg.Pool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS evidence_knowledge CASCADE");
  await pool.query("DROP SCHEMA IF EXISTS audit_activity CASCADE");
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

function fixtureContext(scope: EvidenceScope): RequestContext {
  const result = parseRequestContext({
    actorId: "actor_alice",
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: "cor_evidence-test",
    origin: "http",
  });
  if (!result.ok) throw new Error("Fixture context invalid.");
  return result.value;
}

function fixtureCitation(scope: EvidenceScope, idStr: string) {
  return createCitation({
    citationId: required(idStr, parseCitationId),
    scope,
    source: createExactDocumentVersionReference({
      documentVersionId: required("docver_cmdv1", parseDocumentVersionId),
      checksum: { algorithm: "sha256", value: "a".repeat(64) },
      location: { kind: "page", page: 1 },
      classification: "financial",
      processingVersion: "extractor-v1",
    }),
    excerpt: "Evidence write test excerpt",
    freshness: {
      state: "current",
      checkedAt: new Date("2026-08-04T12:00:00.000Z"),
    },
    createdAt: new Date("2026-08-04T12:00:00.000Z"),
  });
}

function fixtureEvidence(
  scope: EvidenceScope,
  citation: ReturnType<typeof fixtureCitation>,
  idStr: string,
) {
  return createEvidenceRecord({
    evidenceId: required(idStr, parseEvidenceId),
    scope,
    citation,
    createdAt: new Date("2026-08-04T12:00:00.000Z"),
  });
}

function required<T>(
  value: string,
  parser: (value: unknown) => { ok: true; value: T } | { ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}

function createBarrier(count: number) {
  let remaining = count;
  let resolveReached: () => void;
  const reached = new Promise<void>((res) => {
    resolveReached = res;
  });
  let resolveProceed: () => void;
  const proceed = new Promise<void>((res) => {
    resolveProceed = res;
  });

  return {
    async enter(): Promise<void> {
      remaining--;
      if (remaining === 0) resolveReached();
      await proceed;
    },
    awaitReached(): Promise<void> {
      return reached;
    },
    release(): void {
      resolveProceed();
    },
  };
}
