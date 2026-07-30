import { defineMigration } from "../migration.ts";

export const platformInboxMigration = defineMigration({
  owner: "platform",
  schema: "platform",
  id: "platform-0003-inbox",
  version: 3,
  forwardNotes:
    "Create the tenant-scoped inbox with provider/message deduplication.",
  rollbackNotes:
    "Stop consumers while retaining receipts, failures, and processed evidence.",
  statements: [
    {
      schema: "platform",
      sql: `
        CREATE TABLE platform.inbox (
          tenant_id TEXT NOT NULL,
          source_identity TEXT NOT NULL,
          message_identity TEXT NOT NULL,
          payload_digest CHAR(64) NOT NULL,
          received_at TIMESTAMPTZ NOT NULL,
          last_received_at TIMESTAMPTZ NOT NULL,
          processing_state TEXT NOT NULL CHECK (
            processing_state IN ('processing', 'processed', 'failed')
          ),
          processed_at TIMESTAMPTZ,
          sanitized_failure_reference TEXT CHECK (
            sanitized_failure_reference IS NULL OR
            length(sanitized_failure_reference) <= 128
          ),
          delivery_count INTEGER NOT NULL DEFAULT 1 CHECK (delivery_count > 0),
          PRIMARY KEY (tenant_id, source_identity, message_identity),
          CHECK (payload_digest ~ '^[0-9a-f]{64}$')
        )
      `,
    },
    {
      schema: "platform",
      sql: `
        CREATE INDEX platform_inbox_tenant_state_idx
        ON platform.inbox (tenant_id, processing_state, received_at)
      `,
    },
  ],
});
