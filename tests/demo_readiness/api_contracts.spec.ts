import { assertEquals, assertThrows } from "@std/assert";
import manifestJson from "../fixtures/investor-demo/manifest.json" with {
  type: "json",
};
import {
  demoReadinessResultSchema,
  demoShellReadModelSchema,
  parseDemoEnvelope,
} from "../../src/demo_readiness/api_contracts.ts";
import {
  type DemoManifest,
  runSyntheticInvestorDemo,
} from "../../src/demo_readiness/runner.ts";

Deno.test("demo API schemas accept the governed workflow result", async () => {
  const result = await runSyntheticInvestorDemo(
    manifestJson as DemoManifest,
    new URL("../fixtures/investor-demo/", import.meta.url),
    { environment: "test", databaseName: "mai_demo_readiness" },
  );
  const parsed = parseDemoEnvelope({
    data: result,
    meta: { correlationId: "cor_contract-test", freshness: "current" },
  }, demoReadinessResultSchema);
  assertEquals(parsed.datasetDigest, result.datasetDigest);
});

Deno.test("demo API schemas reject presentation-only success envelopes", () => {
  assertThrows(
    () =>
      parseDemoEnvelope({
        data: {},
        meta: { correlationId: "cor_contract-test", freshness: "current" },
      }, demoReadinessResultSchema),
  );
  assertThrows(
    () =>
      parseDemoEnvelope({
        data: { deal: { id: "deal_serra-azul" } },
        meta: { correlationId: "cor_contract-test", freshness: "current" },
      }, demoShellReadModelSchema),
  );
});
