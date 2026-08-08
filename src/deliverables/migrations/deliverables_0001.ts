import { defineMigration } from "../../platform/persistence/migration.ts";

export const deliverablesMigration = defineMigration({
  owner: "deliverables",
  schema: "deliverables",
  id: "deliverables-0001",
  version: 1,
  forwardNotes:
    "Additive deliverables schema for immutable source snapshots, reviewed versions, release authorization, export manifests, and recipient receipts.",
  rollbackNotes:
    "Disable deliverable export and distribution workers while retaining versions, stale marks, approvals, manifests, and receipts for audit and recovery.",
  statements: [
    { schema: "deliverables", sql: "CREATE SCHEMA deliverables" },
    {
      schema: "deliverables",
      sql: `
        CREATE TABLE deliverables.deliverables (
          deliverable_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          deliverable_type TEXT NOT NULL CHECK (length(deliverable_type) BETWEEN 1 AND 128),
          title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 512),
          owner_id TEXT NOT NULL,
          default_audience_type TEXT NOT NULL,
          confidentiality TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('draft', 'in_review', 'approved', 'release_pending', 'released', 'superseded', 'withdrawn', 'archived')),
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          current_approved_version_id TEXT,
          latest_draft_version_id TEXT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, deliverable_id)
        )
      `,
    },
    {
      schema: "deliverables",
      sql: `
        CREATE TABLE deliverables.source_snapshots (
          snapshot_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          source_cutoff_at TIMESTAMPTZ NOT NULL,
          source_references JSONB NOT NULL,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, snapshot_id),
          CHECK (jsonb_typeof(source_references) = 'array')
        )
      `,
    },
    {
      schema: "deliverables",
      sql: `
        CREATE TABLE deliverables.deliverable_versions (
          version_id TEXT PRIMARY KEY,
          deliverable_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version_number BIGINT NOT NULL CHECK (version_number > 0),
          version_label TEXT NOT NULL,
          source_snapshot_id TEXT NOT NULL,
          content JSONB NOT NULL,
          classifications JSONB NOT NULL,
          preparation_state TEXT NOT NULL,
          content_approval_state TEXT NOT NULL,
          release_state TEXT NOT NULL CHECK (release_state IN ('required', 'pending', 'authorized', 'released', 'expired', 'invalidated', 'withdrawn')),
          freshness_state TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          review_submitted_by TEXT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          approved_at TIMESTAMPTZ,
          UNIQUE (tenant_id, deliverable_id, version_number),
          UNIQUE (tenant_id, workspace_id, deal_id, version_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, deliverable_id)
            REFERENCES deliverables.deliverables(tenant_id, workspace_id, deal_id, deliverable_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, source_snapshot_id)
            REFERENCES deliverables.source_snapshots(tenant_id, workspace_id, deal_id, snapshot_id),
          CHECK (jsonb_typeof(content) = 'object'),
          CHECK (jsonb_typeof(classifications) = 'object')
        )
      `,
    },
    {
      schema: "deliverables",
      sql: `
        CREATE TABLE deliverables.stale_marks (
          stale_mark_id TEXT PRIMARY KEY,
          version_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          changed_source_ids JSONB NOT NULL,
          marked_at TIMESTAMPTZ NOT NULL,
          FOREIGN KEY (tenant_id, workspace_id, deal_id, version_id)
            REFERENCES deliverables.deliverable_versions(tenant_id, workspace_id, deal_id, version_id),
          CHECK (jsonb_typeof(changed_source_ids) = 'array')
        )
      `,
    },
    {
      schema: "deliverables",
      sql: `
        CREATE TABLE deliverables.redaction_overlays (
          overlay_id TEXT PRIMARY KEY,
          version_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          policy_id TEXT NOT NULL,
          audience JSONB NOT NULL,
          fields JSONB NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL,
          FOREIGN KEY (tenant_id, workspace_id, deal_id, version_id)
            REFERENCES deliverables.deliverable_versions(tenant_id, workspace_id, deal_id, version_id),
          CHECK (jsonb_typeof(audience) = 'object'),
          CHECK (jsonb_typeof(fields) = 'array')
        )
      `,
    },
    {
      schema: "deliverables",
      sql: `
        CREATE TABLE deliverables.approvals (
          approval_id TEXT PRIMARY KEY,
          version_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'agent', 'system')),
          decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'approved_with_conditions')),
          conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
          decided_at TIMESTAMPTZ NOT NULL,
          FOREIGN KEY (tenant_id, workspace_id, deal_id, version_id)
            REFERENCES deliverables.deliverable_versions(tenant_id, workspace_id, deal_id, version_id),
          CHECK (jsonb_typeof(conditions) = 'array')
        )
      `,
    },
    {
      schema: "deliverables",
      sql: `
        CREATE TABLE deliverables.release_authorizations (
          authorization_id TEXT PRIMARY KEY,
          version_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'agent', 'system')),
          audience JSONB NOT NULL,
          approved_formats JSONB NOT NULL,
          confidentiality TEXT NOT NULL,
          authorized_at TIMESTAMPTZ NOT NULL,
          expires_at TIMESTAMPTZ,
          UNIQUE (tenant_id, workspace_id, deal_id, version_id, authorization_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, version_id)
            REFERENCES deliverables.deliverable_versions(tenant_id, workspace_id, deal_id, version_id),
          CHECK (jsonb_typeof(audience) = 'object'),
          CHECK (jsonb_typeof(approved_formats) = 'array')
        )
      `,
    },
    {
      schema: "deliverables",
      sql: `
        CREATE TABLE deliverables.exports (
          export_id TEXT PRIMARY KEY,
          version_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          release_authorization_id TEXT NOT NULL,
          format TEXT NOT NULL CHECK (format IN ('pdf', 'docx', 'xlsx', 'csv', 'zip')),
          filename TEXT NOT NULL,
          state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'succeeded', 'failed', 'withdrawn')),
          manifest_id TEXT,
          checksum CHAR(64),
          created_at TIMESTAMPTZ NOT NULL,
          generated_at TIMESTAMPTZ,
          UNIQUE (tenant_id, export_id),
          UNIQUE (tenant_id, workspace_id, deal_id, export_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, version_id)
            REFERENCES deliverables.deliverable_versions(tenant_id, workspace_id, deal_id, version_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, version_id, release_authorization_id)
            REFERENCES deliverables.release_authorizations(tenant_id, workspace_id, deal_id, version_id, authorization_id)
        )
      `,
    },
    {
      schema: "deliverables",
      sql: `
        CREATE TABLE deliverables.export_manifests (
          manifest_id TEXT PRIMARY KEY,
          export_id TEXT NOT NULL,
          version_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          source_snapshot_id TEXT NOT NULL,
          artifact_reference TEXT NOT NULL,
          artifact_checksum CHAR(64) NOT NULL CHECK (artifact_checksum ~ '^[0-9a-f]{64}$'),
          audience JSONB NOT NULL,
          redacted_fields JSONB NOT NULL,
          content_digest CHAR(64) NOT NULL CHECK (content_digest ~ '^[0-9a-f]{64}$'),
          created_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, export_id),
          UNIQUE (tenant_id, manifest_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, export_id)
            REFERENCES deliverables.exports(tenant_id, workspace_id, deal_id, export_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, version_id)
            REFERENCES deliverables.deliverable_versions(tenant_id, workspace_id, deal_id, version_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, source_snapshot_id)
            REFERENCES deliverables.source_snapshots(tenant_id, workspace_id, deal_id, snapshot_id),
          CHECK (jsonb_typeof(audience) = 'object'),
          CHECK (jsonb_typeof(redacted_fields) = 'array')
        )
      `,
    },
    {
      schema: "deliverables",
      sql: `
        ALTER TABLE deliverables.exports
        ADD CONSTRAINT deliverables_manifest_fk
        FOREIGN KEY (tenant_id, manifest_id)
          REFERENCES deliverables.export_manifests(tenant_id, manifest_id)
      `,
    },
    {
      schema: "deliverables",
      sql: `
        CREATE TABLE deliverables.distribution_receipts (
          receipt_id TEXT PRIMARY KEY,
          export_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          recipient_id TEXT NOT NULL,
          purpose TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          state TEXT NOT NULL CHECK (state IN ('pending', 'retry_scheduled', 'sent', 'delivered', 'failed', 'revoked', 'expired')),
          attempt_count INTEGER NOT NULL CHECK (attempt_count >= 0),
          failure_code TEXT,
          next_attempt_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, export_id, recipient_id, purpose),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, export_id)
            REFERENCES deliverables.exports(tenant_id, workspace_id, deal_id, export_id)
        )
      `,
    },
    {
      schema: "deliverables",
      sql: `
        CREATE FUNCTION deliverables.reject_history_mutation()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'deliverables history is append-only';
        END;
        $$
      `,
    },
    ...[
      "source_snapshots",
      "stale_marks",
      "redaction_overlays",
      "approvals",
      "release_authorizations",
      "export_manifests",
      "distribution_receipts",
      "deliverable_versions",
      "exports",
    ].map((table) => ({
      schema: "deliverables" as const,
      sql: `CREATE TRIGGER deliverables_${table}_no_update_or_delete
        BEFORE UPDATE OR DELETE ON deliverables.${table}
        FOR EACH ROW EXECUTE FUNCTION deliverables.reject_history_mutation()`,
    })),
  ],
});
