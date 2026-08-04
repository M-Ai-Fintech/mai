import { assert, assertEquals, assertFalse } from "@std/assert";
import {
  parseCalculationId,
  parseCitationId,
  parseEvidenceId,
  parseFactId,
  parseFactVersionId,
} from "../../src/evidence_knowledge/ids.ts";
import { parseDocumentVersionId } from "../../src/documents/ids.ts";
import {
  createCalculation,
  createEvidenceRecord,
  createExactDocumentVersionReference,
  createFact,
  createFactVersion,
} from "../../src/evidence_knowledge/model.ts";
import { createCitation } from "../../src/evidence_knowledge/citation.ts";
import { createFreshness } from "../../src/evidence_knowledge/freshness.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";

Deno.test("evidence records require exact immutable source identity", () => {
  const source = createExactDocumentVersionReference({
    documentVersionId: required("docver_contract-v1", parseDocumentVersionId),
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    location: { kind: "page", page: 7 },
    classification: "financial",
    processingVersion: "extractor-2026-08-04",
  });
  const citation = createCitation({
    citationId: requiredCitation("citation_contract"),
    scope: fixtureScope(),
    source,
    excerpt: "Net debt is EUR 10m.",
    freshness: createFreshness({
      state: "current",
      checkedAt: timestamp(),
    }),
    createdAt: timestamp(),
  });
  const evidence = createEvidenceRecord({
    evidenceId: requiredEvidence("evidence_net-debt"),
    scope: fixtureScope(),
    citation,
    createdAt: timestamp(),
  });

  assertEquals(
    evidence.citation.source.documentVersionId,
    "docver_contract-v1",
  );
  assert(Object.isFrozen(evidence));
  assert(Object.isFrozen(evidence.citation));
  assertFalse(Reflect.set(citation, "excerpt", "changed"));
});

Deno.test("facts separate proposed, approved, and superseded versions", () => {
  const fact = createFact({
    factId: requiredFact("fact_net-debt"),
    scope: fixtureScope(),
    category: "financial",
    status: "proposed",
    aggregateVersion: 1,
    createdAt: timestamp(),
  });
  const version = createFactVersion({
    factVersionId: requiredFactVersion("factver_net-debt-v1"),
    factId: fact.factId,
    scope: fact.scope,
    statement: "Net debt is EUR 10m.",
    category: fact.category,
    status: "approved",
    versionNumber: 1,
    citationIds: [requiredCitation("citation_contract")],
    createdAt: timestamp(),
  });

  assertEquals(version.status, "approved");
  assert(Object.isFrozen(version));
  assertFalse("interpretation" in version);
  assertFalse(Reflect.set(version, "statement", "EUR 11m."));
});

Deno.test("calculations capture exact inputs and algorithm provenance", () => {
  const calculation = createCalculation({
    calculationId: requiredCalculation("calc_net-debt"),
    scope: fixtureScope(),
    inputReferences: [{
      kind: "fact_version",
      factVersionId: requiredFactVersion("factver_net-debt-v1"),
    }],
    formula: "net_debt",
    algorithmVersion: "calc-2026-08-04",
    output: { amount: 10_000_000, currency: "EUR" },
    freshness: createFreshness({ state: "current", checkedAt: timestamp() }),
    createdAt: timestamp(),
  });

  assertEquals(calculation.inputReferences[0].kind, "fact_version");
  assert(Object.isFrozen(calculation));
  assertFalse(Reflect.set(calculation, "formula", "other"));
});

function fixtureScope() {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}

function timestamp(): Date {
  return new Date("2026-08-04T12:00:00.000Z");
}

function requiredEvidence(value: string) {
  return required(value, parseEvidenceId);
}
function requiredCitation(value: string) {
  return required(value, parseCitationId);
}
function requiredFact(value: string) {
  return required(value, parseFactId);
}
function requiredFactVersion(value: string) {
  return required(value, parseFactVersionId);
}
function requiredCalculation(value: string) {
  return required(value, parseCalculationId);
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
