import type { ActorReference } from "../platform/authz/v1.ts";
import type { TenantId, WorkspaceId } from "../shared/contracts/identifiers.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { SessionContext } from "./contracts.ts";
import type { SessionId } from "./ids.ts";

export type SessionState = "active" | "revoked" | "expired";

export interface SessionRecord {
  readonly sessionId: SessionId;
  readonly actor: ActorReference;
  readonly identityId?: string;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt?: string;
  readonly state: SessionState;
}

export interface SessionRepository {
  save(record: SessionRecord): Promise<void>;
  find(
    scope: { readonly tenantId: TenantId; readonly workspaceId?: WorkspaceId },
    sessionId: SessionId,
  ): Promise<SessionRecord | undefined>;
  revoke(
    scope: { readonly tenantId: TenantId; readonly workspaceId?: WorkspaceId },
    sessionId: SessionId,
    revokedAt: string,
  ): Promise<void>;
  invalidateActor(input: {
    readonly tenantId: TenantId;
    readonly actorId: string;
    readonly revokedAt: string;
  }): Promise<void>;
}

export function sessionRecord(session: SessionContext): SessionRecord {
  return Object.freeze({
    sessionId: session.sessionId,
    actor: Object.freeze({ ...session.actor }),
    ...(session.identityId === undefined
      ? {}
      : { identityId: session.identityId }),
    tenantId: session.tenantId,
    ...(session.workspaceId === undefined
      ? {}
      : { workspaceId: session.workspaceId }),
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
    ...(session.revokedAt === undefined
      ? {}
      : { revokedAt: session.revokedAt }),
    state: session.revokedAt === undefined ? "active" : "revoked",
  });
}

export function assertSessionRecordActive(
  record: SessionRecord,
  now: string,
): void {
  if (record.state === "revoked") {
    throw new Error(`session "${record.sessionId}" is revoked.`);
  }
  if (Date.parse(now) >= Date.parse(record.expiresAt)) {
    throw new Error(
      `session "${record.sessionId}" expired at "${record.expiresAt}".`,
    );
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly records = new Map<string, SessionRecord>();

  save(record: SessionRecord): Promise<void> {
    return Promise.resolve().then(() => {
      const recordKey = key(record.tenantId, record.sessionId);
      if (this.records.has(recordKey)) {
        throw new Error(`session "${record.sessionId}" already exists.`);
      }
      this.records.set(recordKey, record);
    });
  }

  find(
    scope: { readonly tenantId: TenantId; readonly workspaceId?: WorkspaceId },
    sessionIdValue: SessionId,
  ): Promise<SessionRecord | undefined> {
    const record = this.records.get(key(scope.tenantId, sessionIdValue));
    return Promise.resolve(
      record !== undefined && matchesScope(record, scope) ? record : undefined,
    );
  }

  revoke(
    scope: { readonly tenantId: TenantId; readonly workspaceId?: WorkspaceId },
    sessionIdValue: SessionId,
    revokedAt: string,
  ): Promise<void> {
    return Promise.resolve().then(() => {
      const record = this.records.get(key(scope.tenantId, sessionIdValue));
      if (record === undefined || !matchesScope(record, scope)) return;
      this.records.set(key(scope.tenantId, sessionIdValue), {
        ...record,
        revokedAt,
        state: "revoked",
      });
    });
  }

  invalidateActor(input: {
    readonly tenantId: TenantId;
    readonly actorId: string;
    readonly revokedAt: string;
  }): Promise<void> {
    return Promise.resolve().then(() => {
      for (const [recordKey, record] of this.records) {
        if (
          record.tenantId !== input.tenantId ||
          record.actor.id !== input.actorId
        ) {
          continue;
        }
        this.records.set(recordKey, {
          ...record,
          revokedAt: input.revokedAt,
          state: "revoked",
        });
      }
    });
  }
}

export class PostgresSessionRepository implements SessionRepository {
  constructor(private readonly transactions: SessionTransactionRunner) {}

  save(record: SessionRecord): Promise<void> {
    return this.transactions.run((transaction) =>
      transaction.query(
        `INSERT INTO iam.sessions (
         aggregate_id, tenant_id, workspace_id, actor_id, version, state,
         issued_at, expires_at, revoked_at, document, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9, $6, $6)`,
        [
          record.sessionId,
          record.tenantId,
          record.workspaceId ?? null,
          record.actor.id,
          record.state,
          record.issuedAt,
          record.expiresAt,
          record.revokedAt ?? null,
          JSON.stringify(record),
        ],
      ).then(() => undefined)
    );
  }

  find(
    scope: { readonly tenantId: TenantId; readonly workspaceId?: WorkspaceId },
    sessionIdValue: SessionId,
  ): Promise<SessionRecord | undefined> {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query<{ document: unknown }>(
        `SELECT document FROM iam.sessions
         WHERE tenant_id = $1 AND aggregate_id = $2 ${scopePredicate(scope)}`,
        scopeParameters(scope, sessionIdValue),
      );
      const document = result.rows[0]?.document;
      return document === undefined ? undefined : parseSessionRecord(document);
    });
  }

  revoke(
    scope: { readonly tenantId: TenantId; readonly workspaceId?: WorkspaceId },
    sessionIdValue: SessionId,
    revokedAt: string,
  ): Promise<void> {
    const atIndex = scope.workspaceId === undefined ? 3 : 4;
    return this.transactions.run((transaction) =>
      transaction.query(
        `UPDATE iam.sessions
       SET state = 'revoked', revoked_at = $${atIndex}, updated_at = $${atIndex},
           document = jsonb_set(jsonb_set(document, '{state}', '"revoked"'),
             '{revokedAt}', to_jsonb($${atIndex}::timestamptz))
       WHERE tenant_id = $1 AND aggregate_id = $2 ${scopePredicate(scope)}`,
        scopeParameters(scope, sessionIdValue).concat(revokedAt),
      ).then(() => undefined)
    );
  }

  invalidateActor(input: {
    readonly tenantId: TenantId;
    readonly actorId: string;
    readonly revokedAt: string;
  }): Promise<void> {
    return this.transactions.run((transaction) =>
      transaction.query(
        `UPDATE iam.sessions
       SET state = 'revoked', revoked_at = $3, updated_at = $3,
           document = jsonb_set(jsonb_set(document, '{state}', '"revoked"'),
             '{revokedAt}', to_jsonb($3::timestamptz))
       WHERE tenant_id = $1 AND actor_id = $2 AND state = 'active'`,
        [input.tenantId, input.actorId, input.revokedAt],
      ).then(() => undefined)
    );
  }
}

