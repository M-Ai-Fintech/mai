import { defineMigration } from "../../platform/persistence/v1.ts";

const TABLES = [
  "criteria",
  "runs",
  "candidate_projections",
  "conflicts",
  "restrictions",
  "shortlist_decisions",
  "outreach_authorizations",
] as const;

export const matchingMigration = defineMigration({
  owner: "matching",
  schema: "matching",
  id: "matching-0001",
  version: 1,
  forwardNotes:
    "Create tenant, workspace, and deal scoped Matching criteria, runs, candidate projections, conflict, restriction, shortlist, and outreach authorization aggregates.",
  rollbackNotes:
    "Disable Matching commands and rebuild projections from retained source versions; preserve conflict, restriction, shortlist, and outreach authorization history during rollback.",
  statements: [
    { schema: "matching", sql: "CREATE SCHEMA matching" },
    ...TABLES.map((table) => ({
      schema: "matching" as const,
      sql: `
      CREATE TABLE matching.${table} (
        aggregate_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
        payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, workspace_id, deal_id, aggregate_id)
      )`,
    })),
    {
      schema: "matching",
      sql: `
      CREATE INDEX candidate_projections_by_run
      ON matching.candidate_projections (tenant_id, workspace_id, deal_id, aggregate_id)
      WHERE payload ? 'runId'`,
    },
    {
      schema: "matching",
      sql: `
      CREATE OR REPLACE FUNCTION matching.reject_immutable_shortlist_change()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Matching shortlist decisions are append-only';
      END;
      $$`,
    },
    {
      schema: "matching",
      sql: `
      CREATE TRIGGER shortlist_decisions_append_only
      BEFORE UPDATE OR DELETE ON matching.shortlist_decisions
      FOR EACH ROW EXECUTE FUNCTION matching.reject_immutable_shortlist_change()`,
    },
  ],
});
