import { parseDocumentVersionId } from "../documents/ids.ts";
import {
  parseCalculationId,
  parseCitationId,
  parseEvidenceId,
  parseFactId,
  parseFactVersionId,
} from "./ids.ts";
import { createCitation } from "./citation.ts";
import { createFreshness } from "./freshness.ts";
import {
  type Calculation,
  type CitationLocation,
  createCalculation,
  createEvidenceRecord,
  createExactDocumentVersionReference,
  createFact,
  createFactVersion,
  type EvidenceScope,
  type Fact,
  type FactVersion,
} from "./model.ts";
import type { Citation } from "./citation.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../platform/api/v1.ts";

export function rowToCitation(row: Record<string, unknown>): Citation {
  return createCitation({
    citationId: identifier(row, "citationId", parseCitationId),
    scope: rowScope(row),
    source: createExactDocumentVersionReference({
      documentVersionId: identifier(
        row,
        "documentVersionId",
        parseDocumentVersionId,
      ),
      checksum: { algorithm: "sha256", value: text(row, "checksumValue") },
      location: citationLocation(row.location),
      classification: classification(row, "classification"),
      processingVersion: text(row, "processingVersion"),
    }),
    excerpt: text(row, "excerpt"),
    freshness: createFreshness({
      state: freshnessState(row, "freshnessState"),
      reason: optionalText(row, "freshnessReason"),
      checkedAt: date(row, "freshnessCheckedAt"),
    }),
    createdAt: date(row, "createdAt"),
  });
}

export function rowToEvidence(row: Record<string, unknown>) {
  return createEvidenceRecord({
    evidenceId: identifier(row, "evidenceId", parseEvidenceId),
    scope: rowScope(row),
    citation: rowToCitation(row),
    createdAt: date(row, "createdAt"),
  });
}

export function rowToFact(row: Record<string, unknown>): Fact {
  return createFact({
    factId: identifier(row, "factId", parseFactId),
    scope: rowScope(row),
    category: factCategory(row, "category"),
    status: factStatus(row, "status"),
    aggregateVersion: positiveNumber(row, "aggregateVersion"),
    createdAt: date(row, "createdAt"),
  });
}

export function rowToFactVersion(row: Record<string, unknown>): FactVersion {
  return createFactVersion({
    factVersionId: identifier(row, "factVersionId", parseFactVersionId),
    factId: identifier(row, "factId", parseFactId),
    scope: rowScope(row),
    statement: text(row, "statement"),
    category: factCategory(row, "category"),
    status: factStatus(row, "status"),
    versionNumber: positiveNumber(row, "versionNumber"),
    citationIds: array(row, "citationIds") as never,
    supersedesFactVersionId: optionalIdentifier(
      row,
      "supersedesFactVersionId",
      parseFactVersionId,
    ),
    createdAt: date(row, "createdAt"),
  });
}

export function rowToCalculation(row: Record<string, unknown>): Calculation {
  return createCalculation({
    calculationId: identifier(row, "calculationId", parseCalculationId),
    scope: rowScope(row),
    inputReferences: array(row, "inputReferences") as never,
    formula: text(row, "formula"),
    algorithmVersion: text(row, "algorithmVersion"),
    output: record(row.output, "output"),
    freshness: createFreshness({
      state: freshnessState(row, "freshnessState"),
      reason: optionalText(row, "freshnessReason"),
      checkedAt: date(row, "freshnessCheckedAt"),
    }),
    createdAt: date(row, "createdAt"),
  });
}

