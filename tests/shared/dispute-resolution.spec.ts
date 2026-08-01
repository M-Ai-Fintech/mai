import { assertEquals, assertThrows } from "@std/assert";
import {
  adaptLegacyDisputeResolution,
  arbitrationInstitutionSchema,
  CANONICAL_ARBITRATION_INSTITUTIONS,
  DISPUTE_RESOLUTION_SCHEMA_VERSION,
  disputeResolutionApiSchema,
  disputeResolutionMechanismSchema,
  disputeResolutionPersistenceSchema,
  LEGACY_DISPUTE_RESOLUTION_VALUES,
  normalizeLegacyDisputeResolution,
  parseDisputeResolution,
  serializeDisputeResolution,
} from "../../src/shared/schemas/dispute-resolution.ts";
import { contractanalysisSchema } from "../../src/agent/agents/legal-dd/schemas/contract-analysis.ts";
import { negotiationProposalSchema } from "../../src/agent/agents/negotiation/schemas/term-sheet.ts";
import { spaSchema } from "../../src/agent/agents/legal-closing/schemas/spa.ts";
import { DISPUTE_RESOLUTION_SCHEMA_VERSION as API_VERSION } from "../../src/api/contracts/dispute-resolution.ts";

const canonical = (
  name: (typeof CANONICAL_ARBITRATION_INSTITUTIONS)[number],
) => ({
  type: "arbitration" as const,
  institution: { type: "canonical" as const, name },
});

const court = {
  type: "court" as const,
  jurisdiction: "Brazil",
  forum: "Sao Paulo State Court/SP",
};

Deno.test("the reviewed canonical institution vocabulary is explicit", () => {
  assertEquals(CANONICAL_ARBITRATION_INSTITUTIONS, [
    "CAM-CCBC",
    "CAM-B3",
    "CCI",
    "FGV",
  ]);

  for (const name of CANONICAL_ARBITRATION_INSTITUTIONS) {
    assertEquals(
      arbitrationInstitutionSchema.parse({ type: "canonical", name }),
      { type: "canonical", name },
    );
    assertEquals(
      disputeResolutionMechanismSchema.parse(canonical(name)),
      canonical(name),
    );
  }
});

Deno.test("arbitration and court litigation remain structurally distinct", () => {
  assertEquals(disputeResolutionMechanismSchema.parse(court), court);
  assertThrows(() =>
    disputeResolutionMechanismSchema.parse({
      type: "arbitration",
      institution: { type: "canonical", name: "CAM-CCBC" },
      jurisdiction: "Brazil",
      forum: "Sao Paulo",
    })
  );
  assertThrows(() =>
    disputeResolutionMechanismSchema.parse({
      type: "court",
      jurisdiction: "",
      forum: "Sao Paulo",
    })
  );
});

Deno.test("other arbitration institutions carry a supplied name", () => {
  const other = {
    type: "arbitration" as const,
    institution: { type: "other" as const, name: "Centro XYZ" },
  };

  assertEquals(disputeResolutionMechanismSchema.parse(other), other);
  assertThrows(() =>
    disputeResolutionMechanismSchema.parse({
      type: "arbitration",
      institution: { type: "other", name: "Other" },
    })
  );
  assertThrows(() =>
    arbitrationInstitutionSchema.parse({ type: "canonical", name: "Other" })
  );
});

Deno.test("legacy values normalize without confusing court and arbitration", () => {
  assertEquals(LEGACY_DISPUTE_RESOLUTION_VALUES, [
    "B3",
    "CAM-B3",
    "CAM-CCBC",
    "CCI",
    "FGV",
    "Judicial-Court",
    "Other",
  ]);
  assertEquals(normalizeLegacyDisputeResolution("B3"), canonical("CAM-B3"));
  assertEquals(
    normalizeLegacyDisputeResolution("CAM-B3"),
    canonical("CAM-B3"),
  );
  assertEquals(
    normalizeLegacyDisputeResolution("CAM-CCBC"),
    canonical("CAM-CCBC"),
  );
  assertEquals(normalizeLegacyDisputeResolution("CCI"), canonical("CCI"));
  assertEquals(normalizeLegacyDisputeResolution("FGV"), canonical("FGV"));
  assertEquals(
    normalizeLegacyDisputeResolution("Judicial-Court", court),
    court,
  );
  assertEquals(
    adaptLegacyDisputeResolution({
      arbitrationChamber: "Other",
      institutionName: "Centro XYZ",
    }),
    {
      type: "arbitration",
      institution: { type: "other", name: "Centro XYZ" },
    },
  );
});

