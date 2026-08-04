import { assertEquals, assertRejects } from "@std/assert";
import { createNotificationId } from "../../src/notifications/model.ts";
import type { NotificationAdapterResult } from "../../src/notifications/delivery.ts";
import {
  access,
  assertExpiredDelivery,
  claimedJob,
  createdAt,
  expiringAdapterFixture,
  FakeChannelAdapter,
  FakeJobs,
  FakeTransaction,
  LeaseFenceError,
  MutableFakeClock,
  prepareProjection,
  worker,
} from "./delivery_test_support.ts";
import { InMemoryNotificationRepository } from "../../src/notifications/repository.ts";
import { ExponentialDeliveryRetryPolicy } from "../../src/notifications/retry.ts";

Deno.test("delivery worker records timestamps from the active delivery lease", async () => {
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
  await assertExpiredAdapterResult({
    status: "succeeded",
    resultReference: "must-not-complete",
  });
});

Deno.test("lease expiry during a retryable adapter call prevents retry persistence", async () => {
  await assertExpiredAdapterResult({
    status: "retryable",
    failureCode: "REMOTE_BUSY",
  });
});

Deno.test("lease expiry during a terminal adapter call prevents dead-letter persistence", async () => {
  await assertExpiredAdapterResult({
    status: "terminal",
    failureCode: "REMOTE_REJECTED",
  });
});

async function assertExpiredAdapterResult(
  result: Exclude<NotificationAdapterResult, { readonly status: "disabled" }>,
): Promise<void> {
  const fixture = await expiringAdapterFixture(result);
  await assertRejects(
    () => fixture.worker.runOne("worker_a", 30_000),
    LeaseFenceError,
    "lease expired",
  );
  await assertExpiredDelivery(fixture);
}
