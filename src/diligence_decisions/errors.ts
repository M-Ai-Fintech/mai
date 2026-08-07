export type DiligenceDecisionErrorCode =
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "SCOPE_MISMATCH"
  | "ACTOR_DENIED"
  | "HUMAN_AUTHORITY_REQUIRED"
  | "SEPARATION_OF_DUTIES"
  | "EXACT_BASIS_MISMATCH"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "IDEMPOTENCY_IN_PROGRESS"
  | "IMMUTABLE_DECISION"
  | "STALE_INVALIDATION"
  | "PROTECTED_NOT_FOUND"
  | "REFERENCE_MISMATCH";

export class DiligenceDecisionError extends Error {
  constructor(
    readonly code: DiligenceDecisionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DiligenceDecisionError";
  }
}
