import type { TargetCommandDispatch } from "./target_commands.ts";
import { parseTargetCommandDispatch } from "./target_commands.ts";
import type { AuthorityEvaluation } from "./authority_evaluation.ts";
import type {
  AuthorityProofReference,
  AuthorityProofResolver,
} from "./authority_proof.ts";
import {
  authorityProofReference,
  parseAuthorityProofReference,
  resolveAuthorityProof,
} from "./authority_proof.ts";
import { assertScope, WorkManagementError } from "./model.ts";

export interface AuthorityProtectedTargetCommand {
  readonly schemaVersion: 1;
  readonly dispatch: TargetCommandDispatch;
  readonly authorityProof: AuthorityProofReference;
}

export interface AuthorityConsumerProjection {
  readonly approvalRequestId: string;
  readonly commandType: string;
  readonly decision: "allowed";
  readonly proofVersion: 1;
}

/** Adds a resolvable immutable proof reference to an approved dispatch. */
export async function protectTargetCommand(
  dispatch: TargetCommandDispatch,
  evaluation: AuthorityEvaluation,
): Promise<AuthorityProtectedTargetCommand> {
  assertDispatchEvaluation(dispatch, evaluation);
  assertAllowed(evaluation);
  const authorityProof = await authorityProofReference(evaluation);
  return Object.freeze({
    schemaVersion: 1,
    dispatch: Object.freeze({
      ...structuredClone(dispatch),
      authorityProof,
    }),
    authorityProof,
  });
}

/** Consumer-side fail-closed validation before any foreign-context mutation. */
export async function validateAuthorityProtectedTargetCommand(
  value: unknown,
  resolver: AuthorityProofResolver,
  consumedAt: string,
): Promise<AuthorityProtectedTargetCommand> {
  const command = await parseProtectedCommand(value);
  const proof = await resolveAuthorityProof(command.authorityProof, resolver);
  assertAllowed(proof.evaluation);
  assertDispatchEvaluation(command.dispatch, proof.evaluation);
  assertDispatchProof(command.dispatch, command.authorityProof);
  assertConsumerWindow(proof.evaluation, consumedAt);
  return command;
}

function assertDispatchProof(
  dispatch: TargetCommandDispatch,
  reference: AuthorityProofReference,
): void {
  const proof = dispatch.authorityProof;
  if (
    proof !== undefined &&
    proof.proofId === reference.proofId &&
    proof.proofVersion === reference.proofVersion &&
    proof.evaluationId === reference.evaluationId &&
    proof.evaluationDigest === reference.evaluationDigest &&
    proof.proofDigest === reference.proofDigest
  ) return;
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Target command dispatch "${dispatch.dispatchId}" is missing its exact authority proof reference; expected proof "${reference.proofId}".`,
  );
}

/** Exposes only consumer status, never facts, limits, mandate, or proof content. */
export function authorityConsumerProjection(
  command: AuthorityProtectedTargetCommand,
): AuthorityConsumerProjection {
  return Object.freeze({
    approvalRequestId: command.dispatch.approvalRequestId,
    commandType: command.dispatch.commandType,
    decision: "allowed",
    proofVersion: command.authorityProof.proofVersion,
  });
}

async function parseProtectedCommand(
  value: unknown,
): Promise<AuthorityProtectedTargetCommand> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalid(value, "an authority-protected target command object");
  }
  const record = value as Record<string, unknown>;
  const keys = ["schemaVersion", "dispatch", "authorityProof"];
  if (
    Object.keys(record).length !== keys.length ||
    Object.keys(record).some((key) => !keys.includes(key))
  ) {
    throw invalid(value, `exact fields ${keys.join(", ")}`);
  }
  if (record.schemaVersion !== 1) {
    throw invalid(record.schemaVersion, "schema version 1");
  }
  return Object.freeze({
    schemaVersion: 1,
    dispatch: parseTargetCommandDispatch(record.dispatch),
    authorityProof: await parseAuthorityProofReference(record.authorityProof),
  });
}

function assertDispatchEvaluation(
  dispatch: TargetCommandDispatch,
  evaluation: AuthorityEvaluation,
): void {
  assertScope(evaluation.scope, dispatch, "Authority-protected target command");
  const fieldsMatch = dispatch.packageId === evaluation.requirement.packageId &&
    dispatch.packageVersion === evaluation.requirement.packageVersion &&
    dispatch.packageDigest === evaluation.requirement.packageDigest &&
    dispatch.authoritySnapshotReference === evaluation.snapshotReference &&
    dispatch.commandType === evaluation.commandType &&
    dispatch.targetAggregateType === evaluation.targetAggregateType &&
    dispatch.targetAggregateId === evaluation.targetAggregateId &&
    Number(dispatch.expectedTargetVersion) ===
      evaluation.expectedTargetVersion &&
    dispatch.actor.id === evaluation.approverId &&
    dispatch.actor.kind === "human" &&
    dispatch.actor.state === "active";
  if (fieldsMatch) return;
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Target command dispatch "${dispatch.dispatchId}" does not match authority evaluation "${evaluation.evaluationId}"; expected exact package, policy snapshot, command, target, version, approver, and scope bindings.`,
  );
}

function assertAllowed(evaluation: AuthorityEvaluation): void {
  if (
    evaluation.outcome === "allowed" && evaluation.reasons.length === 1 &&
    evaluation.reasons[0] === "AUTHORITY_ALLOWED"
  ) return;
  throw new WorkManagementError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Authority evaluation "${evaluation.evaluationId}" outcome "${evaluation.outcome}" cannot authorize a foreign target command; expected one allowed evaluation.`,
  );
}

function assertConsumerWindow(
  evaluation: AuthorityEvaluation,
  consumedAt: string,
): void {
  const instant = canonicalInstant(consumedAt);
  const effective = Date.parse(evaluation.window.effectiveAt);
  const expiry = Date.parse(evaluation.window.expiresAt);
  if (instant >= effective && instant < expiry) return;
  throw new WorkManagementError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Authority proof "${evaluation.evaluationId}" is not effective at "${consumedAt}"; expected consumption before "${evaluation.window.expiresAt}".`,
  );
}

function canonicalInstant(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed) && new Date(parsed).toISOString() === value) {
    return parsed;
  }
  throw invalid(value, "a canonical ISO-8601 UTC consumption time");
}

function invalid(value: unknown, expected: string): WorkManagementError {
  return new WorkManagementError(
    "INVALID_INPUT",
    `Authority-protected command value "${
      String(value)
    }" is invalid; expected ${expected}.`,
  );
}
