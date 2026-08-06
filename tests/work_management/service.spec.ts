import { assertEquals, assertRejects } from "@std/assert";
import {
  action,
  type AuthorizationDecision,
  field,
} from "../../src/platform/authz/v1.ts";
import { parseIdempotencyKey } from "../../src/platform/api/v1.ts";
import { createInMemoryWorkManagementTestComposition } from "../../src/work_management/composition.ts";
import type {
  WorkManagementAuthorizationInput,
} from "../../src/work_management/authorization_service.ts";
import {
  actor,
  deal,
  taskId,
  tenant,
  type WorkScope,
  workspace,
  workstreamId,
} from "../../src/work_management/ids.ts";
import type { TaskState } from "../../src/work_management/model.ts";
import { createWorkstream } from "../../src/work_management/workstreams.ts";

const scope: WorkScope = {
  tenantId: tenant("tenant_service"),
  workspaceId: workspace("workspace_service"),
  dealId: deal("deal_service"),
};
const human = {
  id: actor("actor_service-human"),
  kind: "human" as const,
  state: "active" as const,
};
const context = {
  actorId: human.id,
  tenantId: scope.tenantId,
  workspaceId: scope.workspaceId,
  dealId: scope.dealId,
  correlationId:
    "cor_service" as import("../../src/platform/api/v1.ts").CorrelationId,
  origin: "http" as const,
};

Deno.test("service persists Workstream task ownership and gates completion", async () => {
  for (const state of ["open", "in_progress", "blocked"] as const) {
    const fixture = testComposition();
    const values = await createOwnedTaskFixture(fixture.service, state);
    await assertRejects(
      () =>
        fixture.service.transitionWorkstream({
          ...command(
            values.workstreamId,
            `complete-${state.replace("_", "-")}`,
            3,
          ),
          toState: "completed",
        }),
      Error,
      "cannot complete",
    );
  }
  for (const state of ["completed", "cancelled"] as const) {
    const fixture = testComposition();
    const values = await createOwnedTaskFixture(fixture.service, state);
    const completed = await fixture.service.transitionWorkstream({
      ...command(values.workstreamId, `complete-${state}`, 3),
      toState: "completed",
    });
    assertEquals(completed.state, "completed");
  }
});

Deno.test("service completion fails closed for missing authoritative Task state", async () => {
  const fixture = testComposition();
  const missingId = taskId("task_missing-owned");
  const workstream = createWorkstream({
    ...scope,
    id: workstreamId("workstream_missing-owned"),
    name: "Missing",
    ownerId: human.id,
    now: "2026-08-06T12:00:00.000Z",
  });
  await fixture.repository.saveWorkstream({
    ...workstream,
    state: "active",
    taskIds: [missingId],
    version: 2 as typeof workstream.version,
  }, 0);
  await assertRejects(
    () =>
      fixture.service.transitionWorkstream({
        ...command(workstream.id, "missing-state", 2),
        toState: "completed",
      }),
    Error,
    "missing",
  );
});

Deno.test("service completion fails closed for an unlisted Task back-reference", async () => {
  const fixture = testComposition();
  const workstream = await fixture.service.createWorkstream({
    ...command(workstreamId("workstream_unlisted-task"), "unlisted-ws"),
    name: "Unlisted Task",
    ownerId: human.id,
  });
  await fixture.service.transitionWorkstream({
    ...command(workstream.id, "unlisted-active", 1),
    toState: "active",
  });
  await fixture.repository.saveTask(
    storedTaskWithoutParent(taskId("task_unlisted"), workstream.id),
    0,
  );
  await assertRejects(
    () =>
      fixture.service.transitionWorkstream({
        ...command(workstream.id, "unlisted-complete", 2),
        toState: "completed",
      }),
    Error,
    "exact membership equivalence",
  );
});

Deno.test("service ignores unrelated open Tasks in another exact scope", async () => {
  const fixture = testComposition();
  const workstream = await fixture.service.createWorkstream({
    ...command(workstreamId("workstream_isolated"), "isolated-create"),
    name: "Isolated",
    ownerId: human.id,
  });
  const active = await fixture.service.transitionWorkstream({
    ...command(workstream.id, "isolated-active", 1),
    toState: "active",
  });
  const otherScope = { ...scope, dealId: deal("deal_service-other") };
  await fixture.repository.saveTask({
    aggregateType: "task",
    id: taskId("task_other-scope"),
    ...otherScope,
    workstreamId: workstream.id,
    title: "Other",
    assigneeId: human.id,
    state: "open",
    version: 1 as import("../../src/platform/api/v1.ts").AggregateVersion,
    createdAt: "2026-08-06T12:00:00.000Z",
    updatedAt: "2026-08-06T12:00:00.000Z",
  }, 0);
  const completed = await fixture.service.transitionWorkstream({
    ...command(active.id, "isolated-complete", 2),
    toState: "completed",
  });
  assertEquals(completed.state, "completed");
});

