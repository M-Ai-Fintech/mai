import { defineMigration } from "../../platform/persistence/v1.ts";

// Preserve the published migration checksum while avoiding physical trailing whitespace.
const SQL_TRAILING_SPACE = " ";

export const evidenceKnowledgeMigration0004 = defineMigration({
  owner: "evidence_knowledge",
  schema: "evidence_knowledge",
  id: "evidence_knowledge-0004",
  version: 4,
  forwardNotes:
    "Corrective migration for facts.current_fact_version_id repairing superseded pointers, validating fact pointer invariant, and establishing constraint triggers on facts and fact_transition_history.",
  rollbackNotes:
    "Retain check constraint, constraint triggers, and current_fact_version_id backfill; additive schema migration is non-destructive.",
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
        v_curr_valid BOOLEAN;
        effective_approved_count INTEGER;
        single_version_id TEXT;
      BEGIN
        FOR target_fact_id, target_tenant_id, target_workspace_id, target_deal_id, target_current_id IN${SQL_TRAILING_SPACE}
          SELECT fact_id, tenant_id, workspace_id, deal_id, current_fact_version_id${SQL_TRAILING_SPACE}
          FROM evidence_knowledge.facts${SQL_TRAILING_SPACE}
          WHERE status = 'approved'${SQL_TRAILING_SPACE}
        LOOP
          effective_approved_count := 0;
          single_version_id := NULL;
          v_curr_valid := FALSE;

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
              IF target_current_id IS NOT NULL AND v_id = target_current_id THEN
                v_curr_valid := TRUE;
              END IF;
            END IF;
          END LOOP;

          IF v_curr_valid THEN
            NULL;
          ELSIF effective_approved_count = 1 THEN
            UPDATE evidence_knowledge.facts
            SET current_fact_version_id = single_version_id
            WHERE tenant_id = target_tenant_id
              AND workspace_id = target_workspace_id
              AND deal_id = target_deal_id
              AND fact_id = target_fact_id;
          ELSIF effective_approved_count = 0 THEN
            RAISE EXCEPTION 'Approved Fact % in scope %/%/% has no effective approved version',${SQL_TRAILING_SPACE}
              target_fact_id, target_tenant_id, target_workspace_id, target_deal_id;
          ELSE
            RAISE EXCEPTION 'Approved Fact % in scope %/%/% has % independently eligible approved versions with no current pointer',${SQL_TRAILING_SPACE}
              target_fact_id, target_tenant_id, target_workspace_id, target_deal_id, effective_approved_count;
          END IF;
        END LOOP;
      END $$;
      `,
    },
    {
      schema: "evidence_knowledge",
      sql: `
      ALTER TABLE evidence_knowledge.facts
      DROP CONSTRAINT IF EXISTS check_facts_approved_has_current_version;
      ALTER TABLE evidence_knowledge.facts
      ADD CONSTRAINT check_facts_approved_has_current_version
      CHECK (
        (status = 'approved' AND current_fact_version_id IS NOT NULL) OR
        (status != 'approved' AND current_fact_version_id IS NULL)
      );

      CREATE OR REPLACE FUNCTION evidence_knowledge.validate_fact_pointer_invariant(
        v_tenant_id TEXT,
        v_workspace_id TEXT,
        v_deal_id TEXT,
        v_fact_id TEXT
      )
      RETURNS VOID AS $$
      DECLARE
        v_status TEXT;
        v_current_id TEXT;
        v_ver_status TEXT;
        v_eff_status TEXT;
      BEGIN
        SELECT status, current_fact_version_id
        INTO v_status, v_current_id
        FROM evidence_knowledge.facts
        WHERE tenant_id = v_tenant_id
          AND workspace_id = v_workspace_id
          AND deal_id = v_deal_id
          AND fact_id = v_fact_id;

        IF NOT FOUND THEN
          RETURN;
        END IF;

        IF v_status = 'approved' THEN
          IF v_current_id IS NULL THEN
            RAISE EXCEPTION 'Approved Fact % has null current_fact_version_id', v_fact_id;
          END IF;

          SELECT status INTO v_ver_status
          FROM evidence_knowledge.fact_versions
          WHERE tenant_id = v_tenant_id
            AND workspace_id = v_workspace_id
            AND deal_id = v_deal_id
            AND fact_id = v_fact_id
            AND fact_version_id = v_current_id;

          IF v_ver_status IS NULL THEN
            RAISE EXCEPTION 'Fact % current_fact_version_id % is invalid, cross-scope, or owned by another Fact',
              v_fact_id, v_current_id;
          END IF;

          SELECT to_status INTO v_eff_status
          FROM evidence_knowledge.fact_transition_history
          WHERE tenant_id = v_tenant_id
            AND workspace_id = v_workspace_id
            AND deal_id = v_deal_id
            AND fact_version_id = v_current_id
          ORDER BY transition_sequence DESC
          LIMIT 1;

          IF v_eff_status IS NULL THEN
            v_eff_status := v_ver_status;
          END IF;

          IF v_eff_status != 'approved' THEN
            RAISE EXCEPTION 'Fact % current_fact_version_id % is not effectively approved',
              v_fact_id, v_current_id;
          END IF;
        ELSE
          IF v_current_id IS NOT NULL THEN
            RAISE EXCEPTION 'Non-approved Fact % cannot have current_fact_version_id', v_fact_id;
          END IF;
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION evidence_knowledge.check_fact_pointer_invariant()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM evidence_knowledge.validate_fact_pointer_invariant(
          to_jsonb(NEW)->>'tenant_id',
          to_jsonb(NEW)->>'workspace_id',
          to_jsonb(NEW)->>'deal_id',
          to_jsonb(NEW)->>'fact_id'
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_check_fact_pointer_invariant ON evidence_knowledge.facts;
      CREATE CONSTRAINT TRIGGER trigger_check_fact_pointer_invariant
      AFTER INSERT OR UPDATE ON evidence_knowledge.facts
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE FUNCTION evidence_knowledge.check_fact_pointer_invariant();

      CREATE OR REPLACE FUNCTION evidence_knowledge.check_fact_transition_history_pointer_invariant()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM evidence_knowledge.validate_fact_pointer_invariant(
          to_jsonb(NEW)->>'tenant_id',
          to_jsonb(NEW)->>'workspace_id',
          to_jsonb(NEW)->>'deal_id',
          to_jsonb(NEW)->>'fact_id'
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_check_fact_transition_history_pointer_invariant ON evidence_knowledge.fact_transition_history;
      CREATE CONSTRAINT TRIGGER trigger_check_fact_transition_history_pointer_invariant
      AFTER INSERT ON evidence_knowledge.fact_transition_history
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE FUNCTION evidence_knowledge.check_fact_transition_history_pointer_invariant();
      `,
    },
  ],
});
