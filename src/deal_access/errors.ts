export class DealAccessInvariantError extends Error {
  readonly code = "DEAL_ACCESS_INVARIANT";

  constructor(message: string) {
    super(message);
    this.name = "DealAccessInvariantError";
  }
}

export class DealAccessVersionConflictError extends Error {
  readonly code = "DEAL_ACCESS_VERSION_CONFLICT";
  readonly expectedVersion: number;
  readonly currentVersion: number;

  constructor(expectedVersion: number, currentVersion: number) {
    super(
      `Deal Access aggregate version "${currentVersion}" conflicts with expected version "${expectedVersion}".`,
    );
    this.name = "DealAccessVersionConflictError";
    this.expectedVersion = expectedVersion;
    this.currentVersion = currentVersion;
  }
}

export class DealAccessAuthorizationError extends Error {
  readonly code = "DEAL_ACCESS_AUTHORIZATION_DENIED";
  readonly reason: string;

  constructor(reason: string) {
    super(
      `Deal Access authorization was denied with reason "${reason}"; expected an active scoped grant.`,
    );
    this.name = "DealAccessAuthorizationError";
    this.reason = reason;
  }
}

export class DealAccessIdempotencyConflictError extends Error {
  readonly code = "DEAL_ACCESS_IDEMPOTENCY_CONFLICT";

  constructor(key: string) {
    super(
      `Deal Access idempotency key "${key}" conflicts with a different payload; expected the original payload.`,
    );
    this.name = "DealAccessIdempotencyConflictError";
  }
}
