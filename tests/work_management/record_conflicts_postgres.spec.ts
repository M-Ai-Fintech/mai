import { assertEquals, assertRejects } from "@std/assert";
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
  targetCommandType,
  taskId,
  tenant,
  workEventId,
  type WorkScope,
  workspace,
  workstreamId,
} from "../../src/work_management/ids.ts";
import {
  workManagementMigrationOptions,
  workManagementMigrations,
} from "../../src/work_management/migrations/index.ts";
import { WorkManagementRecordConflictError } from "../../src/work_management/repository.ts";
import { PostgresWorkManagementRepository } from "../../src/work_management/repository_sql.ts";
import { createTask } from "../../src/work_management/tasks.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  createPostgresIntegrationTestPool,
  ensureWorkManagementTestRoles,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();
const scope: WorkScope = {
  tenantId: tenant("tenant_record-pg"),
  workspaceId: workspace("workspace_record-pg"),
  dealId: deal("deal_record-pg"),
};
const human = {
  id: actor("actor_record-pg"),
  kind: "human" as const,
  state: "active" as const,
};

Deno.test({
  name:
    "PostgreSQL immutable record IDs accept exact replay and reject semantic aliasing",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await ensureWorkManagementTestRoles(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...workManagementMigrations,
    ], workManagementMigrationOptions());
    const runner = new PostgresTransactionRunner(pool);
    const suffix = Date.now().toString();
    const event = historyEvent(suffix, `task_original-${suffix}`, scope);
    await runner.run(async (handle) => {
      await new PostgresWorkManagementRepository(handle).appendHistory(event);
    });
    await runner.run(async (handle) => {
      await new PostgresWorkManagementRepository(handle).appendHistory(event);
    });
    await assertRejects(
      () =>
        runner.run(async (handle) => {
          await new PostgresWorkManagementRepository(handle).appendHistory({
            ...event,
            aggregateId: `task_different-${suffix}`,
          });
        }),
      WorkManagementRecordConflictError,
    );
    await assertRejects(
      () =>
        runner.run(async (handle) => {
          await new PostgresWorkManagementRepository(handle).appendHistory({
            ...event,
            dealId: deal("deal_record-other"),
          });
        }),
      WorkManagementRecordConflictError,
    );

    const approved = await decidedRequest(suffix, "approved");
    await runner.run(async (handle) => {
      await new PostgresWorkManagementRepository(handle)
        .appendApprovalDecision(approved, approved.decision!);
    });
    await runner.run(async (handle) => {
      await new PostgresWorkManagementRepository(handle)
        .appendApprovalDecision(approved, approved.decision!);
    });
    const rejected = await decidedRequest(suffix, "rejected");
    await assertRejects(
      () =>
        runner.run(async (handle) => {
          await new PostgresWorkManagementRepository(handle)
            .appendApprovalDecision(rejected, rejected.decision!);
        }),
      WorkManagementRecordConflictError,
    );
    await assertRejects(
      () =>
        runner.run(async (handle) => {
          await new PostgresWorkManagementRepository(handle)
            .appendApprovalDecision(approved, {
              ...approved.decision!,
              approverId: actor("actor_record-other"),
            });
        }),
      WorkManagementRecordConflictError,
    );

    const rollbackTask = createTask({
      ...scope,
      id: taskId(`task_rollback-${suffix}`),
      workstreamId: workstreamId(`workstream_rollback-${suffix}`),
      title: "Rollback",
      assigneeId: human.id,
      now: "2026-08-06T12:00:00.000Z",
    });
    await assertRejects(
      () =>
        runner.run(async (handle) => {
          const repository = new PostgresWorkManagementRepository(handle);
          await repository.saveTask(rollbackTask, 0);
          await repository.appendHistory({
            ...event,
            aggregateId: rollbackTask.id,
          });
        }),
      WorkManagementRecordConflictError,
    );
    await runner.run(async (handle) => {
      assertEquals(
        await new PostgresWorkManagementRepository(handle)
          .findTask(scope, rollbackTask.id),
        undefined,
      );
    });
    await pool.end();
  },
});

function historyEvent(
  suffix: string,
  aggregateId: string,
  eventScope: WorkScope,
) {
  return createWorkManagementEvent({
    eventId: workEventId(`work_event_conflict-${suffix}`),
    aggregateType: "task",
    aggregateId,
    aggregateVersion: aggregateVersion(1),
    ...eventScope,
    eventType: "task.created",
    actor: human,
    correlationId:
      "cor_record_pg" as import("../../src/platform/api/v1.ts").CorrelationId,
    payload: { taskId: aggregateId, state: "open", version: 1 },
    occurredAt: new Date("2026-08-06T12:00:00.000Z"),
  });
}

async function decidedRequest(
  suffix: string,
  outcome: "approved" | "rejected",
) {
  const requester = {
    id: actor("actor_record-requester"),
    kind: "human" as const,
    state: "active" as const,
  };
  const approver = {
    id: actor("actor_record-approver"),
    kind: "human" as const,
    state: "active" as const,
  };
  const target = {
    aggregateType: "evidence",
    aggregateId: `evidence_${suffix}`,
    expectedVersion: aggregateVersion(1),
    scope,
  } as const;
  const packageValue = await createApprovalPackage({
    id: approvalPackageId(`package_conflict-${suffix}`),
    version: 1,
    target,
    evidence: [],
    authority: {
      commandType: targetCommandType("approve_evidence"),
      target,
      namedApproverId: approver.id,
      policyVersion: "policy-v1",
      snapshotReference: `authority-${suffix}`,
      scope,
      effectiveAt: "2026-08-06T11:00:00.000Z",
      expiresAt: "2026-08-06T13:00:00.000Z",
      applicableLimits: [],
      humanOnly: true,
    },
    authoritySnapshot: {
      snapshotId: `authority-${suffix}`,
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
      id: approvalRequestId(`approval_conflict-${suffix}`),
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
    decisionId: approvalDecisionId(`decision_conflict-${suffix}`),
    now: "2026-08-06T12:02:00.000Z",
  });
}
