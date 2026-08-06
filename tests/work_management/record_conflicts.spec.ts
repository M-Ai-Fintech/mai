import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  createApprovalPackage,
  createApprovalRequest,
  decideApprovalRequest,
  openApprovalRequest,
} from "../../src/work_management/approval_requests.ts";
import { createWorkManagementEvent } from "../../src/work_management/events.ts";
import {
  actor,
  aggregateVersion,
  approvalDecisionId,
  approvalPackageId,
  approvalRequestId,
  deal,
  taskId,
  tenant,
  workEventId,
  type WorkScope,
  workspace,
  workstreamId,
} from "../../src/work_management/ids.ts";
import {
  InMemoryWorkManagementRepository,
  WorkManagementRecordConflictError,
} from "../../src/work_management/repository.ts";
import { createTask } from "../../src/work_management/tasks.ts";

const scope: WorkScope = {
  tenantId: tenant("tenant_conflict"),
  workspaceId: workspace("workspace_conflict"),
  dealId: deal("deal_conflict"),
};
const actorRef = {
  id: actor("actor_conflict"),
  kind: "human" as const,
  state: "active" as const,
};

Deno.test("immutable history accepts exact replay and rejects event-ID aliasing", async () => {
  const repository = new InMemoryWorkManagementRepository();
  const event = historyEvent("task_one", scope);
  await repository.appendHistory(event);
  await repository.appendHistory(event);
  assertThrows(
    () => repository.appendHistory({ ...event, aggregateId: "task_two" }),
    WorkManagementRecordConflictError,
  );
  assertThrows(
    () => repository.appendHistory({ ...event, dealId: deal("deal_other") }),
    WorkManagementRecordConflictError,
  );
});

Deno.test("immutable decision ID binds outcome and exact approver", async () => {
  const repository = new InMemoryWorkManagementRepository();
  const approved = await decidedRequest("approved");
  await repository.appendApprovalDecision(approved, approved.decision!);
  await repository.appendApprovalDecision(approved, approved.decision!);
  const rejected = await decidedRequest("rejected");
  assertThrows(
    () => repository.appendApprovalDecision(rejected, rejected.decision!),
    WorkManagementRecordConflictError,
  );
  assertThrows(
    () =>
      repository.appendApprovalDecision(approved, {
        ...approved.decision!,
        approverId: actor("actor_other-approver"),
      }),
    WorkManagementRecordConflictError,
  );
});

Deno.test("immutable record conflict rolls back companion aggregate writes", async () => {
  const repository = new InMemoryWorkManagementRepository();
  const event = historyEvent("task_existing", scope);
  await repository.appendHistory(event);
  const task = createTask({
    ...scope,
    id: taskId("task_rollback-conflict"),
    workstreamId: workstreamId("workstream_conflict"),
    title: "Rollback",
    assigneeId: actorRef.id,
    now: "2026-08-06T12:00:00.000Z",
  });
  await assertRejects(
    () =>
      repository.run(async (transaction) => {
        await transaction.saveTask(task, 0);
        await transaction.appendHistory({
          ...event,
          aggregateId: "task_changed",
        });
      }),
    WorkManagementRecordConflictError,
  );
  assertEquals(await repository.findTask(scope, task.id), undefined);
});

function historyEvent(aggregateId: string, eventScope: WorkScope) {
  return createWorkManagementEvent({
    eventId: workEventId("work_event_semantic-conflict"),
    aggregateType: "task",
    aggregateId,
    aggregateVersion: aggregateVersion(1),
    ...eventScope,
    eventType: "task.created",
    actor: actorRef,
    correlationId:
      "cor_conflict" as import("../../src/platform/api/v1.ts").CorrelationId,
    payload: { taskId: aggregateId, state: "open", version: 1 },
    occurredAt: new Date("2026-08-06T12:00:00.000Z"),
  });
}

async function decidedRequest(outcome: "approved" | "rejected") {
  const approver = {
    id: actor("actor_conflict-approver"),
    kind: "human" as const,
    state: "active" as const,
  };
  const requester = {
    id: actor("actor_conflict-requester"),
    kind: "human" as const,
    state: "active" as const,
  };
  const packageValue = await createApprovalPackage({
    id: approvalPackageId("package_conflict"),
    version: 1,
    target: {
      aggregateType: "evidence",
      aggregateId: "evidence_conflict",
      expectedVersion: aggregateVersion(1),
      scope,
    },
    evidence: [],
    authority: {
      action: "approve_evidence",
      namedApproverId: approver.id,
      policyVersion: "policy-v1",
      snapshotReference: "authority-conflict-v1",
      humanOnly: true,
    },
    authoritySnapshot: {
      snapshotId: "authority-conflict-v1",
      actorId: approver.id,
      actorKind: "human",
      policyVersion: "policy-v1",
      capturedAt: "2026-08-06T12:00:00.000Z",
      scope,
    },
    payload: {},
  });
  const open = openApprovalRequest(
    createApprovalRequest({
      ...scope,
      id: approvalRequestId("approval_conflict"),
      requesterId: requester.id,
      namedApproverId: approver.id,
      package: packageValue,
      now: "2026-08-06T12:00:00.000Z",
    }),
    { actor: requester, now: "2026-08-06T12:01:00.000Z" },
  );
  return decideApprovalRequest(open, {
    actor: approver,
    expectedPackage: packageValue,
    outcome,
    decisionId: approvalDecisionId("decision_semantic-conflict"),
    now: "2026-08-06T12:02:00.000Z",
  });
}
