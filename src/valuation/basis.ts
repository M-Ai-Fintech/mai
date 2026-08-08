import type { AggregateVersion } from "../platform/api/v1.ts";
import type { DealId, TenantId, WorkspaceId } from "../platform/api/v1.ts";
import type {
  ValuationInputId,
  ValuationModelId,
  ValuationScenarioId,
} from "./ids.ts";
import { ValuationError, valuationInputError } from "./errors.ts";

export interface ValuationScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}

export type ValuationBasisReferenceKind =
  | "document_version"
  | "evidence"
  | "fact_version"
  | "calculation";

export interface ValuationBasisReference {
  readonly kind: ValuationBasisReferenceKind;
  readonly id: string;
  readonly version?: AggregateVersion;
  readonly checksum?: string;
}

export interface ExactValuationBasis {
  readonly scope: ValuationScope;
  readonly modelId: ValuationModelId;
  readonly modelVersion: AggregateVersion;
  readonly scenarioId: ValuationScenarioId;
  readonly scenarioVersion: AggregateVersion;
  readonly inputId: ValuationInputId;
  readonly inputVersion: AggregateVersion;
  readonly references: readonly ValuationBasisReference[];
  readonly basisDigest: string;
  readonly capturedAt: Date;
}

export function createExactValuationBasis(
  input: ExactValuationBasis,
): ExactValuationBasis {
  assertScope(input.scope);
  assertVersion(input.modelVersion, "model version");
  assertVersion(input.scenarioVersion, "scenario version");
  assertVersion(input.inputVersion, "input version");
  assertText(input.modelId, "model ID");
  assertText(input.scenarioId, "scenario ID");
  assertText(input.inputId, "input ID");
  if (input.references.length === 0) {
    throw new ValuationError(
      "INVALID_INPUT",
      "Valuation basis is empty; expected at least one exact source reference.",
    );
  }
  assertDigest(input.basisDigest);
  assertDate(input.capturedAt, "basis capture time");
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    references: Object.freeze(input.references.map(normalizeReference)),
    capturedAt: new Date(input.capturedAt),
  });
}

export function assertExactBasis(
  expected: ExactValuationBasis,
  actual: ExactValuationBasis,
  subject: string,
): void {
  if (sameExactBasis(expected, actual)) return;
  throw new ValuationError(
    "EXACT_BASIS_MISMATCH",
    `${subject} basis digest "${actual.basisDigest}" does not match expected "${expected.basisDigest}"; expected the exact reviewed model, scenario, input, and source versions.`,
  );
}

export function sameExactBasis(
  left: ExactValuationBasis,
  right: ExactValuationBasis,
): boolean {
  return left.basisDigest === right.basisDigest &&
    sameScope(left.scope, right.scope) &&
    left.modelId === right.modelId &&
    left.modelVersion === right.modelVersion &&
    left.scenarioId === right.scenarioId &&
    left.scenarioVersion === right.scenarioVersion &&
    left.inputId === right.inputId &&
    left.inputVersion === right.inputVersion &&
    stableReferences(left.references) === stableReferences(right.references);
}

export function sameScope(
  left: ValuationScope,
  right: ValuationScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function normalizeReference(
  reference: ValuationBasisReference,
): ValuationBasisReference {
  assertText(reference.id, "basis reference ID");
  if (
    reference.checksum !== undefined &&
    !/^[0-9a-f]{64}$/.test(reference.checksum)
  ) {
    throw valuationInputError(
      "basis reference checksum",
      reference.checksum,
      "lowercase SHA-256 hex",
    );
  }
  if (
    reference.kind === "document_version" && reference.checksum === undefined
  ) {
    throw valuationInputError(
      "document version checksum",
      reference.id,
      "an exact lowercase SHA-256 checksum",
    );
  }
  if (reference.version !== undefined) {
    assertVersion(reference.version, "basis reference version");
  }
  return Object.freeze({ ...reference });
}

function stableReferences(
  references: readonly ValuationBasisReference[],
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

function assertScope(scope: ValuationScope): void {
  for (const [label, value] of Object.entries(scope)) {
    if (typeof value === "string" && value.trim()) continue;
    throw valuationInputError(`scope.${label}`, value, "a non-empty scoped ID");
  }
}

function assertVersion(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw valuationInputError(label, value, "a positive aggregate version");
}

function assertDigest(value: string): void {
  if (/^[0-9a-f]{64}$/.test(value)) return;
  throw valuationInputError(
    "basis digest",
    value,
    "a lowercase SHA-256 digest",
  );
}

function assertText(value: string, label: string): void {
  if (typeof value === "string" && value.trim() && value.length <= 256) return;
  throw valuationInputError(label, value, "1-256 non-whitespace characters");
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw valuationInputError(label, value, "a valid Date");
}