Deno.test("legacy ambiguity and missing required context are rejected", () => {
  assertThrows(() => normalizeLegacyDisputeResolution("Other"));
  assertThrows(() => normalizeLegacyDisputeResolution("Judicial-Court"));
  assertThrows(() =>
    normalizeLegacyDisputeResolution("Judicial-Court", { forum: "Sao Paulo" })
  );
  assertThrows(() =>
    normalizeLegacyDisputeResolution({ value: "B3", arbitrationChamber: "CCI" })
  );
  assertThrows(() => normalizeLegacyDisputeResolution("Unknown"));
  assertThrows(() => normalizeLegacyDisputeResolution(42));
});

Deno.test("the versioned API and persistence representations round-trip", () => {
  const mechanism = canonical("CAM-CCBC");
  const serialized = serializeDisputeResolution(mechanism);
  assertEquals(serialized, {
    schemaVersion: DISPUTE_RESOLUTION_SCHEMA_VERSION,
    mechanism,
  });
  assertEquals(parseDisputeResolution(serialized), mechanism);
  assertEquals(disputeResolutionApiSchema, disputeResolutionPersistenceSchema);
  assertEquals(API_VERSION, DISPUTE_RESOLUTION_SCHEMA_VERSION);
  assertThrows(() => parseDisputeResolution({ schemaVersion: 2, mechanism }));
});

Deno.test("consumer schemas use the shared mechanism and reject legacy enum fields", () => {
  const analysis = contractanalysisSchema.parse({
    contractTitle: "Supply Agreement",
    counterparty: "Vendor Corp",
    hasChangeOfControlClause: true,
    requiresConsentForAssignment: false,
    noticePeriodDays: 30,
    hasNonCompeteOrExclusivity: false,
    disputeResolution: canonical("CAM-CCBC"),
    riskRating: "low",
    recommendations: [],
  });
  assertEquals(analysis.disputeResolution, canonical("CAM-CCBC"));

  assertThrows(() =>
    contractanalysisSchema.parse({
      ...analysis,
      arbitrationChamber: "CAM-CCBC",
    })
  );

  const proposal = negotiationProposalSchema.parse({
    dealId: "deal-123",
    cashPercentage: 0.6,
    buyerEquityShare: 0.2,
    earnOutTargetYears: 3,
    nonCompeteMonths: 24,
    escrowPercentage: 0.1,
    statutoryLimitationsMatching: true,
    disputeResolution: court,
    buyerUtility: 0.85,
    sellerUtility: 0.78,
    redFlags: [],
  });
  assertEquals(proposal.disputeResolution, court);

  assertThrows(() =>
    negotiationProposalSchema.parse({
      ...proposal,
      arbitrationChamber: "CAM-CCBC",
    })
  );

  const spa = spaSchema.parse({
    dealId: "deal-123",
    contractType: "SPA",
    purchasePriceAdjustmentType: "Locked-Box",
    repsAndWarrantiesCap: 10,
    basketThreshold: 1,
    deMinimisThreshold: 0.1,
    escrowRetentionAmount: 2,
    survivalPeriodsMonths: {
      generalCivil: 24,
      laborClaims: 60,
      taxLiabilities: 60,
    },
    disputeResolution: court,
    closingConditionsPrecedent: [],
  });
  assertEquals(spa.disputeResolution, court);
  assertThrows(() =>
    spaSchema.parse({ ...spa, disputeResolutionMethod: "Judicial-Court" })
  );
});
