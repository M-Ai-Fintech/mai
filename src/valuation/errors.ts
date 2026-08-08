export type ValuationErrorCode =
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "SCOPE_MISMATCH"
  | "VERSION_CONFLICT"
  | "REFERENCED_VERSION_MISMATCH"
  | "EXACT_BASIS_MISMATCH"
  | "STALE_INPUT"
  | "STALE_RESULT"
  | "HUMAN_AUTHORITY_REQUIRED"
  | "ACTOR_DENIED"
  | "SEPARATION_OF_DUTIES"
  | "IDEMPOTENCY_CONFLICT"
  | "IDEMPOTENCY_IN_PROGRESS"
  | "IMMUTABLE_RESULT"
  | "DEPENDENCY_UNAVAILABLE"
  | "METHOD_UNSUPPORTED"
  | "PROTECTED_NOT_FOUND"
  | "FEATURE_DISABLED"
  | "JOB_FAILED";

export class ValuationError extends Error {
  constructor(
    readonly code: ValuationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ValuationError";
  }
}

export function valuationInputError(
  field: string,
  value: unknown,
  expected: string,
): ValuationError {
  return new ValuationError(
    "INVALID_INPUT",
    `Valuation field "${field}" received "${
      String(value)
    }"; expected ${expected}.`,
  );
}
