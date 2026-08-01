import { assert, assertEquals } from "@std/assert";
import {
  ELIGIBILITY_CONTRACT_VERSION,
  type EligibilityStatus,
  type EvidenceStaleness,
  type MatchingCandidate,
  type PortfolioSelectionCriteria,
  type PortfolioSelectionRequest,
  selectPortfolio,
} from "../../src/engines/optimization/matching/index.ts";

function candidate(
  id: string,
  synergyValue: number,
  acquisitionCost: number,
  sector: string,
  riskScore: number,
  taxDebt: number,
  status: EligibilityStatus = "eligible",
  staleness: EvidenceStaleness = "current",
): MatchingCandidate {
  return {
    id,
    synergyValue,
    acquisitionCost,
    sector,
    riskScore,
    taxDebt,
    eligibility: {
      contractVersion: ELIGIBILITY_CONTRACT_VERSION,
      status,
      evidence: {
        evidenceVersion: "evidence-2026-08-01",
        findingId: "finding-1",
        decisionRecordId: "decision-1",
        policyVersion: "policy-1",
        actorOrApprovalAuthority: "authority-1",
        effectiveAt: "2026-08-01T00:00:00Z",
        staleness,
      },
    },
  };
}

function request(): PortfolioSelectionRequest {
  return {
    candidates: [
      candidate("target-b", 80, 35, "Fintech", 0.2, 5),
      candidate("target-a", 50, 20, "SaaS", 0.1, 2),
      candidate("target-c", 70, 30, "SaaS", 0.4, 3),
    ],
    criteria: {
      budgetLimit: 40,
      riskThreshold: 0.5,
      taxDebtCap: 10,
      sectorAllocationCaps: { SaaS: 25 },
    },
  };
}

function criteria(
  overrides: Partial<PortfolioSelectionCriteria> = {},
): PortfolioSelectionCriteria {
  return {
    budgetLimit: 100,
    riskThreshold: 0.5,
    taxDebtCap: 100,
    ...overrides,
  };
}

Deno.test("selectPortfolio chooses the highest-value feasible candidate", () => {
  const result = selectPortfolio(request());

  assertEquals(result.status, "optimal");
  assertEquals(result.selectedCandidateIds, ["target-b"]);
  assertEquals(result.totals, {
    synergyValue: 80,
    acquisitionCost: 35,
    taxDebt: 5,
    selectionCount: 1,
  });
});

Deno.test("selectPortfolio enforces mandatory, exclusion, cap, and size constraints", () => {
  const result = selectPortfolio({
    candidates: [
      candidate("mandatory", 60, 20, "SaaS", 0.1, 2),
      candidate("excluded-by-pair", 100, 10, "SaaS", 0.1, 1),
      candidate("selected", 70, 40, "Fintech", 0.2, 2),
    ],
    criteria: criteria({
      budgetLimit: 60,
      taxDebtCap: 5,
      sectorAllocationCaps: { SaaS: 20 },
      mutualExclusions: [["mandatory", "excluded-by-pair"]],
      mandatoryCandidateIds: ["mandatory"],
      minSelectionSize: 2,
      maxSelectionSize: 2,
    }),
  });

  assertEquals(result.status, "optimal");
  assertEquals(result.selectedCandidateIds, ["mandatory", "selected"]);
  assertEquals(result.totals.selectionCount, 2);
  assertEquals(result.totals.acquisitionCost <= 60, true);
});

Deno.test("selectPortfolio excludes stale, unresolved, restricted, and risky candidates", () => {
  const result = selectPortfolio({
    candidates: [
      candidate("stale", 100, 1, "SaaS", 0.1, 0, "eligible", "stale"),
      candidate("unresolved", 100, 1, "SaaS", 0.1, 0, "unresolved"),
      candidate("restricted", 100, 1, "SaaS", 0.1, 0, "restricted"),
      candidate("risky", 100, 1, "SaaS", 0.9, 0),
    ],
    criteria: criteria({ riskThreshold: 0.5 }),
  });

  assertEquals(result.status, "infeasible");
  assertEquals(result.explanations[0].code, "NO_ELIGIBLE_CANDIDATES");
  assertEquals(result.selectedCandidateIds, []);
});

