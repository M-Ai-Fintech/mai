import { assertEquals, assertFalse, assertThrows } from "@std/assert";
import {
  assertProvisionable,
  isProvisionable,
  parseInfrastructurePlan,
  parseInfrastructureSet,
  requiredAuthoritativeRecords,
} from "../../../src/platform/operations/contract.ts";

Deno.test("MAI-148 manifests validate all environment boundaries", async () => {
  const values = await Promise.all([
    readManifest("development"),
    readManifest("staging"),
    readManifest("production"),
  ]);
  const plans = parseInfrastructureSet(values);

  assertEquals(plans.map((plan) => plan.environment), [
    "development",
    "staging",
    "production",
  ]);
  assertEquals(isProvisionable(plans[0]), true);
  assertFalse(isProvisionable(plans[1]));
  assertFalse(isProvisionable(plans[2]));
  assertThrows(
    () => assertProvisionable(plans[1]),
    Error,
    "lacks owner approval",
  );
});

Deno.test("topology rejects prototype microservice names", async () => {
  const manifest = await readManifest("development") as Record<string, unknown>;
  const topology = manifest.topology as Record<string, unknown>;
  const processes = topology.processes as Array<Record<string, unknown>>;
  processes[0].name = "core";

  assertThrows(
    () => parseInfrastructurePlan(manifest),
    Error,
    "expected the MAI-148 contract shape",
  );
});

Deno.test("production readiness requires approval and recovery evidence", async () => {
  const manifest = await readManifest("production") as Record<string, unknown>;
  manifest.readinessClaim = "production-ready";

  assertThrows(
    () => parseInfrastructurePlan(manifest),
    Error,
    "claims production-ready",
  );
});

Deno.test("authoritative recovery set includes MAI-106 records", () => {
  assertEquals(requiredAuthoritativeRecords(), [
    "database",
    "platform.outbox",
    "platform.inbox",
    "platform.jobs",
    "audit",
    "evidence",
    "object-storage",
  ]);
});

async function readManifest(
  environment: "development" | "staging" | "production",
): Promise<unknown> {
  const path = new URL(
    `../../../infra/environments/${environment}.json`,
    import.meta.url,
  );
  return JSON.parse(await Deno.readTextFile(path));
}
