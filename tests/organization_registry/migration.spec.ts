import { assert, assertEquals } from "@std/assert";
import {
  organizationRegistryMigration,
  organizationRegistryMigrations,
} from "../../src/organization_registry/v1.ts";
import { platformMigrations } from "../../src/platform/persistence/v1.ts";

Deno.test("organization registry migration is additive, owned, and rollback-safe", () => {
  assertEquals(organizationRegistryMigration.owner, "organization_registry");
  assertEquals(organizationRegistryMigration.schema, "organization_registry");
  assertEquals(organizationRegistryMigration.version, 1);
  assertEquals(organizationRegistryMigrations, [organizationRegistryMigration]);
  assert(
    organizationRegistryMigration.rollbackNotes.includes(
      "retaining every new record",
    ),
  );
  const sql = organizationRegistryMigration.statements.map(({ sql: text }) =>
    text
  )
    .join("\n");
  assert(sql.includes("organization_registry.merge_history"));
  assert(sql.includes("organization_registry.people"));
  assert(!/\bDROP\s+(TABLE|SCHEMA)\b/i.test(sql));
  assert(
    organizationRegistryMigration.statements.every((statement) =>
      statement.schema === organizationRegistryMigration.schema
    ),
  );
});

Deno.test("organization registry migration remains unregistered until the MAI-107 rebase gate", () => {
  assertEquals(
    platformMigrations.some(({ owner }) => owner === "organization_registry"),
    false,
  );
});
