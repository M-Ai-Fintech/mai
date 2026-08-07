import type {
  ActorId,
  IdempotencyKey,
} from "../shared/contracts/identifiers.ts";
import {
  DealAccessIdempotencyConflictError,
  DealAccessInvariantError,
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
import {
  cloneState,
  commandKey,
  emptyState,
  sameScope,
  saveAggregate,
  scopedKey,
  type SessionInvalidationReason,
  type SessionInvalidationRecord,
  type StoreState,
} from "./repository_support.ts";

export type {
  SessionInvalidationReason,
  SessionInvalidationRecord,
  SessionInvalidationState,
} from "./repository_support.ts";

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

export interface SessionInvalidationTarget {
  readonly grantId?: string;
  readonly participationId?: string;
  readonly reason?: SessionInvalidationReason;
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
  recordSubmissionDeliveryAttempt(
    scope: DealAccessScope,
    submissionId: string,
  ): Promise<void>;
  recordSubmissionDeliveryFailure(
    scope: DealAccessScope,
    submissionId: string,
    error: string,
  ): Promise<void>;
  saveReceipt(
    scope: DealAccessScope,
    submissionId: string,
    receipt: PortalReceipt,
  ): Promise<void>;
  recordSessionInvalidation(record: SessionInvalidationRecord): Promise<void>;
  listPendingSessionInvalidations(
    scope: DealAccessScope,
    target?: SessionInvalidationTarget,
  ): Promise<SessionInvalidationRecord[]>;
  recordSessionInvalidationAttempt(
    scope: DealAccessScope,
    invalidationId: string,
  ): Promise<void>;
  markSessionInvalidationFailure(
    scope: DealAccessScope,
    invalidationId: string,
    error: string,
  ): Promise<void>;
  completeSessionInvalidation(
    scope: DealAccessScope,
    invalidationId: string,
    completedAt: string,
  ): Promise<void>;
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

  recordSubmissionDeliveryAttempt(
    scope: DealAccessScope,
    submissionId: string,
  ): Promise<void> {
    const key = scopedKey(scope, submissionId);
    const current = this.state.submissions.get(key);
    if (current === undefined) {
      throw new DealAccessInvariantError(
        `Submission "${submissionId}" was not found in scope "${scope.dealId}"; expected a durable queued submission.`,
      );
    }
    if (current.state === "accepted") return Promise.resolve();
    this.state.submissions.set(key, {
      ...current,
      deliveryAttemptCount: current.deliveryAttemptCount + 1,
      lastDeliveryError: undefined,
    });
    return Promise.resolve();
  }

  recordSubmissionDeliveryFailure(
    scope: DealAccessScope,
    submissionId: string,
    error: string,
  ): Promise<void> {
    const key = scopedKey(scope, submissionId);
    const current = this.state.submissions.get(key);
    if (current === undefined) {
      throw new DealAccessInvariantError(
        `Submission "${submissionId}" was not found in scope "${scope.dealId}"; expected durable delivery evidence.`,
      );
    }
    if (current.state === "accepted") return Promise.resolve();
    this.state.submissions.set(key, {
      ...current,
      lastDeliveryError: error.slice(0, 1000),
    });
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
    if (record.grantId === undefined && record.participationId === undefined) {
      throw new DealAccessInvariantError(
        `Session invalidation "${record.invalidationId}" has no target; expected a grant or participation ID.`,
      );
    }
    if (
      record.state !== "pending" || record.attemptCount !== 0 ||
      record.completedAt !== undefined
    ) {
      throw new DealAccessInvariantError(
        `Session invalidation "${record.invalidationId}" has initial state "${record.state}" and attempt count "${record.attemptCount}"; expected pending state with zero attempts.`,
      );
    }
    this.state.invalidations.push(record);
    return Promise.resolve();
  }

  listPendingSessionInvalidations(
    scope: DealAccessScope,
    target?: SessionInvalidationTarget,
  ): Promise<SessionInvalidationRecord[]> {
    return Promise.resolve(
      this.state.invalidations.filter((record) =>
        sameScope(record.scope, scope) &&
        record.state === "pending" &&
        (target?.grantId === undefined || record.grantId === target.grantId) &&
        (target?.participationId === undefined ||
          record.participationId === target.participationId) &&
        (target?.reason === undefined || record.reason === target.reason)
      ),
    );
  }

  recordSessionInvalidationAttempt(
    scope: DealAccessScope,
    invalidationId: string,
  ): Promise<void> {
    const index = this.invalidationIndex(scope, invalidationId);
    const current = this.state.invalidations[index];
    if (current.state === "completed") return Promise.resolve();
    this.state.invalidations[index] = {
      ...current,
      attemptCount: current.attemptCount + 1,
      lastError: undefined,
    };
    return Promise.resolve();
  }

  markSessionInvalidationFailure(
    scope: DealAccessScope,
    invalidationId: string,
    error: string,
  ): Promise<void> {
    const index = this.invalidationIndex(scope, invalidationId);
    const current = this.state.invalidations[index];
    if (current.state === "completed") return Promise.resolve();
    this.state.invalidations[index] = {
      ...current,
      lastError: error.slice(0, 1000),
    };
    return Promise.resolve();
  }

  completeSessionInvalidation(
    scope: DealAccessScope,
    invalidationId: string,
    completedAt: string,
  ): Promise<void> {
    const index = this.invalidationIndex(scope, invalidationId);
    const current = this.state.invalidations[index];
    if (current.state === "completed") return Promise.resolve();
    this.state.invalidations[index] = {
      ...current,
      state: "completed",
      completedAt,
      lastError: undefined,
    };
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

  private invalidationIndex(
    scope: DealAccessScope,
    invalidationId: string,
  ): number {
    const index = this.state.invalidations.findIndex((record) =>
      sameScope(record.scope, scope) && record.invalidationId === invalidationId
    );
    if (index >= 0) return index;
    throw new DealAccessInvariantError(
      `Session invalidation "${invalidationId}" was not found in scope "${scope.dealId}"; expected a durable pending record.`,
    );
  }
}
