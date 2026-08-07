import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { dealGovernanceMigration } from "../../src/deal_governance/migrations/deal_governance_0001.ts";

Deno.test("Deal Governance migration owns additive scoped persistence and retained proof", () => {
  assertEquals(dealGovernanceMigration.owner, "deal_governance");
  assertEquals(dealGovernanceMigration.schema, "deal_governance");
  assertEquals(dealGovernanceMigration.id, "deal_governance-0001");
  assertStringIncludes(
    dealGovernanceMigration.rollbackNotes,
    "never physically erases",
  );
  const sql = dealGovernanceMigration.statements.map((statement) =>
    statement.sql
  ).join("\n");
  for (
    const table of [
      "governance_aggregates",
      "retention_assignments",
      "legal_holds",
      "deletion_requests",
      "orchestrations",
      "erasure_manifests",
      "command_claims",
      "history",
    ]
  ) {
    assertStringIncludes(sql, `deal_governance.${table}`);
  }
  assertStringIncludes(sql, "append-only");
  assert(!/DROP TABLE|TRUNCATE TABLE/.test(sql));
  assert(!sql.includes("deal_management."));
  assert(!sql.includes("documents."));
  assert(!sql.includes("audit_activity."));
});
