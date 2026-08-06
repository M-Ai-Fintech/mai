import {
  assert,
  assertEquals,
  assertNotEquals,
  assertThrows,
} from "@std/assert";
import {
  actor,
  aggregateVersion,
  approvalPackageId,
  approvalRequestId,
  deal,
  targetCommandType,
  taskId,
  tenant,
  workspace,
  workstreamId,
} from "../../src/work_management/ids.ts";
import {
  approvalPackageDigest,
  createApprovalPackage,
  createApprovalRequest,
} from "../../src/work_management/approval_requests.ts";
import {
  type ApprovalPackage,
  assertExactPackage,
  samePackage,
} from "../../src/work_management/model.ts";

const scope = {
  tenantId: tenant("tenant_northstar"),
  workspaceId: workspace("workspace_alpha"),
  dealId: deal("deal_work"),
};
const approver = {
  id: actor("actor_approver"),
  kind: "human" as const,
  state: "active" as const,
};

async function packageValue(): Promise<ApprovalPackage> {
  const target = {
    aggregateType: "evidence",
    aggregateId: "evidence_1",
    expectedVersion: aggregateVersion(4),
    scope,
  } as const;
  return await createApprovalPackage({
    id: approvalPackageId("package_diligence"),
    version: 1,
    target,
    evidence: [{
      sourceType: "document_version",
      sourceId: "document_1",
      sourceVersion: "2",
    }],
    authority: {
      commandType: targetCommandType("approve_evidence"),
      target,
      namedApproverId: approver.id,
      policyVersion: "policy-1",
      snapshotReference: "authority_snapshot_1",
      scope,
      effectiveAt: "2026-08-06T11:00:00.000Z",
      expiresAt: "2026-08-06T13:00:00.000Z",
      applicableLimits: [{ name: "max_amount", value: 1_000_000 }],
      humanOnly: true,
    },
    authoritySnapshot: {
      snapshotId: "authority_snapshot_1",
      actorId: approver.id,
      actorKind: "human",
      policyVersion: "policy-1",
      capturedAt: "2026-08-06T12:00:00.000Z",
      scope,
    },
    payload: { summary: "safe summary" },
  });
}

Deno.test("approval package digest binds immutable target, evidence, authority and payload", async () => {
  const value = await packageValue();
  assertEquals(value.contentDigest, await approvalPackageDigest(value));
  assert(Object.isFrozen(value));
  assert(Object.isFrozen(value.target));
  assert(Object.isFrozen(value.authority.target));
  assert(Object.isFrozen(value.authority.applicableLimits));
  assert(Object.isFrozen(value.payload));
  const changed = { ...value, payload: { summary: "changed" } };
  assertEquals(samePackage(value, changed), false);
  assertThrows(
    () => assertExactPackage(value, changed),
    Error,
    "does not match",
  );
  assertNotEquals(
    await approvalPackageDigest({
      ...value,
      authority: {
        ...value.authority,
        commandType: targetCommandType("release_evidence"),
      },
    }),
    value.contentDigest,
  );
  assertNotEquals(
    await approvalPackageDigest({
      ...value,
      authority: {
        ...value.authority,
        applicableLimits: [{ name: "max_amount", value: 999_999 }],
      },
    }),
    value.contentDigest,
  );
});

Deno.test("approval request rejects requester and approver identity collision", async () => {
  const value = await packageValue();
  assertThrows(
    () =>
      createApprovalRequest({
        ...scope,
        id: approvalRequestId("approval_collision"),
        requesterId: approver.id,
        namedApproverId: approver.id,
        package: value,
        now: "2026-08-06T12:00:00.000Z",
      }),
    Error,
    "cannot also be",
  );
});

Deno.test("work identifiers reject malformed values", () => {
  assertEquals(workstreamId("workstream_alpha"), "workstream_alpha");
  assertEquals(taskId("task_alpha"), "task_alpha");
  assertThrows(() => workstreamId("workstream_"), Error);
  assertThrows(() => taskId("task bad"), Error);
});
