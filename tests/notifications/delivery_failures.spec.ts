import { assertEquals } from "@std/assert";
import { createNotificationId } from "../../src/notifications/model.ts";
import { InMemoryNotificationRepository } from "../../src/notifications/repository.ts";
import { ExponentialDeliveryRetryPolicy } from "../../src/notifications/retry.ts";
import {
  access,
  claimedJob,
  FakeChannelAdapter,
  FakeJobs,
  FakeTransaction,
  prepareProjection,
  worker,
} from "./delivery_test_support.ts";

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
