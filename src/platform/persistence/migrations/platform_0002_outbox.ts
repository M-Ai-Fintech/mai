import { defineMigration } from "../migration.ts";

export const platformOutboxMigration = defineMigration({
  owner: "platform",
  schema: "platform",
  id: "platform-0002-outbox",
  version: 2,
  forwardNotes:
    "Create the tenant-scoped transactional outbox and claim indexes.",
  rollbackNotes:
    "Stop dispatchers and consumers while retaining every durable event row.",
  statements: [
    {
      schema: "platform",
      sql: `
        CREATE TABLE platform.outbox (
          event_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          deal_id TEXT,
          aggregate_type TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          event_type TEXT NOT NULL,
          schema_version INTEGER NOT NULL CHECK (schema_version > 0),
          payload JSONB NOT NULL,
          correlation_id TEXT NOT NULL,
          causation_id TEXT,
          occurred_at TIMESTAMPTZ NOT NULL,
          available_at TIMESTAMPTZ NOT NULL,
          dispatch_state TEXT NOT NULL CHECK (
            dispatch_state IN (
              'pending', 'leased', 'retry_scheduled', 'published',
              'dead_lettered'
            )
          ),
          attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
          lease_owner TEXT,
          lease_expires_at TIMESTAMPTZ,
          published_at TIMESTAMPTZ,
          last_failure TEXT CHECK (
            last_failure IS NULL OR length(last_failure) <= 255
          ),
          CHECK ((lease_owner IS NULL) = (lease_expires_at IS NULL))
        )
      `,
    },
    {
      schema: "platform",
      sql: `
        CREATE INDEX platform_outbox_claim_idx
        ON platform.outbox (
          dispatch_state, available_at, lease_expires_at, occurred_at
        )
      `,
    },
    {
      schema: "platform",
      sql: `
        CREATE INDEX platform_outbox_tenant_aggregate_idx
        ON platform.outbox (
          tenant_id, aggregate_type, aggregate_id, aggregate_version
        )
      `,
    },
  ],
});
