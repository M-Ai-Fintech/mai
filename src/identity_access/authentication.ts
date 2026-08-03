import type { ActorReference } from "../platform/authz/v1.ts";
import type {
  ActorId,
  CorrelationId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import { IdentityAccessError } from "./errors.ts";
import type { SessionContext } from "./contracts.ts";
import type { SessionId } from "./ids.ts";

export interface AuthenticatedPrincipal {
  readonly actor: ActorReference;
  readonly identityId?: string;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
}

export interface AuthenticationPort {
  authenticate(
    input: { readonly credential: string },
  ): Promise<AuthenticatedPrincipal>;
}

export class FakeAuthenticationPort implements AuthenticationPort {
  constructor(private readonly principal: AuthenticatedPrincipal) {}

  authenticate(
    input: { readonly credential: string },
  ): Promise<AuthenticatedPrincipal> {
    if (input.credential.trim().length === 0) {
      return Promise.reject(
        new IdentityAccessError(
          "AUTHENTICATION_FAILED",
          "credential proof is empty; expected an opaque provider proof.",
        ),
      );
    }
    return Promise.resolve(Object.freeze({
      actor: Object.freeze({ ...this.principal.actor }),
      tenantId: this.principal.tenantId,
      ...(this.principal.workspaceId === undefined
        ? {}
        : { workspaceId: this.principal.workspaceId }),
    }));
  }
}

export function createSessionContext(input: {
  readonly sessionId: SessionId;
  readonly principal: AuthenticatedPrincipal;
  readonly correlationId: CorrelationId;
  readonly issuedAt: string;
  readonly expiresAt: string;
}): SessionContext {
  assertSessionTimes(input.issuedAt, input.expiresAt);
  if (input.principal.actor.state !== "active") {
    throw new IdentityAccessError(
      "AUTHENTICATION_FAILED",
      `actor "${input.principal.actor.id}" is not active.`,
    );
  }
  return new SafeSessionContext(input);
}

export class SessionRegistry {
  private readonly sessions = new Map<string, SafeSessionContext>();

  register(session: SessionContext): void {
    if (!(session instanceof SafeSessionContext)) {
      throw new Error(
        "Session context is not registry-owned; expected a safe v1 context.",
      );
    }
    this.sessions.set(session.sessionId, session);
  }

  revoke(sessionId: SessionId, reason: string, revokedAt: string): void {
    const session = this.sessions.get(sessionId);
    if (session === undefined) return;
    session.revoke(reason, revokedAt);
  }

  invalidateActor(
    actorId: ActorId,
    tenantId: TenantId,
    revokedAt: string,
  ): void {
    for (const session of this.sessions.values()) {
      if (session.actor.id === actorId && session.tenantId === tenantId) {
        session.revoke("actor revoked", revokedAt);
      }
    }
  }

  assertActive(sessionId: SessionId, now: string): void {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      throw new IdentityAccessError(
        "SESSION_REVOKED",
        `session "${sessionId}" is unknown.`,
      );
    }
    session.assertActive(now);
  }
}

class SafeSessionContext implements SessionContext {
  readonly sessionId: SessionId;
  readonly actor: ActorReference;
  readonly identityId: string | undefined;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId | undefined;
  readonly issuedAt: string;
  readonly expiresAt: string;
  private revokedAtValue: string | undefined;

  get revokedAt(): string | undefined {
    return this.revokedAtValue;
  }

  constructor(input: {
    readonly sessionId: SessionId;
    readonly principal: AuthenticatedPrincipal;
    readonly correlationId: CorrelationId;
    readonly issuedAt: string;
    readonly expiresAt: string;
  }) {
    this.sessionId = input.sessionId;
    this.actor = Object.freeze({ ...input.principal.actor });
    this.identityId = input.principal.identityId;
    this.tenantId = input.principal.tenantId;
    this.workspaceId = input.principal.workspaceId;
    this.issuedAt = input.issuedAt;
    this.expiresAt = input.expiresAt;
    this.correlationId = input.correlationId;
  }

  private readonly correlationId: CorrelationId;

  toRequestContext(origin: "http" | "job" | "internal" = "internal") {
    return {
      actorId: this.actor.id,
      ...(this.identityId === undefined ? {} : { identityId: this.identityId }),
      tenantId: this.tenantId,
      correlationId: this.correlationId,
      origin,
      ...(this.workspaceId === undefined
        ? {}
        : { workspaceId: this.workspaceId }),
    };
  }

  toJSON(): Readonly<Record<string, unknown>> {
    return {
      sessionId: this.sessionId,
      actorId: this.actor.id,
      tenantId: this.tenantId,
      ...(this.workspaceId === undefined
        ? {}
        : { workspaceId: this.workspaceId }),
      issuedAt: this.issuedAt,
      expiresAt: this.expiresAt,
      state: this.revokedAtValue === undefined ? "active" : "revoked",
    };
  }

  revoke(_reason: string, revokedAt: string): void {
    this.revokedAtValue ??= revokedAt;
  }

  assertActive(now: string): void {
    if (this.revokedAtValue !== undefined) {
      throw new IdentityAccessError(
        "SESSION_REVOKED",
        `session "${this.sessionId}" was revoked at "${this.revokedAtValue}".`,
      );
    }
    if (!Number.isFinite(Date.parse(now))) return;
    if (Date.parse(now) >= Date.parse(this.expiresAt)) {
      throw new IdentityAccessError(
        "SESSION_REVOKED",
        `session "${this.sessionId}" expired at "${this.expiresAt}".`,
      );
    }
  }
}

function assertSessionTimes(issuedAt: string, expiresAt: string): void {
  if (
    Number.isFinite(Date.parse(issuedAt)) &&
    Number.isFinite(Date.parse(expiresAt)) &&
    Date.parse(expiresAt) > Date.parse(issuedAt)
  ) return;
  throw new IdentityAccessError(
    "INVALID_INPUT",
    `session interval "${issuedAt}" -> "${expiresAt}" is invalid; expected expiry after issue time.`,
  );
}
