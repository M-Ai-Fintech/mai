import { defineMigration } from "../../platform/persistence/v1.ts";

export const evidenceKnowledgeMigration0002 = defineMigration({
  owner: "evidence_knowledge",
  schema: "evidence_knowledge",
  id: "evidence_knowledge-0002",
  version: 2,
  forwardNotes:
    "Add current_fact_version_id to evidence_knowledge.facts with scoped foreign key and deterministic backfill.",
  rollbackNotes:
    "Retain current_fact_version_id column and foreign key; additive schema migration is non-destructive.",
  statements: [
    {
      schema: "evidence_knowledge",
      sql:
        `ALTER TABLE evidence_knowledge.facts ADD COLUMN current_fact_version_id TEXT`,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      DO $$
      DECLARE
        evidence_knowledge RECORD;
      BEGIN
        FOR evidence_knowledge IN SELECT fact_id, tenant_id, workspace_id, deal_id FROM evidence_knowledge.facts WHERE status = 'approved' LOOP
          UPDATE evidence_knowledge.facts
          SET current_fact_version_id = (
            SELECT fact_version_id
            FROM evidence_knowledge.fact_versions
            WHERE tenant_id = evidence_knowledge.tenant_id
              AND workspace_id = evidence_knowledge.workspace_id
              AND deal_id = evidence_knowledge.deal_id
              AND fact_id = evidence_knowledge.fact_id
              AND status = 'approved'
            LIMIT 1
          )
          WHERE tenant_id = evidence_knowledge.tenant_id
            AND workspace_id = evidence_knowledge.workspace_id
            AND deal_id = evidence_knowledge.deal_id
            AND fact_id = evidence_knowledge.fact_id;
        END LOOP;
      END $$;
      `,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      ALTER TABLE evidence_knowledge.facts
      ADD CONSTRAINT fk_facts_current_fact_version
      FOREIGN KEY (tenant_id, workspace_id, deal_id, fact_id, current_fact_version_id)
      REFERENCES evidence_knowledge.fact_versions (tenant_id, workspace_id, deal_id, fact_id, fact_version_id)
      `,
    },
  ],
});
