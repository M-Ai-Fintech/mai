import { assert, assertEquals } from "@std/assert";
import {
  dealManagementMigrations,
  lifecycleMilestonesMigration,
} from "../../src/deal_management/v1.ts";

Deno.test("lifecycle migration is an additive current-schema upgrade", () => {
  assertEquals(lifecycleMilestonesMigration.owner, "deal_management");
  assertEquals(lifecycleMilestonesMigration.schema, "deal_management");
  assertEquals(lifecycleMilestonesMigration.version, 3);
  assertEquals(
    dealManagementMigrations.map(({ version }) => version),
    [1, 2, 3],
  );
  assert(
    lifecycleMilestonesMigration.forwardNotes.includes("append-only"),
  );
  const sql = lifecycleMilestonesMigration.statements.map(({ sql: text }) =>
    text
  )
    .join("\n");
  assert(sql.includes("CREATE TABLE deal_management.lifecycle_current"));
  assert(
    sql.includes("CREATE TABLE deal_management.lifecycle_transition_history"),
  );
  assert(sql.includes("PRIMARY KEY (tenant_id, workspace_id, deal_id)"));
  assert(
    sql.includes(
      "UNIQUE (tenant_id, workspace_id, deal_id, aggregate_version)",
    ),
  );
  assert(sql.includes("jsonb_typeof(document) = 'object'"));
  assert(!/\b(DROP|TRUNCATE|DELETE|ALTER)\b/i.test(sql));
  assert(
    lifecycleMilestonesMigration.statements.every((statement) =>
      statement.schema === "deal_management"
    ),
  );
});

Deno.test("lifecycle migration rollback retains evidence and routes reads to legacy", () => {
  const notes = lifecycleMilestonesMigration.rollbackNotes;
  assert(notes.includes("Disable lifecycle commands"));
  assert(notes.includes("legacy phase adapter"));
  assert(notes.includes("retain lifecycle rows"));
  assert(notes.includes("receipts"));
  assert(notes.includes("audit"));
  assert(notes.includes("outbox"));
});
