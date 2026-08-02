import type {
  AuditEventDraft,
  AuditOutboxAppender,
} from "../audit_activity/v1.ts";
import { type OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import type { AggregateVersion, DealId } from "../platform/api/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import { freezeDeal } from "./model.ts";
import {
  DealInvariantError,
  DealScopeMismatchError,
  DealVersionConflictError,
} from "./errors.ts";
import type { Deal, DealEvent, DealReceipt, DealScope } from "./contracts.ts";
import { sameDealScope } from "./contracts.ts";

export interface DealWrite {
  readonly scope: DealScope;
  readonly aggregate: Deal;
  readonly expectedVersion?: AggregateVersion | number;
  readonly event: DealEvent;
  readonly receipt?: DealReceipt;
  readonly auditEvent?: AuditEventDraft;
}

export interface DealRepository {
  find(scope: DealScope, dealId: DealId): Promise<Deal | undefined>;
  list(scope: DealScope): Promise<readonly Deal[]>;
  save(write: DealWrite): Promise<Deal>;
  listEvents(scope: DealScope, dealId: DealId): Promise<readonly DealEvent[]>;
}

export class InMemoryDealRepository implements DealRepository {
  private readonly deals = new Map<string, Deal>();
  private readonly events = new Map<string, DealEvent[]>();

  find(scope: DealScope, dealId: DealId): Promise<Deal | undefined> {
    const deal = this.deals.get(keyFor(scope, dealId));
    return Promise.resolve(deal === undefined ? undefined : cloneDeal(deal));
  }

  list(scope: DealScope): Promise<readonly Deal[]> {
    return Promise.resolve(
      [...this.deals.values()]
        .filter((deal) => sameDealScope(scope, deal))
        .map(cloneDeal),
    );
  }

  save(write: DealWrite): Promise<Deal> {
    return Promise.resolve().then(() => {
      assertScope(write.scope, write.aggregate);
      assertEvent(write.event, write.aggregate);
      const key = keyFor(write.scope, write.aggregate.id);
      const current = this.deals.get(key);
      assertVersion(write, current);
      this.deals.set(key, cloneDeal(write.aggregate));
      const history = this.events.get(key) ?? [];
      history.push(cloneEvent(write.event));
      this.events.set(key, history);
      return cloneDeal(write.aggregate);
    });
  }

  listEvents(scope: DealScope, dealId: DealId): Promise<readonly DealEvent[]> {
    return Promise.resolve(
      (this.events.get(keyFor(scope, dealId)) ?? []).map(cloneEvent),
    );
  }
}

export interface DealTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

export class PostgresDealRepository implements DealRepository {
  constructor(
    private readonly transactions: DealTransactionRunner,
    private readonly outbox = new OutboxRepository(),
    private readonly audit?: AuditOutboxAppender,
  ) {}

  find(scope: DealScope, dealId: DealId): Promise<Deal | undefined> {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query<{ document: unknown }>(
        `SELECT document FROM deal_management.deals
         WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3`,
        [scope.tenantId, scope.workspaceId, dealId],
      );
      const document = result.rows[0]?.document;
      return document === undefined ? undefined : deserializeDeal(document);
    });
  }

  list(scope: DealScope): Promise<readonly Deal[]> {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query<{ document: unknown }>(
        `SELECT document FROM deal_management.deals
         WHERE tenant_id = $1 AND workspace_id = $2 ORDER BY deal_id`,
        [scope.tenantId, scope.workspaceId],
      );
      return result.rows.map(({ document }) => deserializeDeal(document));
    });
  }

  save(write: DealWrite): Promise<Deal> {
    return this.transactions.run(async (transaction) => {
      const current = await currentVersion(
        transaction,
        write.scope,
        write.aggregate.id,
      );
      assertVersion(write, current === undefined ? undefined : current);
      if (current === undefined) {
        await insertDeal(transaction, write.aggregate);
      } else {
        await updateDeal(transaction, write.aggregate, write.expectedVersion!);
      }
      await insertHistory(transaction, write);
      await this.persistReceipt(transaction, write);
      await this.persistEvent(transaction, write);
      return cloneDeal(write.aggregate);
    });
  }

  listEvents(scope: DealScope, dealId: DealId): Promise<readonly DealEvent[]> {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query<DealEventRow>(
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
      return result.rows.map(toEvent);
    });
  }

  private async persistReceipt(
    transaction: TransactionHandle,
    write: DealWrite,
  ): Promise<void> {
    if (write.receipt === undefined) return;
    await transaction.query(
      `INSERT INTO deal_management.command_receipts (
         receipt_id, tenant_id, workspace_id, actor_id, command_type,
         target_id, idempotency_key, fingerprint, result, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (tenant_id, workspace_id, actor_id, command_type, target_id, idempotency_key)
       DO NOTHING`,
      [
        write.receipt.id,
        write.scope.tenantId,
        write.scope.workspaceId,
        write.receipt.actorId,
        write.receipt.commandType,
        write.receipt.targetId,
        write.receipt.key,
        write.receipt.fingerprint,
        JSON.stringify(write.receipt.result),
        write.event.occurredAt,
      ],
    );
  }

  private async persistEvent(
    transaction: TransactionHandle,
    write: DealWrite,
  ): Promise<void> {
    const event = toOutboxEvent(write.event, write.auditEvent?.eventId);
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

interface DealEventRow {
  readonly eventId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly actorId: string;
  readonly actorKind: DealEvent["actorKind"];
  readonly correlationId: string;
  readonly aggregateVersion: string | number;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly payload: unknown;
  readonly occurredAt: Date | string;
  readonly availableAt: Date | string;
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

function toOutboxEvent(
  event: DealEvent,
  auditEventId: string | undefined,
): OutboxEvent {
  return {
    eventId: event.eventId,
    tenantId: event.tenantId,
    workspaceId: event.workspaceId,
    dealId: event.dealId,
    aggregateType: "deal",
    aggregateId: event.dealId,
    aggregateVersion: event.aggregateVersion,
    eventType: event.eventType,
    schemaVersion: event.schemaVersion,
    payload: {
      ...event.payload,
      ...(auditEventId === undefined ? {} : { auditEventId }),
    },
    correlationId: event.correlationId,
    occurredAt: event.occurredAt,
    availableAt: event.availableAt,
  };
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

function assertVersion(
  write: DealWrite,
  current: Deal | number | undefined,
): void {
  const stored = typeof current === "object" && current !== null
    ? current.version
    : current;
  if (
    stored === undefined && write.expectedVersion === undefined &&
    write.aggregate.version === 1
  ) return;
  if (
    stored !== undefined && write.expectedVersion === stored &&
    write.aggregate.version === stored + 1
  ) return;
  throw new DealVersionConflictError(
    write.aggregate.id,
    write.expectedVersion,
    stored ?? 0,
  );
}

function keyFor(scope: DealScope, dealId: DealId): string {
  return `${scope.tenantId}|${scope.workspaceId}|${dealId}`;
}

function cloneDeal(deal: Deal): Deal {
  return freezeDeal({
    ...deal,
    parties: deal.parties.map((party) => ({
      ...party,
      reference: { ...party.reference },
    })),
    roles: deal.roles.map((role) => ({ ...role })),
    ...(deal.mandate === undefined ? {} : {
      mandate: {
        ...deal.mandate,
        transactionValueCeiling: { ...deal.mandate.transactionValueCeiling },
      },
    }),
    authorityConstraints: deal.authorityConstraints.map((constraint) => ({
      ...constraint,
      ...(constraint.amountCeiling === undefined
        ? {}
        : { amountCeiling: { ...constraint.amountCeiling } }),
    })),
  });
}

function cloneEvent(event: DealEvent): DealEvent {
  return Object.freeze({
    ...event,
    payload: Object.freeze({ ...event.payload }),
  });
}

function deserializeDeal(document: unknown): Deal {
  const value = typeof document === "string" ? JSON.parse(document) : document;
  if (!isRecord(value) || value.aggregateType !== "deal") {
    throw new Error(
      `Stored Deal document "${
        String(document)
      }" is invalid; expected aggregateType "deal".`,
    );
  }
  return freezeDeal(value as unknown as Deal);
}

function toEvent(row: DealEventRow): DealEvent {
  return {
    eventId: row.eventId as DealEvent["eventId"],
    tenantId: row.tenantId as DealEvent["tenantId"],
    workspaceId: row.workspaceId as DealEvent["workspaceId"],
    dealId: row.dealId as DealEvent["dealId"],
    actorId: row.actorId as DealEvent["actorId"],
    actorKind: row.actorKind,
    correlationId: row.correlationId as DealEvent["correlationId"],
    aggregateVersion: Number(
      row.aggregateVersion,
    ) as DealEvent["aggregateVersion"],
    eventType: row.eventType,
    schemaVersion: 1,
    payload: toRecord(row.payload),
    occurredAt: toDate(row.occurredAt, row.eventId),
    availableAt: toDate(row.availableAt, row.eventId),
  };
}

function toRecord(value: unknown): Readonly<Record<string, unknown>> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (isRecord(parsed)) return parsed;
  throw new Error(
    `Stored Deal event payload "${
      String(value)
    }" is invalid; expected an object.`,
  );
}

function toDate(value: Date | string, eventId: string): Date {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isNaN(date.getTime())) return date;
  throw new Error(
    `Deal event "${eventId}" timestamp "${
      String(value)
    }" is invalid; expected an ISO date.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
