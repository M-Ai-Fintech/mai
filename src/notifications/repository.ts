import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  IdempotencyKey,
  JobId,
  OperationId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import {
  type DeliveryReceipt,
  type DeliveryState,
  freezeProjection,
  freezeReceipt,
  type NotificationId,
  type NotificationProjection,
  type NotificationScope,
  notificationScopeKey,
} from "./model.ts";
import type { AuthorizedNotificationScope } from "./projection.ts";
import {
  freezeSubscription,
  type Subscription,
  SubscriptionVersionConflictError,
} from "./subscriptions.ts";

export { PostgresNotificationRepository } from "./repository_sql.ts";

export function subscriptionInsertSql(): string {
  return `INSERT INTO notifications.subscriptions (
    subscription_id, tenant_id, workspace_id, deal_id, recipient_id,
    event_type, preferences, version, created_at, updated_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`;
}

export function subscriptionInsertValues(
  subscription: Subscription,
): unknown[] {
  return [
    subscription.subscriptionId,
    subscription.scope.tenantId,
    subscription.scope.workspaceId,
    subscription.scope.dealId ?? null,
    subscription.recipientId,
    subscription.eventType,
    JSON.stringify(subscription.preferences),
    subscription.version,
    subscription.createdAt,
  ];
}

export function subscriptionSelectSql(): string {
  return `SELECT subscription_id AS "subscriptionId",
    tenant_id AS "tenantId", workspace_id AS "workspaceId",
    deal_id AS "dealId", recipient_id AS "recipientId",
    event_type AS "eventType", preferences, version,
    created_at AS "createdAt", updated_at AS "updatedAt"
    FROM notifications.subscriptions`;
}

export function subscriptionUpdateSql(): string {
  return `UPDATE notifications.subscriptions
    SET preferences = $7, version = $8, updated_at = $9
    WHERE tenant_id = $1 AND workspace_id = $2
      AND deal_id IS NOT DISTINCT FROM $3 AND recipient_id = $4
      AND subscription_id = $5 AND version = $6`;
}

export function projectionInsertSql(): string {
  return `INSERT INTO notifications.projections (
    notification_id, tenant_id, workspace_id, deal_id, recipient_id,
    source_event_id, source_event_type, notification_type, title, body,
    subscription_id, subscription_version, created_at, expires_at,
    delivery_state, job_id, operation_id, idempotency_key
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
    $15, $16, $17, $18
  ) ON CONFLICT (tenant_id, source_event_id, recipient_id) DO NOTHING`;
}

export function projectionInsertValues(
  projection: NotificationProjection,
): unknown[] {
  return [
    projection.notificationId,
    projection.scope.tenantId,
    projection.scope.workspaceId,
    projection.scope.dealId ?? null,
    projection.recipientId,
    projection.sourceEventId,
    projection.sourceEventType,
    projection.notificationType,
    projection.title,
    projection.body,
    projection.subscriptionId ?? null,
    projection.subscriptionVersion ?? null,
    projection.createdAt,
    projection.expiresAt ?? null,
    projection.deliveryState,
    projection.jobId ?? null,
    projection.operationId ?? null,
    projection.idempotencyKey,
  ];
}

export function projectionSelectSql(): string {
  return `SELECT notification_id AS "notificationId",
    tenant_id AS "tenantId", workspace_id AS "workspaceId",
    deal_id AS "dealId", recipient_id AS "recipientId",
    source_event_id AS "sourceEventId", source_event_type AS "sourceEventType",
    notification_type AS "notificationType", title, body,
    subscription_id AS "subscriptionId",
    subscription_version AS "subscriptionVersion",
    created_at AS "createdAt", expires_at AS "expiresAt",
    delivery_state AS "deliveryState", job_id AS "jobId",
    operation_id AS "operationId", idempotency_key AS "idempotencyKey"
    FROM notifications.projections`;
}

export function attachJobSql(): string {
  return `UPDATE notifications.projections
    SET delivery_state = 'queued', job_id = $7, operation_id = $8
    WHERE tenant_id = $1 AND workspace_id = $2
      AND deal_id IS NOT DISTINCT FROM $3 AND recipient_id = $4
      AND notification_id = $5 AND idempotency_key = $6`;
}

