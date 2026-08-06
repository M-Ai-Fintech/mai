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
  assertStringIncludes(sql, "membership_is_inconsistent");
  assertStringIncludes(sql, "jsonb_array_elements_text");
  assertStringIncludes(sql, "DEFERRABLE INITIALLY DEFERRED");
  assertStringIncludes(sql, "Workstream taskIds authority");
  assert(!/\b(DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE)\b/i.test(sql));
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
