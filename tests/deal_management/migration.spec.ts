import { assert, assertEquals } from "@std/assert";
import {
  dealManagementMigration,
  dealManagementMigrations,
} from "../../src/deal_management/v1.ts";
import { platformMigrations } from "../../src/platform/persistence/v1.ts";

Deno.test("Deal Management migration is additive, scoped, and rollback-safe", () => {
  assertEquals(dealManagementMigration.owner, "deal_management");
  assertEquals(dealManagementMigration.schema, "deal_management");
  assertEquals(dealManagementMigration.version, 1);
  assertEquals(dealManagementMigrations, [dealManagementMigration]);
  assert(
    dealManagementMigration.rollbackNotes.includes(
      "retaining every new record",
    ),
  );
  const sql = dealManagementMigration.statements.map(({ sql: text }) => text)
    .join("\n");
  assert(sql.includes("deal_management.deals"));
  assert(sql.includes("deal_management.aggregate_history"));
  assert(sql.includes("deal_management.command_receipts"));
  assert(sql.includes("deal_management.command_claims"));
  assert(sql.includes("UNIQUE INDEX deal_management_receipts_global_key_idx"));
  assert(sql.includes("deal_management.reconciliation_manifest"));
  assert(!/\bDROP\s+(TABLE|SCHEMA)\b/i.test(sql));
  assert(
    dealManagementMigration.statements.every((statement) =>
      statement.schema === "deal_management"
    ),
  );
});

Deno.test("Deal Management migration is not added to platform ownership", () => {
  assertEquals(
    platformMigrations.some(({ owner }) => owner === "deal_management"),
    false,
  );
});