export function deliveryStateUpdateSql(): string {
  return `UPDATE notifications.projections
    SET delivery_state = $7
    WHERE tenant_id = $1 AND workspace_id = $2
      AND deal_id IS NOT DISTINCT FROM $3 AND recipient_id = $4
      AND notification_id = $5 AND job_id = $6`;
}

export function receiptInsertSql(): string {
  return `INSERT INTO notifications.delivery_receipts (
    receipt_id, tenant_id, workspace_id, deal_id, recipient_id,
    notification_id, job_id, channel, attempt_number, outcome,
    failure_code, occurred_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
}

export function receiptInsertValues(receipt: DeliveryReceipt): unknown[] {
  return [
    receipt.receiptId,
    receipt.scope.tenantId,
    receipt.scope.workspaceId,
    receipt.scope.dealId ?? null,
    receipt.recipientId,
    receipt.notificationId,
    receipt.jobId,
    receipt.channel,
    receipt.attemptNumber,
    receipt.outcome,
    receipt.failureCode ?? null,
    receipt.occurredAt,
  ];
}

export function receiptSelectSql(): string {
  return `SELECT receipt_id AS "receiptId", tenant_id AS "tenantId",
    workspace_id AS "workspaceId", deal_id AS "dealId",
    recipient_id AS "recipientId", notification_id AS "notificationId",
    job_id AS "jobId", channel, attempt_number AS "attemptNumber",
    outcome, failure_code AS "failureCode", occurred_at AS "occurredAt"
    FROM notifications.delivery_receipts`;
}

export function idempotencySelectSql(): string {
  return `SELECT tenant_id AS "tenantId", workspace_id AS "workspaceId",
    actor_id AS "actorId", command_type AS "commandType",
    target_id AS "targetId", idempotency_key AS "idempotencyKey",
    payload_digest AS "payloadDigest", result, created_at AS "createdAt"
    FROM notifications.idempotency_records`;
}

export function idempotencyInsertSql(): string {
  return `INSERT INTO notifications.idempotency_records (
    tenant_id, workspace_id, actor_id, command_type, target_id,
    idempotency_key, payload_digest, result, created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
}

export interface SubscriptionLookup {
  readonly scope: NotificationScope;
  readonly recipientId: ActorId;
  readonly eventType: string;
}

export interface SubscriptionIdLookup {
  readonly scope: NotificationScope;
  readonly recipientId: ActorId;
  readonly subscriptionId: Subscription["subscriptionId"];
}

export interface NotificationProjectionQuery {
  readonly access: AuthorizedNotificationScope;
  readonly after?: {
    readonly createdAt: Date;
    readonly notificationId: NotificationId;
  };
  readonly limit: number;
}

export interface NotificationProjectionLookup {
  readonly access: AuthorizedNotificationScope;
  readonly notificationId: NotificationId;
}

export interface NotificationJobLink {
  readonly access: AuthorizedNotificationScope;
  readonly notificationId: NotificationId;
  readonly idempotencyKey: IdempotencyKey;
  readonly jobId: JobId;
  readonly operationId: OperationId;
}

export interface NotificationStateUpdate {
  readonly access: AuthorizedNotificationScope;
  readonly notificationId: NotificationId;
  readonly jobId: string;
  readonly state: DeliveryState;
}

export interface NotificationIdempotencyLookup {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetId: string;
  readonly idempotencyKey: IdempotencyKey;
}

export interface NotificationIdempotencyRecord
  extends NotificationIdempotencyLookup {
  readonly payloadDigest: string;
  readonly result: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
}

export interface NotificationRepository {
  findSubscription(
    transaction: TransactionHandle,
    lookup: SubscriptionLookup,
  ): Promise<Subscription | undefined>;
  findSubscriptionById(
    transaction: TransactionHandle,
    lookup: SubscriptionIdLookup,
  ): Promise<Subscription | undefined>;
  insertSubscription(
    transaction: TransactionHandle,
    subscription: Subscription,
  ): Promise<void>;
  replaceSubscription(
    transaction: TransactionHandle,
    subscription: Subscription,
    expectedVersion: AggregateVersion,
  ): Promise<void>;
  listProjections(
    transaction: TransactionHandle,
    query: NotificationProjectionQuery,
  ): Promise<readonly NotificationProjection[]>;
  findProjection(
    transaction: TransactionHandle,
    lookup: NotificationProjectionLookup,
  ): Promise<NotificationProjection | undefined>;
  insertProjection(
    transaction: TransactionHandle,
    projection: NotificationProjection,
  ): Promise<"inserted" | "duplicate">;
  attachDeliveryJob(
    transaction: TransactionHandle,
    link: NotificationJobLink,
  ): Promise<void>;
  updateDeliveryState(
    transaction: TransactionHandle,
    update: NotificationStateUpdate,
  ): Promise<void>;
  appendReceipt(
    transaction: TransactionHandle,
    receipt: DeliveryReceipt,
  ): Promise<void>;
  listReceipts(
    transaction: TransactionHandle,
    lookup: NotificationProjectionLookup,
  ): Promise<readonly DeliveryReceipt[]>;
  findIdempotency(
    transaction: TransactionHandle,
    lookup: NotificationIdempotencyLookup,
  ): Promise<NotificationIdempotencyRecord | undefined>;
  insertIdempotency(
    transaction: TransactionHandle,
    record: NotificationIdempotencyRecord,
  ): Promise<"inserted" | "duplicate">;
}

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly projections = new Map<string, NotificationProjection>();
  private readonly receipts: DeliveryReceipt[] = [];
  private readonly idempotency = new Map<
    string,
    NotificationIdempotencyRecord
  >();

  async findSubscription(
    _transaction: TransactionHandle,
    lookup: SubscriptionLookup,
  ): Promise<Subscription | undefined> {
    return this.subscriptions.get(subscriptionLookupKey(lookup));
  }

  async findSubscriptionById(
    _transaction: TransactionHandle,
    lookup: SubscriptionIdLookup,
  ): Promise<Subscription | undefined> {
    return [...this.subscriptions.values()].find((subscription) =>
      subscription.subscriptionId === lookup.subscriptionId &&
      sameScopeAndRecipient(subscription, lookup)
    );
  }

  async insertSubscription(
    _transaction: TransactionHandle,
    subscription: Subscription,
  ): Promise<void> {
    const key = subscriptionLookupKey({
      scope: subscription.scope,
      recipientId: subscription.recipientId,
      eventType: subscription.eventType,
    });
    if (this.subscriptions.has(key)) {
      throw new Error(
        `Subscription "${subscription.subscriptionId}" already exists; expected a unique subscription identity.`,
      );
    }
    this.subscriptions.set(key, subscription);
  }

  async replaceSubscription(
    _transaction: TransactionHandle,
    subscription: Subscription,
    expectedVersion: AggregateVersion,
  ): Promise<void> {
    const key = subscriptionLookupKey({
      scope: subscription.scope,
      recipientId: subscription.recipientId,
      eventType: subscription.eventType,
    });
    const current = this.subscriptions.get(key);
    if (current === undefined) throw new NotificationRepositoryNotFoundError();
    if (current.version !== expectedVersion) {
      throw new SubscriptionVersionConflictError(
        subscription.subscriptionId,
        expectedVersion,
        current.version,
      );
    }
    this.subscriptions.set(key, subscription);
  }

  async listProjections(
    _transaction: TransactionHandle,
    query: NotificationProjectionQuery,
  ): Promise<readonly NotificationProjection[]> {
    const rows = [...this.projections.values()]
      .filter((projection) => sameScopeAndRecipient(projection, query.access))
      .sort(compareProjection);
    const after = query.after;
    const filtered = after === undefined
      ? rows
      : rows.filter((projection) => isAfterCursor(projection, after));
    return filtered.slice(0, query.limit).map(freezeProjection);
  }

  async findProjection(
    _transaction: TransactionHandle,
    lookup: NotificationProjectionLookup,
  ): Promise<NotificationProjection | undefined> {
    const projection = this.projections.get(
      projectionKey(lookup.access, lookup.notificationId),
    );
    return projection === undefined ? undefined : freezeProjection(projection);
  }

  async insertProjection(
    _transaction: TransactionHandle,
    projection: NotificationProjection,
  ): Promise<"inserted" | "duplicate"> {
    const duplicate = [...this.projections.values()].some((stored) =>
      stored.scope.tenantId === projection.scope.tenantId &&
      stored.sourceEventId === projection.sourceEventId &&
      stored.recipientId === projection.recipientId
    );
    if (duplicate) return "duplicate";
    this.projections.set(projectionKeyForProjection(projection), projection);
    return "inserted";
  }

  async attachDeliveryJob(
    _transaction: TransactionHandle,
    link: NotificationJobLink,
  ): Promise<void> {
    const key = projectionKey(link.access, link.notificationId);
    const current = this.projections.get(key);
    if (
      current === undefined || current.idempotencyKey !== link.idempotencyKey
    ) {
      throw new NotificationRepositoryNotFoundError();
    }
    this.projections.set(key, {
      ...current,
      deliveryState: "queued",
      jobId: link.jobId,
      operationId: link.operationId,
    });
  }

  async updateDeliveryState(
    _transaction: TransactionHandle,
    update: NotificationStateUpdate,
  ): Promise<void> {
    const key = projectionKey(update.access, update.notificationId);
    const current = this.projections.get(key);
    if (current === undefined || current.jobId !== update.jobId) {
      throw new NotificationRepositoryNotFoundError();
    }
    this.projections.set(key, { ...current, deliveryState: update.state });
  }

  async appendReceipt(
    _transaction: TransactionHandle,
    receipt: DeliveryReceipt,
  ): Promise<void> {
    this.receipts.push(freezeReceipt(receipt));
  }

  async listReceipts(
    _transaction: TransactionHandle,
    lookup: NotificationProjectionLookup,
  ): Promise<readonly DeliveryReceipt[]> {
    return this.receipts.filter((receipt) =>
      receipt.notificationId === lookup.notificationId &&
      sameScopeAndRecipient(receipt, lookup.access)
    ).map(freezeReceipt);
  }

  async findIdempotency(
    _transaction: TransactionHandle,
    lookup: NotificationIdempotencyLookup,
  ): Promise<NotificationIdempotencyRecord | undefined> {
    return this.idempotency.get(idempotencyKey(lookup));
  }

  async insertIdempotency(
    _transaction: TransactionHandle,
    record: NotificationIdempotencyRecord,
  ): Promise<"inserted" | "duplicate"> {
    const key = idempotencyKey(record);
    if (this.idempotency.has(key)) return "duplicate";
    this.idempotency.set(key, record);
    return "inserted";
  }
}

