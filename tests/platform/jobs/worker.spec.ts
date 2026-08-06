import { assertEquals } from "@std/assert";
import { parseAggregateVersion } from "../../../src/platform/api/v1.ts";
import {
  ClaimedJob,
  JobAuditAppendPort,
  JobExecutor,
  JobFailurePolicy,
  JobInputVersionChecker,
  JobWorker,
  JobWorkerStore,
  sanitizedJobFailure,
} from "../../../src/platform/jobs/v1.ts";

Deno.test("worker observes durable cancellation before executor side effects", async () => {
  const store = new RecordingJobStore(fixtureClaimedJob(), true);
  const executor = new RecordingJobExecutor();
  const worker = createWorker(store, executor, new CurrentInputs());

  assertEquals(await worker.executeOne("worker_a", 60_000), {
    status: "cancelled",
    jobId: "job_worker",
  });
  assertEquals(executor.executions, 0);
  assertEquals(store.transitions, ["cancelled"]);
});

Deno.test("worker rechecks inputs, completes success, and schedules failures", async () => {
  const successStore = new RecordingJobStore(fixtureClaimedJob(), false);
  const successExecutor = new RecordingJobExecutor();
  const success = createWorker(
    successStore,
    successExecutor,
    new CurrentInputs(),
  );
  assertEquals(
    (await success.executeOne("worker_a", 60_000)).status,
    "succeeded",
  );
  assertEquals(successStore.transitions, ["succeeded"]);

  const failureStore = new RecordingJobStore(fixtureClaimedJob(), false);
  const failure = createWorker(
    failureStore,
    new FailingJobExecutor(),
    new CurrentInputs(),
  );
  assertEquals(
    (await failure.executeOne("worker_a", 60_000)).status,
    "retry_scheduled",
  );
  assertEquals(failureStore.transitions, ["retry_scheduled"]);

  const staleStore = new RecordingJobStore(fixtureClaimedJob(), false);
  const staleExecutor = new RecordingJobExecutor();
  const stale = createWorker(staleStore, staleExecutor, new StaleInputs());
  assertEquals((await stale.executeOne("worker_a", 60_000)).status, "failed");
  assertEquals(staleExecutor.executions, 0);
});

Deno.test("worker persists timeout before invoking an expired job", async () => {
  const expired = {
    ...fixtureClaimedJob(),
    timeoutAt: new Date("2026-07-30T11:59:59.000Z"),
  };
  const store = new RecordingJobStore(expired, false);
  const executor = new RecordingJobExecutor();
  const worker = createWorker(store, executor, new CurrentInputs());

  assertEquals(await worker.executeOne("worker_a", 60_000), {
    status: "timed_out",
    jobId: "job_worker",
  });
  assertEquals(executor.executions, 0);
  assertEquals(store.transitions, ["timed_out"]);
});

Deno.test("executor rejection after deadline persists timed_out", async () => {
  const store = new RecordingJobStore(fixtureClaimedJob(), false);
  const worker = new JobWorker({
    transactions: new ImmediateTransactions(),
    store,
    executor: new FailingJobExecutor(),
    versions: new CurrentInputs(),
    clock: new AdvancingClock(),
    failurePolicy: new OneRetryFailurePolicy(),
    audit: new RecordingAuditPort(),
  });

  assertEquals(await worker.executeOne("worker_a", 60_000), {
    status: "timed_out",
    jobId: "job_worker",
  });
  assertEquals(store.transitions, ["timed_out"]);
});

Deno.test("worker exposes heartbeat and lease validation before executor effects", async () => {
  const store = new RecordingJobStore(fixtureClaimedJob(), false);
  const executor = new HeartbeatingExecutor();
  const worker = new JobWorker({
    transactions: new ImmediateTransactions(),
    store,
    executor,
    versions: new CurrentInputs(),
    clock: new HeartbeatClock(),
    failurePolicy: new OneRetryFailurePolicy(),
    audit: new RecordingAuditPort(),
  });

  assertEquals(
    (await worker.executeOne("worker_a", 60_000)).status,
    "succeeded",
  );
  assertEquals(executor.observedLeaseExpiry, "2026-07-30T12:01:30.000Z");
  assertEquals(store.leaseChecks, 3);
  assertEquals(store.heartbeats, 1);
});

function createWorker(
  store: JobWorkerStore,
  executor: JobExecutor,
  versions: JobInputVersionChecker,
): JobWorker {
  return new JobWorker({
    transactions: new ImmediateTransactions(),
    store,
    executor,
    versions,
    clock: new FixedClock(),
    failurePolicy: new OneRetryFailurePolicy(),
    audit: new RecordingAuditPort(),
  });
}

