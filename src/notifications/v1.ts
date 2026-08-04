import { type OpaqueCursor, parseOpaqueCursor } from "../platform/api/v1.ts";
import type {
  IdempotencyKey,
  JobId,
  OperationId,
} from "../shared/contracts/identifiers.ts";
import { createNotificationId, type NotificationId } from "./model.ts";

export * from "./model.ts";
export * from "./subscriptions.ts";
export * from "./projection.ts";

export const NOTIFICATION_SCHEMA_VERSION = 1;
export const NOTIFICATION_API_VERSION = "v1";

export interface NotificationCursorData {
  readonly createdAt: string;
  readonly notificationId: NotificationId;
}

export function createNotificationCursor(
  data: NotificationCursorData,
): OpaqueCursor {
  assertCursorData(data);
  const encoded = btoa(JSON.stringify(data))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return encoded as OpaqueCursor;
}

export function parseNotificationCursor(
  value: unknown,
): NotificationCursorData | undefined {
  const cursor = parseOpaqueCursor(value);
  if (!cursor.ok) return undefined;
  try {
    const base64 = cursor.value.replaceAll("-", "+").replaceAll("_", "/");
    const padding = "=".repeat((4 - base64.length % 4) % 4);
    const decoded = JSON.parse(atob(`${base64}${padding}`)) as unknown;
    if (!isCursorData(decoded)) return undefined;
    return decoded;
  } catch {
    return undefined;
  }
}

export function deterministicNotificationId(
  sourceEventId: string,
  recipientId: string,
): NotificationId {
  return createNotificationId(
    `notif_${stableToken(sourceEventId)}-${stableToken(recipientId)}`,
  );
}

export function deterministicNotificationIdempotencyKey(
  sourceEventId: string,
  recipientId: string,
): IdempotencyKey {
  return `idem_notification-${stableToken(sourceEventId)}-${
    stableToken(recipientId)
  }` as IdempotencyKey;
}

export function deterministicNotificationJobId(
  notificationId: NotificationId,
): JobId {
  return `job_notification-${stableToken(notificationId)}` as JobId;
}

export function deterministicNotificationOperationId(
  notificationId: NotificationId,
): OperationId {
  return `op_notification-${stableToken(notificationId)}` as OperationId;
}

function assertCursorData(data: NotificationCursorData): void {
  if (!isCursorData(data)) {
    throw new Error(
      "Notification cursor data is invalid; expected an ISO timestamp and notification ID.",
    );
  }
}

function isCursorData(value: unknown): value is NotificationCursorData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.createdAt === "string" &&
    Number.isFinite(Date.parse(record.createdAt)) &&
    typeof record.notificationId === "string" &&
    parseNotificationIdentifier(record.notificationId);
}

function parseNotificationIdentifier(value: string): boolean {
  return /^notif_[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function stableToken(value: string): string {
  const token = value.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (token || "value").slice(0, 24);
}
