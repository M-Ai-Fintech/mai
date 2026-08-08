import { defineMigration } from "../../platform/persistence/v1.ts";

/**
 * Additive authority evidence for the JSON round aggregate. The round
 * document remains the transactional aggregate; this table is the immutable,
 * scoped evidence stream used for recovery, audit, and delivery fencing.
 */
export const negotiationEvidenceMigration = defineMigration({
  owner: "negotiation",
  schema: "negotiation",
  id: "negotiation-0002-evidence",
  version: 2,
  forwardNotes:
    "Add append-only scoped evidence snapshots, exact round foreign keys for declared child projections, and cross-command negotiation idempotency protection without rewriting the pinned control migration.",
  rollbackNotes:
    "Disable Negotiation delivery and authority-sensitive commands while retaining the append-only evidence stream and existing round documents; do not delete historical evidence during rollback.",
  statements: [
    {
      schema: "negotiation",
      sql: `
        CREATE TABLE negotiation.evidence_events (
          evidence_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          round_id TEXT NOT NULL,
          evidence_type TEXT NOT NULL,
          subject_id TEXT NOT NULL,
          subject_version BIGINT NOT NULL CHECK (subject_version > 0),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          recorded_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, evidence_id),
          UNIQUE (
            tenant_id,
            workspace_id,
            deal_id,
            round_id,
            evidence_type,
            subject_id,
            subject_version
          ),
          CONSTRAINT negotiation_evidence_round_scope_fk
            FOREIGN KEY (tenant_id, workspace_id, deal_id, round_id)
            REFERENCES negotiation.rounds (
              tenant_id, workspace_id, deal_id, round_id
            )
        );
        CREATE INDEX negotiation_evidence_scope_idx
          ON negotiation.evidence_events (
            tenant_id, workspace_id, deal_id, round_id, recorded_at
          );

        CREATE OR REPLACE FUNCTION negotiation.reject_evidence_mutation()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RAISE EXCEPTION 'Negotiation evidence is append-only';
        END;
        $$;
        CREATE TRIGGER negotiation_evidence_append_only
          BEFORE UPDATE OR DELETE ON negotiation.evidence_events
          FOR EACH ROW EXECUTE FUNCTION negotiation.reject_evidence_mutation();

        ALTER TABLE negotiation.internal_positions
          ADD CONSTRAINT negotiation_internal_positions_round_scope_fk
          FOREIGN KEY (tenant_id, workspace_id, deal_id, round_id)
          REFERENCES negotiation.rounds (
            tenant_id, workspace_id, deal_id, round_id
          ) NOT VALID;
        ALTER TABLE negotiation.approvals
          ADD CONSTRAINT negotiation_approvals_round_scope_fk
          FOREIGN KEY (tenant_id, workspace_id, deal_id, round_id)
          REFERENCES negotiation.rounds (
            tenant_id, workspace_id, deal_id, round_id
          ) NOT VALID;
        ALTER TABLE negotiation.delivery_requests
          ADD CONSTRAINT negotiation_delivery_requests_round_scope_fk
          FOREIGN KEY (tenant_id, workspace_id, deal_id, round_id)
          REFERENCES negotiation.rounds (
            tenant_id, workspace_id, deal_id, round_id
          ) NOT VALID;
        ALTER TABLE negotiation.delivery_receipts
          ADD COLUMN IF NOT EXISTS round_id TEXT;
        ALTER TABLE negotiation.delivery_receipts
          ADD CONSTRAINT negotiation_delivery_receipts_round_scope_fk
          FOREIGN KEY (tenant_id, workspace_id, deal_id, round_id)
          REFERENCES negotiation.rounds (
            tenant_id, workspace_id, deal_id, round_id
          ) NOT VALID;

        CREATE INDEX negotiation_command_results_actor_idempotency_idx
          ON negotiation.command_results (actor_id, idempotency_key);

        COMMENT ON TABLE negotiation.mandates IS
          'Compatibility projection only; authoritative mandate snapshots and authority evidence are in the round aggregate and append-only evidence store';
        COMMENT ON TABLE negotiation.internal_positions IS
          'Compatibility projection only; authoritative position snapshots and authority evidence are in the round aggregate and append-only evidence store';
        COMMENT ON TABLE negotiation.approvals IS
          'Compatibility projection only; authoritative approval snapshots and authority evidence are in the round aggregate and append-only evidence store';
        COMMENT ON TABLE negotiation.delivery_requests IS
          'Compatibility projection only; authoritative delivery requests and authority evidence are in the round aggregate and append-only evidence store';
        COMMENT ON TABLE negotiation.delivery_receipts IS
          'Compatibility projection only; authoritative delivery receipts and authority evidence are in the round aggregate and append-only evidence store';
      `,
    },
  ],
});
