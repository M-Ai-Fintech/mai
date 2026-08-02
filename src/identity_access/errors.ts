import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { AdministrationContext } from "./contracts.ts";

export type IdentityAccessErrorCode =
  | "HUMAN_AUTHORITY_REQUIRED"
  | "SCOPE_MISMATCH"
  | "INVALID_STATE"
  | "EXPIRED"
  | "REVOKED"
  | "VERSION_CONFLICT"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "IDEMPOTENCY_CONFLICT"
  | "SESSION_REVOKED"
  | "AUTHENTICATION_FAILED"
  | "AUTHORIZATION_DENIED";

export class IdentityAccessError extends Error {
  constructor(
    readonly code: IdentityAccessErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "IdentityAccessError";
  }
}

export function assertHumanAdministrator(context: AdministrationContext): void {
  if (context.actor.kind === "human" && context.actor.state === "active") {
    return;
  }
  throw new IdentityAccessError(
    "HUMAN_AUTHORITY_REQUIRED",
    `actor "${context.actor.id}" must be an active human administrator.`,
  );
}

export function assertTenantScope(
  context: AdministrationContext,
  tenantId: string,
): void {
  if (context.tenantId === tenantId) return;
  throw new IdentityAccessError(
    "SCOPE_MISMATCH",
    `tenant "${tenantId}" does not match context tenant "${context.tenantId}".`,
  );
}

export function assertExpectedVersion(
  actual: AggregateVersion,
  expected: AggregateVersion | number | undefined,
  aggregateId: string,
): void {
  if (expected !== undefined && expected !== actual) {
    throw new IdentityAccessError(
      "VERSION_CONFLICT",
      `aggregate "${aggregateId}" expected version "${expected}" but is "${actual}".`,
    );
  }
}

export function assertActiveState(
  state: string,
  aggregateId: string,
): void {
  if (state === "active" || state === "pending") return;
  throw new IdentityAccessError(
    "INVALID_STATE",
    `aggregate "${aggregateId}" is "${state}"; expected an active or pending state.`,
  );
}

export function assertFutureExpiry(expiresAt: string, now: string): void {
  if (
    Number.isFinite(Date.parse(expiresAt)) &&
    Date.parse(expiresAt) > Date.parse(now)
  ) {
    return;
  }
  throw new IdentityAccessError(
    "EXPIRED",
    `expiry "${expiresAt}" is not after current time "${now}".`,
  );
}

export function assertReason(reason: string): void {
  if (reason.trim().length > 0 && reason.length <= 512) return;
  throw new IdentityAccessError(
    "INVALID_INPUT",
    `reason "${reason}" must contain 1-512 non-whitespace characters.`,
  );
}
