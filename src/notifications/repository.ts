import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  DealId,
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
  type Subscription,
  SubscriptionVersionConflictError,
} from "./subscriptions.ts";

export { PostgresNotificationRepository } from "./repository_sql.ts";
export * from "./repository_sql_queries.ts";

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
  readonly dealId?: DealId;
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
  lockIdempotency(
    transaction: TransactionHandle,
    lookup: NotificationIdempotencyLookup,
  ): Promise<void>;
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
    await Promise.resolve();
    return this.subscriptions.get(subscriptionLookupKey(lookup));
  }

  async findSubscriptionById(
    _transaction: TransactionHandle,
    lookup: SubscriptionIdLookup,
  ): Promise<Subscription | undefined> {
    await Promise.resolve();
    return [...this.subscriptions.values()].find((subscription) =>
      subscription.subscriptionId === lookup.subscriptionId &&
      sameScopeAndRecipient(subscription, lookup)
    );
  }

  async insertSubscription(
    _transaction: TransactionHandle,
    subscription: Subscription,
  ): Promise<void> {
    await Promise.resolve();
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
    await Promise.resolve();
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
    await Promise.resolve();
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
    await Promise.resolve();
    const projection = this.projections.get(
      projectionKey(lookup.access, lookup.notificationId),
    );
    return projection === undefined ? undefined : freezeProjection(projection);
  }

  async insertProjection(
    _transaction: TransactionHandle,
    projection: NotificationProjection,
  ): Promise<"inserted" | "duplicate"> {
    await Promise.resolve();
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
    await Promise.resolve();
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
    await Promise.resolve();
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
    await Promise.resolve();
    this.receipts.push(freezeReceipt(receipt));
  }

  async listReceipts(
    _transaction: TransactionHandle,
    lookup: NotificationProjectionLookup,
  ): Promise<readonly DeliveryReceipt[]> {
    await Promise.resolve();
    return this.receipts.filter((receipt) =>
      receipt.notificationId === lookup.notificationId &&
      sameScopeAndRecipient(receipt, lookup.access)
    ).map(freezeReceipt);
  }

  async findIdempotency(
    _transaction: TransactionHandle,
    lookup: NotificationIdempotencyLookup,
  ): Promise<NotificationIdempotencyRecord | undefined> {
    await Promise.resolve();
    return this.idempotency.get(idempotencyKey(lookup));
  }

  lockIdempotency(): Promise<void> {
    return Promise.resolve();
  }

  async insertIdempotency(
    _transaction: TransactionHandle,
    record: NotificationIdempotencyRecord,
  ): Promise<"inserted" | "duplicate"> {
    await Promise.resolve();
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
    lookup.dealId ?? NO_DEAL_SCOPE_MARKER,
    lookup.actorId,
    lookup.commandType,
    lookup.targetId,
    lookup.idempotencyKey,
  ].join("|");
}

export const NO_DEAL_SCOPE_MARKER = "__no_deal__";