Deno.test("permission-safe projection applies mask and allowed actions", async () => {
  const authorization = {
    authorize: (): AuthorizationDecision => allowProjection(),
  };
  const fixture = createInMemoryWorkManagementTestComposition({
    authorization,
    clock: fixedClock(),
  });
  const created = await fixture.service.createWorkstream({
    ...command(workstreamId("workstream_projection"), "projection-create"),
    name: "Protected name",
    ownerId: human.id,
  });
  const result = await fixture.service.getWorkstream({
    context,
    actor: human,
    scope,
    id: created.id,
  });
  assertEquals(result.kind, "loaded");
  if (result.kind === "loaded") {
    assertEquals(result.value.id, created.id);
    assertEquals(result.value.name, "[redacted]");
    assertEquals(result.value.ownerId, undefined);
    assertEquals(result.value.allowedActions, [action("transition")]);
  }
});

Deno.test("service rejects an indirect persisted parent cycle", async () => {
  const fixture = testComposition();
  const workstream = await fixture.service.createWorkstream({
    ...command(workstreamId("workstream_parent-cycle"), "parent-cycle-ws"),
    name: "Parent cycle",
    ownerId: human.id,
  });
  const firstId = taskId("task_parent-first");
  const secondId = taskId("task_parent-second");
  await fixture.repository.saveTask(
    storedTask(firstId, workstream.id, secondId),
    0,
  );
  await fixture.repository.saveTask(
    storedTask(secondId, workstream.id, firstId),
    0,
  );
  await assertRejects(
    () =>
      fixture.service.createTask({
        ...command(taskId("task_parent-child"), "parent-cycle-child", 1),
        workstreamId: workstream.id,
        parentTaskId: firstId,
        title: "Child",
        assigneeId: human.id,
      }),
    Error,
    "cycle",
  );
});

Deno.test("Task creation independently authorizes exact Workstream attachment atomically", async () => {
  const authorization = new AttachmentAuthorizationFake();
  const fixture = createInMemoryWorkManagementTestComposition({
    authorization,
    clock: fixedClock(),
  });
  const workstream = await fixture.service.createWorkstream({
    ...command(workstreamId("workstream_attachment-auth"), "attachment-ws"),
    name: "Attachment authorization",
    ownerId: human.id,
  });
  authorization.reset();
  const taskCommand = {
    ...command(taskId("task_attachment-auth"), "attachment-task", 1),
    workstreamId: workstream.id,
    title: "Protected attachment",
    assigneeId: human.id,
  };

  await assertRejects(
    () => fixture.service.createTask(taskCommand),
    Error,
    "attach_task workstream",
  );
  assertEquals(authorization.requests, [
    { action: "create", kind: "task", id: taskCommand.id, state: undefined },
    {
      action: "attach_task",
      kind: "workstream",
      id: workstream.id,
      state: "planned",
    },
  ]);
  assertEquals(
    await fixture.repository.findTask(scope, taskCommand.id),
    undefined,
  );
  assertEquals(
    await fixture.repository.findWorkstream(scope, workstream.id),
    workstream,
  );
  assertEquals(
    await fixture.repository.listHistory(scope, "task", taskCommand.id),
    [],
  );

  authorization.allowAttachment();
  const task = await fixture.service.createTask(taskCommand);
  const owner = await fixture.repository.findWorkstream(scope, workstream.id);
  assertEquals(task.id, taskCommand.id);
  assertEquals(owner?.taskIds, [task.id]);
  assertEquals(owner?.version, 2);
});

