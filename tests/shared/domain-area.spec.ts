import { assertEquals, assertThrows } from "@std/assert";
import {
  DomainArea,
  domainAreaSchema,
  normalizeLegacyDomainArea,
} from "../../src/shared/schemas/domain-area.ts";
import { riskmatrixSchema } from "../../src/agent/agents/general-dd/schemas/risk-matrix.ts";
import { contingencySchema } from "../../src/agent/agents/legal-dd/schemas/contingency.ts";
import { conditionsprecedentSchema } from "../../src/agent/agents/legal-closing/schemas/conditions-precedent.ts";

const CANONICAL_TEN: DomainArea[] = [
  "corporate",
  "financial",
  "tax",
  "labor",
  "civil",
  "regulatory",
  "environmental",
  "operational",
  "tech",
  "commercial",
];

Deno.test("DomainArea - All 10 canonical values parse cleanly", () => {
  for (const area of CANONICAL_TEN) {
    assertEquals(domainAreaSchema.parse(area), area);
  }
});

Deno.test("DomainArea - Canonical schema rejects 'legal'", () => {
  assertThrows(() => domainAreaSchema.parse("legal"));
});

Deno.test("DomainArea - Canonical schema rejects 'third-party-consent'", () => {
  assertThrows(() => domainAreaSchema.parse("third-party-consent"));
});

Deno.test("DomainArea - Canonical schema rejects Title Case and uppercase values", () => {
  assertThrows(() => domainAreaSchema.parse("Tax"));
  assertThrows(() => domainAreaSchema.parse("Financial"));
  assertThrows(() => domainAreaSchema.parse("CORPORATE"));
  assertThrows(() => domainAreaSchema.parse("Labor"));
});

Deno.test("DomainArea - Normalizer converts each supported legacy value", () => {
  assertEquals(normalizeLegacyDomainArea("Finance"), "financial");
  assertEquals(normalizeLegacyDomainArea("Financial"), "financial");
  assertEquals(normalizeLegacyDomainArea("Tax"), "tax");
  assertEquals(normalizeLegacyDomainArea("Labor"), "labor");
  assertEquals(normalizeLegacyDomainArea("Labour"), "labor");
  assertEquals(normalizeLegacyDomainArea("Civil"), "civil");
  assertEquals(normalizeLegacyDomainArea("Regulatory"), "regulatory");
  assertEquals(normalizeLegacyDomainArea("Environmental"), "environmental");
  assertEquals(normalizeLegacyDomainArea("Operational"), "operational");
  assertEquals(normalizeLegacyDomainArea("Operations"), "operational");
  assertEquals(normalizeLegacyDomainArea("Technology"), "tech");
  assertEquals(normalizeLegacyDomainArea("Commercial"), "commercial");
  assertEquals(normalizeLegacyDomainArea("Corporate"), "corporate");
});

Deno.test("DomainArea - Normalizer trims surrounding whitespace and normalizes casing", () => {
  assertEquals(normalizeLegacyDomainArea("  Finance  "), "financial");
  assertEquals(normalizeLegacyDomainArea("\tLABOUR\n"), "labor");
  assertEquals(normalizeLegacyDomainArea("  OpErAtIoNs  "), "operational");
});

Deno.test("DomainArea - Normalizer explicitly rejects 'legal', 'third-party-consent', unknown and compound values", () => {
  assertThrows(() => normalizeLegacyDomainArea("legal"));
  assertThrows(() => normalizeLegacyDomainArea("Legal"));
  assertThrows(() => normalizeLegacyDomainArea("third-party-consent"));
  assertThrows(() => normalizeLegacyDomainArea("Third-Party-Consent"));
  assertThrows(() => normalizeLegacyDomainArea("unknown"));
  assertThrows(() => normalizeLegacyDomainArea("corporate/legal"));
  assertThrows(() => normalizeLegacyDomainArea("financial & tax"));
  assertThrows(() => normalizeLegacyDomainArea(123));
  assertThrows(() => normalizeLegacyDomainArea(null));
  assertThrows(() => normalizeLegacyDomainArea(undefined));
  assertThrows(() => normalizeLegacyDomainArea({}));
});

Deno.test("DomainArea - riskmatrixSchema uses canonical contract", () => {
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
  assertEquals(parsed.risks[0].category, "tax");

  const invalidLegal = {
    ...baseData,
    risks: [{ ...baseData.risks[0], category: "legal" }],
  };
  assertThrows(() => riskmatrixSchema.parse(invalidLegal));

  const invalidTitleCase = {
    ...baseData,
    risks: [{ ...baseData.risks[0], category: "Tax" }],
  };
  assertThrows(() => riskmatrixSchema.parse(invalidTitleCase));
});

Deno.test("DomainArea - contingencySchema uses canonical contract", () => {
  const baseData = {
    contingencyTitle: "Civil Dispute",
    category: "civil",
    severity: "critical",
    legalBasis: "Art 186 CC",
    probabilityOfLoss: "Probable",
    estimatedFinancialImpact: 50,
    escrowRetentionRecommended: true,
    recommendedEscrowAmount: 50,
    redFlags: ["Civil liability"],
  };

  const parsed = contingencySchema.parse(baseData);
  assertEquals(parsed.category, "civil");

  const invalidThirdParty = {
    ...baseData,
    category: "third-party-consent",
  };
  assertThrows(() => contingencySchema.parse(invalidThirdParty));

  const invalidTitleCase = {
    ...baseData,
    category: "Civil",
  };
  assertThrows(() => contingencySchema.parse(invalidTitleCase));
});

Deno.test("DomainArea - conditionsprecedentSchema uses canonical contract", () => {
  const baseData = {
    dealId: "DEAL-001",
    conditions: [
      {
        id: "CP-001",
        description: "Regulatory approval",
        category: "regulatory",
        responsibleParty: "seller",
        status: "pending",
      },
    ],
    allFulfilled: false,
  };

  const parsed = conditionsprecedentSchema.parse(baseData);
  assertEquals(parsed.conditions[0].category, "regulatory");

  const invalidLegal = {
    ...baseData,
    conditions: [{ ...baseData.conditions[0], category: "legal" }],
  };
  assertThrows(() => conditionsprecedentSchema.parse(invalidLegal));

  const invalidConsent = {
    ...baseData,
    conditions: [{
      ...baseData.conditions[0],
      category: "third-party-consent",
    }],
  };
  assertThrows(() => conditionsprecedentSchema.parse(invalidConsent));
});
