import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  assertRestoreIncludesAuthoritativeRecords,
  assertRollbackPreservesAuthoritativeRecords,
  type InfrastructureSmokeProbe,
  runInfrastructureSmoke,
} from "../../../src/platform/operations/smoke.ts";

Deno.test("local smoke runs every staging evidence seam", async () => {
  const probe = new PassingInfrastructureProbe();
  const results = await runInfrastructureSmoke(probe);

  assertEquals(results.length, 8);
  assertEquals(results.at(-1)?.name, "restart-recovery");
  assertEquals(probe.calls, [
    "application-health",
    "worker-health",
    "database-connectivity",
    "object-storage-connectivity",
    "secret-resolution",
    "durable-job-execution",
    "outbox-dispatch",
    "restart-recovery",
  ]);
});

Deno.test("smoke stops at the failing evidence seam", async () => {
  const probe = new FailingInfrastructureProbe();

  await assertRejects(
    () => runInfrastructureSmoke(probe),
    Error,
    "object storage",
  );
  assertEquals(probe.calls, [
    "application-health",
    "worker-health",
    "database-connectivity",
    "object-storage-connectivity",
  ]);
});

Deno.test("restore and rollback preserve authoritative records", () => {
  const before = ["database", "platform.jobs", "audit"];
  assertRestoreIncludesAuthoritativeRecords(before, [
    ...before,
    "new-derived-index",
  ]);
  assertRollbackPreservesAuthoritativeRecords(before, [...before]);

  assertThrows(
    () => assertRestoreIncludesAuthoritativeRecords(before, ["database"]),
    Error,
    "platform.jobs",
  );
  assertThrows(
    () => assertRollbackPreservesAuthoritativeRecords(before, ["database"]),
    Error,
    "platform.jobs",
  );
});

class PassingInfrastructureProbe implements InfrastructureSmokeProbe {
  readonly calls: string[] = [];

  applicationHealth(): Promise<void> {
    return this.record("application-health");
  }

  workerHealth(): Promise<void> {
    return this.record("worker-health");
  }

  databaseConnectivity(): Promise<void> {
    return this.record("database-connectivity");
  }

  objectStorageConnectivity(): Promise<void> {
    return this.record("object-storage-connectivity");
  }

  secretResolution(): Promise<void> {
    return this.record("secret-resolution");
  }

  durableJobExecution(): Promise<void> {
    return this.record("durable-job-execution");
  }

  outboxDispatch(): Promise<void> {
    return this.record("outbox-dispatch");
  }

  restartRecovery(): Promise<void> {
    return this.record("restart-recovery");
  }

  protected record(name: string): Promise<void> {
    this.calls.push(name);
    return Promise.resolve();
  }
}

class FailingInfrastructureProbe extends PassingInfrastructureProbe {
  override objectStorageConnectivity(): Promise<void> {
    this.calls.push("object-storage-connectivity");
    return Promise.reject(new Error("object storage unavailable"));
  }
}
