import { defineMigration } from "../../platform/persistence/v1.ts";

export const evidenceKnowledgeMigration = defineMigration({
  owner: "evidence_knowledge",
  schema: "evidence_knowledge",
  id: "evidence_knowledge-0001",
  version: 1,
  forwardNotes:
    "Additive Evidence Knowledge schema for exact citations, immutable facts, lineage, targeted invalidation, and versioned derived projections.",
  rollbackNotes:
    "Disable Evidence Knowledge readers, projections, and consumers while retaining immutable records, migration ledger, invalidation, idempotency, and audit/outbox evidence; physical rollback never deletes history.",
  statements: [
    { schema: "evidence_knowledge", sql: "CREATE SCHEMA evidence_knowledge" },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.citations (
        citation_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        document_version_id TEXT NOT NULL,
        checksum_algorithm TEXT NOT NULL CHECK (checksum_algorithm = 'sha256'),
        checksum_value CHAR(64) NOT NULL CHECK (checksum_value ~ '^[0-9a-f]{64}$'),
        location JSONB NOT NULL,
        classification TEXT NOT NULL CHECK (classification IN ('legal', 'financial', 'tax', 'operational', 'other')),
        processing_version TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        freshness_state TEXT NOT NULL CHECK (freshness_state IN ('current', 'stale', 'missing', 'inaccessible', 'unsupported')),
        freshness_reason TEXT,
        freshness_checked_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, workspace_id, deal_id, citation_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.command_idempotency_history (
        history_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL, workspace_id TEXT NOT NULL, deal_id TEXT NOT NULL,
        actor_id TEXT NOT NULL, command_type TEXT NOT NULL, target_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL, payload_digest CHAR(64) NOT NULL,
        result_reference TEXT NOT NULL, completed_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, workspace_id, deal_id, actor_id, command_type, target_id, idempotency_key)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.evidence_records (
        evidence_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        citation_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, workspace_id, deal_id, evidence_id),
        UNIQUE (tenant_id, workspace_id, deal_id, citation_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, citation_id)
          REFERENCES evidence_knowledge.citations (tenant_id, workspace_id, deal_id, citation_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.facts (
        fact_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('identity', 'financial', 'legal', 'operational', 'tax')),
        status TEXT NOT NULL CHECK (status IN ('proposed', 'approved', 'superseded')),
        aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, workspace_id, deal_id, fact_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.fact_versions (
        fact_version_id TEXT PRIMARY KEY,
        fact_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        statement TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('identity', 'financial', 'legal', 'operational', 'tax')),
        status TEXT NOT NULL CHECK (status IN ('proposed', 'approved', 'superseded')),
        version_number BIGINT NOT NULL CHECK (version_number > 0),
        citation_ids JSONB NOT NULL,
        supersedes_fact_version_id TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, workspace_id, deal_id, fact_version_id),
        UNIQUE (tenant_id, workspace_id, deal_id, fact_id, fact_version_id),
        UNIQUE (tenant_id, workspace_id, deal_id, fact_id, version_number),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, fact_id)
          REFERENCES evidence_knowledge.facts (tenant_id, workspace_id, deal_id, fact_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, fact_id, supersedes_fact_version_id)
          REFERENCES evidence_knowledge.fact_versions (tenant_id, workspace_id, deal_id, fact_id, fact_version_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.interpretations (
        interpretation_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        statement TEXT NOT NULL,
        evidence_ids JSONB NOT NULL,
        status TEXT NOT NULL CHECK (status = 'proposed'),
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, workspace_id, deal_id, interpretation_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.assumptions (
        assumption_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        statement TEXT NOT NULL,
        rationale TEXT,
        status TEXT NOT NULL CHECK (status = 'proposed'),
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, workspace_id, deal_id, assumption_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.calculations (
        calculation_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        input_references JSONB NOT NULL,
        formula TEXT NOT NULL,
        algorithm_version TEXT NOT NULL,
        output JSONB NOT NULL,
        freshness_state TEXT NOT NULL,
        freshness_reason TEXT,
        freshness_checked_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, workspace_id, deal_id, calculation_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.provenance_links (
        provenance_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        relation TEXT NOT NULL CHECK (relation IN ('derived_from', 'supports', 'supersedes', 'invalidates')),
        source_kind TEXT NOT NULL,
        source_id TEXT NOT NULL,
        target_kind TEXT NOT NULL,
        target_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, workspace_id, deal_id, provenance_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.invalidations (
        invalidation_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        source_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        event_identity TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, workspace_id, deal_id, event_identity)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.index_metadata (
        index_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        document_version_id TEXT NOT NULL,
        classification TEXT NOT NULL,
        processing_version TEXT NOT NULL,
        index_version BIGINT NOT NULL CHECK (index_version > 0),
        state TEXT NOT NULL CHECK (state IN ('active', 'stale', 'rebuilding', 'disabled')),
        created_at TIMESTAMPTZ NOT NULL,
        CHECK (classification IN ('legal', 'financial', 'tax', 'operational', 'other')),
        CHECK (length(trim(processing_version)) > 0),
        UNIQUE (tenant_id, workspace_id, deal_id, document_version_id, classification, processing_version, index_version)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.fact_version_citations (
        tenant_id TEXT NOT NULL, workspace_id TEXT NOT NULL, deal_id TEXT NOT NULL,
        fact_id TEXT NOT NULL, fact_version_id TEXT NOT NULL, citation_id TEXT NOT NULL,
        PRIMARY KEY (tenant_id, workspace_id, deal_id, fact_version_id, citation_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, fact_id, fact_version_id)
          REFERENCES evidence_knowledge.fact_versions (tenant_id, workspace_id, deal_id, fact_id, fact_version_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, citation_id)
          REFERENCES evidence_knowledge.citations (tenant_id, workspace_id, deal_id, citation_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.interpretation_evidence (
        tenant_id TEXT NOT NULL, workspace_id TEXT NOT NULL, deal_id TEXT NOT NULL,
        interpretation_id TEXT NOT NULL, evidence_id TEXT NOT NULL,
        PRIMARY KEY (tenant_id, workspace_id, deal_id, interpretation_id, evidence_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, interpretation_id)
          REFERENCES evidence_knowledge.interpretations (tenant_id, workspace_id, deal_id, interpretation_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, evidence_id)
          REFERENCES evidence_knowledge.evidence_records (tenant_id, workspace_id, deal_id, evidence_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.calculation_inputs (
        tenant_id TEXT NOT NULL, workspace_id TEXT NOT NULL, deal_id TEXT NOT NULL,
        calculation_id TEXT NOT NULL, input_kind TEXT NOT NULL,
        input_id TEXT NOT NULL CHECK (length(trim(input_id)) > 0),
        PRIMARY KEY (tenant_id, workspace_id, deal_id, calculation_id, input_kind, input_id),
        CHECK (input_kind IN ('evidence', 'fact_version', 'interpretation', 'assumption')),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, calculation_id)
          REFERENCES evidence_knowledge.calculations (tenant_id, workspace_id, deal_id, calculation_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.fact_transition_history (
        history_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL, fact_id TEXT NOT NULL, fact_version_id TEXT NOT NULL,
        from_status TEXT NOT NULL, to_status TEXT NOT NULL, command_key TEXT NOT NULL,
        transition_sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
        created_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (tenant_id, workspace_id, deal_id, fact_id)
          REFERENCES evidence_knowledge.facts (tenant_id, workspace_id, deal_id, fact_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, fact_id, fact_version_id)
          REFERENCES evidence_knowledge.fact_versions (tenant_id, workspace_id, deal_id, fact_id, fact_version_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.fact_transition_provenance (
        provenance_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL, workspace_id TEXT NOT NULL, deal_id TEXT NOT NULL,
        fact_id TEXT NOT NULL, fact_version_id TEXT NOT NULL, citation_id TEXT NOT NULL,
        relation TEXT NOT NULL CHECK (relation IN ('supports', 'supersedes')),
        created_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (tenant_id, workspace_id, deal_id, fact_id, fact_version_id)
          REFERENCES evidence_knowledge.fact_versions (tenant_id, workspace_id, deal_id, fact_id, fact_version_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, citation_id)
          REFERENCES evidence_knowledge.citations (tenant_id, workspace_id, deal_id, citation_id)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.invalidation_receipts (
        event_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL, source_kind TEXT NOT NULL, source_id TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('processing', 'pending', 'completed')),
        owner_token TEXT, lease_expires_at TIMESTAMPTZ,
        attempt_count INTEGER NOT NULL CHECK (attempt_count > 0), last_failure TEXT,
        created_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      CREATE TABLE evidence_knowledge.command_idempotency (
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        command_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        payload_digest CHAR(64) NOT NULL CHECK (payload_digest ~ '^[0-9a-f]{64}$'),
        result_reference TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        PRIMARY KEY (tenant_id, workspace_id, deal_id, actor_id, command_type, target_id, idempotency_key),
        CHECK (result_reference IS NULL OR completed_at IS NOT NULL)
      )`,
    },
    {
      schema: "evidence_knowledge",
      sql:
        "CREATE INDEX evidence_knowledge_scope_idx ON evidence_knowledge.evidence_records (tenant_id, workspace_id, deal_id, created_at)",
    },
    {
      schema: "evidence_knowledge",
      sql:
        "CREATE INDEX evidence_knowledge_citation_source_idx ON evidence_knowledge.citations (tenant_id, workspace_id, deal_id, document_version_id)",
    },
    {
      schema: "evidence_knowledge",
      sql:
        "CREATE INDEX evidence_knowledge_fact_scope_idx ON evidence_knowledge.facts (tenant_id, workspace_id, deal_id, status)",
    },
    {
      schema: "evidence_knowledge",
      sql:
        "CREATE INDEX evidence_knowledge_invalidation_source_idx ON evidence_knowledge.invalidations (tenant_id, workspace_id, deal_id, source_kind, source_id)",
    },
    {
      schema: "evidence_knowledge",
      sql:
        "CREATE INDEX evidence_knowledge_index_scope_idx ON evidence_knowledge.index_metadata (tenant_id, workspace_id, deal_id, state)",
    },
    {
      schema: "evidence_knowledge",
      sql:
        "CREATE FUNCTION evidence_knowledge.reject_immutable_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'evidence knowledge history is append-only'; END; $$",
    },
    {
      schema: "evidence_knowledge",
      sql:
        "CREATE TRIGGER evidence_knowledge_citations_no_update BEFORE UPDATE OR DELETE ON evidence_knowledge.citations FOR EACH ROW EXECUTE FUNCTION evidence_knowledge.reject_immutable_mutation()",
    },
    {
      schema: "evidence_knowledge",
      sql:
        "CREATE TRIGGER evidence_knowledge_fact_versions_no_update BEFORE UPDATE OR DELETE ON evidence_knowledge.fact_versions FOR EACH ROW EXECUTE FUNCTION evidence_knowledge.reject_immutable_mutation()",
    },
    {
      schema: "evidence_knowledge",
      sql:
        "CREATE TRIGGER evidence_knowledge_provenance_no_update BEFORE UPDATE OR DELETE ON evidence_knowledge.provenance_links FOR EACH ROW EXECUTE FUNCTION evidence_knowledge.reject_immutable_mutation()",
    },
    ...[
      "evidence_records",
      "interpretations",
      "assumptions",
      "calculations",
      "invalidations",
      "fact_version_citations",
      "interpretation_evidence",
      "calculation_inputs",
      "fact_transition_history",
      "fact_transition_provenance",
      "command_idempotency_history",
    ].map((table) => ({
      schema: "evidence_knowledge",
      sql:
        `CREATE TRIGGER evidence_knowledge_${table}_no_update BEFORE UPDATE OR DELETE ON evidence_knowledge.${table} FOR EACH ROW EXECUTE FUNCTION evidence_knowledge.reject_immutable_mutation()`,
    })),
  ],
});
