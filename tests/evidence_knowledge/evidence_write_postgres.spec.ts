import { assertEquals, assertRejects } from "@std/assert";
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
import type {
  TransactionHandle,
} from "../../src/platform/persistence/v1.ts";
import type { Citation } from "../../src/evidence_knowledge/citation.ts";
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
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ??
  mai106DatabaseUrl();

class TestVerifier implements ExactDocumentVersionVerificationPort {
  constructor(private readonly shouldPass: boolean = true) {}

  verify(
    _context: RequestContext,
    scope: EvidenceScope,
    reference: ExactDocumentVersionReference,
  ): Promise<VerifiedExactDocumentVersion> {
    if (!this.shouldPass) {
      return Promise.reject(
        new Error("Exact Document Version verification failed."),
      );
    }
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
  name: "PostgreSQL evidence write fresh write and exact replay",
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
    const verifier = new TestVerifier(true);
    const auth = { authorize: () => Promise.resolve(true) };
    const service = new PostgresVerifiedEvidenceWriteService(
      transactions,
      repository,
      verifier,
      auth,
    );

    const scope = fixtureScope();
    const context = fixtureContext(scope);
    const citation = fixtureCitation(scope, "citation_replay1");
    const evidence = fixtureEvidence(scope, citation, "evidence_replay1");

    await service.createEvidence(context, evidence);

    const counts1 = await queryCounts(pool);
    assertEquals(counts1.citationCount, "1");
    assertEquals(counts1.evidenceCount, "1");

    await service.createEvidence(context, evidence);

    const counts2 = await queryCounts(pool);
    assertEquals(counts2.citationCount, "1");
    assertEquals(counts2.evidenceCount, "1");

    await resetSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name: "PostgreSQL evidence write citation conflict rejection",
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
    const verifier = new TestVerifier(true);
    const auth = { authorize: () => Promise.resolve(true) };
    const service = new PostgresVerifiedEvidenceWriteService(
      transactions,
      repository,
      verifier,
      auth,
    );

    const scope = fixtureScope();
    const context = fixtureContext(scope);
    const citation = fixtureCitation(scope, "citation_conflict1");
    const evidence = fixtureEvidence(scope, citation, "evidence_conflict1");

    await service.createEvidence(context, evidence);

    const conflictingCitation = createCitation({
      ...citation,
      excerpt: "Changed excerpt content",
    });

    await assertRejects(
      () => service.createCitation(context, conflictingCitation),
      Error,
      "payload changed; expected immutable replay",
    );

    const counts = await queryCounts(pool);
    assertEquals(counts.citationCount, "1");
    assertEquals(counts.evidenceCount, "1");

    await resetSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name: "PostgreSQL evidence write evidence conflict rejection",
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
    const verifier = new TestVerifier(true);
    const auth = { authorize: () => Promise.resolve(true) };
    const service = new PostgresVerifiedEvidenceWriteService(
      transactions,
      repository,
      verifier,
      auth,
    );

    const scope = fixtureScope();
    const context = fixtureContext(scope);
    const citation1 = fixtureCitation(scope, "citation_evconf1");
    const citation2 = fixtureCitation(scope, "citation_evconf2");
    const evidence1 = fixtureEvidence(scope, citation1, "evidence_evconf1");
    const conflictingEvidence = fixtureEvidence(
      scope,
      citation2,
      "evidence_evconf1",
    );

    await service.createEvidence(context, evidence1);

    await assertRejects(
      () => service.createEvidence(context, conflictingEvidence),
      Error,
      "payload changed; expected immutable replay",
    );

    const counts = await queryCounts(pool);
    assertEquals(counts.citationCount, "1");
    assertEquals(counts.evidenceCount, "1");

    await resetSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name: "PostgreSQL evidence write atomic rollback on error",
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
    const verifier = new TestVerifier(true);
    const auth = { authorize: () => Promise.resolve(true) };

    const failingRepository = {
      ...repository,
      insertOrValidateCitation: (t: unknown, c: unknown) =>
        repository.insertOrValidateCitation(t as TransactionHandle, c as Citation),
      insertOrValidateEvidence: () =>
        Promise.reject(new Error("Simulated database failure")),
    } as unknown as EvidenceKnowledgeRepository;

    const service = new PostgresVerifiedEvidenceWriteService(
      transactions,
      failingRepository,
      verifier,
      auth,
    );

    const scope = fixtureScope();
    const context = fixtureContext(scope);
    const citation = fixtureCitation(scope, "citation_rollback1");
    const evidence = fixtureEvidence(scope, citation, "evidence_rollback1");

    await assertRejects(
      () => service.createEvidence(context, evidence),
      Error,
      "Simulated database failure",
    );

    const counts = await queryCounts(pool);
    assertEquals(counts.citationCount, "0");
    assertEquals(counts.evidenceCount, "0");

    await resetSchema(pool);
    await pool.end();
  },
});

Deno.test({
  name:
    "PostgreSQL evidence write authorization and verification rejection leaves zero rows",
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
    const context = fixtureContext(scope);
    const citation = fixtureCitation(scope, "citation_rej1");
    const evidence = fixtureEvidence(scope, citation, "evidence_rej1");

    const forbiddenAuth = { authorize: () => Promise.resolve(false) };
    const forbiddenService = new PostgresVerifiedEvidenceWriteService(
      transactions,
      repository,
      new TestVerifier(true),
      forbiddenAuth,
    );

    await assertRejects(
      () => forbiddenService.createEvidence(context, evidence),
      Error,
      "forbidden",
    );

    const countsAuth = await queryCounts(pool);
    assertEquals(countsAuth.citationCount, "0");
    assertEquals(countsAuth.evidenceCount, "0");

    const failingVerifierService = new PostgresVerifiedEvidenceWriteService(
      transactions,
      repository,
      new TestVerifier(false),
      { authorize: () => Promise.resolve(true) },
    );

    await assertRejects(
      () => failingVerifierService.createEvidence(context, evidence),
      Error,
      "verification failed",
    );

    const countsVerif = await queryCounts(pool);
    assertEquals(countsVerif.citationCount, "0");
    assertEquals(countsVerif.evidenceCount, "0");

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
