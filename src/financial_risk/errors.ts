export type FinancialRiskIdempotencyFailureCode =
  | "STALE_VERSION"
  | "VERSION_CONFLICT"
  | "PROTECTED_NOT_FOUND"
  | "DEPENDENCY_UNAVAILABLE"
  | "INFERENCE_FAILED"
  | "CANCELLED"
  | "COMMAND_FAILED";

export type FinancialRiskErrorCode =
  | "INVALID_INPUT"
  | "SCOPE_MISMATCH"
  | "ACTOR_DENIED"
  | "PROTECTED_NOT_FOUND"
  | "EXACT_VERSION_MISMATCH"
  | "IDEMPOTENCY_CONFLICT"
  | "IDEMPOTENCY_IN_PROGRESS"
  | "VERSION_CONFLICT"
  | "STALE_VERSION"
  | "DEPENDENCY_UNAVAILABLE"
  | "INFERENCE_FAILED"
  | "CANCELLED"
  | "HUMAN_AUTHORITY_REQUIRED"
  | "COMMAND_FAILED";

export class FinancialRiskError extends Error {
  constructor(
    readonly code: FinancialRiskErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FinancialRiskError";
  }
}

export class FinancialRiskIdempotencyReplayError extends FinancialRiskError {
  constructor(
    readonly failureReference: FinancialRiskIdempotencyFailureCode,
    idempotencyKey: string,
  ) {
    super(
      failureReference,
      `Idempotency key "${idempotencyKey}" previously failed with terminal reference "${failureReference}"; expected the original command outcome.`,
    );
    this.name = "FinancialRiskIdempotencyReplayError";
  }
}