export interface SessionTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

function key(tenantId: TenantId, sessionId: SessionId): string {
  return `${tenantId}:${sessionId}`;
}

function matchesScope(
  record: SessionRecord,
  scope: { readonly tenantId: TenantId; readonly workspaceId?: WorkspaceId },
): boolean {
  if (scope.workspaceId === undefined) return record.workspaceId === undefined;
  return record.workspaceId === scope.workspaceId;
}

function scopePredicate(
  scope: { readonly workspaceId?: WorkspaceId },
): string {
  return scope.workspaceId === undefined
    ? "AND workspace_id IS NULL"
    : "AND workspace_id = $3";
}

function scopeParameters(
  scope: { readonly tenantId: TenantId; readonly workspaceId?: WorkspaceId },
  sessionIdValue: SessionId,
): unknown[] {
  return [
    scope.tenantId,
    sessionIdValue,
    ...(scope.workspaceId === undefined ? [] : [scope.workspaceId]),
  ];
}

function parseSessionRecord(document: unknown): SessionRecord {
  const value = typeof document === "string" ? JSON.parse(document) : document;
  if (!isRecord(value)) {
    throw new Error("Stored session document is not an object.");
  }
  if (
    typeof value.sessionId !== "string" || typeof value.tenantId !== "string" ||
    typeof value.issuedAt !== "string" || typeof value.expiresAt !== "string" ||
    !isActor(value.actor) || !isSessionState(value.state)
  ) throw new Error("Stored session document has an unexpected shape.");
  return value as unknown as SessionRecord;
}

function isActor(value: unknown): value is ActorReference {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" &&
    (value.kind === "human" || value.kind === "service" ||
      value.kind === "agent") &&
    (value.state === "active" || value.state === "inactive" ||
      value.state === "revoked");
}

function isSessionState(value: unknown): value is SessionState {
  return value === "active" || value === "revoked" || value === "expired";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
