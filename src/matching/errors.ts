export type MatchingErrorCode =
  | "PROTECTED_NOT_FOUND"
  | "ACTION_FORBIDDEN"
  | "HUMAN_AUTHORITY_REQUIRED"
  | "INVALID_TRANSITION"
  | "VERSION_CONFLICT"
  | "CONFLICT_BLOCKING"
  | "RESTRICTION_BLOCKING"
  | "INVALID_CRITERIA"
  | "DEPENDENCY_UNAVAILABLE"
  | "IDEMPOTENCY_CONFLICT";

export class MatchingError extends Error {
  constructor(
    readonly code: MatchingErrorCode,
    message: string,
    readonly resourceId?: string,
  ) {
    super(message);
    this.name = "MatchingError";
  }
}

export function protectedNotFound(resourceId: string): MatchingError {
  return new MatchingError(
    "PROTECTED_NOT_FOUND",
    `Matching resource "${resourceId}" was not found or is not visible in the requested scope.`,
    resourceId,
  );
}

export function assertMatchingVersion(
  resourceId: string,
  expected: number,
  actual: number,
): void {
  if (expected === actual) return;
  throw new MatchingError(
    "VERSION_CONFLICT",
    `Matching resource "${resourceId}" version "${actual}" does not match expected version "${expected}".`,
    resourceId,
  );
}
