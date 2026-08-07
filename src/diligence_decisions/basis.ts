import type {
  EvidenceId,
  EvidenceScope,
  ExactDocumentVersionReference,
  FactVersionId,
} from "../evidence_knowledge/v1.ts";
import {
  createExactDocumentVersionReference,
  sameScope,
} from "../evidence_knowledge/v1.ts";
import { DiligenceDecisionError } from "./errors.ts";

export type EvidenceBasisReference =
  | {
    readonly kind: "document_version";
    readonly reference: ExactDocumentVersionReference;
  }
  | { readonly kind: "evidence"; readonly evidenceId: EvidenceId }
  | { readonly kind: "fact_version"; readonly factVersionId: FactVersionId };

export interface ExactEvidenceBasis {
  readonly scope: EvidenceScope;
  readonly references: readonly EvidenceBasisReference[];
  readonly basisDigest: string;
  readonly capturedAt: Date;
}

export function createExactEvidenceBasis(
  input: ExactEvidenceBasis,
): ExactEvidenceBasis {
  if (input.references.length === 0) {
    throw new DiligenceDecisionError(
      "INVALID_INPUT",
      "Evidence basis is empty; expected at least one exact Evidence Knowledge reference.",
    );
  }
  assertScope(input.scope);
  assertDigest(input.basisDigest);
  assertDate(input.capturedAt, "Evidence basis capture time");
  const references = input.references.map(normalizeReference);
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    references: Object.freeze(references),
    capturedAt: new Date(input.capturedAt),
  });
}

export function assertExactBasis(
  expected: ExactEvidenceBasis,
  actual: ExactEvidenceBasis,
  subject: string,
): void {
  if (sameEvidenceBasis(expected, actual)) return;
  throw new DiligenceDecisionError(
    "EXACT_BASIS_MISMATCH",
    `${subject} basis digest "${actual.basisDigest}" does not match expected "${expected.basisDigest}"; expected the exact reviewed evidence versions.`,
  );
}

export function sameEvidenceBasis(
  left: ExactEvidenceBasis,
  right: ExactEvidenceBasis,
): boolean {
  return left.basisDigest === right.basisDigest &&
    sameScope(left.scope, right.scope) &&
    stableReferences(left.references) === stableReferences(right.references);
}

function normalizeReference(
  reference: EvidenceBasisReference,
): EvidenceBasisReference {
  if (reference.kind === "document_version") {
    return Object.freeze({
      kind: reference.kind,
      reference: createExactDocumentVersionReference(reference.reference),
    });
  }
  if (reference.kind === "evidence" && reference.evidenceId.trim()) {
    return Object.freeze({ ...reference });
  }
  if (reference.kind === "fact_version" && reference.factVersionId.trim()) {
    return Object.freeze({ ...reference });
  }
  throw new DiligenceDecisionError(
    "INVALID_INPUT",
    `Evidence basis reference "${
      JSON.stringify(reference)
    }" is invalid; expected a public Evidence Knowledge version reference.`,
  );
}

function stableReferences(
  references: readonly EvidenceBasisReference[],
): string {
  return JSON.stringify(references, (_, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value).sort(([left], [right]) =>
          left.localeCompare(right)
        ),
      );
    }
    return value;
  });
}

function assertScope(scope: EvidenceScope): void {
  for (const [label, value] of Object.entries(scope)) {
    if (typeof value === "string" && value.trim()) continue;
    throw new DiligenceDecisionError(
      "INVALID_INPUT",
      `Evidence basis scope value "${
        String(value)
      }" for ${label} is invalid; expected a non-empty scoped identifier.`,
    );
  }
}

function assertDigest(value: string): void {
  if (/^[0-9a-f]{64}$/.test(value)) return;
  throw new DiligenceDecisionError(
    "INVALID_INPUT",
    `Evidence basis digest "${value}" is invalid; expected lowercase SHA-256 hex.`,
  );
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new DiligenceDecisionError(
    "INVALID_INPUT",
    `${label} "${String(value)}" is invalid; expected a valid Date.`,
  );
}
