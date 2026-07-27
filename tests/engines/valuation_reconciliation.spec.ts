import { assertAlmostEquals, assertEquals } from "@std/assert";
import {
  computeChaffeDLOM,
  computeContingencyDeductions,
  computeJcpTaxShield,
  cumulativeNormalCDF,
  ReconciliationEngine,
  ValuationEngine,
} from "../../src/engines/optimization/valuation/index.ts";
import type { ExtendedValuationInput } from "../../src/shared/types.ts";

const CONTINGENCY_INPUT = {
  taxContingencies: [
    {
      id: "T1",
      category: "tax" as const,
      description: "ICMS",
      amount: 500_000,
      probability: "PROBABLE" as const,
    },
    {
      id: "T2",
      category: "tax" as const,
      description: "PIS",
      amount: 200_000,
      probability: "POSSIBLE" as const,
    },
  ],
  laborContingencies: [
    {
      id: "L1",
      category: "labor" as const,
      description: "CLT Overtime",
      amount: 100_000,
      probability: "POSSIBLE" as const,
      probabilityWeight: 0.60,
    },
    {
      id: "L2",
      category: "labor" as const,
      description: "FGTS Claim",
      amount: 50_000,
      probability: "REMOTE" as const,
    },
  ],
};

const RECONCILIATION_INPUT = {
  values: [
    5_000_000,
    6_500_000,
    5_500_000,
    50_000_000,
    45_000_000,
    40_000_000,
  ],
  weightsConfig: {
    bookValue: { minWeight: 0.0, maxWeight: 0.10, priorWeight: 0.05 },
    dcf: { minWeight: 0.30, maxWeight: 0.70, priorWeight: 0.50 },
    terminalValue: { minWeight: 0.05, maxWeight: 0.25, priorWeight: 0.15 },
    marketCap: { minWeight: 0.0, maxWeight: 0.0, priorWeight: 0.0 },
    enterpriseValue: { minWeight: 0.0, maxWeight: 0.0, priorWeight: 0.0 },
    ebitdaValuation: { minWeight: 0.10, maxWeight: 0.50, priorWeight: 0.30 },
  },
};

const EXTENDED_VALUATION_INPUT: ExtendedValuationInput = {
  companyId: "COMP-LATAM-456",
  profile: {
    listingStatus: "private",
    stage: "growth",
    sector: "technology",
    financialStability: "high",
  },
  balanceSheet: {
    totalAssets: 10_000_000,
    intangibleAssets: 1_000_000,
    totalLiabilities: 4_000_000,
  },
  cashFlowProjection: {
    cashFlows: [500_000, 600_000, 700_000],
    wacc: 0.12,
  },
  terminalValue: {
    lastCashFlow: 700_000,
    growthRate: 0.02,
    wacc: 0.12,
    projectionYears: 3,
  },
  marketData: {
    sharePrice: 25,
    outstandingShares: 2_000_000,
  },
  enterpriseValue: {
    marketCap: 50_000_000,
    totalDebt: 5_000_000,
    cashAndEquivalents: 10_000_000,
  },
  ebitdaMultiple: {
    ebitda: 2_000_000,
    evEbitdaMultiple: 12,
    totalDebt: 5_000_000,
    cashAndEquivalents: 10_000_000,
  },
  dlom: {
    volatility: 0.35,
    riskFreeRate: 0.1075,
    holdingPeriod: 1.5,
  },
  jcp: {
    jcpAmount: 500_000,
    corporateTaxRate: 0.34,
  },
  contingencies: {
    taxContingencies: [
      {
        id: "T1",
        category: "tax",
        description: "PIS/COFINS Dispute",
        amount: 300_000,
        probability: "POSSIBLE",
      },
    ],
    laborContingencies: [
      {
        id: "L1",
        category: "labor",
        description: "CLT Claim",
        amount: 100_000,
        probability: "PROBABLE",
      },
    ],
  },
};

