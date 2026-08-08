import { defineMigration } from "../../platform/persistence/v1.ts";

export const dealGovernanceConsequencePreviewsMigration = defineMigration({
  owner: "deal_governance",
  schema: "deal_governance",
  id: "deal_governance-0002",
  version: 2,
  forwardNotes:
    "Additive immutable storage for server-issued consequence previews bound to scoped aggregate versions and expiry windows.",
  rollbackNotes:
    "Stop issuing or consuming new consequence previews while retaining existing preview evidence; rollback never authorizes a caller-authored preview.",
  statements: [
    {
      schema: "deal_governance",
      sql: `
        CREATE TABLE deal_governance.consequence_previews (
          preview_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          action TEXT NOT NULL CHECK (action IN ('pause', 'archive', 'restore', 'terminate')),
          outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'blocked')),
          expires_at TIMESTAMPTZ NOT NULL,
          document JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, preview_id)
        )
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE FUNCTION deal_governance.reject_preview_mutation() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'Deal Governance consequence previews are immutable';
        END;
        $$
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE TRIGGER deal_governance_consequence_previews_no_update
        BEFORE UPDATE OR DELETE ON deal_governance.consequence_previews
        FOR EACH ROW EXECUTE FUNCTION deal_governance.reject_preview_mutation()
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE INDEX deal_governance_consequence_previews_scope_idx
        ON deal_governance.consequence_previews (
          tenant_id, workspace_id, deal_id, aggregate_version, expires_at
        )
      `,
    },
  ],
});
