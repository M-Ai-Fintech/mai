import { assertEquals, assertRejects } from "@std/assert";
import type {
  IdempotencyClaim,
} from "../../src/platform/persistence/idempotency.ts";
import type {
  TransactionHandle,
  TransactionQueryResult,
} from "../../src/platform/persistence/transaction.ts";
import { inspectWorkManagementIdempotency } from "../../src/work_management/idempotency_replay.ts";

class IdempotencyQueryFake implements TransactionHandle {
  readonly metadata = {};

  constructor(private readonly row: Record<string, unknown> | undefined) {}

  query<TRow>(): Promise<TransactionQueryResult<TRow>> {
    return Promise.resolve({
      rows: this.row === undefined ? [] : [this.row as TRow],
      rowCount: this.row === undefined ? 0 : 1,
    });
  }
}

const claim = {
  tenantId: "tenant_replay" as IdempotencyClaim["tenantId"],
  actorId: "actor_replay" as IdempotencyClaim["actorId"],
  commandType: "create_workstream",
  targetType: "work_management:workstream",
  targetId: "workspace_replay|deal_replay|workstream_replay",
  idempotencyKey: "replay-key" as IdempotencyClaim["idempotencyKey"],
  payloadDigest: "a".repeat(64),
  expiresAt: new Date("2026-08-06T12:00:00.000Z"),
};

Deno.test("Work Management replay inspection remains local and read-only", async () => {
  const transaction = new IdempotencyQueryFake(undefined);
  assertEquals(await inspectWorkManagementIdempotency(transaction, claim), {
    status: "absent",
  });
});

Deno.test("Work Management replay inspection preserves terminal state", async () => {
  const transaction = new IdempotencyQueryFake({
    payloadDigest: claim.payloadDigest,
    state: "completed",
    resultReference: "result_replay",
    errorReference: null,
  });
  assertEquals(await inspectWorkManagementIdempotency(transaction, claim), {
    status: "replay",
    state: "completed",
    resultReference: "result_replay",
    errorReference: undefined,
  });
});

Deno.test("Work Management replay inspection rejects digest reuse", async () => {
  const transaction = new IdempotencyQueryFake({
    payloadDigest: "b".repeat(64),
    state: "completed",
    resultReference: "result_replay",
    errorReference: null,
  });
  await assertRejects(
    () => inspectWorkManagementIdempotency(transaction, claim),
    Error,
    "IDEMPOTENCY_CONFLICT",
  );
});
