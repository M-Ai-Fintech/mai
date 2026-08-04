import { assertEquals, assertRejects } from "@std/assert";
import type {
  ClaimedJob,
  JobFailure,
} from "../../src/platform/jobs/repository.ts";
import type { TransactionHandle } from "../../src/platform/persistence/transaction.ts";
import type { AggregateVersion } from "../../src/shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  IdempotencyKey,
  JobId,
  OperationId,
  TenantId,
  WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";
import {
  createNotificationId,
  freezeProjection,
  type NotificationScope,
} from "../../src/notifications/model.ts";
import {
  type ClaimedNotificationDeliveryJob,
  DisabledNotificationChannelAdapter,
  type NotificationAdapterResult,
  type NotificationChannelAdapter,
  type NotificationDeliveryClaim,
  NotificationDeliveryClaimUnavailableError,
  type NotificationDeliveryJobStore,
  NotificationDeliveryWorker,
} from "../../src/notifications/delivery.ts";
import { InMemoryNotificationRepository } from "../../src/notifications/repository.ts";
import { ExponentialDeliveryRetryPolicy } from "../../src/notifications/retry.ts";
import type { AuthorizedNotificationScope } from "../../src/notifications/projection.ts";

const scope: NotificationScope = {
  tenantId: "tenant_alpha" as TenantId,
  workspaceId: "workspace_main" as WorkspaceId,
  dealId: "deal_solar" as DealId,
};
const actorAlice = "actor_alice" as ActorId;
const createdAt = new Date("2026-08-03T12:00:00.000Z");

Deno.test("delivery worker records attempted and succeeded receipts", async () => {
  const repository = new InMemoryNotificationRepository();
  const job = claimedJob("in_app", 1);
  await prepareProjection(repository, job);
  const clock = new MutableFakeClock(createdAt);
  const adapter = new FakeChannelAdapter("in_app", {
    status: "succeeded",
    resultReference: "receipt-provider-fake",
  }, () => clock.advance(1_000));
  const jobs = new FakeJobs([job]);
  const result = await worker(
    repository,
    jobs,
    [adapter],
    new ExponentialDeliveryRetryPolicy(),
    clock,
  ).runOne("worker_a", 30_000);

  assertEquals(result, { status: "succeeded", jobId: job.jobId });
  const receipts = await repository.listReceipts(new FakeTransaction(), {
    access: access(),
    notificationId: createNotificationId("notif_event-1-actor-alice"),
  });
  assertEquals(receipts.map((receipt) => receipt.outcome), [
    "attempted",
    "succeeded",
  ]);
  assertEquals(
    receipts.map((receipt) => receipt.occurredAt.toISOString()),
    [
      createdAt.toISOString(),
      new Date(createdAt.getTime() + 1_000).toISOString(),
    ],
  );
  const projection = await repository.findProjection(new FakeTransaction(), {
    access: access(),
    notificationId: createNotificationId("notif_event-1-actor-alice"),
  });
  assertEquals(projection?.deliveryState, "succeeded");
  assertEquals(jobs.completed.length, 1);
  assertEquals(
    jobs.completed[0]?.completedAt.toISOString(),
    new Date(createdAt.getTime() + 1_000).toISOString(),
  );
  assertEquals(
    jobs.leaseAssertions.map((assertion) => assertion.toISOString()),
    [
      createdAt.toISOString(),
      createdAt.toISOString(),
      new Date(createdAt.getTime() + 1_000).toISOString(),
    ],
  );
  assertEquals(jobs.claimCalls, 1);
  assertEquals(adapter.requests.length, 1);
});

Deno.test("lease expiry during a successful adapter call prevents completion", async () => {
  const fixture = await expiringAdapterFixture({
    status: "succeeded",
    resultReference: "must-not-complete",
  });

  await assertRejects(
    () => fixture.worker.runOne("worker_a", 30_000),
    LeaseFenceError,
    "lease expired",
  );
  await assertExpiredDelivery(fixture);
});

Deno.test("lease expiry during a retryable adapter call prevents retry persistence", async () => {
  const fixture = await expiringAdapterFixture({
    status: "retryable",
    failureCode: "REMOTE_BUSY",
  });

  await assertRejects(
    () => fixture.worker.runOne("worker_a", 30_000),
    LeaseFenceError,
    "lease expired",
  );
  await assertExpiredDelivery(fixture);
});

Deno.test("lease expiry during a terminal adapter call prevents dead-letter persistence", async () => {
  const fixture = await expiringAdapterFixture({
    status: "terminal",
    failureCode: "REMOTE_REJECTED",
  });

  await assertRejects(
    () => fixture.worker.runOne("worker_a", 30_000),
    LeaseFenceError,
    "lease expired",
  );
  await assertExpiredDelivery(fixture);
});

