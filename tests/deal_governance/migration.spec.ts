import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { dealGovernanceMigration } from "../../src/deal_governance/migrations/deal_governance_0001.ts";
import {
  dealGovernanceConsequencePreviewsMigration,
} from "../../src/deal_governance/migrations/deal_governance_0002.ts";

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

Deno.test("Deal Governance consequence previews use an additive immutable migration", () => {
  assertEquals(
    dealGovernanceConsequencePreviewsMigration.id,
    "deal_governance-0002",
  );
  assertEquals(dealGovernanceConsequencePreviewsMigration.version, 2);
  const sql = dealGovernanceConsequencePreviewsMigration.statements.map(
    (statement) => statement.sql,
  ).join("\n");
  assertStringIncludes(sql, "deal_governance.consequence_previews");
  assertStringIncludes(sql, "consequence previews are immutable");
  assert(!/DROP TABLE|TRUNCATE TABLE/.test(sql));
});
