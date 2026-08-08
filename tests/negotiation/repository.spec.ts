import { assertEquals, assertRejects } from "@std/assert";
import { InMemoryNegotiationUnitOfWork } from "../../src/negotiation/repository.ts";
import { createNegotiationRound } from "../../src/negotiation/model.ts";
import { actor, scope } from "./support.ts";

const round = createNegotiationRound({
  roundId: "round_repository",
  negotiationId: "negotiation_repository",
  scope,
  number: 1,
  openedBy: actor().id,
  now: "2026-08-08T12:00:00.000Z",
});

function identity(key: string, targetId = round.roundId) {
  return {
    ...scope,
    actorId: actor().id,
    commandType: "negotiation_test",
    targetId,
    idempotencyKey: key as never,
    payloadDigest: "a".repeat(64),
    recordedAt: "2026-08-08T12:00:00.000Z",
  };
}

Deno.test("in-memory negotiation repository replays exact commands and fences versions", async () => {
  const unitOfWork = new InMemoryNegotiationUnitOfWork();
  const first = await unitOfWork.run(
    identity("idem_repository"),
    async (transaction) => {
      await transaction.insertRound(round);
      return round;
    },
  );
  const replay = await unitOfWork.run(
    identity("idem_repository"),
    () => Promise.reject(new Error("replay should not execute")),
  );
  assertEquals(first.replayed, false);
  assertEquals(replay.replayed, true);
  await assertRejects(
    () =>
      unitOfWork.run({
        ...identity("idem_stale"),
        payloadDigest: "b".repeat(64),
      }, async (transaction) => {
        await transaction.insertRound(round);
        return round;
      }),
    Error,
    "already exists",
  );
});
