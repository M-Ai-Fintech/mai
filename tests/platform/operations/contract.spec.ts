import { assertEquals, assertThrows } from "@std/assert";
import {
  assertProvisionable,
  isProvisionable,
  parseInfrastructurePlan,
  parseInfrastructureSet,
  requiredAuthoritativeRecords,
} from "../../../src/platform/operations/contract.ts";

Deno.test("MVP local manifest validates the single local boundary", async () => {
  const values = [await readManifest()];
  const plans = parseInfrastructureSet(values);

  assertEquals(plans.map((plan) => plan.environment), ["local"]);
  assertEquals(isProvisionable(plans[0]), true);
  assertProvisionable(plans[0]);
});

Deno.test("topology rejects prototype microservice names", async () => {
  const manifest = await readManifest() as Record<string, unknown>;
  const topology = manifest.topology as Record<string, unknown>;
  const processes = topology.processes as Array<Record<string, unknown>>;
  processes[0].name = "core";

  assertThrows(
    () => parseInfrastructurePlan(manifest),
    Error,
    "expected the MVP-local operations contract shape",
  );
});

Deno.test("cloud readiness claims are rejected by the local contract", async () => {
  const manifest = await readManifest() as Record<string, unknown>;
  manifest.readinessClaim = "production-ready";

  assertThrows(
    () => parseInfrastructurePlan(manifest),
    Error,
    "expected the MVP-local operations contract shape",
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

async function readManifest(): Promise<unknown> {
  const path = new URL(
    "../../../infra/environments/development.json",
    import.meta.url,
  );
  return JSON.parse(await Deno.readTextFile(path));
}
