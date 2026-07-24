import { assertEquals, assertThrows } from "@std/assert";
import { nashequilibriumSchema } from "../../src/agent/agents/negotiation/schemas/nash-equilibrium.ts";
import { valuationSchema } from "../../src/agent/agents/deal-matching/schemas/valuation.ts";
import { riskmatrixSchema } from "../../src/agent/agents/general-dd/schemas/risk-matrix.ts";

Deno.test("Schema Validation - nashequilibriumSchema accepts valid array of 3 payoffMatrix", () => {
  const validData = {
    dealId: "DEAL-123",
    buyerReservationUtility: 0.3,
    sellerReservationUtility: 0.3,
    payoffMatrix: [
      {
        round: 1,
        proposal: { cashPercentage: 0.6, buyerEquityShare: 0.2, earnOutTargetYears: 3, nonCompeteMonths: 60 },
        buyerUtility: 0.5,
        sellerUtility: 0.6,
        fitness: 0.06
      },
      {
        round: 2,
        proposal: { cashPercentage: 0.5, buyerEquityShare: 0.3, earnOutTargetYears: 4, nonCompeteMonths: 48 },
        buyerUtility: 0.6,
        sellerUtility: 0.5,
        fitness: 0.06
      },
      {
        round: 3,
        proposal: { cashPercentage: 0.7, buyerEquityShare: 0.1, earnOutTargetYears: 2, nonCompeteMonths: 72 },
        buyerUtility: 0.4,
        sellerUtility: 0.7,
        fitness: 0.04
      }
    ],
    nashEquilibriumAchieved: true,
    optimalProposal: { cashPercentage: 0.6, buyerEquityShare: 0.2, earnOutTargetYears: 3, nonCompeteMonths: 60 },
    comments: "Converged."
  };
  
  const parsed = nashequilibriumSchema.parse(validData);
  assertEquals(parsed.payoffMatrix.length, 3);
});

Deno.test("Schema Validation - nashequilibriumSchema rejects when mandatory fields are missing", () => {
  const invalidData = {
    dealId: "DEAL-123"
  };
  
  assertThrows(() => nashequilibriumSchema.parse(invalidData));
});

Deno.test("Schema Validation - riskmatrixSchema validates structured impact", () => {
  const validData = {
    dealId: "DEAL-123",
    overallRiskScore: 8,
    risks: [
      {
        id: "RSK-001",
        category: "tax",
        description: "Tax contingency",
        severity: "critical",
        probability: "high",
        valuationImpact: 15000000,
        mitigationStrategy: "Escrow retention",
        isDealBreaker: true
      }
    ]
  };

  const parsed = riskmatrixSchema.parse(validData);
  assertEquals(parsed.risks[0].severity, "critical");
  assertEquals(parsed.risks[0].isDealBreaker, true);
});

Deno.test("Schema Validation - riskmatrixSchema rejects invalid enums", () => {
  const invalidData = {
    dealId: "DEAL-123",
    overallRiskScore: 8,
    risks: [
      {
        id: "RSK-001",
        category: "UNKNOWN", // Invalid category
        description: "Tax contingency",
        severity: "SUPER_HIGH", // Invalid severity
        probability: "SURE", // Invalid probability
        valuationImpact: 15000000,
        mitigationStrategy: "Escrow retention",
        isDealBreaker: true
      }
    ]
  };

  assertThrows(() => riskmatrixSchema.parse(invalidData));
});

Deno.test("Schema Validation - valuationSchema accepts correct data", () => {
  const validData = {
    dealId: "DEAL-123",
    targetCompany: "Alpha Tech",
    ebitda: 10000000,
    revenue: 50000000,
    suggestedMultiple: 8,
    ev: 80000000,
    netDebt: 10000000,
    equityValue: 70000000,
    valuationMethod: "Multiples",
    discountRate: 0.15,
    perpetualGrowthRate: 0.03,
    valuationRange: { min: 65000000, max: 75000000 },
    illiquidityDiscount: 0.1,
    controlPremium: 0.2
  };

  const parsed = valuationSchema.parse(validData);
  assertEquals(parsed.valuationMethod, "Multiples");
  assertEquals(parsed.equityValue, 70000000);
});