Deno.test("delivery execution fails closed without a notification claim port", async () => {
  const repository = new InMemoryNotificationRepository();
  const deliveryWorker = new NotificationDeliveryWorker({
    transactions: new ImmediateRunner(),
    repository,
    authorizer: new FakeDeliveryAuthorizer(),
    adapters: new Map(),
    retryPolicy: new ExponentialDeliveryRetryPolicy(),
    clock: { now: () => createdAt },
  });

  await assertRejects(
    () => deliveryWorker.runOne("worker_a", 30_000),
    NotificationDeliveryClaimUnavailableError,
    "claimNotificationDelivery",
  );
});

Deno.test("typed claim store leaves unrelated jobs outside the notification queue", async () => {
  const notification = claimedJob("in_app", 1);
  const unrelated = { ...notification, jobType: "audit.export" } as ClaimedJob;
  const mixed = new MixedFakeJobStore([unrelated, notification]);

  const claimed = await mixed.claimNotificationDelivery(
    new FakeTransaction(),
    {
      workerId: "worker_a",
      now: createdAt,
      leaseUntil: new Date(createdAt.getTime() + 30_000),
      limit: 1,
    },
  );

  assertEquals(claimed.map((job) => job.jobType), ["notification.delivery"]);
  assertEquals(mixed.remaining.map((job) => job.jobType), ["audit.export"]);
});

Deno.test("delivery worker retries with backoff and exposes terminal dead-letter evidence", async () => {
  const repository = new InMemoryNotificationRepository();
  const first = claimedJob("in_app", 1);
  const second = claimedJob("in_app", 2);
  await prepareProjection(repository, first);
  const adapter = new FakeChannelAdapter("in_app", {
    status: "retryable",
    failureCode: "REMOTE_BUSY",
  });
  const jobs = new FakeJobs([first, second]);
  const deliveryWorker = worker(
    repository,
    jobs,
    [adapter],
    new ExponentialDeliveryRetryPolicy(2),
  );

  assertEquals(
    await deliveryWorker.runOne("worker_a", 30_000),
    { status: "retry_scheduled", jobId: first.jobId },
  );
  assertEquals(
    await deliveryWorker.runOne("worker_a", 30_000),
    { status: "dead_lettered", jobId: second.jobId },
  );
  const receipts = await repository.listReceipts(new FakeTransaction(), {
    access: access(),
    notificationId: createNotificationId("notif_event-1-actor-alice"),
  });
  assertEquals(receipts.map((receipt) => receipt.outcome), [
    "attempted",
    "retry_scheduled",
    "attempted",
    "terminal",
  ]);
  assertEquals(receipts.at(-1)?.failureCode, "DELIVERY_RETRY_EXHAUSTED");
  assertEquals(jobs.failures.map((failure) => failure.outcome), [
    "retry_scheduled",
    "dead_lettered",
  ]);
});

Deno.test("delivery worker expires before the adapter is called", async () => {
  const repository = new InMemoryNotificationRepository();
  const job = claimedJob("in_app", 1);
  await prepareProjection(
    repository,
    job,
    new Date("2026-08-03T11:59:00.000Z"),
  );
  const adapter = new FakeChannelAdapter("in_app", {
    status: "succeeded",
    resultReference: "must-not-run",
  });
  const jobs = new FakeJobs([job]);

  const result = await worker(repository, jobs, [adapter]).runOne(
    "worker_a",
    30_000,
  );
  assertEquals(result, { status: "expired", jobId: job.jobId });
  assertEquals(adapter.requests, []);
  assertEquals(jobs.failures[0]?.failure, "NOTIFICATION_EXPIRED");
});

Deno.test("disabled channel produces a visible terminal receipt without provider delivery", async () => {
  const repository = new InMemoryNotificationRepository();
  const job = claimedJob("email", 1);
  await prepareProjection(repository, job);
  const jobs = new FakeJobs([job]);

  const result = await worker(
    repository,
    jobs,
    [new DisabledNotificationChannelAdapter("email")],
  ).runOne("worker_a", 30_000);
  assertEquals(result, { status: "dead_lettered", jobId: job.jobId });
  const receipts = await repository.listReceipts(new FakeTransaction(), {
    access: access(),
    notificationId: createNotificationId("notif_event-1-actor-alice"),
  });
  assertEquals(receipts.map((receipt) => receipt.outcome), ["terminal"]);
  assertEquals(receipts[0]?.failureCode, "CHANNEL_DISABLED");
});

