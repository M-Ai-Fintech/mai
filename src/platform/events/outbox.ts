import {
  AggregateVersion,
  isAggregateVersion,
} from "../../shared/contracts/aggregate_version.ts";
import {
  CorrelationId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../../shared/contracts/identifiers.ts";
import { TransactionHandle } from "../persistence/transaction.ts";

export interface OutboxEvent {
  readonly eventId: string;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly dealId?: DealId;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: AggregateVersion;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly correlationId: CorrelationId;
  readonly causationId?: string;
  readonly occurredAt: Date;
  readonly availableAt: Date;
}

export interface OutboxClaim {
  readonly owner: string;
  readonly now: Date;
  readonly leaseUntil: Date;
  readonly limit: number;
}

export interface ClaimedOutboxEvent extends OutboxEvent {
  readonly attemptCount: number;
  readonly leaseOwner: string;
  readonly leaseExpiresAt: Date;
}

export type OutboxFailureState = "retry_scheduled" | "dead_lettered";

export interface OutboxStore {
  claim(
    transaction: TransactionHandle,
    claim: OutboxClaim,
  ): Promise<ClaimedOutboxEvent[]>;
  markPublished(
    transaction: TransactionHandle,
    event: ClaimedOutboxEvent,
    publishedAt: Date,
  ): Promise<void>;
  recordFailure(
    transaction: TransactionHandle,
    event: ClaimedOutboxEvent,
    failure: string,
    retryAt: Date | undefined,
  ): Promise<OutboxFailureState>;
}

interface OutboxRow {
  eventId: string;
  tenantId: TenantId;
  workspaceId: WorkspaceId | null;
  dealId: DealId | null;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: string;
  eventType: string;
  schemaVersion: number;
  payload: Record<string, unknown>;
  correlationId: CorrelationId;
  causationId: string | null;
  occurredAt: Date;
  availableAt: Date;
  attemptCount: number;
  leaseOwner: string;
  leaseExpiresAt: Date;
}

export class OutboxRepository {
  /**
   * Appends an event through the caller's aggregate transaction.
   *
   * @example await repository.append(transaction, event)
   */
  async append(
    transaction: TransactionHandle,
    event: OutboxEvent,
  ): Promise<void> {
    assertOutboxEvent(event);
    await transaction.query(
      `INSERT INTO platform.outbox (
         event_id, tenant_id, workspace_id, deal_id, aggregate_type,
         aggregate_id, aggregate_version, event_type, schema_version,
         payload, correlation_id, causation_id, occurred_at, available_at,
         dispatch_state
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
         'pending'
       )`,
      outboxValues(event),
    );
  }

  /**
   * Claims available rows with PostgreSQL skip-locked lease semantics.
   *
   * @example await repository.claim(transaction, claim)
   */
  async claim(
    transaction: TransactionHandle,
    claim: OutboxClaim,
  ): Promise<ClaimedOutboxEvent[]> {
    assertClaim(claim);
    const result = await transaction.query<OutboxRow>(
      outboxClaimSql(),
      [claim.now, claim.owner, claim.leaseUntil, claim.limit],
    );
    return result.rows.map(toClaimedEvent);
  }

  /**
   * Records successful publication only for the current lease owner.
   *
   * @example await repository.markPublished(transaction, claimedEvent, now)
   */
  async markPublished(
    transaction: TransactionHandle,
    event: ClaimedOutboxEvent,
    publishedAt: Date,
  ): Promise<void> {
    const result = await transaction.query(
      `UPDATE platform.outbox
       SET dispatch_state = 'published', published_at = $5,
           lease_owner = NULL, lease_expires_at = NULL, last_failure = NULL
       WHERE event_id = $1 AND dispatch_state = 'leased' AND lease_owner = $2
         AND attempt_count = $3 AND lease_expires_at = $4`,
      leaseFenceValues(event, publishedAt),
    );
    assertLeaseUpdate(result.rowCount, event);
  }

  /**
   * Reschedules or dead-letters a failed publication without raw errors.
   *
   * @example await repository.recordFailure(transaction, claimedEvent, failure, retryAt)
   */
  async recordFailure(
    transaction: TransactionHandle,
    event: ClaimedOutboxEvent,
    failure: string,
    retryAt: Date | undefined,
  ): Promise<OutboxFailureState> {
    assertSanitizedFailure(failure);
    const result = await transaction.query<
      { dispatchState: OutboxFailureState }
    >(
      outboxFailureSql(),
      [...leaseFenceValues(event), failure, retryAt ?? null],
    );
    assertLeaseUpdate(result.rowCount, event);
    return result.rows[0].dispatchState;
  }
}

function outboxValues(event: OutboxEvent): unknown[] {
  return [
    event.eventId,
    event.tenantId,
    event.workspaceId ?? null,
    event.dealId ?? null,
    event.aggregateType,
    event.aggregateId,
    event.aggregateVersion,
    event.eventType,
    event.schemaVersion,
    JSON.stringify(event.payload),
    event.correlationId,
    event.causationId ?? null,
    event.occurredAt,
    event.availableAt,
  ];
}

function outboxClaimSql(): string {
  return `
    WITH claimable AS (
      SELECT event_id
      FROM platform.outbox
      WHERE (
        dispatch_state IN ('pending', 'retry_scheduled')
        AND available_at <= $1
      ) OR (
        dispatch_state = 'leased' AND lease_expires_at <= $1
      )
      ORDER BY available_at, occurred_at, event_id
      FOR UPDATE SKIP LOCKED
      LIMIT $4
    )
    UPDATE platform.outbox AS event
    SET dispatch_state = 'leased', lease_owner = $2, lease_expires_at = $3,
        attempt_count = attempt_count + 1
    FROM claimable
    WHERE event.event_id = claimable.event_id
    RETURNING ${outboxReturningColumns("event")}
  `;
}

function outboxFailureSql(): string {
  return `
    UPDATE platform.outbox
    SET dispatch_state = CASE
          WHEN $6::timestamptz IS NULL THEN 'dead_lettered'
          ELSE 'retry_scheduled'
        END,
        available_at = COALESCE($6::timestamptz, available_at),
        lease_owner = NULL, lease_expires_at = NULL, last_failure = $5
    WHERE event_id = $1 AND dispatch_state = 'leased' AND lease_owner = $2
      AND attempt_count = $3 AND lease_expires_at = $4
    RETURNING dispatch_state AS "dispatchState"
  `;
}

function leaseFenceValues(
  event: ClaimedOutboxEvent,
  trailing?: unknown,
): unknown[] {
  const values: unknown[] = [
    event.eventId,
    event.leaseOwner,
    event.attemptCount,
    event.leaseExpiresAt,
  ];
  if (arguments.length === 2) values.push(trailing);
  return values;
}

function outboxReturningColumns(alias: string): string {
  return `
    ${alias}.event_id AS "eventId", ${alias}.tenant_id AS "tenantId",
    ${alias}.workspace_id AS "workspaceId", ${alias}.deal_id AS "dealId",
    ${alias}.aggregate_type AS "aggregateType",
    ${alias}.aggregate_id AS "aggregateId",
    ${alias}.aggregate_version::text AS "aggregateVersion",
    ${alias}.event_type AS "eventType",
    ${alias}.schema_version AS "schemaVersion", ${alias}.payload,
    ${alias}.correlation_id AS "correlationId",
    ${alias}.causation_id AS "causationId",
    ${alias}.occurred_at AS "occurredAt",
    ${alias}.available_at AS "availableAt",
    ${alias}.attempt_count AS "attemptCount",
    ${alias}.lease_owner AS "leaseOwner",
    ${alias}.lease_expires_at AS "leaseExpiresAt"
  `;
}

function toClaimedEvent(row: OutboxRow): ClaimedOutboxEvent {
  const aggregateVersion = Number(row.aggregateVersion) as AggregateVersion;
  if (!isAggregateVersion(aggregateVersion)) {
    throw new Error(
      `Outbox event "${row.eventId}" version "${row.aggregateVersion}" is invalid; expected a positive integer.`,
    );
  }
  return {
    ...row,
    aggregateVersion,
    workspaceId: row.workspaceId ?? undefined,
    dealId: row.dealId ?? undefined,
    causationId: row.causationId ?? undefined,
  };
}

function assertOutboxEvent(event: OutboxEvent): void {
  assertText(event.eventId, "event ID", 128);
  assertText(event.aggregateType, "aggregate type", 128);
  assertText(event.aggregateId, "aggregate ID", 128);
  assertText(event.eventType, "event type", 128);
  if (Number.isSafeInteger(event.schemaVersion) && event.schemaVersion > 0) {
    return;
  }
  throw new Error(
    `Outbox event "${event.eventId}" schema version "${event.schemaVersion}" is invalid; expected a positive integer.`,
  );
}

function assertClaim(claim: OutboxClaim): void {
  assertText(claim.owner, "lease owner", 128);
  if (claim.leaseUntil <= claim.now) {
    throw new Error(
      `Outbox lease "${claim.leaseUntil.toISOString()}" is invalid; expected a time after "${claim.now.toISOString()}".`,
    );
  }
  if (
    Number.isSafeInteger(claim.limit) && claim.limit > 0 && claim.limit <= 100
  ) {
    return;
  }
  throw new Error(
    `Outbox claim limit "${claim.limit}" is invalid; expected 1-100.`,
  );
}

function assertText(value: string, label: string, maximum: number): void {
  if (value.trim() && value.length <= maximum) return;
  throw new Error(
    `Outbox ${label} "${value}" is invalid; expected 1-${maximum} characters.`,
  );
}

function assertLeaseUpdate(
  rowCount: number | null,
  event: ClaimedOutboxEvent,
): void {
  if (rowCount === 1) return;
  throw new Error(
    `Outbox event "${event.eventId}" lease attempt "${event.attemptCount}" did not match; expected one current leased row.`,
  );
}

function assertSanitizedFailure(failure: string): void {
  if (/^[A-Z][A-Z0-9_:-]{0,127}$/.test(failure)) return;
  throw new Error(
    `Outbox failure "${failure}" is unsafe; expected a sanitized code up to 128 characters.`,
  );
}
