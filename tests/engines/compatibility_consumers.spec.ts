import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { synergyPricingTool } from "../../src/agent/actions.ts";

const consumers = [
  {
    path: "src/api/routes/legacy.ts",
    adapter: "engines/optimization/negotiation/compatibility.ts",
  },
  {
    path: "src/cli/term-sheet-command.ts",
    adapter: "engines/optimization/negotiation/compatibility.ts",
  },
  {
    path: "src/cli/document-command.ts",
    adapter: "engines/optimization/negotiation/term_sheet_compatibility.ts",
  },
  {
    path: "src/agent/tools/core_tools.ts",
    adapter: "engines/optimization/negotiation/compatibility.ts",
  },
];

Deno.test("active negotiation consumers use the negotiation compatibility boundary", async () => {
  for (const consumer of consumers) {
    const source = await Deno.readTextFile(consumer.path);
    assertStringIncludes(source, consumer.adapter);
    assert(!source.includes("optimizeWithConstraints"), consumer.path);
  }
});

Deno.test("portfolio fixture labels its non-financial synergy score explicitly", async () => {
  const source = await Deno.readTextFile("src/cli/portfolio-command.ts");
  assertStringIncludes(source, "calculateSyntheticSynergyScore");
  assert(!source.includes("calculateSynergyPrice"));
});

Deno.test("agent synergy helper returns typed failures instead of success", async () => {
  const result = await synergyPricingTool.execute!({
    standaloneValue: 100,
    costSynergies: [],
    revenueSynergies: [10],
    integrationCosts: [2],
    wacc: 0.1,
    taxRate: 0.34,
    revenueHaircut: 0.4,
    sharingCoefficient: 0.3,
  }, {} as Parameters<NonNullable<typeof synergyPricingTool.execute>>[1]);

  assertEquals(result.success, false);
  if (result.success) return;
  assertEquals(result.error.code, "REQUIRED_DATA_UNAVAILABLE");
});
