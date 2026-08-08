import { assertEquals, assertRejects } from "@std/assert";
import {
  CLOSING_ACTION,
  type ClosingAuthorizationPort,
} from "../../src/closing/authorization.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type {
  DealId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../../src/platform/api/v1.ts";
import { ClosingError } from "../../src/closing/model.ts";
import { InMemoryClosingUnitOfWork } from "../../src/closing/repository.ts";
import type { ClosingAuthorityInput } from "../../src/closing/authority.ts";
import type {
  ClosingAuthorityPort,
  ClosingCommandInput,
  ClosingService,
} from "../../src/closing/service.ts";
import { ClosingService as ClosingServiceImplementation } from "../../src/closing/service.ts";
import {
  ActionScopedClosingAuthorization,
  AllowingClosingAuthorization,
  closingContext,
  DenyingClosingAuthorization,
} from "./authorization_support.ts";

const scope = {
  tenantId: "tenant_alpha" as TenantId,
  workspaceId: "workspace_main" as WorkspaceId,
  dealId: "deal_solar" as DealId,
};
const otherScope = { ...scope, dealId: "deal_other" as DealId };
const actor: ActorReference = {
  id: "actor_alice" as never,
  kind: "human",
  state: "active",
};
const aiActor: ActorReference = {
  id: "agent_closing" as never,
  kind: "ai",
  state: "active",
};

class RejectingAuthority implements ClosingAuthorityPort {
  calls = 0;

  consume(_input: ClosingAuthorityInput): Promise<never> {
    this.calls += 1;
    return Promise.reject(new Error("authority proof required"));
  }
}

function service(
  unitOfWork = new InMemoryClosingUnitOfWork(),
  authorization?: ClosingAuthorizationPort,
  authority?: ClosingAuthorityPort,
): ClosingService {
  return new ClosingServiceImplementation({
    unitOfWork,
    authorization,
    authority,
    clock: { now: () => "2026-08-07T12:00:00.000Z" },
  });
}

function createInput(
  inputScope = scope,
  inputActor = actor,
  key = "idem_create-authorization",
) {
  return {
    context: closingContext(inputScope, inputActor),
    scope: inputScope,
    closingWorkspaceId: "closing_solar",
    actor: inputActor,
    idempotencyKey: key as IdempotencyKey,
  };
}

function commandInput(
  inputScope = scope,
  inputActor = actor,
): ClosingCommandInput {
  return {
    context: closingContext(inputScope, inputActor),
    scope: inputScope,
    workspaceId: "closing_solar",
    actor: inputActor,
    expectedVersion: 1 as never,
    idempotencyKey: "idem_transition-authorization" as IdempotencyKey,
  };
}

Deno.test("Closing defaults to deny and cannot self-enable confirmation", async () => {
  const unitOfWork = new InMemoryClosingUnitOfWork();
  const closing = service(unitOfWork);
  await assertRejects(
    () =>
      closing.createWorkspace({ ...createInput(), confirmationEnabled: true }),
    ClosingError,
    "denied",
  );
  assertEquals(
    await unitOfWork.read((transaction) =>
      transaction.find(scope, "closing_solar")
    ),
    undefined,
  );
});

Deno.test("an active human denied an action cannot mutate Closing", async () => {
  const unitOfWork = new InMemoryClosingUnitOfWork();
  const allowed = service(unitOfWork, new AllowingClosingAuthorization());
  await allowed.createWorkspace(createInput());
  const denied = service(
    unitOfWork,
    new ActionScopedClosingAuthorization(
      String(CLOSING_ACTION.createWorkspace),
    ),
  );
  await assertRejects(
    () => denied.transition({ ...commandInput(), to: "preparing_signing" }),
    ClosingError,
    "Closing action",
  );
  assertEquals(
    await unitOfWork.read((transaction) =>
      transaction.find(scope, "closing_solar").then((workspace) =>
        workspace?.version
      )
    ),
    1,
  );
});

Deno.test("an actor authorized in one deal cannot submit a command for another", async () => {
  const closing = service(
    new InMemoryClosingUnitOfWork(),
    new AllowingClosingAuthorization(),
  );
  await assertRejects(
    () =>
      closing.createWorkspace({
        ...createInput(otherScope),
        context: closingContext(scope, actor),
      }),
    ClosingError,
    "does not match trusted RequestContext",
  );
});

