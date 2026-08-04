import type {
  AuditEventDraft,
  AuditOutboxAppender,
} from "../audit_activity/v1.ts";
import { OutboxRepository } from "../platform/events/v1.ts";
import type {
  ActorId,
  AggregateVersion,
  DealId,
  IdempotencyKey,
} from "../platform/api/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import { assertDealWriteVersion } from "./repository_validation.ts";
import {
  DealIdempotencyConflictError,
  DealInvariantError,
  DealScopeMismatchError,
  DealVersionConflictError,
} from "./errors.ts";
import type {
  Deal,
  DealCommandResult,
  DealEvent,
  DealReceipt,
  DealScope,
} from "./contracts.ts";
import type {
  DealLifecycleAggregate,
  DealLifecycleRepository,
  DealLifecycleTransaction,
  LifecycleHistoryRecord,
  LifecyclePersistenceMutation,
} from "./lifecycle/contracts.ts";
import {
  cloneStoredDeal,
  cloneStoredEvent,
  cloneStoredResult,
  sameDealScope,
  type StoredDealEventRow,
  type StoredDealRow,
  toDealOutboxEvent,
  toStoredEvent,
} from "./contracts.ts";
import { readStoredDeal } from "./read_model.ts";
import {
  findLifecycleInTransaction,
  InMemoryLifecycleStore,
  persistLifecycle,
  PostgresLifecycleStore,
} from "./lifecycle/projection.ts";
import {
  claimDealCommand,
  completeDealCommand,
  deserializeResult,
  loadDealCommandClaim,
  persistDealReceipt,
} from "./receipts.ts";
export interface DealWrite {
  readonly scope: DealScope;
  readonly aggregate: Deal;
  readonly expectedVersion?: AggregateVersion | number;
  readonly event: DealEvent;
  readonly receipt?: DealReceipt;
  readonly auditEvent?: AuditEventDraft;
  readonly lifecycle?: LifecyclePersistenceMutation;
}
export interface DealCommandClaim {
  readonly scope: DealScope;
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetId: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly key: string;
  readonly fingerprint: string;
}
export interface DealCommandExecution {
  readonly result: DealCommandResult;
  readonly receipt: DealReceipt;
}

export interface DealCommandTransaction extends DealLifecycleTransaction {
  find(scope: DealScope, dealId: DealId): Promise<Deal | undefined>;
  save(write: DealWrite): Promise<Deal>;
}

export interface DealRepository extends DealLifecycleRepository {
  find(scope: DealScope, dealId: DealId): Promise<Deal | undefined>;
  list(scope: DealScope): Promise<readonly Deal[]>;
  save(write: DealWrite): Promise<Deal>;
  listEvents(scope: DealScope, dealId: DealId): Promise<readonly DealEvent[]>;
  runIdempotent(
    claim: DealCommandClaim,
    callback: (
      transaction: DealCommandTransaction,
    ) => Promise<DealCommandExecution> | DealCommandExecution,
  ): Promise<DealCommandResult>;
}

interface InMemoryClaim {
  readonly fingerprint: string;
  readonly result: DealCommandResult;
}

export class InMemoryDealRepository implements DealRepository {
  private readonly deals = new Map<string, Deal>();
  private readonly events = new Map<string, DealEvent[]>();
  private readonly lifecycleStore = new InMemoryLifecycleStore();
  private readonly claims = new Map<string, InMemoryClaim>();
  private readonly commandLocks = new Map<string, Promise<void>>();

  find(scope: DealScope, dealId: DealId): Promise<Deal | undefined> {
    const deal = this.deals.get(keyFor(scope, dealId));
    return Promise.resolve(
      deal === undefined ? undefined : cloneStoredDeal(deal),
    );
  }

  list(scope: DealScope): Promise<readonly Deal[]> {
    return Promise.resolve(
      [...this.deals.values()]
        .filter((deal) => sameDealScope(scope, deal))
        .map(cloneStoredDeal),
    );
  }

