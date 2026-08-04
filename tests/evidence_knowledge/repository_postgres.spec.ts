import { assertEquals, assertRejects } from "@std/assert";
import pg from "pg";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import { evidenceKnowledgeMigrations } from "../../src/evidence_knowledge/migrations/index.ts";
import { EvidenceKnowledgeRepository } from "../../src/evidence_knowledge/repository.ts";
import { createCitation } from "../../src/evidence_knowledge/citation.ts";
import {
  createEvidenceRecord,
  createExactDocumentVersionReference,
  createFact,
  createFactVersion,
} from "../../src/evidence_knowledge/model.ts";
import {
  parseCitationId,
  parseEvidenceId,
  parseFactId,
  parseFactVersionId,
  parseIndexId,
} from "../../src/evidence_knowledge/ids.ts";
import { parseDocumentVersionId } from "../../src/documents/ids.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ??
  mai106DatabaseUrl();

Deno.test({
  name:
    "Evidence Knowledge repository preserves scope and append-only fact history",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await reset(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...evidenceKnowledgeMigrations,
    ]);
    const transactions = new PostgresTransactionRunner(pool);
    const repository = new EvidenceKnowledgeRepository();
    const scope = fixtureScope();
    const citation = fixtureCitation(scope);
    const evidence = createEvidenceRecord({
      evidenceId: required("evidence_net-debt", parseEvidenceId),
      scope,
      citation,
      createdAt: now(),
    });
    await transactions.run(async (transaction) => {
      await repository.insertCitation(transaction, citation);
      await repository.insertEvidence(transaction, evidence);
    });
    await assertRejects(
      () =>
        pool.query(
          `INSERT INTO evidence_knowledge.evidence_records (evidence_id, tenant_id, workspace_id, deal_id, citation_id, created_at) VALUES ('evidence_orphan','tenant_acme','workspace_dealroom','deal_horizon','citation_missing',$1)`,
          [now()],
        ),
      Error,
    );
    await assertRejects(
      () =>
        pool.query(
          `INSERT INTO evidence_knowledge.evidence_records (evidence_id, tenant_id, workspace_id, deal_id, citation_id, created_at) VALUES ('evidence_cross_scope','tenant_acme','workspace_dealroom','deal_other','citation_contract',$1)`,
          [now()],
        ),
      Error,
    );
    assertEquals(
      await transactions.run((transaction) =>
        repository.findEvidence(transaction, scope, evidence.evidenceId)
      )?.then((value) => value?.citation.source.documentVersionId),
      "docver_contract-v1",
    );
    assertEquals(
      await transactions.run((transaction) =>
        repository.findEvidence(transaction, {
          ...scope,
          dealId: required("deal_other", parseDealId),
        }, evidence.evidenceId)
      ),
      undefined,
    );
    const fact = createFact({
      factId: required("fact_net-debt", parseFactId),
      scope,
      category: "financial",
      status: "proposed",
      aggregateVersion: 1,
      createdAt: now(),
    });
    const version = createFactVersion({
      factVersionId: required("factver_net-debt-v1", parseFactVersionId),
      factId: fact.factId,
      scope,
      statement: "Net debt is EUR 10m.",
      category: "financial",
      status: "proposed",
      versionNumber: 1,
      citationIds: [citation.citationId],
      createdAt: now(),
    });
    await transactions.run(async (transaction) => {
      await repository.insertFact(transaction, fact);
      await repository.insertFactVersion(transaction, version);
    });
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.insertFactVersion(
            transaction,
            createFactVersion({
              factVersionId: required(
                "factver_net-debt-v2",
                parseFactVersionId,
              ),
              factId: fact.factId,
              scope,
              statement: "Invalid supersession",
              category: "financial",
              status: "proposed",
              versionNumber: 2,
              citationIds: [citation.citationId],
              supersedesFactVersionId: version.factVersionId,
              createdAt: now(),
            }),
          )
        ),
      Error,
      "expected the same fact",
    );
    await transactions.run(async (transaction) => {
      await repository.insertIndexMetadata(transaction, {
        indexId: required("index_financial", parseIndexId),
        scope,
        documentVersionId: citation.source.documentVersionId,
        classification: "financial",
        processingVersion: "extractor-v1",
        indexVersion: 1,
        state: "active",
        createdAt: now(),
      });
      await repository.insertIndexMetadata(transaction, {
        indexId: required("index_legal", parseIndexId),
        scope,
        documentVersionId: citation.source.documentVersionId,
        classification: "legal",
        processingVersion: "extractor-v1",
        indexVersion: 1,
        state: "active",
        createdAt: now(),
      });
    });
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.insertIndexMetadata(transaction, {
            indexId: required("index_duplicate", parseIndexId),
            scope,
            documentVersionId: citation.source.documentVersionId,
            classification: "financial",
            processingVersion: "extractor-v1",
            indexVersion: 1,
            state: "active",
            createdAt: now(),
          })
        ),
      Error,
    );
    await assertRejects(
      () =>
        pool.query(
          "UPDATE evidence_knowledge.fact_versions SET statement='changed'",
        ),
      Error,
      "append-only",
    );
    await reset(pool);
    await pool.end();
  },
});

async function reset(pool: pg.Pool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS evidence_knowledge CASCADE");
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
    citationId: required("citation_contract", parseCitationId),
    scope,
    source: createExactDocumentVersionReference({
      documentVersionId: required("docver_contract-v1", parseDocumentVersionId),
      checksum: { algorithm: "sha256", value: "a".repeat(64) },
      location: { kind: "page", page: 7 },
      classification: "financial",
      processingVersion: "extractor-v1",
    }),
    excerpt: "Net debt is EUR 10m.",
    freshness: { state: "current", checkedAt: now() },
    createdAt: now(),
  });
}
function now(): Date {
  return new Date("2026-08-04T12:00:00.000Z");
}
function required<T>(
  value: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