async function createOwnedTaskFixture(
  service:
    import("../../src/work_management/application_service.ts").WorkManagementService,
  taskState: TaskState,
) {
  const suffix = taskState.replace("_", "-");
  const workstream = await service.createWorkstream({
    ...command(workstreamId(`workstream_${suffix}`), `create-ws-${suffix}`),
    name: `Workstream ${suffix}`,
    ownerId: human.id,
  });
  let task = await service.createTask({
    ...command(taskId(`task_${suffix}`), `create-task-${suffix}`, 1),
    workstreamId: workstream.id,
    title: `Task ${suffix}`,
    assigneeId: human.id,
  });
  await service.transitionWorkstream({
    ...command(workstream.id, `active-${suffix}`, 2),
    toState: "active",
  });
  if (taskState === "in_progress" || taskState === "completed") {
    task = await service.transitionTask({
      ...command(task.id, `task-progress-${suffix}`, task.version),
      toState: "in_progress",
    });
  }
  if (taskState === "blocked") {
    task = await service.transitionTask({
      ...command(task.id, `task-block-${suffix}`, task.version),
      toState: "blocked",
    });
  }
  if (taskState === "completed") {
    task = await service.transitionTask({
      ...command(task.id, `task-complete-${suffix}`, task.version),
      toState: "completed",
    });
  }
  if (taskState === "cancelled") {
    task = await service.transitionTask({
      ...command(task.id, `task-cancel-${suffix}`, task.version),
      toState: "cancelled",
    });
  }
  return { workstreamId: workstream.id, task };
}

function command<Id extends string>(
  id: Id,
  key: string,
  expectedVersion?: number,
) {
  const parsed = parseIdempotencyKey(`idem_${key}`);
  if (!parsed.ok) throw new Error(`Invalid test idempotency key "${key}".`);
  return {
    context,
    actor: human,
    scope,
    id,
    idempotencyKey: parsed.value,
    ...(expectedVersion === undefined ? {} : { expectedVersion }),
  };
}

function testComposition() {
  return createInMemoryWorkManagementTestComposition({
    authorization: { authorize: allowAll },
    clock: fixedClock(),
  });
}

function fixedClock() {
  return { now: () => "2026-08-06T12:00:00.000Z" };
}

function allowAll(): AuthorizationDecision {
  return {
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: [],
    approvedScope: undefined as never,
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
  };
}

function allowProjection(): AuthorizationDecision {
  return {
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: [action("transition")],
    approvedScope: undefined as never,
    fieldMask: {
      include: [field("id"), field("owner_id")],
      omit: [field("owner_id")],
      redact: [field("name")],
      approvedClassifications: [
        { name: field("id"), classification: "public" },
        { name: field("owner_id"), classification: "relationship_ownership" },
      ],
    },
  };
}

class AttachmentAuthorizationFake {
  private attachmentAllowed = false;
  readonly requests: Array<{
    readonly action: string;
    readonly kind: string;
    readonly id: string;
    readonly state: string | undefined;
  }> = [];

  authorize(input: WorkManagementAuthorizationInput): AuthorizationDecision {
    this.requests.push({
      action: input.action,
      kind: input.resource.kind,
      id: input.resource.id,
      state: input.resourceState,
    });
    if (input.action === action("attach_task") && !this.attachmentAllowed) {
      return denyAttachment();
    }
    return allowAll();
  }

  allowAttachment(): void {
    this.attachmentAllowed = true;
  }

  reset(): void {
    this.requests.length = 0;
  }
}

function denyAttachment(): AuthorizationDecision {
  return {
    outcome: "deny",
    reasonCode: "NO_MATCHING_GRANT",
    allowedActions: [],
    approvedScope: undefined,
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
  };
}

function storedTask(
  id: ReturnType<typeof taskId>,
  ownerId: ReturnType<typeof workstreamId>,
  parentTaskId: ReturnType<typeof taskId>,
) {
  return {
    aggregateType: "task" as const,
    id,
    ...scope,
    workstreamId: ownerId,
    parentTaskId,
    title: "Persisted parent",
    assigneeId: human.id,
    state: "open" as const,
    version: 1 as import("../../src/platform/api/v1.ts").AggregateVersion,
    createdAt: "2026-08-06T12:00:00.000Z",
    updatedAt: "2026-08-06T12:00:00.000Z",
  };
}

function storedTaskWithoutParent(
  id: ReturnType<typeof taskId>,
  ownerId: ReturnType<typeof workstreamId>,
) {
  const task = storedTask(id, ownerId, taskId("task_unused-parent"));
  const { parentTaskId: _parentTaskId, ...withoutParent } = task;
  return withoutParent;
}