  findLifecycle(
    scope: DealScope,
    dealId: DealId,
  ): Promise<DealLifecycleAggregate | undefined> {
    return this.lifecycleStore.find(scope, dealId);
  }

  listLifecycleHistory(
    scope: DealScope,
    dealId: DealId,
  ): Promise<readonly LifecycleHistoryRecord[]> {
    return this.lifecycleStore.listHistory(scope, dealId);
  }

  save(write: DealWrite): Promise<Deal> {
    return Promise.resolve().then(() => this.saveInMemory(write));
  }

  async runIdempotent(
    claim: DealCommandClaim,
    callback: (
      transaction: DealCommandTransaction,
    ) => Promise<DealCommandExecution> | DealCommandExecution,
  ): Promise<DealCommandResult> {
    const previous = this.commandLocks.get(claim.key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => release = resolve);
    const queued = previous.then(() => current);
    this.commandLocks.set(claim.key, queued);
    await previous;
    try {
      const existing = this.claims.get(claim.key);
      if (existing !== undefined) {
        if (existing.fingerprint !== claim.fingerprint) {
          throw new DealIdempotencyConflictError(claim.key);
        }
        return cloneStoredResult(existing.result);
      }
      const execution = await callback(this);
      this.claims.set(claim.key, {
        fingerprint: claim.fingerprint,
        result: cloneStoredResult(execution.result),
      });
      return cloneStoredResult(execution.result);
    } finally {
      release();
      if (this.commandLocks.get(claim.key) === queued) {
        this.commandLocks.delete(claim.key);
      }
    }
  }

  listEvents(scope: DealScope, dealId: DealId): Promise<readonly DealEvent[]> {
    return Promise.resolve(
      (this.events.get(keyFor(scope, dealId)) ?? []).map(cloneStoredEvent),
    );
  }

  private saveInMemory(write: DealWrite): Deal {
    assertScope(write.scope, write.aggregate);
    assertEvent(write.event, write.aggregate);
    const key = keyFor(write.scope, write.aggregate.id);
    const current = this.deals.get(key);
    assertDealWriteVersion(write, current);
    this.deals.set(key, cloneStoredDeal(write.aggregate));
    const history = this.events.get(key) ?? [];
    history.push(cloneStoredEvent(write.event));
    this.events.set(key, history);
    if (write.lifecycle !== undefined) {
      this.lifecycleStore.save(write.lifecycle);
    }
    return cloneStoredDeal(write.aggregate);
  }
}

export interface DealTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

export class PostgresDealRepository implements DealRepository {
  private readonly lifecycleStore: PostgresLifecycleStore;

  constructor(
    private readonly transactions: DealTransactionRunner,
    private readonly outbox = new OutboxRepository(),
    private readonly audit?: AuditOutboxAppender,
  ) {
    this.lifecycleStore = new PostgresLifecycleStore(transactions);
  }

  find(scope: DealScope, dealId: DealId): Promise<Deal | undefined> {
    return this.transactions.run((transaction) =>
      findInTransaction(transaction, scope, dealId)
    );
  }

  /** Reads an authoritative Deal on a caller-owned transaction. */
  findInTransaction(
    transaction: TransactionHandle,
    scope: DealScope,
    dealId: DealId,
    lock = false,
  ): Promise<Deal | undefined> {
    return findInTransaction(transaction, scope, dealId, lock);
  }

