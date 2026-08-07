import { defineMigration } from "../../platform/persistence/v1.ts";

export const closingControlMigration = defineMigration({
  owner: "closing",
  schema: "closing",
  id: "closing-0001-control",
  version: 1,
  forwardNotes:
    "Create additive Closing workspace documents, immutable effect records, and durable command result records with semantic deal scope.",
  rollbackNotes:
    "Disable Closing readers and commands, retain workspaces, history, effects, and command results, and route any pre-confirmation compensation through an owner-approved adapter.",
  statements: [
    {
      schema: "closing",
      sql: `
        CREATE SCHEMA IF NOT EXISTS closing;
        CREATE TABLE closing.workspaces (
          closing_workspace_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          status TEXT NOT NULL,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, closing_workspace_id)
        );
        CREATE INDEX closing_workspaces_scope_idx
          ON closing.workspaces (tenant_id, workspace_id, deal_id, updated_at);
        CREATE TABLE closing.command_results (
          command_key TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          command_type TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          payload_digest CHAR(64) NOT NULL,
          result JSONB NOT NULL CHECK (jsonb_typeof(result) = 'object'),
          recorded_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, actor_id, command_type, idempotency_key)
        );
        CREATE TABLE closing.effect_records (
          effect_id TEXT PRIMARY KEY,
          kind TEXT NOT NULL CHECK (kind IN ('audit', 'outbox', 'job')),
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          event_type TEXT NOT NULL,
          actor JSONB NOT NULL CHECK (jsonb_typeof(actor) = 'object'),
          authority_proof_id TEXT,
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          occurred_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX closing_effect_scope_idx
          ON closing.effect_records (tenant_id, workspace_id, deal_id, occurred_at);
      `,
    },
  ],
});
