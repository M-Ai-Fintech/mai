import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { workManagementMembershipAuthorityMigration } from "../../src/work_management/migrations/work_management_0003_membership_authority.ts";
import { parseStoredTask } from "../../src/work_management/repository_validation.ts";

Deno.test("membership migration enforces one fail-closed authority model", () => {
  assertEquals(
    workManagementMembershipAuthorityMigration.owner,
    "work_management",
  );
  assertEquals(workManagementMembershipAuthorityMigration.version, 3);
  const sql = workManagementMembershipAuthorityMigration.statements.map(
    (statement) => statement.sql,
  ).join("\n");
  assertStringIncludes(sql, "membership_reconciliation_findings");
  assertStringIncludes(sql, "scan_membership_authority");
  assertStringIncludes(sql, "membership_commands_available");
  assertStringIncludes(sql, "set_membership_rollout_mode");
  assertStringIncludes(sql, "pg_advisory_xact_lock");
  assertStringIncludes(sql, "DEFERRABLE INITIALLY DEFERRED");
  assertStringIncludes(sql, "append-only");
  assertStringIncludes(sql, "work_management-0003-read-only");
  assert(!sql.includes("membership_is_inconsistent"));
  assert(!/\b(DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE)\b/i.test(sql));
});

Deno.test("membership finding ledger covers every divergence class", () => {
  const sql = workManagementMembershipAuthorityMigration.statements.map(
    (statement) => statement.sql,
  ).join("\n");
  for (
    const findingClass of [
      "malformed_workstream_task_ids",
      "duplicate_authoritative_task_id",
      "task_document_back_reference_mismatch",
      "task_owner_workstream_missing",
      "task_owner_scope_mismatch",
      "task_missing_from_authoritative_membership",
      "authoritative_task_missing",
      "authoritative_task_wrong_workstream",
      "authoritative_task_scope_mismatch",
    ]
  ) assertStringIncludes(sql, findingClass);
});

Deno.test("persisted Task rejects a conflicting document back-reference", () => {
  assertThrows(
    () =>
      parseStoredTask({
        taskId: "task_membership-row",
        tenantId: "tenant_membership",
        workspaceId: "workspace_membership",
        dealId: "deal_membership",
        workstreamId: "workstream_membership-row",
        version: 1,
        document: {
          workstreamId: "workstream_membership-document",
          title: "Membership",
          assigneeId: "actor_membership",
          state: "open",
        },
        createdAt: "2026-08-06T12:00:00.000Z",
        updatedAt: "2026-08-06T12:00:00.000Z",
      }),
    Error,
    "one validated back-reference",
  );
});
