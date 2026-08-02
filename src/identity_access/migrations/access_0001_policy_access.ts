import { defineMigration } from "../../platform/persistence/v1.ts";

export const accessPolicyMigration = defineMigration({
  owner: "access",
  schema: "access",
  id: "access-0001-policy-access",
  version: 1,
  forwardNotes:
    "Create tenant/workspace-scoped role policies, permission grants, restrictions, and append-only access history.",
  rollbackNotes:
    "Disable access consumers while retaining policy, grant, restriction, and history rows for shadow comparison and rollback.",
  statements: [
    {
      schema: "access",
      sql: `
        CREATE SCHEMA IF NOT EXISTS access;
        CREATE TABLE access.role_policies (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'revoked')),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE access.permission_grants (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          identity_id TEXT NOT NULL,
          access_kind TEXT NOT NULL CHECK (access_kind IN ('standard', 'temporary', 'external')),
          state TEXT NOT NULL CHECK (state IN ('active', 'revoked')),
          expires_at TIMESTAMPTZ,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          version BIGINT NOT NULL CHECK (version > 0),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          CHECK (access_kind = 'standard' OR expires_at IS NOT NULL)
        );
        CREATE TABLE access.restrictions (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'revoked')),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE access.aggregate_history (
          history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          aggregate_type TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          event_type TEXT NOT NULL,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          recorded_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, aggregate_type, aggregate_id, version)
        );
        CREATE INDEX access_role_scope_idx
          ON access.role_policies (tenant_id, workspace_id, state, aggregate_id);
        CREATE INDEX access_grant_scope_idx
          ON access.permission_grants (tenant_id, workspace_id, identity_id, state);
        CREATE INDEX access_restriction_scope_idx
          ON access.restrictions (tenant_id, workspace_id, state, aggregate_id);
        CREATE INDEX access_history_scope_idx
          ON access.aggregate_history (tenant_id, workspace_id, aggregate_type, aggregate_id, version);
      `,
    },
  ],
});
