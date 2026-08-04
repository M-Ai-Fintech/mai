import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  IdempotencyKey,
  JobId,
  OperationId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";

declare const notificationIdBrand: unique symbol;
declare const subscriptionIdBrand: unique symbol;
declare const receiptIdBrand: unique symbol;

export type NotificationId = string & {
  readonly [notificationIdBrand]: "NotificationId";
};
export type SubscriptionId = string & {
  readonly [subscriptionIdBrand]: "SubscriptionId";
};
export type DeliveryReceiptId = string & {
  readonly [receiptIdBrand]: "DeliveryReceiptId";
};

export type NotificationIdParseResult = LocalIdParse<NotificationId>;
export type SubscriptionIdParseResult = LocalIdParse<SubscriptionId>;
export type DeliveryReceiptIdParseResult = LocalIdParse<DeliveryReceiptId>;

export interface NotificationScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId?: DealId;
}

export interface RecipientScope extends NotificationScope {
  readonly recipientId: ActorId;
}

export type NotificationChannel = "in_app" | "email";

export interface NotificationRecipientTarget {
  readonly recipientId: ActorId;
  readonly subscriptionId?: SubscriptionId;
  readonly expiresAt?: Date;
}

export interface NotificationEventPayload {
  readonly notificationType: string;
  readonly title: string;
  readonly body: string;
  readonly recipients: readonly NotificationRecipientTarget[];
  readonly expiresAt?: Date;
}

export interface NotificationProjection {
  readonly notificationId: NotificationId;
  readonly scope: NotificationScope;
  readonly recipientId: ActorId;
  readonly sourceEventId: string;
  readonly sourceEventType: string;
  readonly notificationType: string;
  readonly title: string;
  readonly body: string;
  readonly subscriptionId?: SubscriptionId;
  readonly subscriptionVersion?: AggregateVersion;
  readonly createdAt: Date;
  readonly expiresAt?: Date;
  readonly deliveryState: DeliveryState;
  readonly jobId?: JobId;
  readonly operationId?: OperationId;
  readonly idempotencyKey: IdempotencyKey;
}

export type DeliveryState =
  | "queued"
  | "attempting"
  | "retry_scheduled"
  | "succeeded"
  | "expired"
  | "dead_lettered";

export type DeliveryReceiptOutcome =
  | "attempted"
  | "succeeded"
  | "retry_scheduled"
  | "expired"
  | "terminal";

export interface DeliveryReceipt {
  readonly receiptId: DeliveryReceiptId;
  readonly scope: NotificationScope;
  readonly recipientId: ActorId;
  readonly notificationId: NotificationId;
  readonly jobId: JobId;
  readonly channel: NotificationChannel;
  readonly attemptNumber: number;
  readonly outcome: DeliveryReceiptOutcome;
  readonly failureCode?: string;
  readonly occurredAt: Date;
}

export interface NotificationClock {
  now(): Date;
}

export function parseNotificationId(value: unknown): NotificationIdParseResult {
  return parseLocalId(value, "notif_");
}

export function parseSubscriptionId(value: unknown): SubscriptionIdParseResult {
  return parseLocalId(value, "sub_");
}

export function parseDeliveryReceiptId(
  value: unknown,
): DeliveryReceiptIdParseResult {
  return parseLocalId(value, "receipt_");
}

export function createNotificationId(value: string): NotificationId {
  return requireLocalId<NotificationId>(value, "notif_", "notification ID");
}

export function createSubscriptionId(value: string): SubscriptionId {
  return requireLocalId<SubscriptionId>(value, "sub_", "subscription ID");
}

export function createDeliveryReceiptId(value: string): DeliveryReceiptId {
  return requireLocalId<DeliveryReceiptId>(
    value,
    "receipt_",
    "delivery receipt ID",
  );
}

export function freezeEventPayload(
  payload: NotificationEventPayload,
): NotificationEventPayload {
  assertEventPayload(payload);
  const recipients = payload.recipients.map((recipient) =>
    Object.freeze({
      ...recipient,
      ...(recipient.expiresAt === undefined
        ? {}
        : { expiresAt: new Date(recipient.expiresAt) }),
    })
  );
  return Object.freeze({
    notificationType: payload.notificationType,
    title: payload.title,
    body: payload.body,
    recipients: Object.freeze(recipients),
    ...(payload.expiresAt === undefined
      ? {}
      : { expiresAt: new Date(payload.expiresAt) }),
  });
}

