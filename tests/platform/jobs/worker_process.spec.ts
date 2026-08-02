import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  loadConfiguredWorker,
  runWorkerLoop,
  type WorkerProcess,
  workerProcessOptions,
} from "../../../src/platform/jobs/worker_process.ts";

Deno.test("worker loop polls idle jobs and stops on shutdown", async () => {
  const worker = new RecordingWorker();
  const controller = new AbortController();
  const sleep = (): Promise<void> => Promise.resolve(controller.abort());

  await runWorkerLoop(
    worker,
    { workerId: "worker_test", leaseMilliseconds: 10, pollMilliseconds: 1 },
    controller.signal,
    sleep,
  );

  assertEquals(worker.calls, [{
    workerId: "worker_test",
    leaseMilliseconds: 10,
  }]);
});

Deno.test("worker configuration uses safe defaults and rejects invalid values", () => {
  assertEquals(workerProcessOptions({ MAI_WORKER_ID: "worker_test" }), {
    workerId: "worker_test",
    leaseMilliseconds: 60_000,
    pollMilliseconds: 1_000,
  });
  assertThrows(
    () =>
      workerProcessOptions({
        MAI_WORKER_ID: "worker_test",
        MAI_WORKER_POLL_MS: "0",
      }),
    Error,
    "positive integer",
  );
  assertThrows(
    () => workerProcessOptions({}),
    Error,
    "MAI_WORKER_ID",
  );
});

Deno.test("worker loader accepts a named factory and rejects invalid exports", async () => {
  const worker = new RecordingWorker();
  const loaded = await loadConfiguredWorker(
    "fixture-worker",
    () => Promise.resolve({ createWorker: () => worker }),
  );
  assertEquals(loaded, worker);

  await assertRejects(
    () => loadConfiguredWorker("invalid-worker", () => Promise.resolve({})),
    Error,
    "Worker module export is invalid",
  );
});

class RecordingWorker implements WorkerProcess {
  readonly calls: Array<{ workerId: string; leaseMilliseconds: number }> = [];

  executeOne(
    workerId: string,
    leaseMilliseconds: number,
  ): Promise<{ readonly status: string }> {
    this.calls.push({ workerId, leaseMilliseconds });
    return Promise.resolve({ status: "idle" });
  }
}
