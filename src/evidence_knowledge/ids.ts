const MAX_IDENTIFIER_LENGTH = 96;

const brands = {
  evidence: Symbol("evidence-id"),
  citation: Symbol("citation-id"),
  fact: Symbol("fact-id"),
  factVersion: Symbol("fact-version-id"),
  interpretation: Symbol("interpretation-id"),
  assumption: Symbol("assumption-id"),
  calculation: Symbol("calculation-id"),
  provenance: Symbol("provenance-id"),
  index: Symbol("index-id"),
  invalidation: Symbol("invalidation-id"),
} as const;

export type EvidenceId = string & { readonly [brands.evidence]: "EvidenceId" };
export type CitationId = string & { readonly [brands.citation]: "CitationId" };
export type FactId = string & { readonly [brands.fact]: "FactId" };
export type FactVersionId = string & {
  readonly [brands.factVersion]: "FactVersionId";
};
export type InterpretationId = string & {
  readonly [brands.interpretation]: "InterpretationId";
};
export type AssumptionId = string & {
  readonly [brands.assumption]: "AssumptionId";
};
export type CalculationId = string & {
  readonly [brands.calculation]: "CalculationId";
};
export type ProvenanceId = string & {
  readonly [brands.provenance]: "ProvenanceId";
};
export type IndexId = string & { readonly [brands.index]: "IndexId" };
export type InvalidationId = string & {
  readonly [brands.invalidation]: "InvalidationId";
};

export type EvidenceIdentifierIssueCode =
  | "INVALID_TYPE"
  | "EMPTY"
  | "SURROUNDING_WHITESPACE"
  | "WRONG_PREFIX"
  | "INCOMPLETE"
  | "INVALID_LENGTH"
  | "INVALID_FORMAT";

export type EvidenceIdentifierResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
    readonly ok: false;
    readonly issue: { readonly code: EvidenceIdentifierIssueCode };
  };

export const parseEvidenceId = parser<EvidenceId>("evidence_");
export const parseCitationId = parser<CitationId>("citation_");
export const parseFactId = parser<FactId>("fact_");
export const parseFactVersionId = parser<FactVersionId>("factver_");
export const parseInterpretationId = parser<InterpretationId>("interp_");
export const parseAssumptionId = parser<AssumptionId>("assumption_");
export const parseCalculationId = parser<CalculationId>("calc_");
export const parseProvenanceId = parser<ProvenanceId>("prov_");
export const parseIndexId = parser<IndexId>("index_");
export const parseInvalidationId = parser<InvalidationId>("invalidation_");

function parser<T>(
  prefix: string,
): (value: unknown) => EvidenceIdentifierResult<T> {
  return (value) =>
    parseIdentifier(value, prefix) as EvidenceIdentifierResult<T>;
}

function parseIdentifier(
  value: unknown,
  prefix: string,
): EvidenceIdentifierResult<string> {
  if (typeof value !== "string") return failure("INVALID_TYPE");
  if (value.length === 0) return failure("EMPTY");
  if (value !== value.trim()) return failure("SURROUNDING_WHITESPACE");
  if (!value.startsWith(prefix)) return failure("WRONG_PREFIX");
  if (value.length === prefix.length) return failure("INCOMPLETE");
  if (value.length > MAX_IDENTIFIER_LENGTH) return failure("INVALID_LENGTH");
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length))
    ? { ok: true, value }
    : failure("INVALID_FORMAT");
}

function failure(
  code: EvidenceIdentifierIssueCode,
): EvidenceIdentifierResult<never> {
  return { ok: false, issue: { code } };
}
