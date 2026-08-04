import { assertEquals } from "@std/assert";
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
  type NotificationAdapterResult,
  type NotificationChannelAdapter,
  type NotificationDeliveryClaim,
  type NotificationDeliveryJobStore,
  NotificationDeliveryWorker,
} from "../../src/notifications/delivery.ts";
import { InMemoryNotificationRepository } from "../../src/notifications/repository.ts";
import { ExponentialDeliveryRetryPolicy } from "../../src/notifications/retry.ts";
import type { AuthorizedNotificationScope } from "../../src/notifications/projection.ts";

export const scope: NotificationScope = {
  tenantId: "tenant_alpha" as TenantId,
  workspaceId: "workspace_main" as WorkspaceId,
  dealId: "deal_solar" as DealId,
};
export const actorAlice = "actor_alice" as ActorId;
export const createdAt = new Date("2026-08-03T12:00:00.000Z");

export async function prepareProjection(
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

export function worker(
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

export interface ExpiringAdapterFixture {
  readonly repository: InMemoryNotificationRepository;
  readonly job: ClaimedNotificationDeliveryJob;
  readonly jobs: FakeJobs;
  readonly adapter: FakeChannelAdapter;
  readonly worker: NotificationDeliveryWorker;
}

export async function expiringAdapterFixture(
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

export async function assertExpiredDelivery(
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

export function claimedJob(
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

export function access(): AuthorizedNotificationScope {
  return {
    ...scope,
    recipientId: actorAlice,
    action: "deliver",
    decision: {} as AuthorizedNotificationScope["decision"],
  };
}

export class ImmediateRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    return Promise.resolve(callback(new FakeTransaction()));
  }
}

export class MutableFakeClock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

export class FakeTransaction implements TransactionHandle {
  readonly metadata: Readonly<Record<string, string>> = {};

  query<TRow>(): Promise<{ rows: TRow[]; rowCount: number }> {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }
}

export class FakeJobs implements NotificationDeliveryJobStore {
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
    job: ClaimedJob,
    failure: JobFailure,
  ): Promise<void> {
    this.failCalls.push({ jobId: job.jobId, failure });
    this.failures.push(failure);
    return Promise.resolve();
  }
}

export class MixedFakeJobStore implements NotificationDeliveryJobStore {
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

export class FakeDeliveryAuthorizer {
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

export class FakeChannelAdapter implements NotificationChannelAdapter {
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

export class LeaseFenceError extends Error {
  constructor(jobId: JobId, now: Date) {
    super(
      `Job "${jobId}" lease expired at "${now.toISOString()}"; expected an active lease.`,
    );
    this.name = "LeaseFenceError";
  }
}
