import { defineMigration } from "../../platform/persistence/v1.ts";

export const dealAccessMigration = defineMigration({
  owner: "deal_access",
  schema: "deal_access",
  id: "deal_access-0001",
  version: 1,
  forwardNotes:
    "Add additive scoped participation, external grant, portal submission, command claim, audit event, and session invalidation tables.",
  rollbackNotes:
    "Disable Deal Access readers, writers, and invalidation consumers while retaining grants, submissions, receipts, audit events, and invalidation evidence for recovery.",
  statements: [
    {
      schema: "deal_access",
      sql: `
        CREATE SCHEMA IF NOT EXISTS deal_access;
        CREATE TABLE deal_access.participations (
          participation_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          invitation_id TEXT NOT NULL,
          participant_id TEXT NOT NULL,
          participant_kind TEXT NOT NULL CHECK (participant_kind = 'external'),
          state TEXT NOT NULL CHECK (state IN ('invited', 'active', 'revoked', 'offboarded', 'expired')),
          version BIGINT NOT NULL CHECK (version > 0),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, participation_id),
          UNIQUE (tenant_id, workspace_id, deal_id, invitation_id)
        );
        CREATE INDEX deal_access_participations_scope_idx
          ON deal_access.participations (tenant_id, workspace_id, deal_id, state);

        CREATE TABLE deal_access.external_grants (
          grant_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          participation_id TEXT NOT NULL,
          purpose TEXT NOT NULL CHECK (length(purpose) BETWEEN 1 AND 128),
          sponsor_actor_id TEXT NOT NULL,
          sponsor_kind TEXT NOT NULL CHECK (sponsor_kind = 'human'),
          expires_at TIMESTAMPTZ NOT NULL,
          state TEXT NOT NULL CHECK (state IN ('active', 'revoked', 'offboarded', 'expired')),
          object_scopes JSONB NOT NULL CHECK (jsonb_typeof(object_scopes) = 'array' AND jsonb_array_length(object_scopes) > 0),
          actions JSONB NOT NULL CHECK (jsonb_typeof(actions) = 'array' AND jsonb_array_length(actions) > 0),
          fields JSONB NOT NULL CHECK (jsonb_typeof(fields) = 'array' AND jsonb_array_length(fields) > 0),
          version BIGINT NOT NULL CHECK (version > 0),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, grant_id),
          UNIQUE (tenant_id, workspace_id, deal_id, grant_id, participation_id)
        );
        CREATE INDEX deal_access_grants_scope_expiry_idx
          ON deal_access.external_grants (tenant_id, workspace_id, deal_id, state, expires_at);
        CREATE INDEX deal_access_grants_participation_idx
          ON deal_access.external_grants (tenant_id, workspace_id, deal_id, participation_id);

        CREATE TABLE deal_access.portal_submissions (
          submission_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          grant_id TEXT NOT NULL,
          object_id TEXT NOT NULL,
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          state TEXT NOT NULL CHECK (state IN ('queued', 'accepted', 'rejected', 'cancelled')),
          version BIGINT NOT NULL CHECK (version > 0),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, submission_id)
        );
        CREATE INDEX deal_access_submissions_queue_idx
          ON deal_access.portal_submissions (tenant_id, workspace_id, deal_id, state, created_at);

        CREATE TABLE deal_access.portal_receipts (
          receipt_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          submission_id TEXT NOT NULL,
          state TEXT NOT NULL CHECK (state IN ('accepted', 'rejected', 'cancelled')),
          received_at TIMESTAMPTZ NOT NULL,
          submission_reference TEXT NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, receipt_id),
          UNIQUE (tenant_id, workspace_id, deal_id, submission_id)
        );
        CREATE INDEX deal_access_receipts_scope_idx
          ON deal_access.portal_receipts (tenant_id, workspace_id, deal_id, received_at, receipt_id);

        CREATE TABLE deal_access.command_claims (
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          command_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          payload_digest CHAR(64) NOT NULL CHECK (payload_digest ~ '^[0-9a-f]{64}$'),
          state TEXT NOT NULL CHECK (state IN ('in_progress', 'completed')),
          result JSONB,
          created_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, actor_id, command_type, target_id, idempotency_key),
          CHECK ((state = 'in_progress' AND result IS NULL AND completed_at IS NULL) OR
            (state = 'completed' AND result IS NOT NULL AND completed_at IS NOT NULL))
        );

        CREATE TABLE deal_access.audit_events (
          event_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          aggregate_type TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          event_type TEXT NOT NULL,
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          correlation_id TEXT NOT NULL,
          occurred_at TIMESTAMPTZ NOT NULL,
          available_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, aggregate_id, aggregate_version)
        );
        CREATE INDEX deal_access_audit_scope_idx
          ON deal_access.audit_events (tenant_id, workspace_id, deal_id, occurred_at, event_id);

        CREATE TABLE deal_access.session_invalidations (
          invalidation_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          grant_id TEXT,
          participation_id TEXT,
          reason TEXT NOT NULL CHECK (reason IN ('revoked', 'offboarded', 'expired')),
          created_at TIMESTAMPTZ NOT NULL,
          CHECK (grant_id IS NOT NULL OR participation_id IS NOT NULL)
        );
      `,
    },
    {
      schema: "deal_access",
      sql: `
        CREATE OR REPLACE FUNCTION deal_access.reject_immutable_event_update()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'Deal Access audit event is immutable';
        END;
        $$;
        CREATE TRIGGER deal_access_audit_events_no_update
          BEFORE UPDATE OR DELETE ON deal_access.audit_events
          FOR EACH ROW EXECUTE FUNCTION deal_access.reject_immutable_event_update();
      `,
    },
  ],
});
