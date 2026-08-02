import { defineMigration } from "../../platform/persistence/migration.ts";

export const auditActivityEventsMigration = defineMigration({
  owner: "audit_activity",
  schema: "audit_activity",
  id: "audit_activity-0001-events-and-redactions",
  version: 1,
  forwardNotes:
    "Create append-only audit events and non-destructive redaction overlays owned by the audit_activity context.",
  rollbackNotes:
    "Stop audit readers and exporters while retaining events and overlays; no destructive rollback is permitted.",
  statements: [
    {
      schema: "audit_activity",
      sql: "CREATE SCHEMA IF NOT EXISTS audit_activity",
    },
    {
      schema: "audit_activity",
      sql: `
        CREATE TABLE audit_activity.audit_events (
          position BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          event_id TEXT NOT NULL UNIQUE,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          deal_id TEXT,
          actor_id TEXT NOT NULL,
          actor_kind TEXT NOT NULL CHECK (
            actor_kind IN ('human', 'agent', 'system')
          ),
          origin TEXT NOT NULL CHECK (
            origin IN ('http', 'job', 'internal')
          ),
          correlation_id TEXT NOT NULL,
          causation_id TEXT,
          aggregate_type TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          event_type TEXT NOT NULL,
          schema_version INTEGER NOT NULL CHECK (schema_version > 0),
          authority_snapshot JSONB NOT NULL,
          evidence_snapshot JSONB NOT NULL,
          provenance JSONB NOT NULL,
          payload JSONB NOT NULL,
          classifications JSONB NOT NULL,
          content_digest CHAR(64) NOT NULL CHECK (
            content_digest ~ '^[0-9a-f]{64}$'
          ),
          occurred_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, event_id),
          CHECK (jsonb_typeof(authority_snapshot) = 'object'),
          CHECK (jsonb_typeof(evidence_snapshot) = 'object'),
          CHECK (jsonb_typeof(provenance) = 'object'),
          CHECK (jsonb_typeof(payload) = 'object'),
          CHECK (jsonb_typeof(classifications) = 'object')
        )
      `,
    },
    {
      schema: "audit_activity",
      sql: `
        CREATE INDEX audit_activity_events_scope_idx
        ON audit_activity.audit_events (
          tenant_id, workspace_id, deal_id, position
        )
      `,
    },
    {
      schema: "audit_activity",
      sql: `
        CREATE TABLE audit_activity.redaction_overlays (
          position BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          overlay_id TEXT NOT NULL UNIQUE,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          deal_id TEXT,
          target_event_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          authority_snapshot JSONB NOT NULL,
          reason TEXT NOT NULL CHECK (
            reason IN (
              'legal_requirement', 'privacy_request',
              'security_control', 'owner_instruction'
            )
          ),
          fields JSONB NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL,
          CHECK (jsonb_typeof(authority_snapshot) = 'object'),
          CHECK (jsonb_typeof(fields) = 'array'),
          CHECK (jsonb_array_length(fields) > 0),
          FOREIGN KEY (tenant_id, target_event_id)
            REFERENCES audit_activity.audit_events(tenant_id, event_id)
        )
      `,
    },
    {
      schema: "audit_activity",
      sql: `
        CREATE INDEX audit_activity_redaction_target_idx
        ON audit_activity.redaction_overlays (
          tenant_id, target_event_id, position
        )
      `,
    },
    {
      schema: "audit_activity",
      sql: `
        CREATE FUNCTION audit_activity.reject_history_mutation()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'audit_activity history is append-only';
        END;
        $$
      `,
    },
    {
      schema: "audit_activity",
      sql: `
        CREATE TRIGGER audit_events_no_update_or_delete
        BEFORE UPDATE OR DELETE ON audit_activity.audit_events
        FOR EACH ROW EXECUTE FUNCTION audit_activity.reject_history_mutation()
      `,
    },
    {
      schema: "audit_activity",
      sql: `
        CREATE TRIGGER redaction_overlays_no_update_or_delete
        BEFORE UPDATE OR DELETE ON audit_activity.redaction_overlays
        FOR EACH ROW EXECUTE FUNCTION audit_activity.reject_history_mutation()
      `,
    },
  ],
});
