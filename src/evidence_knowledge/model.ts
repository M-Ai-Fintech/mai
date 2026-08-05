import type { DocumentVersionId } from "../documents/ids.ts";
import type { DealId, TenantId, WorkspaceId } from "../platform/api/v1.ts";
import type {
  AssumptionId,
  CalculationId,
  CitationId,
  EvidenceId,
  FactId,
  FactVersionId,
  InterpretationId,
} from "./ids.ts";
import type { Freshness } from "./freshness.ts";

export type EvidenceClassification =
  | "legal"
  | "financial"
  | "tax"
  | "operational"
  | "other";
export interface EvidenceScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}
export interface Checksum {
  readonly algorithm: "sha256";
  readonly value: string;
}
export type CitationLocation =
  | { readonly kind: "page"; readonly page: number }
  | {
    readonly kind: "line";
    readonly startLine: number;
    readonly endLine: number;
  }
  | { readonly kind: "character"; readonly start: number; readonly end: number }
  | { readonly kind: "artifact"; readonly artifactId: string };

export interface ExactDocumentVersionReference {
  readonly documentVersionId: DocumentVersionId;
  readonly checksum: Checksum;
  readonly location: CitationLocation;
  readonly classification: EvidenceClassification;
  readonly processingVersion: string;
}

export interface EvidenceRecord {
  readonly evidenceId: EvidenceId;
  readonly scope: EvidenceScope;
  readonly citation: import("./citation.ts").Citation;
  readonly createdAt: Date;
}

export type FactCategory =
  | "identity"
  | "financial"
  | "legal"
  | "operational"
  | "tax";
export type FactStatus = "proposed" | "approved" | "superseded";
export interface Fact {
  readonly factId: FactId;
  readonly scope: EvidenceScope;
  readonly category: FactCategory;
  readonly status: FactStatus;
  readonly currentFactVersionId?: FactVersionId;
  readonly aggregateVersion: number;
  readonly createdAt: Date;
}
export interface FactVersion {
  readonly factVersionId: FactVersionId;
  readonly factId: FactId;
  readonly scope: EvidenceScope;
  readonly statement: string;
  readonly category: FactCategory;
  readonly status: FactStatus;
  readonly versionNumber: number;
  readonly citationIds: readonly CitationId[];
  readonly supersedesFactVersionId?: FactVersionId;
  readonly createdAt: Date;
}

export interface Interpretation {
  readonly interpretationId: InterpretationId;
  readonly scope: EvidenceScope;
  readonly statement: string;
  readonly evidenceIds: readonly EvidenceId[];
  readonly status: "proposed";
  readonly createdAt: Date;
}

export interface Assumption {
  readonly assumptionId: AssumptionId;
  readonly scope: EvidenceScope;
  readonly statement: string;
  readonly rationale?: string;
  readonly status: "proposed";
  readonly createdAt: Date;
}

export type CalculationInputReference =
  | { readonly kind: "evidence"; readonly evidenceId: EvidenceId }
  | { readonly kind: "fact_version"; readonly factVersionId: FactVersionId }
  | {
    readonly kind: "interpretation";
    readonly interpretationId: InterpretationId;
  }
  | { readonly kind: "assumption"; readonly assumptionId: AssumptionId };
export interface Calculation {
  readonly calculationId: CalculationId;
  readonly scope: EvidenceScope;
  readonly inputReferences: readonly CalculationInputReference[];
  readonly formula: string;
  readonly algorithmVersion: string;
  readonly output: Readonly<Record<string, unknown>>;
  readonly freshness: Freshness;
  readonly createdAt: Date;
}

export type IndexMetadataState = "active" | "stale" | "rebuilding" | "disabled";
export interface IndexMetadata {
  readonly indexId: import("./ids.ts").IndexId;
  readonly scope: EvidenceScope;
  readonly documentVersionId: DocumentVersionId;
  readonly classification: EvidenceClassification;
  readonly processingVersion: string;
  readonly indexVersion: number;
  readonly state: IndexMetadataState;
  readonly createdAt: Date;
}

export interface InvalidationRecord {
  readonly invalidationId: import("./ids.ts").InvalidationId;
  readonly scope: EvidenceScope;
  readonly sourceKind: "evidence" | "fact_version";
  readonly sourceId: string;
  readonly reason: string;
  readonly eventIdentity: string;
  readonly createdAt: Date;
}