Deno.test("Closing rejects an actor reference that disagrees with trusted context", async () => {
  const closing = service(
    new InMemoryClosingUnitOfWork(),
    new AllowingClosingAuthorization(),
  );
  const otherActor = { ...actor, id: "actor_bob" as never };
  await assertRejects(
    () =>
      closing.createWorkspace({
        ...createInput(),
        actor: otherActor,
      }),
    ClosingError,
    "does not match trusted RequestContext",
  );
});

Deno.test("non-human principals cannot acquire Closing mutation authority", async () => {
  const closing = service(
    new InMemoryClosingUnitOfWork(),
    new AllowingClosingAuthorization(),
  );
  await assertRejects(
    () => closing.createWorkspace(createInput(scope, aiActor)),
    ClosingError,
    "active human actor",
  );
});

Deno.test("denied object reads return protected-not-found without loading the workspace", async () => {
  const unitOfWork = new InMemoryClosingUnitOfWork();
  const allowed = service(unitOfWork, new AllowingClosingAuthorization());
  await allowed.createWorkspace(createInput());
  const denied = service(unitOfWork, new DenyingClosingAuthorization());
  await assertRejects(
    () =>
      denied.getWorkspace({
        context: closingContext(scope, actor),
        scope,
        workspaceId: "closing_solar",
        actor,
      }),
    ClosingError,
    "was not found",
  );
});

Deno.test("authorized humans can perform ordinary scoped commands on exact resources", async () => {
  const authorization = new AllowingClosingAuthorization();
  const closing = service(new InMemoryClosingUnitOfWork(), authorization);
  const created = await closing.createWorkspace({
    ...createInput(),
    confirmationEnabled: true,
  });
  const condition = await closing.addCondition({
    ...commandInput(),
    expectedVersion: created.workspace.version,
    idempotencyKey: "idem_condition-authorization" as IdempotencyKey,
  }, {
    conditionId: "condition_authorization",
    requirementId: "requirement_authorization",
    title: "Authorization condition",
    category: "legal",
    responsiblePartyId: actor.id,
    reviewerId: actor.id,
    now: "2026-08-07T12:00:00.000Z",
  });
  const blocker = await closing.addBlocker({
    ...commandInput(),
    expectedVersion: condition.workspace.version,
    idempotencyKey: "idem_blocker-authorization" as IdempotencyKey,
  }, {
    blockerId: "blocker_authorization",
    sourceType: "manual",
    sourceId: "source_authorization",
    title: "Authorization blocker",
    consequence: "Review is required",
    severity: "low",
    ownerId: actor.id,
  });
  const aborted = await closing.abort({
    ...commandInput(),
    expectedVersion: blocker.workspace.version,
    idempotencyKey: "idem_abort-authorization" as IdempotencyKey,
  });
  assertEquals(aborted.workspace.status, "aborted");
  assertEquals(authorization.requests.map((request) => request.resource.id), [
    "closing_solar",
    "condition_authorization",
    "blocker_authorization",
    "closing_solar",
  ]);
});

Deno.test("readiness review has its own action authorization", async () => {
  const unitOfWork = new InMemoryClosingUnitOfWork();
  const creator = service(unitOfWork, new AllowingClosingAuthorization());
  await creator.createWorkspace(createInput());
  const authorization = new ActionScopedClosingAuthorization(
    "closing_start_readiness_review",
  );
  const closing = service(unitOfWork, authorization);
  await assertRejects(
    () => closing.startReadinessReview(commandInput()),
    Error,
    "invalid",
  );
  assertEquals(
    String(authorization.requests[0]?.action),
    "closing_start_readiness_review",
  );
});

Deno.test("baseline authorization succeeds before a protected proof is required", async () => {
  const authority = new RejectingAuthority();
  const authorization = new AllowingClosingAuthorization();
  const closing = service(
    new InMemoryClosingUnitOfWork(),
    authorization,
    authority,
  );
  await closing.createWorkspace(createInput());
  await assertRejects(
    () =>
      closing.approveReadiness({
        ...commandInput(),
        idempotencyKey: "idem_readiness-proof-authorization" as IdempotencyKey,
        authority: {
          protectedCommand: {},
          resolver: { resolve: () => Promise.resolve(undefined) },
        },
      }),
    Error,
    "authority proof required",
  );
  assertEquals(authority.calls, 1);
  assertEquals(
    String(authorization.requests.at(-1)?.action),
    "closing_approve_readiness",
  );
});
