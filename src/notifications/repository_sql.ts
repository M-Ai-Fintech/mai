import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  IdempotencyKey,
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
} from "./model.ts";
import type { AuthorizedNotificationScope } from "./projection.ts";
import {
  freezeSubscription,
  type Subscription,
  SubscriptionVersionConflictError,
} from "./subscriptions.ts";
import {
  attachJobSql,
  deliveryStateUpdateSql,
  idempotencyInsertSql,
  idempotencySelectSql,
  type NotificationIdempotencyLookup,
  type NotificationIdempotencyRecord,
  type NotificationJobLink,
  type NotificationProjectionLookup,
  type NotificationProjectionQuery,
  type NotificationRepository,
  NotificationRepositoryNotFoundError,
  type NotificationStateUpdate,
  projectionInsertSql,
  projectionInsertValues,
  projectionSelectSql,
  receiptInsertSql,
  receiptInsertValues,
  receiptSelectSql,
  type SubscriptionIdLookup,
  subscriptionInsertSql,
  subscriptionInsertValues,
  type SubscriptionLookup,
  subscriptionSelectSql,
  subscriptionUpdateSql,
} from "./repository.ts";

export class PostgresNotificationRepository implements NotificationRepository {
  async findSubscription(
    transaction: TransactionHandle,
    lookup: SubscriptionLookup,
  ): Promise<Subscription | undefined> {
    const result = await transaction.query<SubscriptionRow>(
      `${subscriptionSelectSql()} WHERE tenant_id = $1 AND workspace_id = $2
       AND deal_id IS NOT DISTINCT FROM $3 AND recipient_id = $4 AND event_type = $5`,
      subscriptionScopeValues(lookup),
    );
    return result.rows[0] === undefined
      ? undefined
      : toSubscription(result.rows[0]);
  }

  async findSubscriptionById(
    transaction: TransactionHandle,
    lookup: SubscriptionIdLookup,
  ): Promise<Subscription | undefined> {
    const result = await transaction.query<SubscriptionRow>(
      `${subscriptionSelectSql()} WHERE tenant_id = $1 AND workspace_id = $2
       AND deal_id IS NOT DISTINCT FROM $3 AND recipient_id = $4 AND subscription_id = $5`,
      [
        lookup.scope.tenantId,
        lookup.scope.workspaceId,
        lookup.scope.dealId ?? null,
        lookup.recipientId,
        lookup.subscriptionId,
      ],
    );
    return result.rows[0] === undefined
      ? undefined
      : toSubscription(result.rows[0]);
  }

  async insertSubscription(
    transaction: TransactionHandle,
    subscription: Subscription,
  ): Promise<void> {
    await transaction.query(
      subscriptionInsertSql(),
      subscriptionInsertValues(subscription),
    );
  }

  async replaceSubscription(
    transaction: TransactionHandle,
    subscription: Subscription,
    expectedVersion: AggregateVersion,
  ): Promise<void> {
    const result = await transaction.query(
      subscriptionUpdateSql(),
      [
        subscription.scope.tenantId,
        subscription.scope.workspaceId,
        subscription.scope.dealId ?? null,
        subscription.recipientId,
        subscription.subscriptionId,
        expectedVersion,
        JSON.stringify(subscription.preferences),
        subscription.version,
        subscription.updatedAt,
      ],
    );
    if (result.rowCount === 1) return;
    const current = await this.findSubscriptionById(transaction, {
      scope: subscription.scope,
      recipientId: subscription.recipientId,
      subscriptionId: subscription.subscriptionId,
    });
    if (current === undefined) throw new NotificationRepositoryNotFoundError();
    throw new SubscriptionVersionConflictError(
      subscription.subscriptionId,
      expectedVersion,
      current.version,
    );
  }

  async listProjections(
    transaction: TransactionHandle,
    query: NotificationProjectionQuery,
  ): Promise<readonly NotificationProjection[]> {
    const after = query.after === undefined
      ? ""
      : " AND (created_at, notification_id) < ($5, $6)";
    const values: unknown[] = [
      query.access.tenantId,
      query.access.workspaceId,
      query.access.dealId ?? null,
      query.access.recipientId,
    ];
    if (query.after !== undefined) {
      values.push(query.after.createdAt, query.after.notificationId);
    }
    values.push(query.limit);
    const result = await transaction.query<NotificationProjectionRow>(
      `${projectionSelectSql()} WHERE tenant_id = $1 AND workspace_id = $2
       AND deal_id IS NOT DISTINCT FROM $3 AND recipient_id = $4${after}
       ORDER BY created_at DESC, notification_id DESC LIMIT $${values.length}`,
      values,
    );
    return result.rows.map(toProjection);
  }

