import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import manifestJson from "../fixtures/investor-demo/manifest.json" with {
  type: "json",
};
import {
  assertSafeDemoResetTarget,
  type DemoManifest,
  runSyntheticInvestorDemo,
} from "../../src/demo_readiness/runner.ts";

const manifest = manifestJson as DemoManifest;
const fixtureRoot = new URL("../fixtures/investor-demo/", import.meta.url);
const target = {
  environment: "test" as const,
  databaseName: "mai_demo_readiness" as const,
};

Deno.test("synthetic investor demo is deterministic across a clean reset", async () => {
  const first = await runSyntheticInvestorDemo(manifest, fixtureRoot, target);
  const second = await runSyntheticInvestorDemo(manifest, fixtureRoot, target);

  assertEquals(second, first);
  assertEquals(first.documentVersions.length, 4);
  assertEquals(first.processingRuns.length, 4);
  assertEquals(
    first.processingRuns.every((run) => run.state === "succeeded"),
    true,
  );
  assertEquals(first.evidenceIds.length, 4);
  assertEquals(first.citations.length, 4);
  assertEquals(
    first.citations.map((citation) => citation.checksum),
    first.documentVersions.map((version) => version.checksum),
  );
  assertEquals(first.missingCategories, ["tax"]);
  assertEquals(first.limitations.length, 3);
  assertEquals(first.authority.agentDecisionRejected, true);
  assertEquals(
    first.auditEventId,
    `audit_demo-readiness-${first.datasetDigest.slice(0, 32)}`,
  );
  assertEquals(first.calculation, {
    id: "calc_enterprise-value",
    enterpriseValueBrl: 98_150_000,
    equityValueBrl: 79_450_000,
    algorithmVersion: "deterministic-valuation-v1",
  });
  assertEquals(
    first.artifact.sourceChecksums,
    first.documentVersions.map(
      (version) => version.checksum,
    ),
  );
  assertEquals(first.labels, {
    synthetic: true,
    customerData: false,
    provider: "managed_local",
    calculation: "deterministic",
    persistence: "process_local",
  });
});

Deno.test("synthetic investor demo rejects a changed source checksum", async () => {
  const changed: DemoManifest = {
    ...manifest,
    documents: manifest.documents.map((document, index) =>
      index === 0 ? { ...document, checksum: "0".repeat(64) } : document
    ),
  };

  await assertRejects(
    () => runSyntheticInvestorDemo(changed, fixtureRoot, target),
    Error,
    "did not match expected",
  );
});

Deno.test("synthetic investor demo rejects fixture-root traversal", async () => {
  const unsafe = structuredClone(manifest) as DemoManifest;
  Object.assign(unsafe.documents[0], { path: "../manifest.json" });

  await assertRejects(
    () => runSyntheticInvestorDemo(unsafe, fixtureRoot, target),
    Error,
    "confined",
  );
});

Deno.test("demo reset rejects non-isolated environment and database targets", () => {
  assertThrows(
    () =>
      assertSafeDemoResetTarget({
        environment: "production",
        databaseName: "mai",
      } as never),
    Error,
    "is unsafe",
  );
});
