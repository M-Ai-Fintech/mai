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
