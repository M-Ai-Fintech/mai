import {
  type ContextMigration,
  defineMigration,
} from "../platform/persistence/v1.ts";

export const demoReadinessMigrations: readonly ContextMigration[] = Object
  .freeze([
    defineMigration({
      owner: "demo_readiness",
      schema: "demo_readiness",
      id: "demo_readiness-0001-workflow-snapshots",
      version: 1,
      forwardNotes:
        "Persist exact synthetic workflow snapshots after context-owned records succeed.",
      rollbackNotes:
        "Disable the demo route and retain snapshots for evidence; isolated demo reset may truncate them.",
      statements: [{
        schema: "demo_readiness",
        sql: `
          CREATE SCHEMA IF NOT EXISTS demo_readiness;
          CREATE TABLE demo_readiness.workflow_snapshots (
            tenant_id TEXT NOT NULL,
            workspace_id TEXT NOT NULL,
            deal_id TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            dataset_digest CHAR(64) NOT NULL CHECK (
              dataset_digest ~ '^[0-9a-f]{64}$'
            ),
            result JSONB NOT NULL CHECK (jsonb_typeof(result) = 'object'),
            created_at TIMESTAMPTZ NOT NULL,
            PRIMARY KEY (
              tenant_id, workspace_id, deal_id, idempotency_key
            )
          );
          CREATE INDEX demo_readiness_workflow_scope_idx
            ON demo_readiness.workflow_snapshots
              (tenant_id, workspace_id, deal_id, created_at DESC);
        `,
      }],
    }),
  ]);
