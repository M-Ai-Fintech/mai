import { defineMigration } from "../../platform/persistence/v1.ts";

export const documentsMigration = defineMigration({
  owner: "documents",
  schema: "documents",
  id: "documents-0001",
  version: 1,
  forwardNotes:
    "Additive documents schema for scoped metadata, immutable versions, source cursors, objects, processing, provenance, and idempotency.",
  rollbackNotes:
    "Disable document source, object, and processing consumers while retaining rows, objects, cursors, jobs, provenance, and reconciliation evidence; physical schema rollback is not a data-retention operation.",
  statements: [
    {
      schema: "documents",
      sql: "CREATE SCHEMA documents",
    },
    {
      schema: "documents",
      sql: `
        CREATE TABLE documents.documents (
          document_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 512),
          mime_type TEXT NOT NULL CHECK (length(mime_type) BETWEEN 1 AND 255),
          classification TEXT NOT NULL CHECK (
            classification IN ('legal', 'financial', 'tax', 'operational', 'other')
          ),
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          current_version_id TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, document_id)
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE TABLE documents.document_sources (
          source_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          connector_account_id TEXT NOT NULL,
          provider TEXT NOT NULL CHECK (length(provider) BETWEEN 2 AND 64),
          provider_workspace_id TEXT,
          provider_document_id TEXT,
          provider_folder_id TEXT,
          provider_version TEXT,
          cursor TEXT,
          capabilities JSONB,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (
            tenant_id, workspace_id, deal_id, connector_account_id,
            provider, provider_workspace_id, provider_document_id
          ),
          UNIQUE (tenant_id, workspace_id, deal_id, source_id)
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE TABLE documents.object_references (
          object_reference_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          object_key TEXT NOT NULL,
          storage_version TEXT NOT NULL,
          checksum_algorithm TEXT NOT NULL CHECK (checksum_algorithm = 'sha256'),
          checksum_value CHAR(64) NOT NULL CHECK (checksum_value ~ '^[0-9a-f]{64}$'),
          byte_length BIGINT NOT NULL CHECK (byte_length >= 0),
          media_type TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, object_key, storage_version),
          UNIQUE (tenant_id, workspace_id, deal_id, object_reference_id)
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE TABLE documents.document_versions (
          document_version_id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version_number BIGINT NOT NULL CHECK (version_number > 0),
          source_id TEXT NOT NULL,
          provider TEXT NOT NULL CHECK (length(provider) BETWEEN 2 AND 64),
          provider_document_id TEXT,
          provider_version TEXT,
          checksum_algorithm TEXT NOT NULL CHECK (checksum_algorithm = 'sha256'),
          checksum_value CHAR(64) NOT NULL CHECK (checksum_value ~ '^[0-9a-f]{64}$'),
          classification TEXT NOT NULL CHECK (
            classification IN ('legal', 'financial', 'tax', 'operational', 'other')
          ),
          object_reference_id TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, document_id, version_number),
          UNIQUE (tenant_id, workspace_id, deal_id, document_version_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, document_id)
            REFERENCES documents.documents(tenant_id, workspace_id, deal_id, document_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, source_id)
            REFERENCES documents.document_sources(tenant_id, workspace_id, deal_id, source_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, object_reference_id)
            REFERENCES documents.object_references(tenant_id, workspace_id, deal_id, object_reference_id)
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        ALTER TABLE documents.documents
        ADD CONSTRAINT documents_current_version_scope_fk
        FOREIGN KEY (tenant_id, workspace_id, deal_id, current_version_id)
        REFERENCES documents.document_versions(
          tenant_id, workspace_id, deal_id, document_version_id
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE TABLE documents.processing_runs (
          processing_run_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          document_version_id TEXT NOT NULL,
          input_checksum_algorithm TEXT NOT NULL CHECK (input_checksum_algorithm = 'sha256'),
          input_checksum_value CHAR(64) NOT NULL CHECK (input_checksum_value ~ '^[0-9a-f]{64}$'),
          processor TEXT NOT NULL,
          processor_version TEXT NOT NULL,
          state TEXT NOT NULL CHECK (
            state IN ('queued', 'running', 'succeeded', 'failed', 'retry_scheduled',
              'cancelled', 'timed_out', 'dead_lettered')
          ),
          attempt_count INTEGER NOT NULL CHECK (attempt_count >= 0),
          failure_code TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          FOREIGN KEY (tenant_id, workspace_id, deal_id, document_version_id)
            REFERENCES documents.document_versions(
              tenant_id, workspace_id, deal_id, document_version_id
            )
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE TABLE documents.derived_artifacts (
          derived_artifact_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          document_version_id TEXT NOT NULL,
          artifact_version BIGINT NOT NULL CHECK (artifact_version > 0),
          artifact_type TEXT NOT NULL,
          object_reference_id TEXT NOT NULL,
          checksum_algorithm TEXT NOT NULL CHECK (checksum_algorithm = 'sha256'),
          checksum_value CHAR(64) NOT NULL CHECK (checksum_value ~ '^[0-9a-f]{64}$'),
          processor TEXT NOT NULL,
          processor_version TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, document_version_id, artifact_type, artifact_version),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, document_version_id)
            REFERENCES documents.document_versions(
              tenant_id, workspace_id, deal_id, document_version_id
            ),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, object_reference_id)
            REFERENCES documents.object_references(
              tenant_id, workspace_id, deal_id, object_reference_id
            )
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE TABLE documents.provenance_links (
          provenance_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          relation TEXT NOT NULL CHECK (
            relation IN ('derived_from', 'supersedes', 'invalidates')
          ),
          source_type TEXT NOT NULL,
          source_id TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE TABLE documents.idempotency_keys (
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          command_type TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          payload_digest CHAR(64) NOT NULL CHECK (payload_digest ~ '^[0-9a-f]{64}$'),
          result_reference TEXT,
          error_reference TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          PRIMARY KEY (
            tenant_id, workspace_id, deal_id, actor_id, command_type,
            target_type, target_id, idempotency_key
          ),
          CHECK (result_reference IS NULL OR error_reference IS NULL)
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE INDEX documents_scope_idx
        ON documents.documents (tenant_id, workspace_id, deal_id, updated_at)
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE INDEX documents_sources_scope_idx
        ON documents.document_sources (tenant_id, workspace_id, deal_id, updated_at)
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE INDEX documents_versions_scope_idx
        ON documents.document_versions (
          tenant_id, workspace_id, deal_id, document_id, version_number
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE INDEX documents_processing_scope_idx
        ON documents.processing_runs (
          tenant_id, workspace_id, deal_id, state, created_at
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE INDEX documents_provenance_scope_idx
        ON documents.provenance_links (
          tenant_id, workspace_id, deal_id, source_type, source_id
        )
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE INDEX documents_idempotency_expiry_idx
        ON documents.idempotency_keys (tenant_id, created_at)
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE FUNCTION documents.reject_immutable_mutation()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'documents immutable evidence is append-only';
        END;
        $$
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE TRIGGER documents_object_references_no_update
        BEFORE UPDATE OR DELETE ON documents.object_references
        FOR EACH ROW EXECUTE FUNCTION documents.reject_immutable_mutation()
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE TRIGGER documents_versions_no_update
        BEFORE UPDATE OR DELETE ON documents.document_versions
        FOR EACH ROW EXECUTE FUNCTION documents.reject_immutable_mutation()
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE TRIGGER documents_artifacts_no_update
        BEFORE UPDATE OR DELETE ON documents.derived_artifacts
        FOR EACH ROW EXECUTE FUNCTION documents.reject_immutable_mutation()
      `,
    },
    {
      schema: "documents",
      sql: `
        CREATE TRIGGER documents_provenance_no_update
        BEFORE UPDATE OR DELETE ON documents.provenance_links
        FOR EACH ROW EXECUTE FUNCTION documents.reject_immutable_mutation()
      `,
    },
  ],
});
