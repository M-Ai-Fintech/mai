import { assertEquals, assertRejects } from "@std/assert";
import { payloadDigest } from "../../src/platform/persistence/v1.ts";
import type {
  ActorId,
  DealId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../../src/platform/api/v1.ts";
import {
  type ClosingWorkspace,
  createClosingWorkspace,
} from "../../src/closing/model.ts";
import { InMemoryClosingUnitOfWork } from "../../src/closing/repository.ts";

const scope = {
  tenantId: "tenant_alpha" as TenantId,
  workspaceId: "workspace_main" as WorkspaceId,
  dealId: "deal_solar" as DealId,
};

async function identity(payload: unknown, key: string) {
  return {
    ...scope,
    actorId: "actor_alice" as ActorId,
    commandType: "closing.update",
    targetId: "closing_solar",
    idempotencyKey: key as IdempotencyKey,
    payloadDigest: await payloadDigest(payload),
    recordedAt: "2026-08-07T12:00:00.000Z",
  };
}

Deno.test("closing unit of work replays an identical command", async () => {
  const unit = new InMemoryClosingUnitOfWork();
  const workspace = createClosingWorkspace({
    closingWorkspaceId: "closing_solar",
    scope,
    now: "2026-08-07T12:00:00.000Z",
  });
  await unit.read((transaction) => transaction.insert(workspace));
  const command = await identity(
    { status: "preparing_signing" },
    "idem_close-1",
  );
  const first = await unit.run(
    command,
    (transaction) =>
      transaction.find(scope, "closing_solar").then((current) => {
        const next = {
          ...current!,
          status: "preparing_signing",
          version: 2,
        } as ClosingWorkspace;
        return transaction.replace(next, 1).then(() => next);
      }),
  );
  const replay = await unit.run(command, () => {
    throw new Error("replay must not execute the command body");
  });

  assertEquals(first.replayed, false);
  assertEquals(replay.replayed, true);
  assertEquals(replay.workspace.version, 2);
});

Deno.test("closing idempotency rejects a changed payload", async () => {
  const unit = new InMemoryClosingUnitOfWork();
  const workspace = createClosingWorkspace({
    closingWorkspaceId: "closing_solar",
    scope,
    now: "2026-08-07T12:00:00.000Z",
  });
  await unit.read((transaction) => transaction.insert(workspace));
  const first = await identity({ status: "preparing_signing" }, "idem_close-2");
  await unit.run(first, async (transaction) => {
    const next = {
      ...workspace,
      status: "preparing_signing",
      version: 2,
    } as ClosingWorkspace;
    await transaction.replace(next, 1);
    return next;
  });
  const changed = await identity({ status: "signed" }, "idem_close-2");
  await assertRejects(
    () => unit.run(changed, () => Promise.resolve(workspace)),
    Error,
    "different payload",
  );
});
