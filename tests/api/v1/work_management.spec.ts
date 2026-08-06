import { assertEquals, assertStringIncludes } from "@std/assert";
import type {
  ActorReference,
  AuthorizationDecision,
} from "../../../src/platform/authz/v1.ts";
import { createInMemoryWorkManagementTestComposition } from "../../../src/work_management/composition.ts";
import {
  actor,
  deal,
  tenant,
  workspace,
} from "../../../src/work_management/ids.ts";
import { WorkManagementV1Application } from "../../../src/api/v1/work_management.ts";
import { handleWorkManagementV1Route } from "../../../src/api/v1/work_management_routes.ts";
import type { RequestContext } from "../../../src/platform/api/v1.ts";

const context: RequestContext = {
  actorId: actor("actor_requester"),
  tenantId: tenant("tenant_api"),
  workspaceId: workspace("workspace_api"),
  dealId: deal("deal_api"),
  correlationId: "cor_api" as RequestContext["correlationId"],
  origin: "http",
};
const human: ActorReference = {
  id: context.actorId,
  kind: "human",
  state: "active",
};

function allow(): AuthorizationDecision {
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

Deno.test("Work Management application denies before protected repository load", async () => {
  let loads = 0;
  const composition = createInMemoryWorkManagementTestComposition({
    authorization: {
      authorize: () => ({
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
      }),
    },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
  });
  const original = composition.repository.findWorkstream.bind(
    composition.repository,
  );
  composition.repository.findWorkstream = async (
    scope: import("../../../src/work_management/v1.ts").WorkScope,
    id: import("../../../src/work_management/v1.ts").WorkstreamId,
  ) => {
    loads += 1;
    return await original(scope, id);
  };
  const application = new WorkManagementV1Application(composition.service);
  const result = await application.readWorkstream({
    context,
    actor: human,
    scope: {
      tenantId: context.tenantId,
      workspaceId: context.workspaceId!,
      dealId: context.dealId!,
    },
    id: "workstream_missing" as never,
  });
  assertEquals(result.kind, "error");
  assertEquals(loads, 0);
  if (result.kind === "error") {
    assertEquals(result.error.error.code, "PROTECTED_NOT_FOUND");
  }
});

Deno.test("Work Management route requires idempotency and If-Match for transitions", async () => {
  const composition = createInMemoryWorkManagementTestComposition({
    authorization: { authorize: allow },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
  });
  const application = new WorkManagementV1Application(composition.service);
  const dependencies = {
    context: { contextFor: () => ({ context, actor: human }) },
    application,
  };
  const response = await handleWorkManagementV1Route(
    new Request(
      "http://localhost/api/v1/work-management/workstreams/workstream_one/transition",
      {
        method: "POST",
        body: JSON.stringify({ toState: "active" }),
        headers: { "Content-Type": "application/json" },
      },
    ),
    dependencies,
  );
  assertEquals(response?.status, 422);
  assertStringIncludes(await response!.text(), "Idempotency-Key");
});

Deno.test("Work Management route creates a scoped workstream and returns a strong ETag", async () => {
  const composition = createInMemoryWorkManagementTestComposition({
    authorization: { authorize: allow },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
  });
  const application = new WorkManagementV1Application(composition.service);
  const dependencies = {
    context: { contextFor: () => ({ context, actor: human }) },
    application,
  };
  const response = await handleWorkManagementV1Route(
    new Request("http://localhost/api/v1/work-management/workstreams", {
      method: "POST",
      body: JSON.stringify({
        id: "workstream_one",
        name: "Diligence",
        ownerId: "actor_requester",
      }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "idem_create",
      },
    }),
    dependencies,
  );
  assertEquals(response?.status, 201);
  assertEquals(response?.headers.get("ETag"), '"v1"');
});

Deno.test("Work Management rejects weak ETags and requires owner If-Match for Task creation", async () => {
  const composition = createInMemoryWorkManagementTestComposition({
    authorization: { authorize: allow },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
  });
  const dependencies = {
    context: { contextFor: () => ({ context, actor: human }) },
    application: new WorkManagementV1Application(composition.service),
  };
  const weak = await handleWorkManagementV1Route(
    new Request(
      "http://localhost/api/v1/work-management/workstreams/workstream_one/transition",
      {
        method: "POST",
        body: JSON.stringify({ toState: "active" }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "idem_weak",
          "If-Match": 'W/"v1"',
        },
      },
    ),
    dependencies,
  );
  assertEquals(weak?.status, 422);
  assertStringIncludes(await weak!.text(), "strong");
  const task = await handleWorkManagementV1Route(
    new Request("http://localhost/api/v1/work-management/tasks", {
      method: "POST",
      body: JSON.stringify({
        id: "task_owner-version",
        workstreamId: "workstream_one",
        title: "Owner version",
        assigneeId: "actor_requester",
      }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "idem_task-owner",
      },
    }),
    dependencies,
  );
  assertEquals(task?.status, 422);
  assertStringIncludes(await task!.text(), "If-Match");
});
