import { assertEquals, assertRejects } from "@std/assert";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type {
  DealId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../../src/platform/api/v1.ts";
import { InMemoryClosingUnitOfWork } from "../../src/closing/repository.ts";
import {
  type ClosingAuthorityPort,
  ClosingService,
} from "../../src/closing/service.ts";
import type {
  ClosingEffect,
  ClosingEffects,
} from "../../src/closing/effects.ts";

const scope = {
  tenantId: "tenant_alpha" as TenantId,
  workspaceId: "workspace_main" as WorkspaceId,
  dealId: "deal_solar" as DealId,
};
const actor: ActorReference = {
  id: "actor_alice" as never,
  kind: "human",
  state: "active",
};

class RecordingEffects implements ClosingEffects {
  readonly values: ClosingEffect[] = [];

  append(_transaction: unknown, effect: ClosingEffect): Promise<void> {
    this.values.push(effect);
    return Promise.resolve();
  }
}

class FailingEffects implements ClosingEffects {
  append(): Promise<void> {
    return Promise.reject(new Error("effect unavailable"));
  }
}

const fakeAuthority: ClosingAuthorityPort = {
  consume: () =>
    Promise.resolve({
      actor,
      proof: {
        proofId: "authority_proof_v1_test",
        proofVersion: 1 as const,
        evaluationId: "authority_evaluation_test",
        evaluationDigest: "a".repeat(64),
        proofDigest: "b".repeat(64),
      },
      dispatchId: "work_target_command_test",
      idempotencyIdentity:
        "tenant_alpha|workspace_main|deal_solar|actor_alice|approve_approval_request|approval_request_test|idem_approve-1",
    }),
};

function service(
  unitOfWork = new InMemoryClosingUnitOfWork(),
  effects?: ClosingEffects,
) {
  return new ClosingService({
    unitOfWork,
    effects,
    authority: fakeAuthority,
    clock: { now: () => "2026-08-07T12:00:00.000Z" },
  });
}

function create(serviceValue: ClosingService, key = "idem_create-1") {
  return serviceValue.createWorkspace({
    scope,
    closingWorkspaceId: "closing_solar",
    actor,
    idempotencyKey: key as IdempotencyKey,
  });
}

Deno.test("closing service persists a human command and replays its exact result", async () => {
  const effects = new RecordingEffects();
  const closing = service(new InMemoryClosingUnitOfWork(), effects);
  const created = await create(closing);
  const first = await closing.transition({
    scope,
    workspaceId: "closing_solar",
    actor,
    expectedVersion: 1 as never,
    idempotencyKey: "idem_transition-1" as IdempotencyKey,
    to: "preparing_signing",
  });
  const replay = await closing.transition({
    scope,
    workspaceId: "closing_solar",
    actor,
    expectedVersion: 1 as never,
    idempotencyKey: "idem_transition-1" as IdempotencyKey,
    to: "preparing_signing",
  });

  assertEquals(created.workspace.version, 1);
  assertEquals(first.replayed, false);
  assertEquals(replay.replayed, true);
  assertEquals(replay.workspace.version, 2);
  assertEquals(effects.values.map((effect) => effect.kind), [
    "audit",
    "outbox",
    "audit",
    "outbox",
  ]);
});

Deno.test("closing service rolls back an in-memory command when effects fail", async () => {
  const closing = service(
    new InMemoryClosingUnitOfWork(),
    new FailingEffects(),
  );
  await assertRejects(() => create(closing), Error, "effect unavailable");
  assertEquals(await closing.getWorkspace(scope, "closing_solar"), undefined);
});

Deno.test("confirmation is feature-gated before irreversible completion", async () => {
  const closing = service();
  await create(closing);
  const transitions = [
    "preparing_signing",
    "signing_ready",
    "signed",
    "preparing_closing",
    "closing_review",
  ] as const;
  let version = 1;
  for (const to of transitions) {
    await closing.transition({
      scope,
      workspaceId: "closing_solar",
      actor,
      expectedVersion: version as never,
      idempotencyKey: `idem_transition-${to}` as IdempotencyKey,
      to,
    });
    version += 1;
  }
  const readiness = await closing.approveReadiness({
    scope,
    workspaceId: "closing_solar",
    actor,
    expectedVersion: version as never,
    idempotencyKey: "idem_approve-readiness" as IdempotencyKey,
    authority: {
      protectedCommand: {},
      resolver: { resolve: () => Promise.resolve(undefined) },
    },
  });
  const begun = await closing.beginClosing({
    scope,
    workspaceId: "closing_solar",
    actor,
    expectedVersion: readiness.workspace.version as never,
    idempotencyKey: "idem_begin-closing" as IdempotencyKey,
    authority: {
      protectedCommand: {},
      resolver: { resolve: () => Promise.resolve(undefined) },
    },
  });
  await assertRejects(
    () =>
      closing.confirmCompletion({
        scope,
        workspaceId: "closing_solar",
        actor,
        expectedVersion: begun.workspace.version as never,
        idempotencyKey: "idem_confirm" as IdempotencyKey,
        authority: {
          protectedCommand: {},
          resolver: { resolve: () => Promise.resolve(undefined) },
        },
        paymentsEvidence: ["payment_confirmation"],
        transferEvidence: ["transfer_confirmation"],
        finalExceptions: [],
        pendingEvidence: [],
        effectiveAt: "2026-08-07T12:00:00.000Z",
      }),
    Error,
    "confirmation is disabled",
  );
});
