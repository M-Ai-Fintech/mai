import { assert, assertEquals } from "@std/assert";
import { migrationChecksum } from "../../src/platform/persistence/v1.ts";
import { diligenceDecisionsMigrations } from "../../src/diligence_decisions/v1.ts";

Deno.test("Diligence and Decisions migration owns only its schema and is checksumable", async () => {
  assertEquals(
    diligenceDecisionsMigrations.map((migration) => migration.id),
    ["diligence_decisions-0001", "diligence_decisions-0002"],
  );
  for (const migration of diligenceDecisionsMigrations) {
    assertEquals(migration.owner, "diligence_decisions");
    assertEquals(migration.schema, "diligence_decisions");
    assert(
      migration.statements.every((statement) =>
        statement.schema === migration.schema
      ),
    );
    const checksum = await migrationChecksum(migration);
    assertEquals(checksum.length, 64);
    assertEquals(checksum, await migrationChecksum(migration));
  }
});