  async findProjection(
    transaction: TransactionHandle,
    lookup: NotificationProjectionLookup,
  ): Promise<NotificationProjection | undefined> {
    const result = await transaction.query<NotificationProjectionRow>(
      `${projectionSelectSql()} WHERE tenant_id = $1 AND workspace_id = $2
       AND deal_id IS NOT DISTINCT FROM $3 AND recipient_id = $4
       AND notification_id = $5`,
      projectionLookupValues(lookup),
    );
    return result.rows[0] === undefined
      ? undefined
      : toProjection(result.rows[0]);
  }

  async insertProjection(
    transaction: TransactionHandle,
    projection: NotificationProjection,
  ): Promise<"inserted" | "duplicate"> {
    const result = await transaction.query(
      projectionInsertSql(),
      projectionInsertValues(projection),
    );
    return result.rowCount === 1 ? "inserted" : "duplicate";
  }

  async attachDeliveryJob(
    transaction: TransactionHandle,
    link: NotificationJobLink,
  ): Promise<void> {
    const result = await transaction.query(attachJobSql(), [
      link.access.tenantId,
      link.access.workspaceId,
      link.access.dealId ?? null,
      link.access.recipientId,
      link.notificationId,
      link.idempotencyKey,
      link.jobId,
      link.operationId,
    ]);
    if (result.rowCount === 1) return;
    throw new NotificationRepositoryNotFoundError();
  }

  async updateDeliveryState(
    transaction: TransactionHandle,
    update: NotificationStateUpdate,
  ): Promise<void> {
    const result = await transaction.query(deliveryStateUpdateSql(), [
      update.access.tenantId,
      update.access.workspaceId,
      update.access.dealId ?? null,
      update.access.recipientId,
      update.notificationId,
      update.jobId,
      update.state,
    ]);
    if (result.rowCount === 1) return;
    throw new NotificationRepositoryNotFoundError();
  }

  async appendReceipt(
    transaction: TransactionHandle,
    receipt: DeliveryReceipt,
  ): Promise<void> {
    await transaction.query(receiptInsertSql(), receiptInsertValues(receipt));
  }

  async listReceipts(
    transaction: TransactionHandle,
    lookup: NotificationProjectionLookup,
  ): Promise<readonly DeliveryReceipt[]> {
    const result = await transaction.query<DeliveryReceiptRow>(
      `${receiptSelectSql()} WHERE tenant_id = $1 AND workspace_id = $2
       AND deal_id IS NOT DISTINCT FROM $3 AND recipient_id = $4
       AND notification_id = $5 ORDER BY occurred_at, receipt_id`,
      projectionLookupValues(lookup),
    );
    return result.rows.map(toReceipt);
  }

  async findIdempotency(
    transaction: TransactionHandle,
    lookup: NotificationIdempotencyLookup,
  ): Promise<NotificationIdempotencyRecord | undefined> {
    const result = await transaction.query<NotificationIdempotencyRow>(
      `${idempotencySelectSql()} WHERE tenant_id = $1 AND workspace_id = $2
       AND actor_id = $3 AND command_type = $4 AND target_id = $5
       AND idempotency_key = $6`,
      idempotencyLookupValues(lookup),
    );
    return result.rows[0] === undefined
      ? undefined
      : toIdempotency(result.rows[0]);
  }

  async insertIdempotency(
    transaction: TransactionHandle,
    record: NotificationIdempotencyRecord,
  ): Promise<"inserted" | "duplicate"> {
    const result = await transaction.query(
      idempotencyInsertSql(),
      [
        ...idempotencyLookupValues(record),
        record.payloadDigest,
        JSON.stringify(record.result),
        record.createdAt,
      ],
    );
    return result.rowCount === 1 ? "inserted" : "duplicate";
  }
}

interface ScopedRecipientRow {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: string | null;
  readonly recipientId: ActorId;
}

interface SubscriptionRow extends ScopedRecipientRow {
  readonly subscriptionId: string;
  readonly eventType: string;
  readonly preferences: unknown;
  readonly version: string | number;
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
}

interface NotificationProjectionRow extends ScopedRecipientRow {
  readonly notificationId: string;
  readonly sourceEventId: string;
  readonly sourceEventType: string;
  readonly notificationType: string;
  readonly title: string;
  readonly body: string;
  readonly subscriptionId: string | null;
  readonly subscriptionVersion: string | number | null;
  readonly createdAt: Date | string;
  readonly expiresAt: Date | string | null;
  readonly deliveryState: DeliveryState;
  readonly jobId: string | null;
  readonly operationId: string | null;
  readonly idempotencyKey: IdempotencyKey;
}

interface DeliveryReceiptRow extends ScopedRecipientRow {
  readonly receiptId: string;
  readonly notificationId: string;
  readonly jobId: string;
  readonly channel: DeliveryReceipt["channel"];
  readonly attemptNumber: number | string;
  readonly outcome: DeliveryReceipt["outcome"];
  readonly failureCode: string | null;
  readonly occurredAt: Date | string;
}