  list(scope: DealScope): Promise<readonly Deal[]> {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query<StoredDealRow>(
        `SELECT tenant_id AS "tenantId", workspace_id AS "workspaceId",
           deal_id AS "dealId", version, state, document
         FROM deal_management.deals
         WHERE tenant_id = $1 AND workspace_id = $2 ORDER BY deal_id`,
        [scope.tenantId, scope.workspaceId],
      );
      return result.rows.map(readStoredDeal);
    });
  }

  findLifecycle(
    scope: DealScope,
    dealId: DealId,
  ): Promise<DealLifecycleAggregate | undefined> {
    return this.lifecycleStore.find(scope, dealId);
  }

  listLifecycleHistory(
    scope: DealScope,
    dealId: DealId,
  ): Promise<readonly LifecycleHistoryRecord[]> {
    return this.lifecycleStore.listHistory(scope, dealId);
  }

  save(write: DealWrite): Promise<Deal> {
    return this.transactions.run((transaction) =>
      this.saveInTransaction(transaction, write)
    );
  }

  runIdempotent(
    claim: DealCommandClaim,
    callback: (
      transaction: DealCommandTransaction,
    ) => Promise<DealCommandExecution> | DealCommandExecution,
  ): Promise<DealCommandResult> {
    return this.transactions.run(async (transaction) => {
      const inserted = await claimDealCommand(transaction, claim);
      const row = inserted
        ? undefined
        : await loadDealCommandClaim(transaction, claim);
      if (row !== undefined) {
        if (row.fingerprint !== claim.fingerprint) {
          throw new DealIdempotencyConflictError(claim.key);
        }
        if (row.state === "completed") {
          return deserializeResult(row.result, "Deal command result");
        }
        throw new DealInvariantError(
          `Idempotency key "${claim.key}" remains in progress; expected a completed or absent claim.`,
        );
      }
      const commandTransaction: DealCommandTransaction = {
        find: (scope, dealId) => findInTransaction(transaction, scope, dealId),
        findLifecycle: (scope, dealId) =>
          findLifecycleInTransaction(transaction, scope, dealId),
        save: (write) => this.saveInTransaction(transaction, write),
      };
      const execution = await callback(commandTransaction);
      await completeDealCommand(transaction, claim, execution.result);
      return execution.result;
    });
  }

  listEvents(scope: DealScope, dealId: DealId): Promise<readonly DealEvent[]> {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query<StoredDealEventRow>(
        `SELECT event_id AS "eventId", tenant_id AS "tenantId",
           workspace_id AS "workspaceId", deal_id AS "dealId",
           actor_id AS "actorId", actor_kind AS "actorKind",
           correlation_id AS "correlationId", aggregate_version AS "aggregateVersion",
           event_type AS "eventType", schema_version AS "schemaVersion",
           payload, occurred_at AS "occurredAt", available_at AS "availableAt"
         FROM deal_management.aggregate_history
         WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         ORDER BY aggregate_version`,
        [scope.tenantId, scope.workspaceId, dealId],
      );
      return result.rows.map(toStoredEvent);
    });
  }

  private async saveInTransaction(
    transaction: TransactionHandle,
    write: DealWrite,
  ): Promise<Deal> {
    assertScope(write.scope, write.aggregate);
    assertEvent(write.event, write.aggregate);
    const current = await currentVersion(
      transaction,
      write.scope,
      write.aggregate.id,
    );
    assertDealWriteVersion(write, current);
    if (current === undefined) {
      await insertDeal(transaction, write.aggregate);
    } else {
      await updateDeal(transaction, write.aggregate, write.expectedVersion!);
    }
    await insertHistory(transaction, write);
    await persistDealReceipt(
      transaction,
      write.scope,
      write.receipt,
      write.event.occurredAt,
    );
    await this.persistEvent(transaction, write);
    if (write.lifecycle !== undefined) {
      await persistLifecycle(transaction, write.lifecycle);
    }
    return cloneStoredDeal(write.aggregate);
  }

  private async persistEvent(
    transaction: TransactionHandle,
    write: DealWrite,
  ): Promise<void> {
    const event = toDealOutboxEvent(write.event, write.auditEvent?.eventId);
    if (write.auditEvent !== undefined && this.audit === undefined) {
      throw new Error(
        `Deal event "${write.event.eventId}" requested audit persistence; expected an audit/outbox appender.`,
      );
    }
    if (this.audit !== undefined && write.auditEvent !== undefined) {
      await this.audit.append(transaction, write.auditEvent, event);
      return;
    }
    await this.outbox.append(transaction, event);
  }
}

