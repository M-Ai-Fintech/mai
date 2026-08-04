import { defineMigration } from "../../platform/persistence/v1.ts";

/**
 * Adds Deal-owned lifecycle and milestone documents with append-only transition
 * history while leaving the existing Deal and legacy records untouched.
 *
 * @example lifecycleMilestonesMigration.statements.length
 */
export const lifecycleMilestonesMigration = defineMigration({
  owner: "deal_management",
  schema: "deal_management",
  id: "deal_management-0003-lifecycle-milestones",
  version: 3,
  forwardNotes:
    "Add scoped lifecycle current state and append-only milestone/lifecycle transition history for Deal Management commands and projections.",
  rollbackNotes:
    "Disable lifecycle commands and lifecycle projections, route reads through the explicit legacy phase adapter, and retain lifecycle rows, history, receipts, audit, outbox, and migration records.",
  statements: [
    {
      schema: "deal_management",
      sql: `
        CREATE TABLE deal_management.lifecycle_current (
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          PRIMARY KEY (tenant_id, workspace_id, deal_id)
        );
        CREATE INDEX deal_management_lifecycle_current_scope_idx
          ON deal_management.lifecycle_current
            (tenant_id, workspace_id, version, deal_id);
        CREATE TABLE deal_management.lifecycle_transition_history (
          transition_id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          subject_type TEXT NOT NULL CHECK (
            subject_type IN ('lifecycle', 'milestone')
          ),
          subject_id TEXT NOT NULL,
          previous_state TEXT,
          next_state TEXT NOT NULL,
          prerequisites JSONB NOT NULL CHECK (jsonb_typeof(prerequisites) = 'array'),
          actor_id TEXT NOT NULL,
          correlation_id TEXT NOT NULL,
          occurred_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, aggregate_version),
          UNIQUE (event_id),
          CHECK (
            (subject_type = 'lifecycle' AND next_state IN (
              'draft', 'sourcing', 'due_diligence', 'negotiation',
              'closing', 'completed', 'archived'
            )) OR
            (subject_type = 'milestone' AND next_state IN (
              'planned', 'active', 'blocked', 'completed', 'cancelled'
            ))
          )
        );
        CREATE INDEX deal_management_lifecycle_history_scope_idx
          ON deal_management.lifecycle_transition_history
            (tenant_id, workspace_id, deal_id, aggregate_version, occurred_at);
      `,
    },
  ],
});
