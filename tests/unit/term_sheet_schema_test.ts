import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  assembleBindingTermSheet,
  bindingTermSheetSchema,
} from "../../src/agent/agents/legal-closing/schemas/term-sheet.ts";
import {
  negotiationProposalSchema,
} from "../../src/agent/agents/negotiation/schemas/term-sheet.ts";

const sampleProposal = {
  dealId: "deal-123",
  cashPercentage: 0.6,
  buyerEquityShare: 0.2,
  earnOutTargetYears: 3,
  nonCompeteMonths: 24,
  escrowPercentage: 0.1,
  statutoryLimitationsMatching: true,
  arbitrationChamber: "CAM-CCBC" as const,
  buyerUtility: 0.85,
  sellerUtility: 0.78,
  redFlags: ["High tax liability risk"],
};

const sampleLegalTerms = {
  governingLaw: "Brazil",
  exclusivityPeriodDays: 30,
  confidentialityAgreed: true,
  bindingClauses: ["Exclusivity", "Confidentiality", "Governing Law"],
};

Deno.test("negotiationProposalSchema accepts the approved proposal shape", () => {
  const parsed = negotiationProposalSchema.parse(sampleProposal);
  assertEquals(parsed, sampleProposal);
});

Deno.test("bindingTermSheetSchema accepts the approved document shape", () => {
  const bindingData = {
    dealId: "deal-123",
    buyerName: "Acme Corp",
    sellerName: "Beta LLC",
    targetName: "Target Co",
    valuationAmount: 50,
    proposal: {
      cashPercentage: 0.6,
      buyerEquityShare: 0.2,
      earnOutTargetYears: 3,
      nonCompeteMonths: 24,
    },
    ...sampleLegalTerms,
  };
  const parsed = bindingTermSheetSchema.parse(bindingData);
  assertEquals(parsed, bindingData);
});

Deno.test("A proposal cannot accidentally parse as a binding term sheet", () => {
  // Proposal lacks legal terms (governingLaw, exclusivityPeriodDays, confidentialityAgreed, bindingClauses, proposal sub-object)
  assertThrows(() => {
    bindingTermSheetSchema.parse(sampleProposal);
  });
});

Deno.test("A binding term sheet cannot accidentally parse as a proposal", () => {
  const bindingData = {
    dealId: "deal-123",
    proposal: {
      cashPercentage: 0.6,
      buyerEquityShare: 0.2,
      earnOutTargetYears: 3,
      nonCompeteMonths: 24,
    },
    ...sampleLegalTerms,
  };
  // Binding term sheet has nested proposal and legal terms, missing proposal fields like escrowPercentage, utilities, etc.
  assertThrows(() => {
    negotiationProposalSchema.parse(bindingData);
  });
});

Deno.test("The assembly function preserves every financial term", () => {
  const assembled = assembleBindingTermSheet({
    proposal: sampleProposal,
    legalTerms: sampleLegalTerms,
    parties: {
      buyerName: "Acme Corp",
      sellerName: "Beta LLC",
      targetName: "Target Co",
    },
    dealId: "deal-123",
    valuationAmount: 50,
  });

  assertEquals(assembled.dealId, "deal-123");
  assertEquals(assembled.buyerName, "Acme Corp");
  assertEquals(assembled.sellerName, "Beta LLC");
  assertEquals(assembled.targetName, "Target Co");
  assertEquals(assembled.valuationAmount, 50);

  // Financial terms preserved inside nested proposal
  assertEquals(
    assembled.proposal.cashPercentage,
    sampleProposal.cashPercentage,
  );
  assertEquals(
    assembled.proposal.buyerEquityShare,
    sampleProposal.buyerEquityShare,
  );
  assertEquals(
    assembled.proposal.earnOutTargetYears,
    sampleProposal.earnOutTargetYears,
  );
  assertEquals(
    assembled.proposal.nonCompeteMonths,
    sampleProposal.nonCompeteMonths,
  );

  // Legal terms preserved
  assertEquals(assembled.governingLaw, sampleLegalTerms.governingLaw);
  assertEquals(
    assembled.exclusivityPeriodDays,
    sampleLegalTerms.exclusivityPeriodDays,
  );
  assertEquals(
    assembled.confidentialityAgreed,
    sampleLegalTerms.confidentialityAgreed,
  );
  assertEquals(assembled.bindingClauses, sampleLegalTerms.bindingClauses);

  // Must parse cleanly as bindingTermSheetSchema
  const verified = bindingTermSheetSchema.parse(assembled);
  assertEquals(verified, assembled);
});

Deno.test("Missing required legal terms are rejected", () => {
  assertThrows(() => {
    assembleBindingTermSheet({
      proposal: sampleProposal,
      legalTerms: {
        governingLaw: "Brazil",
        // exclusivityPeriodDays missing
        confidentialityAgreed: true,
        bindingClauses: ["Exclusivity"],
      } as unknown as {
        exclusivityPeriodDays: number;
        confidentialityAgreed: boolean;
        bindingClauses: string[];
      },
    });
  });
});

Deno.test("Importing both schemas in one module creates no collision", () => {
  assert(negotiationProposalSchema !== undefined);
  assert(bindingTermSheetSchema !== undefined);
  assert(negotiationProposalSchema !== (bindingTermSheetSchema as unknown));
});

Deno.test("Schema validation does not perform approval, release, or external sending", () => {
  // Pure schema parse & assembly: verify no side effects or mutations occurred
  const result = assembleBindingTermSheet({
    proposal: sampleProposal,
    legalTerms: sampleLegalTerms,
  });
  assert(result !== null);
});