Deno.test("selectPortfolio explains mandatory and constraint conflicts without candidate details", () => {
  const result = selectPortfolio({
    candidates: [
      candidate(
        "restricted-counterparty-id",
        100,
        1,
        "Secret",
        0.1,
        0,
        "restricted",
      ),
    ],
    criteria: criteria({ mandatoryInclusions: ["restricted-counterparty-id"] }),
  });
  const explanationText = JSON.stringify(result.explanations);

  assertEquals(result.status, "infeasible");
  assertEquals(result.explanations[0].constraint, "mandatory-inclusion");
  assertEquals(explanationText.includes("restricted-counterparty-id"), false);
  assertEquals(explanationText.includes("Secret"), false);
});

Deno.test("selectPortfolio reports empty and conflicting selection sets explicitly", () => {
  const empty = selectPortfolio({ candidates: [], criteria: criteria() });
  const conflicting = selectPortfolio({
    candidates: [
      candidate("a", 5, 5, "SaaS", 0.1, 0),
      candidate("b", 5, 5, "SaaS", 0.1, 0),
    ],
    criteria: criteria({
      mandatoryCandidateIds: ["a", "b"],
      mutualExclusions: [["a", "b"]],
    }),
  });

  assertEquals(empty.explanations[0].code, "EMPTY_CANDIDATE_SET");
  assertEquals(
    conflicting.explanations[0].code,
    "MANDATORY_INCLUSION_CONFLICT",
  );
});

Deno.test("selectPortfolio uses deterministic tie-breaking and seeded replay", () => {
  const input = {
    candidates: [
      candidate("candidate-b", 10, 5, "SaaS", 0.1, 0),
      candidate("candidate-a", 10, 5, "SaaS", 0.1, 0),
    ],
    criteria: criteria({ budgetLimit: 5 }),
  } satisfies PortfolioSelectionRequest;
  const unseeded = selectPortfolio(input);
  const seededInput = {
    ...input,
    criteria: criteria({ budgetLimit: 5, seed: 145 }),
  };
  const seeded = selectPortfolio(seededInput);
  const seededReplay = selectPortfolio({
    ...seededInput,
    candidates: [...input.candidates].reverse(),
  });

  assertEquals(unseeded.selectedCandidateIds, ["candidate-a"]);
  assertEquals(seeded.selectedCandidateIds, seededReplay.selectedCandidateIds);
  assertEquals(seeded.ranking.tieBreaker, "seeded-candidate-order");
  assertEquals(seeded.ranking.seed, 145);
});

Deno.test("selectPortfolio preserves constraints across deterministic candidate permutations", () => {
  const base = Array.from({ length: 12 }, (_, index) =>
    candidate(
      `candidate-${index.toString().padStart(2, "0")}`,
      10 + (index % 4),
      5 + (index % 3),
      index % 2 === 0 ? "SaaS" : "Fintech",
      index % 5 === 0 ? 0.7 : 0.2,
      index % 3,
    ));
  const requestFor = (
    candidates: readonly MatchingCandidate[],
  ): PortfolioSelectionRequest => ({
    candidates,
    criteria: criteria({
      budgetLimit: 30,
      riskThreshold: 0.5,
      taxDebtCap: 10,
      maxSelectionSize: 6,
      seed: 145,
    }),
  });
  const expected = selectPortfolio(requestFor(base));

  for (let rotation = 1; rotation < base.length; rotation++) {
    const rotated = [...base.slice(rotation), ...base.slice(0, rotation)];
    assertEquals(selectPortfolio(requestFor(rotated)), expected);
  }
  assert(expected.totals.acquisitionCost <= 30);
  assert(expected.totals.taxDebt <= 10);
  assert(expected.totals.selectionCount <= 6);
});

Deno.test("selectPortfolio handles a representative portfolio size", () => {
  const candidates = Array.from({ length: 48 }, (_, index) =>
    candidate(
      `portfolio-${index.toString().padStart(2, "0")}`,
      20 + (index % 11),
      4 + (index % 5),
      index % 3 === 0 ? "SaaS" : "Fintech",
      0.1 + (index % 4) * 0.1,
      index % 2,
    ));
  const startedAt = performance.now();
  const result = selectPortfolio({
    candidates,
    criteria: criteria({
      budgetLimit: 80,
      riskThreshold: 0.5,
      taxDebtCap: 20,
      maxSelectionSize: 12,
      sectorAllocationCaps: { SaaS: 30 },
    }),
  });
  const elapsedMs = performance.now() - startedAt;
  console.log(
    `[MAI-145 performance] candidates=48 elapsedMs=${elapsedMs.toFixed(2)}`,
  );

  assertEquals(result.status, "optimal");
  assertEquals(result.totals.acquisitionCost <= 80, true);
  assertEquals(result.totals.selectionCount <= 12, true);
});