async function findInTransaction(
  transaction: TransactionHandle,
  scope: DealScope,
  dealId: DealId,
  lock = false,
): Promise<Deal | undefined> {
  const result = await transaction.query<StoredDealRow>(
    `SELECT tenant_id AS "tenantId", workspace_id AS "workspaceId",
       deal_id AS "dealId", version, state, document
     FROM deal_management.deals
     WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3${
      lock ? " FOR UPDATE" : ""
    }`,
    [scope.tenantId, scope.workspaceId, dealId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : readStoredDeal(row);
}

async function currentVersion(
  transaction: TransactionHandle,
  scope: DealScope,
  dealId: DealId,
): Promise<number | undefined> {
  const result = await transaction.query<{ version: string | number }>(
    `SELECT version FROM deal_management.deals
     WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3`,
    [scope.tenantId, scope.workspaceId, dealId],
  );
  const version = result.rows[0]?.version;
  return version === undefined ? undefined : Number(version);
}

async function insertDeal(
  transaction: TransactionHandle,
  aggregate: Deal,
): Promise<void> {
  await transaction.query(
    `INSERT INTO deal_management.deals (
       deal_id, tenant_id, workspace_id, version, state, document,
       created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      aggregate.id,
      aggregate.tenantId,
      aggregate.workspaceId,
      aggregate.version,
      aggregate.state,
      JSON.stringify(aggregate),
      aggregate.createdAt,
      aggregate.updatedAt,
    ],
  );
}

async function updateDeal(
  transaction: TransactionHandle,
  aggregate: Deal,
  expectedVersion: AggregateVersion | number,
): Promise<void> {
  const result = await transaction.query(
    `UPDATE deal_management.deals
     SET version = $4, state = $5, document = $6, updated_at = $7
     WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
       AND version = $8`,
    [
      aggregate.tenantId,
      aggregate.workspaceId,
      aggregate.id,
      aggregate.version,
      aggregate.state,
      JSON.stringify(aggregate),
      aggregate.updatedAt,
      expectedVersion,
    ],
  );
  if (result.rowCount === 1) return;
  throw new DealVersionConflictError(
    String(aggregate.id),
    expectedVersion,
    aggregate.version - 1,
  );
}

async function insertHistory(
  transaction: TransactionHandle,
  write: DealWrite,
): Promise<void> {
  await transaction.query(
    `INSERT INTO deal_management.aggregate_history (
       event_id, tenant_id, workspace_id, deal_id, actor_id, actor_kind,
       correlation_id, aggregate_version, event_type, schema_version,
       payload, occurred_at, available_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      write.event.eventId,
      write.event.tenantId,
      write.event.workspaceId,
      write.event.dealId,
      write.event.actorId,
      write.event.actorKind,
      write.event.correlationId,
      write.event.aggregateVersion,
      write.event.eventType,
      write.event.schemaVersion,
      JSON.stringify(write.event.payload),
      write.event.occurredAt,
      write.event.availableAt,
    ],
  );
}

function assertScope(scope: DealScope, aggregate: Deal): void {
  if (sameDealScope(scope, aggregate)) return;
  throw new DealScopeMismatchError(aggregate.id);
}

function assertEvent(event: DealEvent, aggregate: Deal): void {
  if (
    event.tenantId === aggregate.tenantId &&
    event.workspaceId === aggregate.workspaceId &&
    event.dealId === aggregate.id &&
    event.aggregateVersion === aggregate.version
  ) return;
  throw new DealInvariantError(
    `Deal event "${event.eventId}" does not match aggregate "${aggregate.id}"; expected the same scope and version.`,
  );
}

function keyFor(scope: DealScope, dealId: DealId): string {
  return `${scope.tenantId}|${scope.workspaceId}|${dealId}`;
}
