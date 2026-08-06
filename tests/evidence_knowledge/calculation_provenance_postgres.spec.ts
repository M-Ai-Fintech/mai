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
import { createInterpretation } from "../../src/evidence_knowledge/interpretation.ts";
import { createAssumption } from "../../src/evidence_knowledge/assumption.ts";
import {
  createCalculation,
  createEvidenceRecord,
  createExactDocumentVersionReference,
  createFact,
  createFactVersion,
} from "../../src/evidence_knowledge/model.ts";
import {
  parseAssumptionId,
  parseCalculationId,
  parseCitationId,
  parseEvidenceId,
  parseFactId,
  parseFactVersionId,
  parseInterpretationId,
} from "../../src/evidence_knowledge/ids.ts";
import { parseDocumentVersionId } from "../../src/documents/ids.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = Deno.env.get("EVIDENCE_KNOWLEDGE_DATABASE_URL") ??
  postgresIntegrationTestDatabaseUrl();

Deno.test({
  name: "calculation provenance resolves every input kind in one scope",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
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
      evidenceId: required("evidence_calc", parseEvidenceId),
      scope,
      citation,
      createdAt: now(),
    });
    const factId = required("fact_calc", parseFactId);
    const factVersionId = required("factver_calc-v1", parseFactVersionId);
    const interpretationId = required("interp_calc", parseInterpretationId);
    const assumptionId = required("assumption_calc", parseAssumptionId);
    await transactions.run(async (transaction) => {
      await repository.insertCitation(transaction, citation);
      await repository.insertEvidence(transaction, evidence);
      await repository.insertFact(
        transaction,
        createFact({
          factId,
          scope,
          category: "financial",
          status: "proposed",
          aggregateVersion: 1,
          createdAt: now(),
        }),
      );
      await repository.insertFactVersion(
        transaction,
        createFactVersion({
          factVersionId,
          factId,
          scope,
          statement: "Calculation fact",
          category: "financial",
          status: "proposed",
          versionNumber: 1,
          citationIds: [citation.citationId],
          createdAt: now(),
        }),
      );
      await repository.insertInterpretation(
        transaction,
        createInterpretation({
          interpretationId,
          scope,
          statement: "Calculation interpretation",
          evidenceIds: [evidence.evidenceId],
          status: "proposed",
          createdAt: now(),
        }),
      );
      await repository.insertAssumption(
        transaction,
        createAssumption({
          assumptionId,
          scope,
          statement: "Calculation assumption",
          status: "proposed",
          createdAt: now(),
        }),
      );
    });
    await transactions.run((transaction) =>
      repository.insertCalculation(
        transaction,
        calculation(scope, [
          { kind: "evidence", evidenceId: evidence.evidenceId },
          { kind: "fact_version", factVersionId },
          { kind: "interpretation", interpretationId },
          { kind: "assumption", assumptionId },
        ]),
      )
    );
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.insertCalculation(
            transaction,
            calculation(scope, [{
              kind: "evidence",
              evidenceId: required("evidence_missing", parseEvidenceId),
            }], "calc_invalid"),
          )
        ),
      Error,
      "not found in scope",
    );
    const counts = await pool.query<{ calculations: string; inputs: string }>(
      `SELECT (SELECT count(*)::text FROM evidence_knowledge.calculations) AS calculations, (SELECT count(*)::text FROM evidence_knowledge.calculation_inputs) AS inputs`,
    );
    assertEquals(counts.rows[0], { calculations: "1", inputs: "4" });
    await reset(pool);
    await pool.end();
  },
});

function calculation(
  scope: ReturnType<typeof fixtureScope>,
  inputReferences: Parameters<typeof createCalculation>[0]["inputReferences"],
  id = "calc_valid",
) {
  return createCalculation({
    calculationId: required(id, parseCalculationId),
    scope,
    inputReferences,
    formula: "sum",
    algorithmVersion: "calc-v1",
    output: { value: 1 },
    freshness: { state: "current", checkedAt: now() },
    createdAt: now(),
  });
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
    citationId: required("citation_calc", parseCitationId),
    scope,
    source: createExactDocumentVersionReference({
      documentVersionId: required("docver_calc-v1", parseDocumentVersionId),
      checksum: { algorithm: "sha256", value: "a".repeat(64) },
      location: { kind: "page", page: 1 },
      classification: "financial",
      processingVersion: "extractor-v1",
    }),
    excerpt: "Calculation evidence.",
    freshness: { state: "current", checkedAt: now() },
    createdAt: now(),
  });
}
function now(): Date {
  return new Date("2026-08-04T12:00:00.000Z");
}
function required<T>(
  value: string,
  parser: (value: unknown) => { ok: true; value: T } | { ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
async function reset(pool: pg.Pool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS evidence_knowledge CASCADE");
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner=$1",
    ["evidence_knowledge"],
  ).catch(() => {});
}
