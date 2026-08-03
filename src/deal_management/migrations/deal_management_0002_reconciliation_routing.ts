import { defineMigration } from "../../platform/persistence/v1.ts";

/**
 * Adds per-Deal reconciliation state and append-only compatibility routing
 * evidence without changing authoritative Deal or legacy records.
 *
 * @example reconciliationRoutingMigration.statements.length
 */
export const reconciliationRoutingMigration = defineMigration({
  owner: "deal_management",
  schema: "deal_management",
  id: "deal_management-0002-reconciliation-routing",
  version: 2,
  forwardNotes:
    "Add per-Deal mapping fingerprints, explicit reconciliation statuses, compatibility routing state, and append-only routing evidence.",
  rollbackNotes:
    "Disable reconciliation readers and retain all records and routing evidence; never delete authoritative or legacy data.",
  statements: [
    {
      schema: "deal_management",
      sql: `
        CREATE TABLE deal_management.reconciliation_records (
          record_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          legacy_source TEXT NOT NULL,
          legacy_record_id TEXT NOT NULL,
          authoritative_deal_id TEXT,
          source_fingerprint TEXT,
          intended_document JSONB,
          status TEXT NOT NULL CHECK (
            status IN (
              'pending', 'dry_run_valid', 'applied', 'verified',
              'conflict', 'rejected', 'rollback_routed'
            )
          ),
          routing_mode TEXT NOT NULL CHECK (routing_mode IN ('authoritative', 'legacy')),
          issue JSONB,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, legacy_source, legacy_record_id),
          UNIQUE (tenant_id, workspace_id, authoritative_deal_id),
          CHECK (intended_document IS NULL OR jsonb_typeof(intended_document) = 'object'),
          CHECK (issue IS NULL OR jsonb_typeof(issue) = 'object')
        );
        CREATE INDEX deal_management_reconciliation_records_scope_idx
          ON deal_management.reconciliation_records
            (tenant_id, workspace_id, status, legacy_source, legacy_record_id);
        CREATE TABLE deal_management.reconciliation_routing_history (
          routing_event_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          legacy_source TEXT NOT NULL,
          legacy_record_id TEXT NOT NULL,
          authoritative_deal_id TEXT,
          previous_mode TEXT NOT NULL CHECK (previous_mode IN ('authoritative', 'legacy')),
          next_mode TEXT NOT NULL CHECK (next_mode IN ('authoritative', 'legacy')),
          actor_id TEXT NOT NULL,
          correlation_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          changed_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX deal_management_routing_history_scope_idx
          ON deal_management.reconciliation_routing_history
            (tenant_id, workspace_id, legacy_source, legacy_record_id, changed_at);
      `,
    },
  ],
});