async function prepareProjection(
  repository: InMemoryNotificationRepository,
  job: ClaimedJob,
  expiresAt?: Date,
): Promise<void> {
  const projection = freezeProjection({
    notificationId: createNotificationId("notif_event-1-actor-alice"),
    scope,
    recipientId: actorAlice,
    sourceEventId: "event-1",
    sourceEventType: "deal.updated",
    notificationType: "deal.updated",
    title: "Deal updated",
    body: "A deal changed.",
    createdAt,
    ...(expiresAt === undefined ? {} : { expiresAt }),
    deliveryState: "queued",
    idempotencyKey: "idem_notification-event-1-actor-alice" as IdempotencyKey,
  });
  await repository.insertProjection(new FakeTransaction(), projection);
  await repository.attachDeliveryJob(new FakeTransaction(), {
    access: access(),
    notificationId: projection.notificationId,
    idempotencyKey: projection.idempotencyKey,
    jobId: job.jobId,
    operationId: job.operationId!,
  });
}

function worker(
  repository: InMemoryNotificationRepository,
  jobs: FakeJobs,
  adapters: readonly NotificationChannelAdapter[],
  retryPolicy = new ExponentialDeliveryRetryPolicy(),
  clock = new MutableFakeClock(createdAt),
): NotificationDeliveryWorker {
  return new NotificationDeliveryWorker({
    transactions: new ImmediateRunner(),
    jobStore: jobs,
    repository,
    authorizer: new FakeDeliveryAuthorizer(),
    adapters: new Map(adapters.map((adapter) => [adapter.channel, adapter])),
    retryPolicy,
    clock,
  });
}

interface ExpiringAdapterFixture {
  readonly repository: InMemoryNotificationRepository;
  readonly job: ClaimedNotificationDeliveryJob;
  readonly jobs: FakeJobs;
  readonly adapter: FakeChannelAdapter;
  readonly worker: NotificationDeliveryWorker;
}

async function expiringAdapterFixture(
  result: Exclude<NotificationAdapterResult, { readonly status: "disabled" }>,
): Promise<ExpiringAdapterFixture> {
  const repository = new InMemoryNotificationRepository();
  const job = claimedJob("in_app", 1);
  await prepareProjection(repository, job);
  const clock = new MutableFakeClock(new Date("2026-08-03T12:29:59.000Z"));
  const adapter = new FakeChannelAdapter(
    "in_app",
    result,
    () => clock.advance(2_000),
  );
  const jobs = new FakeJobs([job]);
  return {
    repository,
    job,
    jobs,
    adapter,
    worker: worker(
      repository,
      jobs,
      [adapter],
      new ExponentialDeliveryRetryPolicy(),
      clock,
    ),
  };
}

async function assertExpiredDelivery(
  fixture: ExpiringAdapterFixture,
): Promise<void> {
  const receipts = await fixture.repository.listReceipts(
    new FakeTransaction(),
    {
      access: access(),
      notificationId: createNotificationId("notif_event-1-actor-alice"),
    },
  );
  const projection = await fixture.repository.findProjection(
    new FakeTransaction(),
    {
      access: access(),
      notificationId: createNotificationId("notif_event-1-actor-alice"),
    },
  );
  assertEquals(receipts.map((receipt) => receipt.outcome), ["attempted"]);
  assertEquals(projection?.deliveryState, "attempting");
  assertEquals(fixture.adapter.requests.length, 1);
  assertEquals(fixture.jobs.completed, []);
  assertEquals(fixture.jobs.failCalls, []);
  assertEquals(fixture.jobs.failures, []);
  assertEquals(
    fixture.jobs.leaseAssertions.map((assertion) => assertion.toISOString()),
    [
      "2026-08-03T12:29:59.000Z",
      "2026-08-03T12:29:59.000Z",
      "2026-08-03T12:30:01.000Z",
    ],
  );
}

function claimedJob(
  channel: "in_app" | "email",
  attemptNumber: number,
): ClaimedNotificationDeliveryJob {
  return {
    jobId: "job_notification-notif-event-1-actor-alice" as JobId,
    operationId: "op_notification-notif-event-1-actor-alice" as OperationId,
    jobType: "notification.delivery",
    schemaVersion: 1,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    initiatingActorId: actorAlice,
    correlationId: "cor_notification" as CorrelationId,
    idempotencyKey: "idem_notification-event-1-actor-alice" as IdempotencyKey,
    inputVersionReferences: [{
      aggregateType: "deal",
      aggregateId: "deal_solar",
      version: 1 as AggregateVersion,
    }],
    payload: {
      notificationId: "notif_event-1-actor-alice",
      recipientId: actorAlice,
      channel,
    },
    timeoutAt: new Date("2026-08-03T13:00:00.000Z"),
    createdAt,
    state: "running",
    progress: 0,
    attemptNumber,
    workerId: "worker_a",
    attemptStartedAt: createdAt,
    leaseExpiresAt: new Date("2026-08-03T12:30:00.000Z"),
  };
}

