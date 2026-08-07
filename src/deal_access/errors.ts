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

export class DealAccessSessionInvalidationError extends Error {
  readonly code = "DEAL_ACCESS_SESSION_INVALIDATION_PENDING";
  readonly invalidationId: string;

  constructor(invalidationId: string) {
    super(
      `Deal Access session invalidation "${invalidationId}" remains pending after delivery failure; expected a durable retry.`,
    );
    this.name = "DealAccessSessionInvalidationError";
    this.invalidationId = invalidationId;
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
