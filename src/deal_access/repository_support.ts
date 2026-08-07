import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  IdempotencyKey,
} from "../shared/contracts/identifiers.ts";
import {
  DealAccessInvariantError,
  DealAccessVersionConflictError,
} from "./errors.ts";
import type { DealAccessEvent } from "./events.ts";
import type {
  DealAccessScope,
  DealParticipation,
  ExternalGrant,
  PortalReceipt,
  PortalSubmission,
} from "./model.ts";
import type { OutboxEvent } from "../platform/events/v1.ts";

export interface CommandRecord {
  readonly digest: string;
  state: "in_progress" | "completed";
  result?: unknown;
}

export interface StoreState {
  readonly participations: Map<string, DealParticipation>;
  readonly grants: Map<string, ExternalGrant>;
  readonly submissions: Map<string, PortalSubmission>;
  readonly receipts: Map<string, PortalReceipt>;
  readonly invalidations: SessionInvalidationRecord[];
  readonly commands: Map<string, CommandRecord>;
  readonly events: DealAccessEvent[];
  readonly outbox: OutboxEvent[];
}

export type SessionInvalidationReason = "revoked" | "offboarded" | "expired";
export type SessionInvalidationState = "pending" | "completed";

export interface SessionInvalidationRecord {
  readonly invalidationId: string;
  readonly scope: DealAccessScope;
  readonly grantId?: string;
  readonly participationId?: string;
  readonly reason: SessionInvalidationReason;
  readonly state: SessionInvalidationState;
  readonly attemptCount: number;
  readonly lastError?: string;
  readonly completedAt?: string;
}

interface CommandIdentity {
  readonly scope: DealAccessScope;
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetId: string;
  readonly idempotencyKey: IdempotencyKey;
}

export function emptyState(): StoreState {
  return {
    participations: new Map(),
    grants: new Map(),
    submissions: new Map(),
    receipts: new Map(),
    invalidations: [],
    commands: new Map(),
    events: [],
    outbox: [],
  };
}

export function cloneState(state: StoreState): StoreState {
  return {
    participations: new Map(state.participations),
    grants: new Map(state.grants),
    submissions: new Map(state.submissions),
    receipts: new Map(state.receipts),
    invalidations: [...state.invalidations],
    commands: new Map(
      [...state.commands].map(([key, record]) => [key, { ...record }]),
    ),
    events: [...state.events],
    outbox: [...state.outbox],
  };
}

export function saveAggregate<
  T extends { id: string; scope: DealAccessScope; version: AggregateVersion },
>(
  collection: Map<string, T>,
  aggregate: T,
  expectedVersion: number | undefined,
  label: string,
): void {
  const key = scopedKey(aggregate.scope, aggregate.id);
  const current = collection.get(key);
  if (expectedVersion === undefined && current !== undefined) {
    throw new DealAccessInvariantError(
      `${label} "${aggregate.id}" already exists; expected a new aggregate.`,
    );
  }
  if (expectedVersion !== undefined && current?.version !== expectedVersion) {
    throw new DealAccessVersionConflictError(
      expectedVersion,
      current?.version ?? 0,
    );
  }
  collection.set(key, aggregate);
}

export function sameScope(
  left: DealAccessScope,
  right: DealAccessScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

export function scopedKey(scope: DealAccessScope, id: string): string {
  return `${scope.tenantId}:${scope.workspaceId}:${scope.dealId}:${id}`;
}

export function commandKey(identity: CommandIdentity): string {
  return `${
    scopedKey(identity.scope, identity.targetId)
  }:${identity.actorId}:` +
    `${identity.commandType}:${identity.idempotencyKey}`;
}
