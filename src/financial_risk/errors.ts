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
  | "HUMAN_AUTHORITY_REQUIRED";

export class FinancialRiskError extends Error {
  constructor(
    readonly code: FinancialRiskErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FinancialRiskError";
  }
}
