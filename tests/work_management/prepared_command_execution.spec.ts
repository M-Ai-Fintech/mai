import { assertEquals, assertRejects } from "@std/assert";
import {
  type DurablePreparedCommandStore,
  executePreparedCommand,
  type PreparedCommandIdentity,
  PreparedCommandInProgressError,
  type PreparedFinalization,
} from "../../src/work_management/prepared_command_execution.ts";
import {
  assertPreparedCommandFinalizable,
  ReplayDisclosureDeniedError,
  type StoredCommandEnvelope,
} from "../../src/work_management/transaction_replay_policy.ts";

interface TestPlan {
  readonly aggregateId: string;
}

interface TestInput {
  readonly aggregateId: string;
  readonly payloadDigest: string;
}

Deno.test("durable preparation executes trusted ports once and exactly replays", async () => {
  const store = new MemoryPreparedStore();
  const gate = deferred<void>();
  let preparations = 0;
  let authorizations = 0;
  const dependencies = {
    store,
    replayAuthorization: {
      authorize: () => {
        authorizations++;
        return Promise.resolve("allow" as const);
      },
    },
    preparer: {
      prepare: async (input: TestInput) => {
        preparations++;
        assertEquals(store.transactionActive, false);
        await gate.promise;
        return prepared(input.aggregateId, input.payloadDigest);
      },
    },
  };
  const request = commandRequest("digest-one");
  const first = executePreparedCommand(request, dependencies);
  await waitFor(() => preparations === 1);
  await assertRejects(
    () => executePreparedCommand(request, dependencies),
    PreparedCommandInProgressError,
    "in progress",
  );
  gate.resolve();
  const completed = await first;
  const replayed = await executePreparedCommand(request, dependencies);
  assertEquals(replayed, completed);
  assertEquals(replayed.etag, '"1"');
  assertEquals(preparations, 1);
  assertEquals(authorizations, 3);
  assertEquals(store.effects, [
    "aggregate:task_one",
    "history:task_one",
    "audit:task_one",
    "outbox:task_one",
    "proof:task_one",
    "result:task_one",
  ]);
});

Deno.test("changed payload conflicts and revoked authorization hides completed replay", async () => {
  const store = new MemoryPreparedStore();
  let authorization: "allow" | "deny" = "allow";
  const dependencies = {
    store,
    replayAuthorization: {
      authorize: () => Promise.resolve(authorization),
    },
    preparer: {
      prepare: (input: TestInput) =>
        Promise.resolve(prepared(input.aggregateId, input.payloadDigest)),
    },
  };
  await executePreparedCommand(commandRequest("digest-one"), dependencies);
  await assertRejects(
    () => executePreparedCommand(commandRequest("digest-two"), dependencies),
    Error,
    "changed payload",
  );
  authorization = "deny";
  await assertRejects(
    () => executePreparedCommand(commandRequest("digest-one"), dependencies),
    ReplayDisclosureDeniedError,
    "current replay-disclosure authorization",
  );
  assertEquals(store.effects.length, 6);
});

Deno.test("finalize failure rolls back aggregate audit outbox proof and result", async () => {
  for (const failure of ["audit", "outbox", "proof", "result"] as const) {
    const store = new MemoryPreparedStore(failure);
    await assertRejects(
      () =>
        executePreparedCommand(commandRequest(`digest-${failure}`), {
          store,
          replayAuthorization: {
            authorize: () => Promise.resolve("allow" as const),
          },
          preparer: {
            prepare: (input: TestInput) =>
              Promise.resolve(prepared(input.aggregateId, input.payloadDigest)),
          },
        }),
      Error,
      `injected-${failure}`,
    );
    assertEquals(store.effects, []);
    assertEquals(store.result, undefined);
    assertEquals(store.failureCode, "PREPARATION_FAILED");
  }
});

Deno.test("expired preparation owner is fenced and crash recovery finalizes once", async () => {
  const store = new MemoryPreparedStore();
  const request = commandRequest("digest-recovery");
  const abandoned = await store.claim(request.identity, request.now);
  assertEquals(abandoned.status, "claimed");
  if (abandoned.status !== "claimed") return;
  const recovered = await store.claim(
    request.identity,
    "2026-08-06T12:00:02.000Z",
  );
  assertEquals(recovered.status, "claimed");
  if (recovered.status !== "claimed") return;
  assertEquals(recovered.recovered, true);
  const preparedValue = prepared("task_one", request.identity.payloadDigest);
  await assertRejects(
    () =>
      store.savePrepared(request.identity, abandoned.ownerToken, preparedValue),
    Error,
    "stable claim",
  );
  await store.savePrepared(
    request.identity,
    recovered.ownerToken,
    preparedValue,
  );
  await store.finalize(request.identity, recovered.ownerToken, preparedValue);
  assertEquals(store.effects.length, 6);
});

