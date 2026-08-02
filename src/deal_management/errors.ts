import type { Deal } from "./contracts.ts";

export type DealErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "SCOPE_MISMATCH"
  | "AUTHORIZATION_DENIED"
  | "HUMAN_AUTHORITY_REQUIRED"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "DUPLICATE_PARTY"
  | "DUPLICATE_ROLE"
  | "MANDATE_REQUIRED"
  | "LIMIT_EXCEEDED"
  | "REFERENCE_INVALID";

export class DealError extends Error {
  constructor(readonly code: DealErrorCode, message: string) {
    super(message);
    this.name = "DealError";
  }
}

export class DealInvariantError extends DealError {
  constructor(message: string) {
    super("INVALID_INPUT", message);
    this.name = "DealInvariantError";
  }
}

export class DealProtectedNotFoundError extends DealError {
  constructor(dealId: string) {
    super(
      "NOT_FOUND",
      `Deal "${dealId}" was not found; expected an authorized deal in the requested scope.`,
    );
    this.name = "DealProtectedNotFoundError";
  }
}

export class DealScopeMismatchError extends DealError {
  constructor(dealId: string) {
    super(
      "SCOPE_MISMATCH",
      `Deal "${dealId}" is outside the requested tenant/workspace scope; expected a matching scope.`,
    );
    this.name = "DealScopeMismatchError";
  }
}

export class DealVersionConflictError extends DealError {
  readonly expectedVersion: number | undefined;
  readonly currentVersion: number;

  constructor(dealId: string, expected: number | undefined, current: number) {
    super(
      "VERSION_CONFLICT",
      `Deal "${dealId}" expected version "${expected}" but current version is "${current}".`,
    );
    this.expectedVersion = expected;
    this.currentVersion = current;
    this.name = "DealVersionConflictError";
  }
}

export class DealIdempotencyConflictError extends DealError {
  constructor(key: string) {
    super(
      "IDEMPOTENCY_CONFLICT",
      `Idempotency key "${key}" was already used with a different command payload; expected the original payload.`,
    );
    this.name = "DealIdempotencyConflictError";
  }
}

export class DealAuthorizationError extends DealError {
  constructor(
    code: "AUTHORIZATION_DENIED" | "HUMAN_AUTHORITY_REQUIRED",
    subject: string,
  ) {
    super(
      code,
      `Actor "${subject}" is not authorized for the requested Deal command; expected an allowed policy decision.`,
    );
    this.name = "DealAuthorizationError";
  }
}

export function assertDealConfidentiality(
  value: string,
): asserts value is Deal["confidentiality"] {
  assertChoice(value, "Deal confidentiality", [
    "standard",
    "sensitive",
    "highly_sensitive",
  ]);
}

export function assertDealPartySide(
  value: string,
): asserts value is Deal["parties"][number]["side"] {
  assertChoice(value, "Deal party side", [
    "acquirer",
    "target",
    "seller",
    "buyer",
    "advisor",
    "other",
  ]);
}

export function assertDealRoleName(
  value: string,
): asserts value is Deal["roles"][number]["name"] {
  assertChoice(value, "Deal role name", [
    "acquirer",
    "target",
    "seller",
    "buyer",
    "advisor",
    "counsel",
    "lender",
    "other",
  ]);
}

function assertChoice(
  value: string,
  label: string,
  choices: readonly string[],
): void {
  if (choices.includes(value)) return;
  throw new DealInvariantError(
    `${label} "${value}" is invalid; expected one of ${choices.join(", ")}.`,
  );
}
