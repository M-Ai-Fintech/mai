import { assertEquals } from "@std/assert";
import manifestJson from "../fixtures/investor-demo/manifest.json" with {
  type: "json",
};
import type { DemoManifest } from "../../src/demo_readiness/contracts.ts";
import {
  demoScope,
  runSyntheticInvestorDemo,
} from "../../src/demo_readiness/runner.ts";
import { buildLocalMvpReceipt } from "../../src/local_mvp/workflow_seed.ts";

const fixtureRoot = new URL("../fixtures/investor-demo/", import.meta.url);

Deno.test("local workflow receipt is deterministic, scoped, and redacted", async () => {
  const result = await runSyntheticInvestorDemo(
    manifestJson as DemoManifest,
    fixtureRoot,
    { environment: "local-demo", databaseName: "mai_demo_readiness" },
  );
  const receipt = buildLocalMvpReceipt(result);

  assertEquals(receipt.tenantId, demoScope.tenantId);
  assertEquals(receipt.workspaceId, demoScope.workspaceId);
  assertEquals(receipt.dealId, demoScope.dealId);
  assertEquals(receipt.contentDigest, result.datasetDigest);
  assertEquals(receipt.payload, {
    datasetId: result.datasetId,
    datasetDigest: result.datasetDigest,
    synthetic: true,
    customerData: false,
  });
});
