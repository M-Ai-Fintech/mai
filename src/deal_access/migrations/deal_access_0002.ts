import { defineMigration } from "../../platform/persistence/v1.ts";

export const dealAccessMigration0002 = defineMigration({
  owner: "deal_access",
  schema: "deal_access",
  id: "deal_access-0002",
  version: 2,
  forwardNotes:
    "Additive upgrade for one-time invitation capability digests and durable retry state for external session invalidation delivery.",
  rollbackNotes:
    "Pause Deal Access acceptance and invalidation workers, retain the capability and delivery evidence, and roll back only after dependent readers are retired.",
  statements: [
    {
      schema: "deal_access",
      sql: `
        ALTER TABLE deal_access.participations
          ADD COLUMN invitation_token_digest CHAR(64) NOT NULL
            DEFAULT repeat('0', 64),
          ADD CONSTRAINT deal_access_participations_token_digest_ck
            CHECK (invitation_token_digest ~ '^[0-9a-f]{64}$');

        ALTER TABLE deal_access.session_invalidations
          ADD COLUMN state TEXT NOT NULL DEFAULT 'pending'
            CHECK (state IN ('pending', 'completed')),
          ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0
            CHECK (attempt_count >= 0),
          ADD COLUMN last_error TEXT,
          ADD COLUMN completed_at TIMESTAMPTZ,
          ADD CONSTRAINT deal_access_session_invalidations_completion_ck
            CHECK ((state = 'pending' AND completed_at IS NULL) OR
              (state = 'completed' AND completed_at IS NOT NULL));

        CREATE INDEX deal_access_session_invalidations_pending_idx
          ON deal_access.session_invalidations
            (tenant_id, workspace_id, deal_id, state, reason);
      `,
    },
  ],
});
