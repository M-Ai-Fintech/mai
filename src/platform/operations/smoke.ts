export type SmokeCheckName =
  | "application-health"
  | "worker-health"
  | "database-connectivity"
  | "object-storage-connectivity"
  | "secret-resolution"
  | "durable-job-execution"
  | "outbox-dispatch"
  | "restart-recovery";

export interface InfrastructureSmokeProbe {
  applicationHealth(): Promise<void>;
  workerHealth(): Promise<void>;
  databaseConnectivity(): Promise<void>;
  objectStorageConnectivity(): Promise<void>;
  secretResolution(): Promise<void>;
  durableJobExecution(): Promise<void>;
  outboxDispatch(): Promise<void>;
  restartRecovery(): Promise<void>;
}

export interface SmokeCheckResult {
  readonly name: SmokeCheckName;
  readonly state: "passed";
}

const smokeChecks: readonly [
  SmokeCheckName,
  keyof InfrastructureSmokeProbe,
][] = [
  ["application-health", "applicationHealth"],
  ["worker-health", "workerHealth"],
  ["database-connectivity", "databaseConnectivity"],
  ["object-storage-connectivity", "objectStorageConnectivity"],
  ["secret-resolution", "secretResolution"],
  ["durable-job-execution", "durableJobExecution"],
  ["outbox-dispatch", "outboxDispatch"],
  ["restart-recovery", "restartRecovery"],
];

export async function runInfrastructureSmoke(
  probe: InfrastructureSmokeProbe,
): Promise<readonly SmokeCheckResult[]> {
  const results: SmokeCheckResult[] = [];
  for (const [name, method] of smokeChecks) {
    await probe[method]();
    results.push({ name, state: "passed" });
  }
  return results;
}

export function assertRollbackPreservesAuthoritativeRecords(
  before: readonly string[],
  after: readonly string[],
): void {
  const missing = before.filter((record) => !after.includes(record));
  if (missing.length === 0) return;
  throw new Error(
    `Rollback removed authoritative records "${
      missing.join(",")
    }"; expected all pre-deployment records to remain.`,
  );
}

export function assertRestoreIncludesAuthoritativeRecords(
  expected: readonly string[],
  restored: readonly string[],
): void {
  const missing = expected.filter((record) => !restored.includes(record));
  if (missing.length === 0) return;
  throw new Error(
    `Restore omitted authoritative records "${
      missing.join(",")
    }"; expected the complete protected recovery set.`,
  );
}
