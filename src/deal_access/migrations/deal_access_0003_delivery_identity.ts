import { defineMigration } from "../../platform/persistence/v1.ts";

export const dealAccessDeliveryIdentityMigration = defineMigration({
  owner: "deal_access",
  schema: "deal_access",
  id: "deal_access-0003-delivery-identity",
  version: 3,
  forwardNotes:
    "Additive portal delivery identity plus durable attempt, failure, and completion metadata so retries can be deduplicated after a local completion crash.",
  rollbackNotes:
    "Pause queued portal delivery workers and retain delivery identity and evidence; rollback is permitted only after adapters no longer depend on retry deduplication metadata.",
  statements: [
    {
      schema: "deal_access",
      sql: `
        ALTER TABLE deal_access.portal_submissions
          ADD COLUMN delivery_id TEXT,
          ADD COLUMN delivery_attempt_count INTEGER NOT NULL DEFAULT 0
            CHECK (delivery_attempt_count >= 0),
          ADD COLUMN last_delivery_error TEXT,
          ADD COLUMN delivery_completed_at TIMESTAMPTZ;

        UPDATE deal_access.portal_submissions
        SET delivery_id = submission_id,
            delivery_completed_at = CASE
              WHEN state = 'accepted' THEN updated_at
              ELSE NULL
            END
        WHERE delivery_id IS NULL;

        ALTER TABLE deal_access.portal_submissions
          ALTER COLUMN delivery_id SET NOT NULL,
          ADD CONSTRAINT deal_access_submission_delivery_id_uq
            UNIQUE (tenant_id, workspace_id, deal_id, delivery_id);
      `,
    },
  ],
});