function fixtureClaimedJob(): ClaimedJob {
  const version = parseAggregateVersion(3);
  if (!version.ok) throw new Error("Fixture version is invalid.");
  return {
    jobId: "job_worker" as ClaimedJob["jobId"],
    operationId: "op_worker" as ClaimedJob["operationId"],
    jobType: "fixture.execute",
    schemaVersion: 1,
    tenantId: "tenant_postgresintegration" as ClaimedJob["tenantId"],
    initiatingActorId:
      "actor_postgresintegration" as ClaimedJob["initiatingActorId"],
    correlationId: "cor_postgresintegration" as ClaimedJob["correlationId"],
    idempotencyKey: "idem_worker" as ClaimedJob["idempotencyKey"],
    inputVersionReferences: [{
      aggregateType: "fixture",
      aggregateId: "aggregate_1",
      version: version.value,
    }],
    payload: {},
    state: "running",
    attemptNumber: 1,
    workerId: "worker_a",
    attemptStartedAt: new Date("2026-07-30T12:00:00.000Z"),
    leaseExpiresAt: new Date("2026-07-30T12:01:00.000Z"),
    progress: 0,
    timeoutAt: new Date("2026-07-30T13:00:00.000Z"),
    createdAt: new Date("2026-07-30T11:00:00.000Z"),
  };
}

class RecordingJobStore implements JobWorkerStore {
  readonly transitions: string[] = [];
  heartbeats = 0;
  leaseChecks = 0;

  constructor(
    private readonly job: ClaimedJob,
    private readonly cancellation: boolean,
  ) {}

  claim(): Promise<ClaimedJob[]> {
    return Promise.resolve([this.job]);
  }

  cancellationRequested(): Promise<boolean> {
    return Promise.resolve(this.cancellation);
  }

  assertActiveLease(): Promise<void> {
    this.leaseChecks++;
    return Promise.resolve();
  }

  extendLease(
    _transaction: unknown,
    job: ClaimedJob,
    _now: Date,
    leaseUntil: Date,
  ): Promise<ClaimedJob> {
    this.heartbeats++;
    return Promise.resolve({ ...job, leaseExpiresAt: leaseUntil });
  }

  cancel(): Promise<void> {
    this.transitions.push("cancelled");
    return Promise.resolve();
  }

  timeout(): Promise<void> {
    this.transitions.push("timed_out");
    return Promise.resolve();
  }

  complete(): Promise<void> {
    this.transitions.push("succeeded");
    return Promise.resolve();
  }

  fail(
    _transaction: unknown,
    _job: ClaimedJob,
    failure: { outcome: string },
  ): Promise<void> {
    this.transitions.push(failure.outcome);
    return Promise.resolve();
  }
}

class RecordingJobExecutor implements JobExecutor {
  executions = 0;

  execute(): Promise<{ resultReference: string }> {
    this.executions++;
    return Promise.resolve({ resultReference: "result_worker" });
  }
}

class FailingJobExecutor implements JobExecutor {
  execute(): Promise<{ resultReference: string }> {
    return Promise.reject(new Error("raw executor failure"));
  }
}

class HeartbeatingExecutor implements JobExecutor {
  observedLeaseExpiry: string | undefined;

  async execute(
    _job: ClaimedJob,
    context: Parameters<JobExecutor["execute"]>[1],
  ): Promise<{ resultReference: string }> {
    await context.beforeExternalEffect();
    this.observedLeaseExpiry = (await context.heartbeat()).toISOString();
    await context.beforeExternalEffect();
    return { resultReference: "result_heartbeat" };
  }
}

class CurrentInputs implements JobInputVersionChecker {
  recheck(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class StaleInputs implements JobInputVersionChecker {
  recheck(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

class OneRetryFailurePolicy implements JobFailurePolicy {
  failure(_job: ClaimedJob, _error: unknown, now: Date) {
    return {
      outcome: "retry_scheduled" as const,
      failure: sanitizedJobFailure("EXECUTOR_RETRY"),
      completedAt: now,
      nextAttemptAt: new Date(now.getTime() + 60_000),
    };
  }
}

class FixedClock {
  now(): Date {
    return new Date("2026-07-30T12:00:00.000Z");
  }
}

class AdvancingClock {
  private calls = 0;

  now(): Date {
    this.calls++;
    return this.calls < 3
      ? new Date("2026-07-30T12:00:00.000Z")
      : new Date("2026-07-30T13:00:01.000Z");
  }
}

class HeartbeatClock {
  private calls = 0;

  now(): Date {
    this.calls++;
    return this.calls < 5
      ? new Date("2026-07-30T12:00:00.000Z")
      : new Date("2026-07-30T12:00:30.000Z");
  }
}

class RecordingAuditPort implements JobAuditAppendPort {
  append(): Promise<void> {
    return Promise.resolve();
  }
}

class ImmediateTransactions {
  run<TResult>(
    callback: (transaction: never) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    return Promise.resolve(callback(undefined as never));
  }
}
