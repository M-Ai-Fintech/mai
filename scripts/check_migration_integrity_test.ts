import { assertEquals, assertStringIncludes } from "@std/assert";
import { defineMigration } from "../src/platform/persistence/migration.ts";
import { migrationChecksum } from "../src/platform/persistence/migration_runner.ts";
import {
  currentMigrationCatalog,
  migrationIntegrityDiagnostics,
  PUBLISHED_MIGRATION_CHECKSUMS,
} from "./check_migration_integrity.ts";

const WAVE_G_MIGRATION_IDS = [
  "valuation-0001",
  "matching-0001",
  "deliverables-0001",
  "closing-0001-control",
  "deal_governance-0001",
  "deal_governance-0002",
] as const;

// This list is deliberately maintained outside the registry and checksum map.
// It prevents both executable checks from agreeing on the same incomplete set.
const EXPECTED_ACTIVE_MIGRATION_IDS = [
  "platform-0001-idempotency",
  "platform-0002-outbox",
  "platform-0003-inbox",
  "platform-0004-jobs",
  "access-0001-policy-access",
  "agent_runtime-0001-mission-run",
  "agent_runtime-0002-deal-scope",
  "audit_activity-0001-events-and-redactions",
  "closing-0001-control",
  "deal_access-0001",
  "deal_access-0002",
  "deal_access-0003-delivery-identity",
  "deal_governance-0001",
  "deal_governance-0002",
  "deal_management-0001-deal-core",
  "deal_management-0002-reconciliation-routing",
  "deal_management-0003-lifecycle-milestones",
  "deliverables-0001",
  "demo_readiness-0001-workflow-snapshots",
  "diligence_decisions-0001",
  "diligence_decisions-0002",
  "documents-0001",
  "evidence_knowledge-0001",
  "evidence_knowledge-0002",
  "evidence_knowledge-0003",
  "evidence_knowledge-0004",
  "financial_risk-0001",
  "iam-0001-identity-access",
  "iam-0002-session-identity",
  "matching-0001",
  "negotiation-0001-control",
  "negotiation-0002-evidence",
  "notifications-0001",
  "organization_registry-0001-identity-lifecycle",
  "valuation-0001",
  "work_management-0001",
  "work_management-0002-corrective",
  "work_management-0003-membership-authority",
  "work_management-0004-membership-authority",
  "work_management-0005-authority-and-prepared",
  "work_management-0006-membership-operability",
  "work_management-0007-runtime-gate",
  "work_management-0008-actor-binding",
  "work_management-0009-corrective-upgrade",
  "work_management-0010-authority-denials",
] as const;

const EXPECTED_ACTIVE_MIGRATION_OWNERS = [
  "access",
  "agent_runtime",
  "audit_activity",
  "closing",
  "deal_access",
  "deal_governance",
  "deal_management",
  "deliverables",
  "demo_readiness",
  "diligence_decisions",
  "documents",
  "evidence_knowledge",
  "financial_risk",
  "iam",
  "matching",
  "negotiation",
  "notifications",
  "organization_registry",
  "platform",
  "valuation",
  "work_management",
] as const;

Deno.test("migration catalog covers clean and historical integrity paths", async () => {
  assertEquals(
    await migrationIntegrityDiagnostics(
      currentMigrationCatalog(),
      PUBLISHED_MIGRATION_CHECKSUMS,
    ),
    [],
  );
});

Deno.test("migration catalog pins every Wave G migration stream", () => {
  const catalogIds = new Set(
    currentMigrationCatalog().map((migration) => migration.id),
  );

  for (const id of WAVE_G_MIGRATION_IDS) {
    assertEquals(catalogIds.has(id), true);
    assertEquals(typeof PUBLISHED_MIGRATION_CHECKSUMS[id], "string");
  }
});

Deno.test("migration catalog exactly matches the independently maintained set", () => {
  const catalog = currentMigrationCatalog();
  assertEquals(catalog.length, EXPECTED_ACTIVE_MIGRATION_IDS.length);
  assertEquals(
    [...catalog.map((migration) => migration.id)].sort(),
    [...EXPECTED_ACTIVE_MIGRATION_IDS].sort(),
  );
  assertEquals(
    [...new Set(catalog.map((migration) => migration.owner))].sort(),
    [...EXPECTED_ACTIVE_MIGRATION_OWNERS].sort(),
  );
  assertEquals(
    new Set(catalog.map((migration) => migration.id)).size,
    catalog.length,
  );
  assertEquals(
    new Set(
      catalog.map((migration) => `${migration.owner}:${migration.version}`),
    )
      .size,
    catalog.length,
  );
  for (const migration of catalog) {
    assertEquals(typeof PUBLISHED_MIGRATION_CHECKSUMS[migration.id], "string");
  }
  assertEquals(
    Object.keys(PUBLISHED_MIGRATION_CHECKSUMS).sort(),
    [...EXPECTED_ACTIVE_MIGRATION_IDS].sort(),
  );
});

Deno.test("migration integrity rejects checksum mutation", async () => {
  const migration = defineMigration({
    owner: "fixture",
    schema: "fixture",
    id: "fixture-0001",
    version: 1,
    forwardNotes: "Add a fixture table.",
    rollbackNotes: "Retain the table history and disable its consumer.",
    statements: [{
      schema: "fixture",
      sql: "CREATE TABLE fixture.items (id TEXT)",
    }],
  });
  const checksum = await migrationChecksum(migration);
  const changed = defineMigration({
    ...migration,
    statements: [{
      schema: "fixture",
      sql: "CREATE TABLE fixture.items (id BIGINT)",
    }],
  });

  const diagnostics = await migrationIntegrityDiagnostics(
    [changed],
    { [migration.id]: checksum },
  );
  assertEquals(diagnostics.length, 1);
  assertStringIncludes(diagnostics[0], "checksum changed");
});

Deno.test("migration integrity requires a pin for every applied definition", async () => {
  const migration = defineMigration({
    owner: "fixture",
    schema: "fixture",
    id: "fixture-0001",
    version: 1,
    forwardNotes: "Add a fixture table.",
    rollbackNotes: "Retain the table history and disable its consumer.",
    statements: [],
  });

  const diagnostics = await migrationIntegrityDiagnostics([migration], {});
  assertEquals(diagnostics, [
    "Migration 'fixture-0001' has no pinned historical checksum.",
  ]);
});
