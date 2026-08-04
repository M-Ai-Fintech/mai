import { assertEquals, assertRejects } from "@std/assert";
import type { ClaimedJob } from "../../src/platform/jobs/repository.ts";
import {
  DisabledNotificationChannelAdapter,
  NotificationDeliveryClaimUnavailableError,
  NotificationDeliveryWorker,
} from "../../src/notifications/delivery.ts";
import { createNotificationId } from "../../src/notifications/model.ts";
import { InMemoryNotificationRepository } from "../../src/notifications/repository.ts";
import { ExponentialDeliveryRetryPolicy } from "../../src/notifications/retry.ts";
import {
  access,
  claimedJob,
  createdAt,
  FakeDeliveryAuthorizer,
  FakeJobs,
  FakeTransaction,
  ImmediateRunner,
  MixedFakeJobStore,
  prepareProjection,
  worker,
} from "./delivery_test_support.ts";

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
