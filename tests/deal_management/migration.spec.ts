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
  assertEquals(dealManagementMigrations.map(({ version }) => version), [
    1,
    2,
    3,
  ]);
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
  const routingMigration = dealManagementMigrations[1];
  assertEquals(
    routingMigration?.id,
    "deal_management-0002-reconciliation-routing",
  );
  assert(
    routingMigration?.statements[0]?.sql.includes("reconciliation_records"),
  );
  assert(
    routingMigration?.statements[0]?.sql.includes(
      "reconciliation_routing_history",
    ),
  );
  assert(
    routingMigration?.statements[0]?.sql.includes(
      "mandate_transaction_value_ceiling IS NULL",
    ),
  );
  assert(
    routingMigration?.statements[0]?.sql.includes(
      "mandate_currency IS NULL",
    ),
  );
  assert(
    routingMigration?.statements[0]?.sql.includes(
      "mandate_authority_ceiling IS NULL",
    ),
  );
  assert(
    !/\bDROP\s+(TABLE|SCHEMA)\b/i.test(
      routingMigration?.statements[0]?.sql ?? "",
    ),
  );
  const lifecycleMigration = dealManagementMigrations[2];
  assertEquals(
    lifecycleMigration?.id,
    "deal_management-0003-lifecycle-milestones",
  );
  assert(
    lifecycleMigration?.statements[0]?.sql.includes("lifecycle_current"),
  );
  assert(
    lifecycleMigration?.statements[0]?.sql.includes(
      "lifecycle_transition_history",
    ),
  );
  assert(
    !/\bDROP\s+(TABLE|SCHEMA)\b/i.test(
      lifecycleMigration?.statements[0]?.sql ?? "",
    ),
  );
});

Deno.test("reconciliation mandate values are all present or all absent", () => {
  const sql = (dealManagementMigrations[1]?.statements[0]?.sql ?? "")
    .replace(/\s+/g, " ");
  assert(sql.includes("mandate_transaction_value_ceiling > 0"));
  assert(sql.includes("mandate_authority_ceiling > 0"));
  assert(
    sql.includes(
      "mandate_transaction_value_ceiling IS NULL AND mandate_currency IS NULL AND mandate_authority_ceiling IS NULL",
    ),
  );
  assert(
    sql.includes(
      "mandate_transaction_value_ceiling IS NOT NULL AND mandate_currency IS NOT NULL AND mandate_authority_ceiling IS NOT NULL",
    ),
  );
});

Deno.test("Deal Management migration is not added to platform ownership", () => {
  assertEquals(
    platformMigrations.some(({ owner }) => owner === "deal_management"),
    false,
  );
});
