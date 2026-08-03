import { defineMigration } from "../../platform/persistence/v1.ts";

export const iamIdentityMigration = defineMigration({
  owner: "iam",
  schema: "iam",
  id: "iam-0001-identity-access",
  version: 1,
  forwardNotes:
    "Create tenant-scoped identity, tenancy, membership, invitation, session, and terminal revocation records.",
  rollbackNotes:
    "Disable IAM consumers while retaining identity, session, revocation, and aggregate history rows for reconciliation.",
  statements: [
    {
      schema: "iam",
      sql: `
        CREATE SCHEMA IF NOT EXISTS iam;
        CREATE TABLE iam.institutions (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL UNIQUE,
          workspace_id TEXT,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'suspended', 'closed')),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE iam.workspaces (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL UNIQUE,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'suspended', 'archived')),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE iam.user_identities (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'inactive', 'revoked')),
          provider_subject TEXT NOT NULL,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, provider_subject)
        );
        CREATE TABLE iam.memberships (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'suspended', 'revoked')),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE iam.invitations (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('pending', 'accepted', 'expired', 'revoked')),
          token_digest CHAR(64) NOT NULL CHECK (token_digest ~ '^[0-9a-f]{64}$'),
          expires_at TIMESTAMPTZ NOT NULL,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE iam.sessions (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          actor_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'revoked', 'expired')),
          issued_at TIMESTAMPTZ NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          identity_id TEXT NOT NULL,
          revoked_at TIMESTAMPTZ,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE iam.revocations (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state = 'terminal'),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, target_type, target_id)
        );
        CREATE TABLE iam.aggregate_history (
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
        CREATE INDEX iam_identity_scope_idx
          ON iam.user_identities (tenant_id, aggregate_id);
        CREATE INDEX iam_membership_scope_idx
          ON iam.memberships (tenant_id, workspace_id, aggregate_id);
        CREATE INDEX iam_invitation_scope_idx
          ON iam.invitations (tenant_id, workspace_id, state, expires_at);
        CREATE INDEX iam_session_scope_idx
          ON iam.sessions (tenant_id, workspace_id, actor_id, state);
        CREATE INDEX iam_history_scope_idx
          ON iam.aggregate_history (tenant_id, workspace_id, aggregate_type, aggregate_id, version);
      `,
    },
  ],
});
