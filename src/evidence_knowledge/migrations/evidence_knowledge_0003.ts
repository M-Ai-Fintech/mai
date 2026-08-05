import { defineMigration } from "../../platform/persistence/v1.ts";

export const evidenceKnowledgeMigration0003 = defineMigration({
  owner: "evidence_knowledge",
  schema: "evidence_knowledge",
  id: "evidence_knowledge-0003",
  version: 3,
  forwardNotes:
    "Corrective migration for facts.current_fact_version_id backfill deriving effective status from transition history and enforcing fact pointer invariant.",
  rollbackNotes:
    "Retain check constraint and current_fact_version_id backfill; additive schema migration is non-destructive.",
  statements: [
    {
      schema: "evidence_knowledge",
      sql: `
      DO $$
      DECLARE
        target_fact_id TEXT;
        target_tenant_id TEXT;
        target_workspace_id TEXT;
        target_deal_id TEXT;
        target_current_id TEXT;
        v_id TEXT;
        v_row_status TEXT;
        v_eff_status TEXT;
        effective_approved_count INTEGER;
        single_version_id TEXT;
      BEGIN
        FOR target_fact_id, target_tenant_id, target_workspace_id, target_deal_id, target_current_id IN 
          SELECT fact_id, tenant_id, workspace_id, deal_id, current_fact_version_id 
          FROM evidence_knowledge.facts 
          WHERE status = 'approved' 
        LOOP
          effective_approved_count := 0;
          single_version_id := NULL;

          FOR v_id, v_row_status IN
            SELECT fact_version_id, status
            FROM evidence_knowledge.fact_versions
            WHERE tenant_id = target_tenant_id
              AND workspace_id = target_workspace_id
              AND deal_id = target_deal_id
              AND fact_id = target_fact_id
          LOOP
            SELECT to_status INTO v_eff_status
            FROM evidence_knowledge.fact_transition_history
            WHERE tenant_id = target_tenant_id
              AND workspace_id = target_workspace_id
              AND deal_id = target_deal_id
              AND fact_version_id = v_id
            ORDER BY transition_sequence DESC
            LIMIT 1;

            IF v_eff_status IS NULL THEN
              v_eff_status := v_row_status;
            END IF;

            IF v_eff_status = 'approved' THEN
              effective_approved_count := effective_approved_count + 1;
              single_version_id := v_id;
            END IF;
          END LOOP;

          IF effective_approved_count = 0 THEN
            RAISE EXCEPTION 'Approved Fact % in scope %/%/% has no effective approved version', 
              target_fact_id, target_tenant_id, target_workspace_id, target_deal_id;
          END IF;

          IF target_current_id IS NOT NULL THEN
            SELECT to_status INTO v_eff_status
            FROM evidence_knowledge.fact_transition_history
            WHERE tenant_id = target_tenant_id
              AND workspace_id = target_workspace_id
              AND deal_id = target_deal_id
              AND fact_version_id = target_current_id
            ORDER BY transition_sequence DESC
            LIMIT 1;

            IF v_eff_status IS NULL THEN
              SELECT status INTO v_eff_status
              FROM evidence_knowledge.fact_versions
              WHERE tenant_id = target_tenant_id
                AND workspace_id = target_workspace_id
                AND deal_id = target_deal_id
                AND fact_version_id = target_current_id;
            END IF;

            IF v_eff_status IS NULL OR v_eff_status != 'approved' THEN
              RAISE EXCEPTION 'Approved Fact % has current_fact_version_id % which is not effectively approved',
                target_fact_id, target_current_id;
            END IF;
          ELSE
            IF effective_approved_count > 1 THEN
              RAISE EXCEPTION 'Approved Fact % in scope %/%/% has % independently eligible approved versions with no current pointer', 
                target_fact_id, target_tenant_id, target_workspace_id, target_deal_id, effective_approved_count;
            END IF;

            UPDATE evidence_knowledge.facts
            SET current_fact_version_id = single_version_id
            WHERE tenant_id = target_tenant_id
              AND workspace_id = target_workspace_id
              AND deal_id = target_deal_id
              AND fact_id = target_fact_id;
          END IF;
        END LOOP;
      END $$;
      `,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      ALTER TABLE evidence_knowledge.facts
      ADD CONSTRAINT check_facts_approved_has_current_version
      CHECK (
        (status = 'approved' AND current_fact_version_id IS NOT NULL) OR
        (status != 'approved' AND current_fact_version_id IS NULL)
      )
      `,
    },
  ],
});
