import { defineMigration } from "../migration.ts";

export const platformIdempotencyMigration = defineMigration({
  owner: "platform",
  schema: "platform",
  id: "platform-0001-idempotency",
  version: 1,
  forwardNotes:
    "Create durable tenant- and actor-scoped command idempotency records.",
  rollbackNotes:
    "Disable command consumers while retaining all idempotency outcomes.",
  statements: [
    {
      schema: "platform",
      sql: `
        CREATE TABLE platform.idempotency_records (
          tenant_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          command_type TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          payload_digest CHAR(64) NOT NULL,
          state TEXT NOT NULL CHECK (
            state IN ('in_progress', 'completed', 'failed', 'abandoned')
          ),
          result_reference TEXT,
          error_reference TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (
            tenant_id, actor_id, command_type, target_type, target_id,
            idempotency_key
          ),
          CHECK (payload_digest ~ '^[0-9a-f]{64}$'),
          CHECK (result_reference IS NULL OR error_reference IS NULL)
        )
      `,
    },
    {
      schema: "platform",
      sql: `
        CREATE INDEX platform_idempotency_expiry_idx
        ON platform.idempotency_records (expires_at, state)
      `,
    },
  ],
});
