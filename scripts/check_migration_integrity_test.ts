import { assertEquals, assertStringIncludes } from "@std/assert";
import { defineMigration } from "../src/platform/persistence/migration.ts";
import { migrationChecksum } from "../src/platform/persistence/migration_runner.ts";
import {
  currentMigrationCatalog,
  migrationIntegrityDiagnostics,
  PUBLISHED_MIGRATION_CHECKSUMS,
} from "./check_migration_integrity.ts";

Deno.test("migration catalog covers clean and historical integrity paths", async () => {
  assertEquals(
    await migrationIntegrityDiagnostics(
      currentMigrationCatalog(),
      PUBLISHED_MIGRATION_CHECKSUMS,
    ),
    [],
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
