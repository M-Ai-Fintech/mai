import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  IdempotencyKey,
} from "../shared/contracts/identifiers.ts";
import {
  DealAccessIdempotencyConflictError,
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

export interface CommandIdentity {
  readonly scope: DealAccessScope;
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetId: string;
  readonly idempotencyKey: IdempotencyKey;
}

export type CommandClaim =
  | { readonly state: "claimed" }
  | { readonly state: "in_progress" }
  | { readonly state: "replay"; readonly result: unknown };

export type SessionInvalidationReason = "revoked" | "offboarded" | "expired";

export interface SessionInvalidationRecord {
  readonly invalidationId: string;
  readonly scope: DealAccessScope;
  readonly grantId?: string;
  readonly participationId?: string;
  readonly reason: SessionInvalidationReason;
}

export interface DealAccessStore {
  findParticipation(
    scope: DealAccessScope,
    id: string,
  ): Promise<DealParticipation | undefined>;
  findGrant(
    scope: DealAccessScope,
    id: string,
  ): Promise<ExternalGrant | undefined>;
  findGrants(
    scope: DealAccessScope,
    participationId: string,
  ): Promise<ExternalGrant[]>;
  findSubmission(
    scope: DealAccessScope,
    id: string,
  ): Promise<PortalSubmission | undefined>;
  findReceipt(
    scope: DealAccessScope,
    id: string,
  ): Promise<PortalReceipt | undefined>;
  listExpiredGrants(
    scope: DealAccessScope,
    now: string,
  ): Promise<ExternalGrant[]>;
  saveParticipation(
    aggregate: DealParticipation,
    expectedVersion?: number,
  ): Promise<void>;
  saveGrant(aggregate: ExternalGrant, expectedVersion?: number): Promise<void>;
  saveSubmission(
    aggregate: PortalSubmission,
    expectedVersion?: number,
  ): Promise<void>;
  saveReceipt(
    scope: DealAccessScope,
    submissionId: string,
    receipt: PortalReceipt,
  ): Promise<void>;
  recordSessionInvalidation(record: SessionInvalidationRecord): Promise<void>;
  claimCommand(
    identity: CommandIdentity,
    digest: string,
  ): Promise<CommandClaim>;
  completeCommand(
    identity: CommandIdentity,
    digest: string,
    result: unknown,
  ): Promise<void>;
  appendEvent(event: DealAccessEvent): Promise<void>;
  appendOutbox(event: OutboxEvent): Promise<void>;
}

export interface DealAccessRepository {
  transaction<T>(callback: (store: DealAccessStore) => Promise<T>): Promise<T>;
}

interface CommandRecord {
  readonly digest: string;
  state: "in_progress" | "completed";
  result?: unknown;
}

interface StoreState {
  readonly participations: Map<string, DealParticipation>;
  readonly grants: Map<string, ExternalGrant>;
  readonly submissions: Map<string, PortalSubmission>;
  readonly receipts: Map<string, PortalReceipt>;
  readonly invalidations: SessionInvalidationRecord[];
  readonly commands: Map<string, CommandRecord>;
  readonly events: DealAccessEvent[];
  readonly outbox: OutboxEvent[];
}

export class InMemoryDealAccessRepository implements DealAccessRepository {
  private state: StoreState = emptyState();
  private tail: Promise<void> = Promise.resolve();

  async transaction<T>(
    callback: (store: DealAccessStore) => Promise<T>,
  ): Promise<T> {
    const previous = this.tail;
    let release: () => void = () => {};
    this.tail = new Promise<void>((resolve) => release = resolve);
    await previous;
    const snapshot = cloneState(this.state);
    try {
      const result = await callback(new InMemoryDealAccessStore(this.state));
      release();
      return result;
    } catch (error) {
      this.state = snapshot;
      release();
      throw error;
    }
  }

  get events(): readonly DealAccessEvent[] {
    return [...this.state.events];
  }

  get outbox(): readonly OutboxEvent[] {
    return [...this.state.outbox];
  }

  get invalidations(): readonly SessionInvalidationRecord[] {
    return [...this.state.invalidations];
  }
}

class InMemoryDealAccessStore implements DealAccessStore {
  constructor(private readonly state: StoreState) {}

  findParticipation(
    scope: DealAccessScope,
    id: string,
  ): Promise<DealParticipation | undefined> {
    return Promise.resolve(this.state.participations.get(scopedKey(scope, id)));
  }

  findGrant(
    scope: DealAccessScope,
    id: string,
  ): Promise<ExternalGrant | undefined> {
    return Promise.resolve(this.state.grants.get(scopedKey(scope, id)));
  }

  findGrants(
    scope: DealAccessScope,
    participationId: string,
  ): Promise<ExternalGrant[]> {
    const grants = [...this.state.grants.values()].filter((grant) =>
      sameScope(grant.scope, scope) && grant.participationId === participationId
    );
    return Promise.resolve(grants);
  }

  findSubmission(
    scope: DealAccessScope,
    id: string,
  ): Promise<PortalSubmission | undefined> {
    return Promise.resolve(this.state.submissions.get(scopedKey(scope, id)));
  }

  findReceipt(
    scope: DealAccessScope,
    id: string,
  ): Promise<PortalReceipt | undefined> {
    return Promise.resolve(this.state.receipts.get(scopedKey(scope, id)));
  }

  listExpiredGrants(
    scope: DealAccessScope,
    now: string,
  ): Promise<ExternalGrant[]> {
    const grants = [...this.state.grants.values()].filter((grant) =>
      sameScope(grant.scope, scope) && grant.state === "active" &&
      Date.parse(grant.expiresAt) <= Date.parse(now)
    );
    return Promise.resolve(grants);
  }

  saveParticipation(
    aggregate: DealParticipation,
    expectedVersion?: number,
  ): Promise<void> {
    saveAggregate(
      this.state.participations,
      aggregate,
      expectedVersion,
      "participation",
    );
    return Promise.resolve();
  }

  saveGrant(aggregate: ExternalGrant, expectedVersion?: number): Promise<void> {
    saveAggregate(this.state.grants, aggregate, expectedVersion, "grant");
    return Promise.resolve();
  }

  saveSubmission(
    aggregate: PortalSubmission,
    expectedVersion?: number,
  ): Promise<void> {
    saveAggregate(
      this.state.submissions,
      aggregate,
      expectedVersion,
      "submission",
    );
    return Promise.resolve();
  }

  saveReceipt(
    scope: DealAccessScope,
    submissionId: string,
    receipt: PortalReceipt,
  ): Promise<void> {
    const key = scopedKey(scope, receipt.id);
    if (this.state.receipts.has(key)) {
      throw new DealAccessInvariantError(
        `Receipt "${receipt.id}" already exists; expected a new portal receipt for submission "${submissionId}".`,
      );
    }
    this.state.receipts.set(key, receipt);
    return Promise.resolve();
  }

  recordSessionInvalidation(record: SessionInvalidationRecord): Promise<void> {
    this.state.invalidations.push(record);
    return Promise.resolve();
  }

  claimCommand(
    identity: CommandIdentity,
    digest: string,
  ): Promise<CommandClaim> {
    const key = commandKey(identity);
    const existing = this.state.commands.get(key);
    if (existing === undefined) {
      this.state.commands.set(key, { digest, state: "in_progress" });
      return Promise.resolve({ state: "claimed" });
    }
    if (existing.digest !== digest) {
      throw new DealAccessIdempotencyConflictError(identity.idempotencyKey);
    }
    return Promise.resolve(
      existing.state === "completed"
        ? { state: "replay", result: existing.result }
        : { state: "in_progress" },
    );
  }

  completeCommand(
    identity: CommandIdentity,
    digest: string,
    result: unknown,
  ): Promise<void> {
    const key = commandKey(identity);
    const existing = this.state.commands.get(key);
    if (existing?.digest !== digest || existing.state !== "in_progress") {
      throw new DealAccessInvariantError(
        `Command "${identity.commandType}" key "${identity.idempotencyKey}" cannot complete; expected one matching in-progress claim.`,
      );
    }
    this.state.commands.set(key, { digest, state: "completed", result });
    return Promise.resolve();
  }

  appendEvent(event: DealAccessEvent): Promise<void> {
    this.state.events.push(event);
    return Promise.resolve();
  }

  appendOutbox(event: OutboxEvent): Promise<void> {
    this.state.outbox.push(event);
    return Promise.resolve();
  }
}

function emptyState(): StoreState {
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

function cloneState(state: StoreState): StoreState {
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

function saveAggregate<
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

function sameScope(left: DealAccessScope, right: DealAccessScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function scopedKey(scope: DealAccessScope, id: string): string {
  return `${scope.tenantId}:${scope.workspaceId}:${scope.dealId}:${id}`;
}

function commandKey(identity: CommandIdentity): string {
  return `${
    scopedKey(identity.scope, identity.targetId)
  }:${identity.actorId}:${identity.commandType}:${identity.idempotencyKey}`;
}
