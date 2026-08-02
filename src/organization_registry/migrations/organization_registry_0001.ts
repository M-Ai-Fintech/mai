import { defineMigration } from "../../platform/persistence/v1.ts";

export const organizationRegistryMigration = defineMigration({
  owner: "organization_registry",
  schema: "organization_registry",
  id: "organization_registry-0001-identity-lifecycle",
  version: 1,
  forwardNotes:
    "Create additive tenant/workspace-scoped organization, legal entity, person, and append-only merge-history records.",
  rollbackNotes:
    "Disable organization-registry readers and route reads to the legacy source while retaining every new record and merge-history row.",
  statements: [
    {
      schema: "organization_registry",
      sql: `
        CREATE SCHEMA IF NOT EXISTS organization_registry;
        CREATE TABLE organization_registry.organizations (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'archived', 'merged')),
          name TEXT NOT NULL,
          normalized_name TEXT NOT NULL,
          external_reference TEXT,
          merged_into_id TEXT,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE UNIQUE INDEX organization_registry_organization_name_idx
          ON organization_registry.organizations (
            tenant_id, COALESCE(workspace_id, ''), normalized_name
          );
        CREATE TABLE organization_registry.legal_entities (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          organization_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'archived', 'merged')),
          legal_name TEXT NOT NULL,
          jurisdiction_code TEXT NOT NULL,
          registration_number TEXT NOT NULL,
          merged_into_id TEXT,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE UNIQUE INDEX organization_registry_legal_registration_idx
          ON organization_registry.legal_entities (
            tenant_id, COALESCE(workspace_id, ''), jurisdiction_code,
            registration_number
          );
        CREATE TABLE organization_registry.people (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          organization_id TEXT,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'archived', 'merged')),
          given_name TEXT NOT NULL,
          family_name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          national_id TEXT,
          merged_into_id TEXT,
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX organization_registry_people_scope_idx
          ON organization_registry.people (
            tenant_id, COALESCE(workspace_id, ''), state, aggregate_id
          );
        CREATE TABLE organization_registry.merge_history (
          record_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          aggregate_kind TEXT NOT NULL CHECK (
            aggregate_kind IN ('organization', 'legal_entity', 'person')
          ),
          source_id TEXT NOT NULL,
          target_id TEXT NOT NULL,
          source_version BIGINT NOT NULL CHECK (source_version > 0),
          target_version BIGINT NOT NULL CHECK (target_version > 0),
          actor_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          recorded_at TIMESTAMPTZ NOT NULL
        );
        CREATE UNIQUE INDEX organization_registry_merge_history_identity_idx
          ON organization_registry.merge_history (
            tenant_id, COALESCE(workspace_id, ''), aggregate_kind, source_id,
            target_id, source_version, target_version
          );
        CREATE INDEX organization_registry_merge_history_scope_idx
          ON organization_registry.merge_history (
            tenant_id, COALESCE(workspace_id, ''), aggregate_kind, recorded_at
          );
      `,
    },
  ],
});