Deno.test("cumulativeNormalCDF – validates standard Normal distribution values", () => {
  // Mean = 0
  assertAlmostEquals(cumulativeNormalCDF(0.0), 0.5, 1e-6);
  // ~95% confidence intervals (approx. 1.96 standard deviations)
  assertAlmostEquals(cumulativeNormalCDF(1.96), 0.975002, 1e-5);
  assertAlmostEquals(cumulativeNormalCDF(-1.96), 0.024997, 1e-5);
});

Deno.test("computeChaffeDLOM – calculates Lack of Marketability discount rate", () => {
  const input = {
    volatility: 0.30,
    riskFreeRate: 0.1175, // Local CDI yield
    holdingPeriod: 2.0, // 2 years exit lockup
  };
  const rate = computeChaffeDLOM(input);
  // Option value should be strictly within (0, 1) and in the expected range for standard inputs
  assertEquals(rate > 0.0 && rate < 1.0, true);
  // Higher volatility implies higher option value, hence higher DLOM rate
  const rateHighVol = computeChaffeDLOM({ ...input, volatility: 0.50 });
  assertEquals(rateHighVol > rate, true);
});

Deno.test("computeJcpTaxShield – calculates tax shield benefits correctly", () => {
  const input = {
    jcpAmount: 1_000_000,
    corporateTaxRate: 0.34,
    withholdingTaxRate: 0.15,
  };
  const result = computeJcpTaxShield(input);
  assertEquals(result.taxShieldBenefit, 340_000);
  assertEquals(result.netJcpValue, 850_000);
});

Deno.test("computeContingencyDeductions – expected value probability calculations", () => {
  const totalDeduction = computeContingencyDeductions(CONTINGENCY_INPUT);
  // T1 (Probable): 500,000 * 1.0 = 500,000
  // T2 (Possible): 200,000 * 0.5 = 100,000
  // L1 (Possible with custom weight): 100,000 * 0.6 = 60,000
  // L2 (Remote): 50,000 * 0 = 0
  // Expected Total = 660,000
  assertEquals(totalDeduction, 660_000);
});

Deno.test("ReconciliationEngine – projects weights onto simplex under constraints", () => {
  const res = ReconciliationEngine.reconcile(RECONCILIATION_INPUT);
  assertEquals(res.status, "optimal");

  const w = res.weights;
  // Simplex sum = 1
  assertAlmostEquals(w.reduce((a, b) => a + b, 0), 1.0, 1e-9);
  // Bounds check
  assertEquals(w[0] >= 0.0 && w[0] <= 0.10, true);
  assertEquals(w[1] >= 0.30 && w[1] <= 0.70, true);
  assertEquals(w[2] >= 0.05 && w[2] <= 0.25, true);
  assertEquals(w[3], 0.0);
  assertEquals(w[4], 0.0);
  assertEquals(w[5] >= 0.10 && w[5] <= 0.50, true);
});

Deno.test("ValuationEngine – end-to-end evaluation with reconciliation & adjustments", () => {
  const engine = new ValuationEngine();
  const report = engine.evaluate(EXTENDED_VALUATION_INPUT);

  assertEquals(report.companyId, "COMP-LATAM-456");
  assertEquals(report.reconciliation !== undefined, true);

  const recon = report.reconciliation!;
  assertEquals(recon.dlomDiscountRate > 0.0, true);
  assertEquals(recon.jcpTaxShieldBenefit, 170_000); // 500,000 * 0.34
  assertEquals(recon.contingencyDeductions, 250_000); // 300,000 * 0.5 + 100,000 * 1.0

  // Verify that the final reconciled valuation incorporates base reconciled, DLOM discount, JCP shield benefit and contingency deductions
  const expectedFinal = recon.baseReconciledValue - recon.dlomDiscountAmount +
    recon.jcpTaxShieldBenefit - recon.contingencyDeductions;
  assertAlmostEquals(recon.finalReconciledValuation, expectedFinal, 1e-5);
});
