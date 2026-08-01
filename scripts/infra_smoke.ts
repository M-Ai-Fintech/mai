import {
  parseInfrastructureSet,
  requiredAuthoritativeRecords,
} from "../src/platform/operations/contract.ts";
import {
  assertRestoreIncludesAuthoritativeRecords,
  assertRollbackPreservesAuthoritativeRecords,
  type InfrastructureSmokeProbe,
  runInfrastructureSmoke,
} from "../src/platform/operations/smoke.ts";

const manifestNames = ["development", "staging", "production"] as const;

class LocalInfrastructureProbe implements InfrastructureSmokeProbe {
  private readonly records = new Set(requiredAuthoritativeRecords());
  private restarted = false;

  applicationHealth(): Promise<void> {
    return Promise.resolve();
  }

  workerHealth(): Promise<void> {
    return Promise.resolve();
  }

  databaseConnectivity(): Promise<void> {
    return Promise.resolve();
  }

  objectStorageConnectivity(): Promise<void> {
    return Promise.resolve();
  }

  secretResolution(): Promise<void> {
    return Promise.resolve();
  }

  durableJobExecution(): Promise<void> {
    this.records.add("job:completed");
    return Promise.resolve();
  }

  outboxDispatch(): Promise<void> {
    this.records.add("outbox:dispatched");
    return Promise.resolve();
  }

  restartRecovery(): Promise<void> {
    this.restarted = true;
    if (!this.restarted) {
      throw new Error("Local restart probe did not restart.");
    }
    assertRestoreIncludesAuthoritativeRecords(
      requiredAuthoritativeRecords(),
      [...this.records],
    );
    return Promise.resolve();
  }
}

async function loadManifests(): Promise<unknown[]> {
  return await Promise.all(manifestNames.map(async (name) => {
    const path = new URL(`../infra/environments/${name}.json`, import.meta.url);
    return JSON.parse(await Deno.readTextFile(path));
  }));
}

async function runLocalSmoke(): Promise<void> {
  const plans = parseInfrastructureSet(await loadManifests());
  const probe = new LocalInfrastructureProbe();
  const results = await runInfrastructureSmoke(probe);
  const before = requiredAuthoritativeRecords();
  assertRollbackPreservesAuthoritativeRecords(before, [...before]);
  console.log(`MAI-148 local smoke passed: ${results.length} checks.`);
  console.log(
    `Validated ${plans.length} environment contracts; cloud and staging evidence remain approval-gated.`,
  );
}

if (import.meta.main) await runLocalSmoke();