export class NotificationRepositoryNotFoundError extends Error {
  readonly code = "PROTECTED_NOT_FOUND";

  constructor() {
    super("The protected notification resource was not found.");
    this.name = "NotificationRepositoryNotFoundError";
  }
}

function subscriptionLookupKey(lookup: SubscriptionLookup): string {
  return `${
    notificationScopeKey(lookup.scope)
  }|${lookup.recipientId}|${lookup.eventType}`;
}

function sameScopeAndRecipient(
  value: { readonly scope: NotificationScope; readonly recipientId: ActorId },
  access:
    | { readonly scope: NotificationScope; readonly recipientId: ActorId }
    | AuthorizedNotificationScope,
): boolean {
  const scope = "scope" in access ? access.scope : access;
  return value.scope.tenantId === scope.tenantId &&
    value.scope.workspaceId === scope.workspaceId &&
    value.scope.dealId === scope.dealId &&
    value.recipientId === access.recipientId;
}

function projectionKey(
  access: AuthorizedNotificationScope,
  notificationId: NotificationId,
): string {
  return `${
    notificationScopeKey(access)
  }|${access.recipientId}|${notificationId}`;
}

function projectionKeyForProjection(
  projection: NotificationProjection,
): string {
  return `${
    notificationScopeKey(projection.scope)
  }|${projection.recipientId}|${projection.notificationId}`;
}

function compareProjection(
  left: NotificationProjection,
  right: NotificationProjection,
): number {
  return right.createdAt.getTime() - left.createdAt.getTime() ||
    right.notificationId.localeCompare(left.notificationId);
}

function isAfterCursor(
  projection: NotificationProjection,
  cursor: NonNullable<NotificationProjectionQuery["after"]>,
): boolean {
  return projection.createdAt < cursor.createdAt ||
    projection.createdAt.getTime() === cursor.createdAt.getTime() &&
      projection.notificationId < cursor.notificationId;
}

function idempotencyKey(lookup: NotificationIdempotencyLookup): string {
  return [
    lookup.tenantId,
    lookup.workspaceId,
    lookup.actorId,
    lookup.commandType,
    lookup.targetId,
    lookup.idempotencyKey,
  ].join("|");
}