function access(): AuthorizedNotificationScope {
  return {
    ...scope,
    recipientId: actorAlice,
    action: "deliver",
    decision: {} as AuthorizedNotificationScope["decision"],
  };
}

class ImmediateRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    return Promise.resolve(callback(new FakeTransaction()));
  }
}

class MutableFakeClock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

class FakeTransaction implements TransactionHandle {
  readonly metadata: Readonly<Record<string, string>> = {};

  query<TRow>(): Promise<{ rows: TRow[]; rowCount: number }> {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }
}

class FakeJobs implements NotificationDeliveryJobStore {
  readonly completed: Array<{
    readonly jobId: JobId;
    readonly completedAt: Date;
  }> = [];
  readonly failCalls: Array<{
    readonly jobId: JobId;
    readonly failure: JobFailure;
  }> = [];
  readonly failures: Array<JobFailure> = [];
  readonly leaseAssertions: Date[] = [];
  claimCalls = 0;

  constructor(private readonly queue: ClaimedNotificationDeliveryJob[]) {}

  claimNotificationDelivery(
    _transaction: TransactionHandle,
    _claim: NotificationDeliveryClaim,
  ): Promise<readonly ClaimedNotificationDeliveryJob[]> {
    this.claimCalls++;
    const job = this.queue.shift();
    return Promise.resolve(job === undefined ? [] : [job]);
  }

  assertActiveLease(
    _transaction: TransactionHandle,
    job: ClaimedNotificationDeliveryJob,
    now: Date,
  ): Promise<void> {
    this.leaseAssertions.push(new Date(now));
    if (now >= job.leaseExpiresAt) {
      return Promise.reject(new LeaseFenceError(job.jobId, now));
    }
    return Promise.resolve();
  }

  complete(
    _transaction: TransactionHandle,
    job: ClaimedJob,
    _resultReference: string,
    completedAt: Date,
  ): Promise<void> {
    this.completed.push({ jobId: job.jobId, completedAt });
    return Promise.resolve();
  }

  fail(
    _transaction: TransactionHandle,
    _job: ClaimedJob,
    failure: JobFailure,
  ): Promise<void> {
    this.failCalls.push({ jobId: _job.jobId, failure });
    this.failures.push(failure);
    return Promise.resolve();
  }
}

class MixedFakeJobStore implements NotificationDeliveryJobStore {
  readonly remaining: ClaimedJob[];

  constructor(jobs: ClaimedJob[]) {
    this.remaining = [...jobs];
  }

  claimNotificationDelivery(
    _transaction: TransactionHandle,
    _claim: NotificationDeliveryClaim,
  ): Promise<readonly ClaimedNotificationDeliveryJob[]> {
    const index = this.remaining.findIndex((job) =>
      job.jobType === "notification.delivery"
    );
    if (index < 0) return Promise.resolve([]);
    const [job] = this.remaining.splice(index, 1);
    return Promise.resolve([job as ClaimedNotificationDeliveryJob]);
  }

  assertActiveLease(): Promise<void> {
    return Promise.resolve();
  }

  complete(): Promise<void> {
    return Promise.resolve();
  }

  fail(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeDeliveryAuthorizer {
  authorize(
    authorizedScope: NotificationScope,
    recipientId: ActorId,
  ): Promise<AuthorizedNotificationScope> {
    return Promise.resolve({
      ...authorizedScope,
      recipientId,
      action: "deliver",
      decision: {} as AuthorizedNotificationScope["decision"],
    });
  }
}

class FakeChannelAdapter implements NotificationChannelAdapter {
  readonly enabled = true;
  readonly requests: unknown[] = [];

  constructor(
    readonly channel: "in_app" | "email",
    private readonly result: NotificationAdapterResult,
    private readonly onDeliver: () => void = () => {},
  ) {}

  deliver(request: unknown): Promise<NotificationAdapterResult> {
    this.requests.push(request);
    this.onDeliver();
    return Promise.resolve(this.result);
  }
}

class LeaseFenceError extends Error {
  constructor(jobId: JobId, now: Date) {
    super(
      `Job "${jobId}" lease expired at "${now.toISOString()}"; expected an active lease.`,
    );
    this.name = "LeaseFenceError";
  }
}
