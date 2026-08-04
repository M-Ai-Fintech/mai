import { type DeliveryReceipt, type NotificationProjection } from "./model.ts";
import type { Subscription } from "./subscriptions.ts";

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
    deal_id AS "dealId", actor_id AS "actorId", command_type AS "commandType",
    target_id AS "targetId", idempotency_key AS "idempotencyKey",
    payload_digest AS "payloadDigest", result, created_at AS "createdAt"
    FROM notifications.idempotency_records`;
}

export function idempotencyInsertSql(): string {
  return `INSERT INTO notifications.idempotency_records (
    tenant_id, workspace_id, deal_id, actor_id, command_type, target_id,
    idempotency_key, payload_digest, result, created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (tenant_id, workspace_id, deal_id, actor_id, command_type,
      target_id, idempotency_key) DO NOTHING`;
}

export function idempotencyLockSql(): string {
  return `SELECT pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', $1::text, $2::text, $3::text, $4::text,
      $5::text, $6::text, $7::text), 0))`;
}
