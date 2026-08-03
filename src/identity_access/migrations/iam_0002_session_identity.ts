import { defineMigration } from "../../platform/persistence/v1.ts";

export const iamSessionIdentityMigration = defineMigration({
  owner: "iam",
  schema: "iam",
  id: "iam-0002-session-identity",
  version: 2,
  forwardNotes:
    "Backfill the exact identity reference from existing session documents before requiring it on every session row.",
  rollbackNotes:
    "Retain the additive identity reference because removing it would weaken exact-session authorization evidence.",
  statements: [{
    schema: "iam",
    sql: `
      ALTER TABLE iam.sessions ADD COLUMN identity_id TEXT;
      UPDATE iam.sessions
      SET identity_id = document ->> 'identityId'
      WHERE identity_id IS NULL
        AND jsonb_typeof(document -> 'identityId') = 'string'
        AND btrim(document ->> 'identityId') <> '';
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM iam.sessions WHERE identity_id IS NULL) THEN
          RAISE EXCEPTION 'IAM session identity backfill failed: expected every stored session document to contain a non-empty identityId';
        END IF;
      END $$;
      ALTER TABLE iam.sessions ALTER COLUMN identity_id SET NOT NULL;
    `,
  }],
});
