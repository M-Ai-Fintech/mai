import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  workManagementAuthorityAndPreparedMigration,
  workManagementCorrectiveMigration,
  workManagementMembershipAuthorityMigration,
  workManagementMembershipAuthorityUpgradeMigration,
  workManagementMigration,
  workManagementMigrations,
} from "../../src/work_management/migrations/index.ts";

Deno.test("Work Management migration is additive, owned, and append-only", () => {
  assertEquals(workManagementMigrations, [
    workManagementMigration,
    workManagementCorrectiveMigration,
    workManagementMembershipAuthorityMigration,
    workManagementMembershipAuthorityUpgradeMigration,
    workManagementAuthorityAndPreparedMigration,
  ]);
  assertEquals(workManagementMigration.owner, "work_management");
  assertEquals(workManagementMigration.schema, "work_management");
  assertEquals(workManagementMigration.version, 1);
  const sql = workManagementMigration.statements.map((statement) =>
    statement.sql
  ).join("\n");
  assertStringIncludes(sql, "CREATE SCHEMA IF NOT EXISTS work_management");
  assertStringIncludes(sql, "approval_decision_history");
  assertStringIncludes(sql, "aggregate_history_no_update_or_delete");
  assertStringIncludes(sql, "approval_decision_history_no_update_or_delete");
  assert(!/\b(DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE)\b/i.test(sql));
  assert(
    !/\b(?:platform|deal_management|evidence_knowledge|identity_access|notifications)\s*\./i
      .test(sql),
  );
  assertEquals(workManagementAuthorityAndPreparedMigration.version, 5);
  const authoritySql = workManagementAuthorityAndPreparedMigration.statements
    .map((statement) => statement.sql).join("\n");
  assertStringIncludes(authoritySql, "authority_evaluations");
  assertStringIncludes(authoritySql, "command_preparations");
  assertStringIncludes(
    authoritySql,
    "authority_evaluations_no_update_or_delete",
  );
  assertEquals(workManagementMembershipAuthorityUpgradeMigration.version, 4);
  const upgradeSql = workManagementMembershipAuthorityUpgradeMigration
    .statements.map((statement) => statement.sql).join("\n");
  assertStringIncludes(upgradeSql, "work_management-0004-read-only");
  assertEquals(workManagementCorrectiveMigration.owner, "work_management");
  assertEquals(workManagementCorrectiveMigration.version, 2);
  const correctiveSql = workManagementCorrectiveMigration.statements.map(
    (statement) => statement.sql,
  ).join("\n");
  assertStringIncludes(correctiveSql, "command_results");
  assertStringIncludes(correctiveSql, "target_command_dispatches");
  assertStringIncludes(correctiveSql, "corrective records are append-only");
  assert(
    !/\b(DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE)\b/i.test(correctiveSql),
  );
  assertEquals(
    workManagementMembershipAuthorityMigration.owner,
    "work_management",
  );
  assertEquals(workManagementMembershipAuthorityMigration.version, 3);
  const membershipSql = workManagementMembershipAuthorityMigration.statements
    .map((statement) => statement.sql).join("\n");
  assertStringIncludes(membershipSql, "membership_is_inconsistent");
  assertStringIncludes(membershipSql.toLowerCase(), "deferrable");
  assertStringIncludes(membershipSql, "membership");
  assertStringIncludes(membershipSql, "membership_is_inconsistent");
});
