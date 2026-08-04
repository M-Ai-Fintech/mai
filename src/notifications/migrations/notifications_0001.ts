import { defineMigration } from "../../platform/persistence/v1.ts";

export const notificationsMigration = defineMigration({
  owner: "notifications",
  schema: "notifications",
  id: "notifications-0001",
  version: 1,
  forwardNotes:
    "Create the notification-owned subscription, recipient projection, idempotency, and append-only delivery receipt tables. Apply additively beside the MVP notification feed; consumers and channels remain disabled until review, credentials, and staging evidence exist.",
  rollbackNotes:
    "Do not physically drop this schema after durable production rows exist. Roll back by disabling notification consumers/channels and routing reads to the retained MVP projection; preserve rows and the platform migration ledger for reconciliation. A rehearsal may drop the schema only in an isolated empty test database.",
  statements: [
    {
      schema: "notifications",
      sql: `CREATE SCHEMA IF NOT EXISTS notifications`,
    },
    {
      schema: "notifications",
      sql: `CREATE TABLE notifications.subscriptions (
        subscription_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT,
        recipient_id TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (length(event_type) BETWEEN 1 AND 128),
        preferences JSONB NOT NULL CHECK (jsonb_typeof(preferences) = 'object'),
        version BIGINT NOT NULL CHECK (version > 0),
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, subscription_id)
      )`,
    },
    {
      schema: "notifications",
      sql: `CREATE UNIQUE INDEX notifications_subscriptions_scope_idx
        ON notifications.subscriptions
        (tenant_id, workspace_id, recipient_id, event_type, COALESCE(deal_id, ''))`,
    },
    {
      schema: "notifications",
      sql: `CREATE TABLE notifications.projections (
        notification_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT,
        recipient_id TEXT NOT NULL,
        source_event_id TEXT NOT NULL,
        source_event_type TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        subscription_id TEXT,
        subscription_version BIGINT CHECK (subscription_version IS NULL OR subscription_version > 0),
        created_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ,
        delivery_state TEXT NOT NULL CHECK (delivery_state IN ('queued', 'attempting', 'retry_scheduled', 'succeeded', 'expired', 'dead_lettered')),
        job_id TEXT,
        operation_id TEXT,
        idempotency_key TEXT NOT NULL,
        PRIMARY KEY (tenant_id, notification_id, recipient_id),
        UNIQUE (tenant_id, source_event_id, recipient_id),
        CHECK (length(title) BETWEEN 1 AND 200),
        CHECK (length(body) BETWEEN 1 AND 2000),
        CHECK (expires_at IS NULL OR expires_at >= created_at)
      )`,
    },
    {
      schema: "notifications",
      sql: `CREATE INDEX notifications_projections_recipient_idx
        ON notifications.projections (tenant_id, workspace_id, deal_id, recipient_id, created_at DESC, notification_id DESC)`,
    },
    {
      schema: "notifications",
      sql: `CREATE TABLE notifications.idempotency_records (
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        command_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        payload_digest CHAR(64) NOT NULL CHECK (payload_digest ~ '^[0-9a-f]{64}$'),
        result JSONB NOT NULL CHECK (jsonb_typeof(result) = 'object'),
        created_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, workspace_id, actor_id, command_type, target_id, idempotency_key)
      )`,
    },
    {
      schema: "notifications",
      sql: `CREATE TABLE notifications.delivery_receipts (
        receipt_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT,
        recipient_id TEXT NOT NULL,
        notification_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
        attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
        outcome TEXT NOT NULL CHECK (outcome IN ('attempted', 'succeeded', 'retry_scheduled', 'expired', 'terminal')),
        failure_code TEXT,
        occurred_at TIMESTAMPTZ NOT NULL
      )`,
    },
    {
      schema: "notifications",
      sql: `CREATE INDEX notifications_receipts_scope_idx
        ON notifications.delivery_receipts (tenant_id, workspace_id, deal_id, recipient_id, notification_id, occurred_at, receipt_id)`,
    },
  ],
});
