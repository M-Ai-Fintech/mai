export type GovernanceErrorCode =
  | "INVALID_STATE_TRANSITION"
  | "INVALID_GOVERNANCE_INPUT"
  | "GOVERNANCE_VERSION_CONFLICT"
  | "GOVERNANCE_AUTHORIZATION_DENIED"
  | "GOVERNANCE_IDEMPOTENCY_CONFLICT"
  | "PREVIEW_STALE"
  | "RETENTION_BLOCKED"
  | "LEGAL_HOLD_ACTIVE"
  | "DELETION_AUTHORITY_REQUIRED"
  | "DELETION_REQUEST_BLOCKED"
  | "ORCHESTRATION_BLOCKED"
  | "CHECKPOINT_CONFLICT"
  | "ERASURE_PROOF_REQUIRED";

export class DealGovernanceError extends Error {
  constructor(
    readonly code: GovernanceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DealGovernanceError";
  }
}

export class GovernanceVersionConflictError extends DealGovernanceError {
  constructor(
    readonly expectedVersion: number,
    readonly currentVersion: number,
    aggregateId: string,
  ) {
    super(
      "GOVERNANCE_VERSION_CONFLICT",
      `Governance aggregate "${aggregateId}" version "${currentVersion}" conflicts with expected version "${expectedVersion}".`,
    );
    this.name = "GovernanceVersionConflictError";
  }
}

export class GovernanceAuthorizationError extends DealGovernanceError {
  constructor(readonly reason: string, actorId: string) {
    super(
      "GOVERNANCE_AUTHORIZATION_DENIED",
      `Deal Governance action for actor "${actorId}" was denied with reason "${reason}"; expected an authorized scoped actor.`,
    );
    this.name = "GovernanceAuthorizationError";
  }
}

export class GovernanceIdempotencyConflictError extends DealGovernanceError {
  constructor(readonly idempotencyKey: string) {
    super(
      "GOVERNANCE_IDEMPOTENCY_CONFLICT",
      `Governance idempotency key "${idempotencyKey}" conflicts with a different command payload; expected the original payload.`,
    );
    this.name = "GovernanceIdempotencyConflictError";
  }
}

export class GovernanceInvariantError extends DealGovernanceError {
  constructor(message: string) {
    super("INVALID_GOVERNANCE_INPUT", message);
    this.name = "GovernanceInvariantError";
  }
}
