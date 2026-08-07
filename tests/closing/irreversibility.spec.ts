import { assertEquals, assertRejects } from "@std/assert";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type {
  DealId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../../src/platform/api/v1.ts";
import { InMemoryClosingUnitOfWork } from "../../src/closing/repository.ts";
import { ClosingService } from "../../src/closing/service.ts";

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

Deno.test("completion records irreversible evidence and blocks later mutation", async () => {
  const service = new ClosingService({
    unitOfWork: new InMemoryClosingUnitOfWork(),
    clock: { now: () => "2026-08-07T12:00:00.000Z" },
    authority: {
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
            "tenant_alpha|workspace_main|deal_solar|actor_alice|approve_approval_request|approval_test|idem_test",
        }),
    },
  });
  const created = await service.createWorkspace({
    scope,
    closingWorkspaceId: "closing_solar",
    confirmationEnabled: true,
    actor,
    idempotencyKey: "idem_create-1" as IdempotencyKey,
  });
  const transitions = [
    "preparing_signing",
    "signing_ready",
    "signed",
    "preparing_closing",
    "closing_review",
  ] as const;
  let version = Number(created.workspace.version);
  for (const [index, to] of transitions.entries()) {
    await service.transition({
      scope,
      workspaceId: "closing_solar",
      actor,
      expectedVersion: version as never,
      idempotencyKey: `idem_transition-${index}` as IdempotencyKey,
      to,
    });
    version += 1;
  }
  const approved = await service.approveReadiness({
    scope,
    workspaceId: "closing_solar",
    actor,
    expectedVersion: version as never,
    idempotencyKey: "idem_readiness-1" as IdempotencyKey,
    authority: {
      protectedCommand: {},
      resolver: { resolve: () => Promise.resolve(undefined) },
    },
  });
  const begun = await service.beginClosing({
    scope,
    workspaceId: "closing_solar",
    actor,
    expectedVersion: approved.workspace.version as never,
    idempotencyKey: "idem_begin-1" as IdempotencyKey,
    authority: {
      protectedCommand: {},
      resolver: { resolve: () => Promise.resolve(undefined) },
    },
  });
  const completed = await service.confirmCompletion({
    scope,
    workspaceId: "closing_solar",
    actor,
    expectedVersion: begun.workspace.version as never,
    idempotencyKey: "idem_completion-1" as IdempotencyKey,
    authority: {
      protectedCommand: {},
      resolver: { resolve: () => Promise.resolve(undefined) },
    },
    paymentsEvidence: ["payment_receipt_1"],
    transferEvidence: ["ownership_transfer_1"],
    finalExceptions: [],
    pendingEvidence: [],
    effectiveAt: "2026-08-07T12:00:00.000Z",
  });
  assertEquals(completed.workspace.status, "closed");
  assertEquals(completed.workspace.completion?.irreversible, true);
  await assertRejects(
    () =>
      service.addBlocker({
        scope,
        workspaceId: "closing_solar",
        actor,
        expectedVersion: completed.workspace.version as never,
        idempotencyKey: "idem_blocker-after-close" as IdempotencyKey,
      }, {
        blockerId: "blocker_after-close",
        sourceType: "manual",
        sourceId: "source_after-close",
        title: "Late blocker",
        consequence: "Evidence trail must remain immutable",
        severity: "low",
        ownerId: actor.id,
      }),
    Error,
    "after irreversible confirmation",
  );
});