export function freezeProjection(
  projection: NotificationProjection,
): NotificationProjection {
  assertProjection(projection);
  return Object.freeze({
    ...projection,
    scope: Object.freeze({ ...projection.scope }),
    createdAt: new Date(projection.createdAt),
    ...(projection.expiresAt === undefined
      ? {}
      : { expiresAt: new Date(projection.expiresAt) }),
  });
}

export function freezeReceipt(receipt: DeliveryReceipt): DeliveryReceipt {
  assertReceipt(receipt);
  return Object.freeze({
    ...receipt,
    scope: Object.freeze({ ...receipt.scope }),
    occurredAt: new Date(receipt.occurredAt),
  });
}

export function sameNotificationScope(
  left: NotificationScope,
  right: NotificationScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

export function notificationScopeKey(scope: NotificationScope): string {
  return [scope.tenantId, scope.workspaceId, scope.dealId ?? "-"].join("|");
}

export function recipientScopeKey(scope: RecipientScope): string {
  return `${notificationScopeKey(scope)}|${scope.recipientId}`;
}

function assertEventPayload(payload: NotificationEventPayload): void {
  assertText(payload.notificationType, "notification type", 128);
  assertText(payload.title, "notification title", 200);
  assertText(payload.body, "notification body", 2_000);
  if (payload.recipients.length === 0) {
    throw new Error(
      "Notification event recipients are empty; expected at least one recipient.",
    );
  }
  assertOptionalDate(payload.expiresAt, "notification expiry");
  for (const target of payload.recipients) {
    assertText(target.recipientId, "notification recipient ID", 64);
    assertOptionalDate(target.expiresAt, "recipient notification expiry");
  }
}

function assertProjection(projection: NotificationProjection): void {
  assertText(projection.notificationId, "notification ID", 128);
  assertText(projection.sourceEventId, "source event ID", 128);
  assertText(projection.sourceEventType, "source event type", 128);
  assertEventPayload({
    notificationType: projection.notificationType,
    title: projection.title,
    body: projection.body,
    recipients: [{ recipientId: projection.recipientId }],
    expiresAt: projection.expiresAt,
  });
  assertOptionalDate(projection.createdAt, "notification creation time");
  assertText(projection.idempotencyKey, "notification idempotency key", 64);
  if (projection.jobId !== undefined) {
    assertText(projection.jobId, "job ID", 64);
  }
}

function assertReceipt(receipt: DeliveryReceipt): void {
  assertText(receipt.receiptId, "delivery receipt ID", 128);
  assertText(receipt.notificationId, "receipt notification ID", 128);
  assertText(receipt.jobId, "receipt job ID", 64);
  if (
    Number.isSafeInteger(receipt.attemptNumber) && receipt.attemptNumber > 0
  ) {
    assertOptionalDate(receipt.occurredAt, "receipt occurrence time");
    return;
  }
  throw new Error(
    `Delivery receipt attempt number "${receipt.attemptNumber}" is invalid; expected a positive integer.`,
  );
}

function assertOptionalDate(value: Date | undefined, label: string): void {
  if (value === undefined || Number.isFinite(value.getTime())) return;
  throw new Error(
    `${label} "${String(value)}" is invalid; expected a valid Date value.`,
  );
}

function assertText(value: string, label: string, maximum: number): void {
  if (typeof value === "string" && value.trim() && value.length <= maximum) {
    return;
  }
  throw new Error(
    `${label} "${String(value)}" is invalid; expected 1-${maximum} characters.`,
  );
}

interface LocalIdResult<T extends string> {
  readonly ok: true;
  readonly value: T;
}

interface LocalIdFailure {
  readonly ok: false;
  readonly issue: { readonly code: "INVALID_ID" };
}

type LocalIdParse<T extends string> = LocalIdResult<T> | LocalIdFailure;

function parseLocalId<T extends string>(
  value: unknown,
  prefix: string,
): LocalIdParse<T> {
  if (
    typeof value === "string" &&
    new RegExp(`^${prefix}[a-z0-9]+(?:-[a-z0-9]+)*$`).test(value) &&
    value.length <= 128
  ) {
    return { ok: true, value: value as T };
  }
  return { ok: false, issue: { code: "INVALID_ID" } };
}

function requireLocalId<T extends string>(
  value: string,
  prefix: string,
  label: string,
): T {
  const result = parseLocalId<T>(value, prefix);
  if (result.ok) return result.value;
  throw new Error(
    `${label} "${value}" is invalid; expected the "${prefix}" prefixed identifier shape.`,
  );
}