function rowScope(row: Record<string, unknown>): EvidenceScope {
  return {
    tenantId: identifier(row, "tenantId", parseTenantId),
    workspaceId: identifier(row, "workspaceId", parseWorkspaceId),
    dealId: identifier(row, "dealId", parseDealId),
  };
}
function identifier<T>(
  row: Record<string, unknown>,
  key: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parser(row[key]);
  if (result.ok) return result.value;
  throw new Error(
    `Evidence row field "${key}" value "${
      String(row[key])
    }" is invalid; expected a branded identifier.`,
  );
}
function optionalIdentifier<T>(
  row: Record<string, unknown>,
  key: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T | undefined {
  return row[key] === null || row[key] === undefined
    ? undefined
    : identifier(row, key, parser);
}
function text(row: Record<string, unknown>, key: string): string {
  if (typeof row[key] === "string") return row[key] as string;
  throw new Error(
    `Evidence row field "${key}" value "${
      String(row[key])
    }" is invalid; expected text.`,
  );
}
function optionalText(
  row: Record<string, unknown>,
  key: string,
): string | undefined {
  return row[key] === null || row[key] === undefined
    ? undefined
    : text(row, key);
}
function date(row: Record<string, unknown>, key: string): Date {
  const value = row[key] instanceof Date
    ? row[key] as Date
    : new Date(String(row[key]));
  if (!Number.isNaN(value.getTime())) return value;
  throw new Error(
    `Evidence row field "${key}" value "${
      String(row[key])
    }" is invalid; expected a timestamp.`,
  );
}
function positiveNumber(row: Record<string, unknown>, key: string): number {
  const value = typeof row[key] === "string" ? Number(row[key]) : row[key];
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value;
  }
  throw new Error(
    `Evidence row field "${key}" value "${
      String(row[key])
    }" is invalid; expected a positive integer.`,
  );
}
function record(value: unknown, key: string): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(
    `Evidence row field "${key}" is invalid; expected a JSON object.`,
  );
}
function citationLocation(value: unknown): CitationLocation {
  const location = record(value, "location");
  if (location.kind === "page" && typeof location.page === "number") {
    return location as unknown as CitationLocation;
  }
  if (
    location.kind === "line" && typeof location.startLine === "number" &&
    typeof location.endLine === "number"
  ) return location as unknown as CitationLocation;
  if (
    location.kind === "character" && typeof location.start === "number" &&
    typeof location.end === "number"
  ) return location as unknown as CitationLocation;
  if (location.kind === "artifact" && typeof location.artifactId === "string") {
    return location as unknown as CitationLocation;
  }
  throw new Error(
    `Evidence citation location "${
      JSON.stringify(value)
    }" is invalid; expected a supported location.`,
  );
}
function array(row: Record<string, unknown>, key: string): unknown[] {
  if (Array.isArray(row[key])) return row[key] as unknown[];
  throw new Error(
    `Evidence row field "${key}" is invalid; expected a JSON array.`,
  );
}
function classification(
  row: Record<string, unknown>,
  key: string,
): "legal" | "financial" | "tax" | "operational" | "other" {
  const value = text(row, key);
  if (["legal", "financial", "tax", "operational", "other"].includes(value)) {
    return value as never;
  }
  throw new Error(
    `Evidence row field "${key}" value "${value}" is invalid; expected a supported classification.`,
  );
}
function factCategory(
  row: Record<string, unknown>,
  key: string,
): "identity" | "financial" | "legal" | "operational" | "tax" {
  const value = text(row, key);
  if (
    ["identity", "financial", "legal", "operational", "tax"].includes(value)
  ) return value as never;
  throw new Error(
    `Evidence row field "${key}" value "${value}" is invalid; expected a fact category.`,
  );
}
function factStatus(
  row: Record<string, unknown>,
  key: string,
): "proposed" | "approved" | "superseded" {
  const value = text(row, key);
  if (["proposed", "approved", "superseded"].includes(value)) {
    return value as never;
  }
  throw new Error(
    `Evidence row field "${key}" value "${value}" is invalid; expected a fact status.`,
  );
}
function freshnessState(
  row: Record<string, unknown>,
  key: string,
): "current" | "stale" | "missing" | "inaccessible" | "unsupported" {
  const value = text(row, key);
  if (
    ["current", "stale", "missing", "inaccessible", "unsupported"].includes(
      value,
    )
  ) return value as never;
  throw new Error(
    `Evidence row field "${key}" value "${value}" is invalid; expected a freshness state.`,
  );
}
