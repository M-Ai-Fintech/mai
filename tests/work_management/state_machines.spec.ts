import { assertEquals, assertThrows } from "@std/assert";
import {
  actor,
  aggregateVersion,
  approvalDecisionId,
  approvalPackageId,
  approvalRequestId,
  deal,
  taskId,
  tenant,
  workspace,
  workstreamId,
} from "../../src/work_management/ids.ts";
import {
  approveApprovalRequest,
  createApprovalPackage,
  createApprovalRequest,
  decideApprovalRequest,
  openApprovalRequest,
  rejectApprovalRequest,
  withdrawApprovalRequest,
} from "../../src/work_management/approval_requests.ts";
import {
  attachTask,
  createWorkstream,
  transitionWorkstream,
} from "../../src/work_management/workstreams.ts";
import { createTask, transitionTask } from "../../src/work_management/tasks.ts";

const scope = {
  tenantId: tenant("tenant_northstar"),
  workspaceId: workspace("workspace_alpha"),
  dealId: deal("deal_work"),
};
const human = (id: string) => ({
  id: actor(id),
  kind: "human" as const,
  state: "active" as const,
});
const ai = {
  id: actor("actor_ai"),
  kind: "ai" as const,
  state: "active" as const,
};

Deno.test("workstream and task state machines enforce explicit transitions and completion gates", () => {
  const workstream = createWorkstream({
    ...scope,
    id: workstreamId("workstream_diligence"),
    name: "Diligence",
    ownerId: actor("actor_owner"),
    now: "2026-08-06T12:00:00.000Z",
  });
  const task = createTask({
    ...scope,
    id: taskId("task_collect"),
    workstreamId: workstream.id,
    title: "Collect evidence",
    assigneeId: actor("actor_assignee"),
    now: "2026-08-06T12:00:00.000Z",
  });
  const attached = attachTask(workstream, task);
  assertEquals(attached.taskIds, [task.id]);
  const active = transitionWorkstream(attached, {
    toState: "active",
    actor: human("actor_owner"),
    now: "2026-08-06T12:01:00.000Z",
  });
  assertThrows(
    () =>
      transitionWorkstream(active, {
        toState: "completed",
        actor: human("actor_owner"),
        now: "2026-08-06T12:01:00.000Z",
        tasks: [task],
      }),
    Error,
    "cannot complete",
  );
  const inProgress = transitionTask(task, {
    toState: "in_progress",
    actor: human("actor_assignee"),
    now: "2026-08-06T12:02:00.000Z",
  });
  const complete = transitionTask(inProgress, {
    toState: "completed",
    actor: human("actor_assignee"),
    now: "2026-08-06T12:03:00.000Z",
  });
  const finished = transitionWorkstream({ ...active, taskIds: [complete.id] }, {
    toState: "completed",
    actor: human("actor_owner"),
    now: "2026-08-06T12:04:00.000Z",
    tasks: [complete],
  });
  assertEquals(finished.state, "completed");
  assertThrows(
    () =>
      transitionTask(complete, {
        toState: "open",
        actor: human("actor_assignee"),
        now: "2026-08-06T12:05:00.000Z",
      }),
    Error,
    "invalid",
  );
});

Deno.test("AI and service actors cannot perform human-only work transitions", () => {
  const workstream = createWorkstream({
    ...scope,
    id: workstreamId("workstream_ai"),
    name: "AI",
    ownerId: actor("actor_owner"),
    now: "2026-08-06T12:00:00.000Z",
  });
  assertThrows(
    () =>
      transitionWorkstream(workstream, {
        toState: "active",
        actor: ai,
        now: "2026-08-06T12:01:00.000Z",
      }),
    Error,
    "human",
  );
});

Deno.test("approval request enforces named approver, SoD, exact package, approve/reject and withdrawal", async () => {
  const approver = human("actor_approver");
  const requester = human("actor_requester");
  const packageValue = await createApprovalPackage({
    id: approvalPackageId("package_approval"),
    version: 3,
    target: {
      aggregateType: "evidence",
      aggregateId: "evidence_1",
      expectedVersion: aggregateVersion(2),
      scope,
    },
    evidence: [{
      sourceType: "document",
      sourceId: "document_1",
      sourceVersion: "7",
    }],
    authority: {
      action: "approve_evidence",
      namedApproverId: approver.id,
      policyVersion: "policy-1",
      snapshotReference: "authority_snapshot_1",
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
    payload: { summary: "review" },
  });
  const draft = createApprovalRequest({
    ...scope,
    id: approvalRequestId("approval_one"),
    requesterId: requester.id,
    namedApproverId: approver.id,
    package: packageValue,
    now: "2026-08-06T12:00:00.000Z",
  });
  const open = openApprovalRequest(draft, {
    actor: requester,
    now: "2026-08-06T12:01:00.000Z",
  });
  assertThrows(
    () =>
      approveApprovalRequest(open, {
        actor: requester,
        expectedPackage: packageValue,
        decisionId: approvalDecisionId("decision_bad"),
        now: "2026-08-06T12:02:00.000Z",
      }),
    Error,
    "named approver",
  );
  const approved = approveApprovalRequest(open, {
    actor: approver,
    expectedPackage: packageValue,
    decisionId: approvalDecisionId("decision_good"),
    now: "2026-08-06T12:02:00.000Z",
  });
  assertEquals(approved.decision?.outcome, "approved");
  assertThrows(
    () =>
      rejectApprovalRequest(approved, {
        actor: approver,
        expectedPackage: packageValue,
        decisionId: approvalDecisionId("decision_second"),
        now: "2026-08-06T12:03:00.000Z",
      }),
    Error,
    "immutable",
  );
  const withdrawn = withdrawApprovalRequest(open, {
    actor: requester,
    now: "2026-08-06T12:03:00.000Z",
  });
  assertEquals(withdrawn.state, "withdrawn");
  assertThrows(
    () =>
      decideApprovalRequest(open, {
        actor: approver,
        expectedPackage: { ...packageValue, version: 4 },
        outcome: "rejected",
        decisionId: approvalDecisionId("decision_stale"),
        now: "2026-08-06T12:04:00.000Z",
      }),
    Error,
    "does not match",
  );
});
