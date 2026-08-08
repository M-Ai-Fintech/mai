import { defineMigration } from "../../platform/persistence/v1.ts";

export const negotiationControlMigration = defineMigration({
  owner: "negotiation",
  schema: "negotiation",
  id: "negotiation-0001-control",
  version: 1,
  forwardNotes:
    "Create additive Negotiation rounds, protected internal records, approvals, durable delivery requests and receipts, idempotent command results, and immutable effect records.",
  rollbackNotes:
    "Disable Negotiation commands and the delivery worker while retaining immutable rounds, internal authority records, approvals, audit/effect records, delivery requests, receipts, and command results for recovery and review.",
  statements: [
    {
      schema: "negotiation",
      sql: `
        CREATE SCHEMA IF NOT EXISTS negotiation;
        CREATE TABLE negotiation.rounds (
          round_id TEXT NOT NULL,
          negotiation_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          status TEXT NOT NULL,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, round_id)
        );
        CREATE INDEX negotiation_rounds_scope_idx
          ON negotiation.rounds (tenant_id, workspace_id, deal_id, updated_at);

        CREATE TABLE negotiation.mandates (
          mandate_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          status TEXT NOT NULL,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, mandate_id)
        );
        CREATE TABLE negotiation.internal_positions (
          position_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          round_id TEXT NOT NULL,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, position_id)
        );
        CREATE INDEX negotiation_internal_positions_round_idx
          ON negotiation.internal_positions (tenant_id, workspace_id, deal_id, round_id, created_at);
        CREATE TABLE negotiation.approvals (
          approval_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          round_id TEXT NOT NULL,
          proposal_id TEXT NOT NULL,
          proposal_version_id TEXT NOT NULL,
          status TEXT NOT NULL,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          requested_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, approval_id)
        );

        CREATE TABLE negotiation.delivery_requests (
          delivery_request_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          round_id TEXT NOT NULL,
          proposal_id TEXT NOT NULL,
          proposal_version_id TEXT NOT NULL,
          approval_id TEXT NOT NULL,
          status TEXT NOT NULL,
          job_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          authority_proof_id TEXT NOT NULL,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          requested_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, delivery_request_id),
          UNIQUE (tenant_id, workspace_id, deal_id, idempotency_key)
        );
        CREATE TABLE negotiation.delivery_receipts (
          delivery_receipt_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          delivery_request_id TEXT NOT NULL,
          state TEXT NOT NULL,
          attempt_count INTEGER NOT NULL CHECK (attempt_count >= 0),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, delivery_receipt_id)
        );

        CREATE TABLE negotiation.command_results (
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
        CREATE TABLE negotiation.effect_records (
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
        CREATE INDEX negotiation_effect_scope_idx
          ON negotiation.effect_records (tenant_id, workspace_id, deal_id, occurred_at);
      `,
    },
  ],
});
