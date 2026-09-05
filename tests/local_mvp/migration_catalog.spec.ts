import { assertEquals } from "@std/assert";
import { registeredMigrations } from "../../src/platform/persistence/registered_migrations.ts";

Deno.test("local migration catalog activates risk and workflow persistence", () => {
  const identities = registeredMigrations().map((migration) => migration.id);
  assertEquals(identities.includes("financial_risk-0001"), true);
  assertEquals(
    identities.includes("demo_readiness-0001-workflow-snapshots"),
    true,
  );
});