class MemoryPreparedStore
  implements DurablePreparedCommandStore<TestPlan, { readonly id: string }> {
  transactionActive = false;
  effects: string[] = [];
  result: StoredCommandEnvelope<{ readonly id: string }> | undefined;
  failureCode: string | undefined;
  private digest: string | undefined;
  private state: "preparing" | "prepared" | "completed" | "failed" | undefined;
  private ownerToken = "owner-one";
  private leaseUntil = 0;
  private ownerSequence = 1;

  constructor(
    private readonly failAt?: "audit" | "outbox" | "proof" | "result",
  ) {}

  claim(identity: PreparedCommandIdentity, now: string) {
    return this.shortTransaction(() => {
      if (this.digest !== undefined && this.digest !== identity.payloadDigest) {
        throw new Error(
          `Idempotency key "${identity.idempotencyKey}" changed payload; expected digest "${this.digest}".`,
        );
      }
      if (this.state === "completed") {
        return { status: "replay" as const, envelope: this.result! };
      }
      if (this.state === "preparing" && Date.parse(now) >= this.leaseUntil) {
        this.ownerSequence++;
        this.ownerToken = `owner-${this.ownerSequence}`;
        this.leaseUntil = Date.parse(now) + 1_000;
        return {
          status: "claimed" as const,
          ownerToken: this.ownerToken,
          recovered: true,
        };
      }
      if (this.state !== undefined) return { status: "in_progress" as const };
      this.digest = identity.payloadDigest;
      this.state = "preparing";
      this.leaseUntil = Date.parse(now) + 1_000;
      return { status: "claimed" as const, ownerToken: this.ownerToken };
    });
  }

  savePrepared(
    _identity: PreparedCommandIdentity,
    ownerToken: string,
    _prepared: PreparedFinalization<TestPlan>,
  ): Promise<void> {
    return this.shortTransaction(() => {
      this.assertOwner(ownerToken);
      this.state = "prepared";
    });
  }

  async finalize(
    _identity: PreparedCommandIdentity,
    ownerToken: string,
    preparedValue: PreparedFinalization<TestPlan>,
  ): Promise<StoredCommandEnvelope<{ readonly id: string }>> {
    this.transactionActive = true;
    await Promise.resolve();
    const before = [...this.effects];
    try {
      this.assertOwner(ownerToken);
      assertPreparedCommandFinalizable(preparedValue.facts, {
        payloadDigest: preparedValue.facts.payloadDigest,
        aggregateVersion: 0,
        ownerVersion: 1,
        targetVersion: 7,
        resourceState: "planned",
        now: "2026-08-06T12:00:01.000Z",
      });
      this.append("aggregate", preparedValue.plan.aggregateId);
      this.append("history", preparedValue.plan.aggregateId);
      this.append("audit", preparedValue.plan.aggregateId);
      this.append("outbox", preparedValue.plan.aggregateId);
      this.append("proof", preparedValue.plan.aggregateId);
      this.append("result", preparedValue.plan.aggregateId);
      this.result = Object.freeze({
        status: 201,
        etag: '"1"',
        headers: Object.freeze({
          location: `/tasks/${preparedValue.plan.aggregateId}`,
        }),
        body: Object.freeze({ id: preparedValue.plan.aggregateId }),
      });
      this.state = "completed";
      return this.result;
    } catch (error) {
      this.effects = before;
      this.result = undefined;
      this.state = "prepared";
      throw error;
    } finally {
      this.transactionActive = false;
    }
  }

  failPreparation(
    _identity: PreparedCommandIdentity,
    ownerToken: string,
    safeFailureCode: string,
  ): Promise<void> {
    return this.shortTransaction(() => {
      this.assertOwner(ownerToken);
      this.failureCode = safeFailureCode;
      this.state = "failed";
    });
  }

  private append(stage: string, aggregateId: string): void {
    assertEquals(this.transactionActive, true);
    if (this.failAt === stage) throw new Error(`injected-${stage}`);
    this.effects.push(`${stage}:${aggregateId}`);
  }

  private assertOwner(ownerToken: string): void {
    if (ownerToken === this.ownerToken) return;
    throw new Error(
      `Owner token "${ownerToken}" changed; expected stable claim.`,
    );
  }

  private async shortTransaction<Result>(
    operation: () => Result,
  ): Promise<Result> {
    assertEquals(this.transactionActive, false);
    this.transactionActive = true;
    await Promise.resolve();
    try {
      return operation();
    } finally {
      this.transactionActive = false;
    }
  }
}

function commandRequest(payloadDigest: string) {
  return {
    identity: {
      commandId: "create_task:task_one",
      idempotencyKey: "idem_task-one",
      payloadDigest,
    },
    input: { aggregateId: "task_one", payloadDigest },
    now: "2026-08-06T12:00:00.000Z",
  };
}

function prepared(
  aggregateId: string,
  payloadDigest: string,
): PreparedFinalization<TestPlan> {
  return {
    facts: {
      payloadDigest,
      aggregateVersion: 0,
      ownerVersion: 1,
      targetVersion: 7,
      authorization: {
        decisionDigest: "authorization-one",
        resourceState: "planned",
        evaluatedAt: "2026-08-06T12:00:00.000Z",
        expiresAt: "2026-08-06T12:05:00.000Z",
      },
      authorityExpiresAt: "2026-08-06T12:10:00.000Z",
    },
    plan: { aggregateId },
  };
}

function deferred<Value>() {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  const promise = new Promise<Value>((accept) => resolve = accept);
  return { promise, resolve };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error(
    "Condition was not reached; expected deterministic test progress.",
  );
}