export function createExactDocumentVersionReference(
  input: ExactDocumentVersionReference,
): ExactDocumentVersionReference {
  assertChecksum(input.checksum);
  assertLocation(input.location);
  assertText(input.processingVersion, "Processing version", 128);
  return Object.freeze({
    ...input,
    checksum: Object.freeze({ ...input.checksum }),
    location: Object.freeze({ ...input.location }),
  });
}

export function createEvidenceRecord(input: EvidenceRecord): EvidenceRecord {
  assertScope(input.scope);
  assertDate(input.createdAt, "Evidence created timestamp");
  if (
    input.citation.scope !== input.scope &&
    !sameScope(input.citation.scope, input.scope)
  ) {
    throw new Error(
      `Evidence citation scope does not match evidence scope "${
        scopeKey(input.scope)
      }".`,
    );
  }
  return Object.freeze({ ...input, scope: Object.freeze({ ...input.scope }) });
}

export function createFact(input: Fact): Fact {
  assertScope(input.scope);
  assertPositive(input.aggregateVersion, "Fact aggregate version");
  assertDate(input.createdAt, "Fact created timestamp");
  return Object.freeze({ ...input, scope: Object.freeze({ ...input.scope }) });
}

export function createFactVersion(input: FactVersion): FactVersion {
  assertScope(input.scope);
  assertText(input.statement, "Fact statement", 4096);
  assertPositive(input.versionNumber, "Fact version number");
  assertDate(input.createdAt, "Fact version created timestamp");
  if (input.citationIds.length === 0) {
    throw new Error(
      "Fact citation IDs are empty; expected at least one exact citation.",
    );
  }
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    citationIds: Object.freeze([...input.citationIds]),
  });
}

export function createCalculation(input: Calculation): Calculation {
  assertScope(input.scope);
  assertText(input.formula, "Calculation formula", 512);
  assertText(input.algorithmVersion, "Calculation algorithm version", 128);
  if (input.inputReferences.length === 0) {
    throw new Error(
      "Calculation input references are empty; expected exact provenance inputs.",
    );
  }
  assertDate(input.createdAt, "Calculation created timestamp");
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    inputReferences: Object.freeze([...input.inputReferences]),
    output: Object.freeze({ ...input.output }),
  });
}

export function sameScope(left: EvidenceScope, right: EvidenceScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function assertScope(scope: EvidenceScope): void {
  assertText(scope.tenantId, "Evidence tenant ID", 96);
  assertText(scope.workspaceId, "Evidence workspace ID", 96);
  assertText(scope.dealId, "Evidence deal ID", 96);
}
function assertChecksum(checksum: Checksum): void {
  if (
    checksum.algorithm === "sha256" && /^[0-9a-f]{64}$/.test(checksum.value)
  ) return;
  throw new Error(
    `Evidence checksum "${checksum.algorithm}:${checksum.value}" is invalid; expected lowercase SHA-256.`,
  );
}
function assertLocation(location: CitationLocation): void {
  const valid = location.kind === "page"
    ? Number.isSafeInteger(location.page) && location.page > 0
    : location.kind === "line"
    ? Number.isSafeInteger(location.startLine) &&
      Number.isSafeInteger(location.endLine) && location.startLine > 0 &&
      location.endLine >= location.startLine
    : location.kind === "character"
    ? Number.isSafeInteger(location.start) &&
      Number.isSafeInteger(location.end) && location.start >= 0 &&
      location.end > location.start
    : Boolean(location.artifactId?.trim());
  if (valid) return;
  throw new Error(
    `Citation location "${
      JSON.stringify(location)
    }" is invalid; expected a positive page, range, or artifact.`,
  );
}
function assertPositive(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new Error(
    `${label} "${value}" is invalid; expected a positive safe integer.`,
  );
}
function assertText(value: string, label: string, maximum: number): void {
  if (typeof value === "string" && value.trim() && value.length <= maximum) {
    return;
  }
  throw new Error(
    `${label} "${value}" is invalid; expected 1-${maximum} non-whitespace characters.`,
  );
}
function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `${label} "${String(value)}" is invalid; expected a valid Date.`,
  );
}
function scopeKey(scope: EvidenceScope): string {
  return `${scope.tenantId}/${scope.workspaceId}/${scope.dealId}`;
}
