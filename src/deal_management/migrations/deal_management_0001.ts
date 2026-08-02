import { defineMigration } from "../../platform/persistence/v1.ts";

export const dealManagementMigration = defineMigration({
  owner: "deal_management",
  schema: "deal_management",
  id: "deal_management-0001-deal-core",
  version: 1,
  forwardNotes:
    "Create additive tenant/workspace/deal-scoped Deal aggregates, append-only history, command receipts, and legacy reconciliation manifest records.",
  rollbackNotes:
    "Disable Deal Management readers and writers, route reads and writes through the legacy adapter, retaining every new record, receipt, history, and outbox row for reconciliation.",
  statements: [
    {
      schema: "deal_management",
      sql: `
        CREATE SCHEMA IF NOT EXISTS deal_management;
        CREATE TABLE deal_management.deals (
          deal_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state = 'draft'),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id)
        );
        CREATE INDEX deal_management_deals_scope_idx
          ON deal_management.deals (tenant_id, workspace_id, updated_at, deal_id);
        CREATE TABLE deal_management.aggregate_history (
          event_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          actor_kind TEXT NOT NULL,
          correlation_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          event_type TEXT NOT NULL,
          schema_version INTEGER NOT NULL CHECK (schema_version > 0),
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          occurred_at TIMESTAMPTZ NOT NULL,
          available_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, aggregate_version)
        );
        CREATE INDEX deal_management_history_scope_idx
          ON deal_management.aggregate_history (tenant_id, workspace_id, deal_id, aggregate_version);
        CREATE TABLE deal_management.command_receipts (
          receipt_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          command_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          fingerprint TEXT NOT NULL,
          result JSONB NOT NULL CHECK (jsonb_typeof(result) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, actor_id, command_type, target_id, idempotency_key),
          UNIQUE (receipt_id)
        );
        CREATE INDEX deal_management_receipts_key_idx
          ON deal_management.command_receipts (idempotency_key);
        CREATE TABLE deal_management.reconciliation_manifest (
          manifest_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          legacy_source TEXT NOT NULL,
          legacy_record_id TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('pending', 'validated', 'rejected', 'rolled_back')),
          details JSONB NOT NULL CHECK (jsonb_typeof(details) = 'object'),
          recorded_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, legacy_source, legacy_record_id)
        );
        CREATE INDEX deal_management_reconciliation_scope_idx
          ON deal_management.reconciliation_manifest (tenant_id, workspace_id, deal_id, status);
      `,
    },
  ],
});