interface NotificationIdempotencyRow {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetId: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly payloadDigest: string;
  readonly result: unknown;
  readonly createdAt: Date | string;
}

function toSubscription(row: SubscriptionRow): Subscription {
  const preferences = parseJsonObject(
    row.preferences,
    "subscription preferences",
  );
  return freezeSubscription({
    subscriptionId: row.subscriptionId as Subscription["subscriptionId"],
    scope: persistedScope(row),
    recipientId: row.recipientId,
    eventType: row.eventType,
    preferences: preferences as unknown as Subscription["preferences"],
    version: Number(row.version) as AggregateVersion,
    createdAt: toDate(row.createdAt, "subscription creation time"),
    updatedAt: toDate(row.updatedAt, "subscription update time"),
  });
}

function toProjection(row: NotificationProjectionRow): NotificationProjection {
  return freezeProjection({
    notificationId: row.notificationId as NotificationId,
    scope: persistedScope(row),
    recipientId: row.recipientId,
    sourceEventId: row.sourceEventId,
    sourceEventType: row.sourceEventType,
    notificationType: row.notificationType,
    title: row.title,
    body: row.body,
    ...(row.subscriptionId === null ? {} : {
      subscriptionId: row.subscriptionId as Subscription["subscriptionId"],
    }),
    ...(row.subscriptionVersion === null ? {} : {
      subscriptionVersion: Number(
        row.subscriptionVersion,
      ) as AggregateVersion,
    }),
    createdAt: toDate(row.createdAt, "notification creation time"),
    ...(row.expiresAt === null
      ? {}
      : { expiresAt: toDate(row.expiresAt, "notification expiry") }),
    deliveryState: row.deliveryState,
    ...(row.jobId === null
      ? {}
      : { jobId: row.jobId as NotificationProjection["jobId"] }),
    ...(row.operationId === null ? {} : {
      operationId: row.operationId as NotificationProjection["operationId"],
    }),
    idempotencyKey: row.idempotencyKey,
  });
}

function toReceipt(row: DeliveryReceiptRow): DeliveryReceipt {
  return freezeReceipt({
    receiptId: row.receiptId as DeliveryReceipt["receiptId"],
    scope: persistedScope(row),
    recipientId: row.recipientId,
    notificationId: row.notificationId as NotificationId,
    jobId: row.jobId as DeliveryReceipt["jobId"],
    channel: row.channel,
    attemptNumber: Number(row.attemptNumber),
    outcome: row.outcome,
    ...(row.failureCode === null ? {} : { failureCode: row.failureCode }),
    occurredAt: toDate(row.occurredAt, "receipt occurrence time"),
  });
}

function toIdempotency(
  row: NotificationIdempotencyRow,
): NotificationIdempotencyRecord {
  return {
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    actorId: row.actorId,
    commandType: row.commandType,
    targetId: row.targetId,
    idempotencyKey: row.idempotencyKey,
    payloadDigest: row.payloadDigest,
    result: parseJsonObject(row.result, "notification idempotency result"),
    createdAt: toDate(row.createdAt, "notification idempotency creation time"),
  };
}

function persistedScope(row: ScopedRecipientRow): NotificationScope {
  return {
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    ...(row.dealId === null
      ? {}
      : { dealId: row.dealId as NotificationScope["dealId"] }),
  };
}

function subscriptionScopeValues(lookup: SubscriptionLookup): unknown[] {
  return [
    lookup.scope.tenantId,
    lookup.scope.workspaceId,
    lookup.scope.dealId ?? null,
    lookup.recipientId,
    lookup.eventType,
  ];
}

function projectionLookupValues(
  lookup: NotificationProjectionLookup,
): unknown[] {
  return [
    lookup.access.tenantId,
    lookup.access.workspaceId,
    lookup.access.dealId ?? null,
    lookup.access.recipientId,
    lookup.notificationId,
  ];
}

function idempotencyLookupValues(
  lookup: NotificationIdempotencyLookup,
): unknown[] {
  return [
    lookup.tenantId,
    lookup.workspaceId,
    lookup.actorId,
    lookup.commandType,
    lookup.targetId,
    lookup.idempotencyKey,
  ];
}

function toDate(value: Date | string, label: string): Date {
  const date = new Date(value);
  if (Number.isFinite(date.getTime())) return date;
  throw new Error(
    `${label} "${
      String(value)
    }" is invalid; expected a valid persisted timestamp.`,
  );
}

function parseJsonObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
  ) return parsed as Record<string, unknown>;
  throw new Error(
    `${label} "${String(value)}" is invalid; expected a JSON object.`,
  );
}
