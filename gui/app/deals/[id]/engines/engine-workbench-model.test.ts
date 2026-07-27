import { describe, expect, it } from "vitest";
import {
  gaResultLogs,
  milpResultLogs,
  onnxResultLogs,
  termSheetRequestFromInput,
  timestampConsoleLog,
  Translation,
} from "./engine-workbench-model";

const translate: Translation = (key, values = {}) => {
  const suffix = Object.entries(values)
    .map(([name, value]) => `${name}:${value}`)
    .join(",");
  return suffix ? `${key}|${suffix}` : key;
};

const termSheetInput = {
  valuationMin: 80,
  valuationMax: 120,
  cash: 0.4,
  equity: 0.3,
  earnOut: 0.2,
  escrow: 0.1,
  maxLeverage: 4,
  minCoverage: 2.5,
};

function expectNestedTermSheetPreferences(): void {
  expect(termSheetRequestFromInput(termSheetInput)).toEqual({
    valuationMin: 80,
    valuationMax: 120,
    preferences: { cash: 0.4, equity: 0.3, earnOut: 0.2, escrow: 0.1 },
    maxLeverage: 4,
    minCoverage: 2.5,
  });
}

function expectEngineResultLogs(): void {
  expect(onnxResultLogs(translate, {
    metrics: { insolvencyRisk: 0.12345, zScore: "2.10" },
    dcfRiskLabel: "MEDIUM",
  })).toContain("engines.onnx.logs.insolvency|risk:12.35");
  expect(
    milpResultLogs(translate, {
      optimization: { status: "optimal" },
      totalSynergy: 19.5,
      totalCost: 42,
    })[0],
  ).toBe("engines.milp.logs.done|status:OPTIMAL");
  expect(gaResultLogs(translate, [{ valuation: 101.236, fitness: 0.98765 }]))
    .toContain("engines.ga.logs.alt|idx:1,val:101.24,fit:0.9877");
}

function expectTimestampedConsoleMessage(): void {
  const now = new Date("2026-07-26T12:34:56.000Z");
  expect(timestampConsoleLog("done", now)).toContain("done");
}

describe("engine workbench model", () => {
  it(
    "builds nested term sheet preferences from the flat UI draft",
    expectNestedTermSheetPreferences,
  );
  it(
    "formats engine result logs with the same numeric precision as the UI",
    expectEngineResultLogs,
  );
  it(
    "prefixes console messages with the localized current time",
    expectTimestampedConsoleMessage,
  );
});
