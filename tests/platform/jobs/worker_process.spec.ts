import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  assertWorkerReadinessContract,
  loadConfiguredWorker,
  runWorkerLoop,
  type WorkerProcess,
  workerProcessOptions,
} from "../../../src/platform/jobs/worker_process.ts";
import { LocalHealthcheckWorker } from "../../../src/platform/jobs/local_worker.ts";
import { registeredMigrations } from "../../../src/platform/persistence/registered_migrations.ts";

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

Deno.test("worker loop does not claim another job after drain begins", async () => {
  const worker = new RecordingWorker();
  const controller = new AbortController();
  let release: (() => void) | undefined;
  const firstJob = new Promise<void>((resolve) => release = resolve);
  worker.next = async () => {
    await firstJob;
    controller.abort();
    return { status: "succeeded" };
  };

  const loop = runWorkerLoop(
    worker,
    { workerId: "worker_drain", leaseMilliseconds: 10, pollMilliseconds: 1 },
    controller.signal,
  );
  release?.();
  await loop;
  assertEquals(worker.calls.length, 1);
});

Deno.test("worker readiness fails closed, recovers, and then drains", async () => {
  const worker = new RecordingWorker();
  const controller = new AbortController();
  const states: boolean[] = [];
  let probeCalls = 0;
  worker.next = () => {
    controller.abort();
    return Promise.resolve({ status: "idle" });
  };
  await runWorkerLoop(
    worker,
    {
      workerId: "worker_readiness",
      leaseMilliseconds: 10,
      pollMilliseconds: 1,
      readinessProbe: () => {
        probeCalls += 1;
        if (probeCalls === 1) throw new Error("database unavailable");
        return Promise.resolve();
      },
      onReadinessChange: (ready) => states.push(ready),
    },
    controller.signal,
    () => Promise.resolve(),
  );
  assertEquals(states, [false, true]);
  assertEquals(worker.calls.length, 1);
});

Deno.test("worker startup rejects a module without readiness registration", () => {
  assertThrows(
    () =>
      assertWorkerReadinessContract("invalid-worker", new RecordingWorker()),
    Error,
    "dependency-backed readiness",
  );
});

Deno.test("local worker readiness requires job table and complete migration state", async () => {
  const missingTable = new LocalHealthcheckWorker(
    new WorkerReadinessPoolFake(null, 0) as never,
  );
  await assertRejects(
    () => missingTable.ready(),
    Error,
    "platform.jobs",
  );

  const incomplete = new LocalHealthcheckWorker(
    new WorkerReadinessPoolFake("platform.jobs", 1) as never,
  );
  await assertRejects(
    () => incomplete.ready(),
    Error,
    "active migrations",
  );

  const healthy = new LocalHealthcheckWorker(
    new WorkerReadinessPoolFake(
      "platform.jobs",
      registeredMigrations().length,
    ) as never,
  );
  await healthy.ready();
});

class RecordingWorker implements WorkerProcess {
  readonly calls: Array<{ workerId: string; leaseMilliseconds: number }> = [];
  next: () => Promise<{ readonly status: string }> = () =>
    Promise.resolve({ status: "idle" });

  executeOne(
    workerId: string,
    leaseMilliseconds: number,
  ): Promise<{ readonly status: string }> {
    this.calls.push({ workerId, leaseMilliseconds });
    return this.next();
  }
}

class WorkerReadinessPoolFake {
  constructor(
    private readonly jobsTable: string | null,
    private readonly migrationCount: number,
  ) {}

  on(): this {
    return this;
  }

  query<T>(sql: string): Promise<{ rows: T[] }> {
    if (sql.includes("to_regclass")) {
      return Promise.resolve({ rows: [{ jobs: this.jobsTable }] as T[] });
    }
    return Promise.resolve({
      rows: [{ count: String(this.migrationCount) }] as T[],
    });
  }
}
