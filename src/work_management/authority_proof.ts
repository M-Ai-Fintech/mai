import { payloadDigest } from "../platform/persistence/v1.ts";
import type { AuthorityEvaluation } from "./authority_evaluation.ts";
import { parseAuthorityEvaluation } from "./authority_evaluation.ts";
import type { AuthorityEvaluationStore } from "./authority_evaluation_store.ts";
import { WorkManagementError } from "./model.ts";

export interface AuthorityProofReference {
  readonly proofId: string;
  readonly proofVersion: 1;
  readonly evaluationId: string;
  readonly evaluationDigest: string;
  readonly proofDigest: string;
}

export interface ResolvedAuthorityProof {
  readonly reference: AuthorityProofReference;
  readonly evaluation: AuthorityEvaluation;
}

export interface AuthorityProofResolver {
  resolve(reference: AuthorityProofReference): Promise<unknown | undefined>;
}

/** Creates a stable versioned reference to the complete immutable evaluation. */
export async function authorityProofReference(
  evaluation: AuthorityEvaluation,
): Promise<AuthorityProofReference> {
  const body = {
    proofVersion: 1 as const,
    evaluationId: evaluation.evaluationId,
    evaluationDigest: evaluation.digest,
  };
  const proofDigest = await payloadDigest(body);
  return Object.freeze({
    proofId: `authority_proof_v1_${proofDigest}`,
    ...body,
    proofDigest,
  });
}

/** Resolves and verifies a proof before a foreign context accepts a command. */
export async function resolveAuthorityProof(
  referenceValue: unknown,
  resolver: AuthorityProofResolver,
): Promise<ResolvedAuthorityProof> {
  const reference = await parseAuthorityProofReference(referenceValue);
  const rawEvaluation = await resolver.resolve(reference);
  if (rawEvaluation === undefined) throw unresolved(reference.proofId);
  const evaluation = await parseAuthorityEvaluation(rawEvaluation);
  assertProofEvaluation(reference, evaluation);
  return Object.freeze({ reference, evaluation });
}

export async function parseAuthorityProofReference(
  value: unknown,
): Promise<AuthorityProofReference> {
  const record = proofRecord(value);
  const reference: AuthorityProofReference = {
    proofId: text(record.proofId, "Authority proof ID"),
    proofVersion: exactVersion(record.proofVersion),
    evaluationId: text(record.evaluationId, "Authority evaluation ID"),
    evaluationDigest: digest(
      record.evaluationDigest,
      "Authority evaluation digest",
    ),
    proofDigest: digest(record.proofDigest, "Authority proof digest"),
  };
  const expected = await authorityProofReferenceBody(reference);
  if (
    reference.proofDigest === expected &&
    reference.proofId === `authority_proof_v1_${expected}`
  ) {
    return Object.freeze(reference);
  }
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Authority proof "${reference.proofId}" is tampered; expected a digest-bound version 1 proof reference.`,
  );
}

export class StoredAuthorityProofResolver implements AuthorityProofResolver {
  constructor(private readonly store: AuthorityEvaluationStore) {}

  resolve(reference: AuthorityProofReference): Promise<unknown | undefined> {
    return this.store.find(reference.evaluationId);
  }
}

function assertProofEvaluation(
  reference: AuthorityProofReference,
  evaluation: AuthorityEvaluation,
): void {
  if (
    evaluation.evaluationId === reference.evaluationId &&
    evaluation.digest === reference.evaluationDigest
  ) return;
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Authority proof "${reference.proofId}" resolved evaluation "${evaluation.evaluationId}" digest "${evaluation.digest}"; expected "${reference.evaluationId}" digest "${reference.evaluationDigest}".`,
  );
}

function proofRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalid(value, "an authority proof object");
  }
  const record = value as Record<string, unknown>;
  const keys = [
    "proofId",
    "proofVersion",
    "evaluationId",
    "evaluationDigest",
    "proofDigest",
  ];
  if (
    Object.keys(record).length !== keys.length ||
    Object.keys(record).some((key) => !keys.includes(key))
  ) {
    throw invalid(value, `exact fields ${keys.join(", ")}`);
  }
  return record;
}

function authorityProofReferenceBody(
  reference: AuthorityProofReference,
): Promise<string> {
  return payloadDigest({
    proofVersion: reference.proofVersion,
    evaluationId: reference.evaluationId,
    evaluationDigest: reference.evaluationDigest,
  });
}

function exactVersion(value: unknown): 1 {
  if (value === 1) return 1;
  throw invalid(value, "authority proof version 1");
}

function text(value: unknown, label: string): string {
  if (
    typeof value === "string" && value.trim().length > 0 && value.length <= 256
  ) return value;
  throw invalid(value, `${label} with 1-256 characters`);
}

function digest(value: unknown, label: string): string {
  if (typeof value === "string" && /^[0-9a-f]{64}$/.test(value)) return value;
  throw invalid(value, `${label} as lowercase SHA-256 hex`);
}

function unresolved(proofId: string): WorkManagementError {
  return new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Authority proof "${proofId}" is unresolved; expected a complete immutable evaluation before consuming the target command.`,
  );
}

function invalid(value: unknown, expected: string): WorkManagementError {
  return new WorkManagementError(
    "INVALID_INPUT",
    `Authority proof value "${
      String(value)
    }" is invalid; expected ${expected}.`,
  );
}
