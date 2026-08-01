import { assertEquals, assertThrows } from "@std/assert";
import {
  normalizeLegacyRiskSeverity,
  riskSeveritySchema,
} from "../../src/shared/schemas/risk-severity.ts";
import { riskmatrixSchema } from "../../src/agent/agents/general-dd/schemas/risk-matrix.ts";
import { insolvencySchema } from "../../src/agent/agents/financial-risk/schemas/insolvency.ts";
import { contractanalysisSchema } from "../../src/agent/agents/legal-dd/schemas/contract-analysis.ts";
import { contingencySchema } from "../../src/agent/agents/legal-dd/schemas/contingency.ts";

Deno.test("Risk Severity - Accepts all four canonical lowercase values", () => {
  assertEquals(riskSeveritySchema.parse("low"), "low");
  assertEquals(riskSeveritySchema.parse("medium"), "medium");
  assertEquals(riskSeveritySchema.parse("high"), "high");
  assertEquals(riskSeveritySchema.parse("critical"), "critical");
});

Deno.test("Risk Severity - Internal canonical schema rejects Title Case and uppercase values", () => {
  assertThrows(() => riskSeveritySchema.parse("Low"));
  assertThrows(() => riskSeveritySchema.parse("Medium"));
  assertThrows(() => riskSeveritySchema.parse("High"));
  assertThrows(() => riskSeveritySchema.parse("Critical"));
  assertThrows(() => riskSeveritySchema.parse("HIGH"));
});

Deno.test("Risk Severity - Normalizer converts each supported Title Case value", () => {
  assertEquals(normalizeLegacyRiskSeverity("Low"), "low");
  assertEquals(normalizeLegacyRiskSeverity("Medium"), "medium");
  assertEquals(normalizeLegacyRiskSeverity("High"), "high");
  assertEquals(normalizeLegacyRiskSeverity("Critical"), "critical");
});

Deno.test("Risk Severity - Normalizer trims surrounding whitespace and normalizes casing", () => {
  assertEquals(normalizeLegacyRiskSeverity("  High  "), "high");
  assertEquals(normalizeLegacyRiskSeverity("\tLOW\n"), "low");
  assertEquals(normalizeLegacyRiskSeverity("  mEdIuM  "), "medium");
  assertEquals(normalizeLegacyRiskSeverity("CRITICAL "), "critical");
});

Deno.test("Risk Severity - Normalizer rejects unknown or invalid values", () => {
  assertThrows(() => normalizeLegacyRiskSeverity("unknown"));
  assertThrows(() => normalizeLegacyRiskSeverity("severe"));
  assertThrows(() => normalizeLegacyRiskSeverity("extreme"));
  assertThrows(() => normalizeLegacyRiskSeverity("moderate"));
  assertThrows(() => normalizeLegacyRiskSeverity(123));
  assertThrows(() => normalizeLegacyRiskSeverity(null));
  assertThrows(() => normalizeLegacyRiskSeverity(undefined));
  assertThrows(() => normalizeLegacyRiskSeverity({}));
});

Deno.test("Risk Severity - Risk Matrix uses canonical contract", () => {
  const baseData = {
    dealId: "DEAL-001",
    overallRiskScore: 5,
    risks: [
      {
        id: "RSK-001",
        category: "tax",
        description: "Tax liability",
        severity: "high",
        probability: "medium",
        valuationImpact: 100,
        mitigationStrategy: "Escrow",
        isDealBreaker: false,
      },
    ],
  };

  const parsed = riskmatrixSchema.parse(baseData);
  assertEquals(parsed.risks[0].severity, "high");

  const invalidData = {
    ...baseData,
    risks: [{ ...baseData.risks[0], severity: "High" }],
  };
  assertThrows(() => riskmatrixSchema.parse(invalidData));
});

Deno.test("Risk Severity - Insolvency uses canonical contract", () => {
  const baseData = {
    insolvencyRiskScore: 0.3,
    riskLevel: "medium",
    kanitzTermometroScore: 1.2,
    elizabetskyScore: 2.1,
    altmanZDoublePrimeScore: 3.5,
    distressWarning: false,
    mitigations: ["Refinance short-term debt"],
  };

  const parsed = insolvencySchema.parse(baseData);
  assertEquals(parsed.riskLevel, "medium");

  const invalidData = { ...baseData, riskLevel: "Medium" };
  assertThrows(() => insolvencySchema.parse(invalidData));
});

Deno.test("Risk Severity - Contract Analysis uses canonical contract", () => {
  const baseData = {
    contractTitle: "Supply Agreement",
    counterparty: "Vendor Corp",
    hasChangeOfControlClause: true,
    requiresConsentForAssignment: false,
    noticePeriodDays: 30,
    hasNonCompeteOrExclusivity: false,
    disputeResolution: {
      type: "arbitration",
      institution: { type: "canonical", name: "CAM-CCBC" },
    },
    riskRating: "low",
    recommendations: ["Review termination clause"],
  };

  const parsed = contractanalysisSchema.parse(baseData);
  assertEquals(parsed.riskRating, "low");

  const invalidData = { ...baseData, riskRating: "Low" };
  assertThrows(() => contractanalysisSchema.parse(invalidData));
});

Deno.test("Risk Severity - Contingency uses canonical contract", () => {
  const baseData = {
    contingencyTitle: "Labor Dispute",
    category: "labor",
    severity: "critical",
    legalBasis: "CLT Art 468",
    probabilityOfLoss: "Probable",
    estimatedFinancialImpact: 50,
    escrowRetentionRecommended: true,
    recommendedEscrowAmount: 50,
    redFlags: ["Unfunded labor liability"],
  };

  const parsed = contingencySchema.parse(baseData);
  assertEquals(parsed.severity, "critical");

  const invalidData = { ...baseData, severity: "Critical" };
  assertThrows(() => contingencySchema.parse(invalidData));
});
