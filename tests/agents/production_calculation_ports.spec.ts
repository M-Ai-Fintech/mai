import { assertEquals, assertRejects } from "@std/assert";
import {
  MATCHING_CALCULATION_BINDINGS,
  TERM_SHEET_CALCULATION_BINDINGS,
} from "../../src/agent/definitions/specialist_calculations.ts";
import type { CalculationBinding } from "../../src/agent/definitions/index.ts";
import { createProductionCalculationRegistry } from "../../src/agent/production_calculation_ports.ts";
import type { GovernedCalculationRequest } from "../../src/agent/governed_calculation_ports.ts";
import { selectPortfolio } from "../../src/engines/optimization/matching/portfolio_selection.ts";
import type { PortfolioSelectionRequest } from "../../src/engines/optimization/matching/types.ts";
import {
  NEGOTIATION_UTILITY_UNITS,
  type NegotiationOptimizerInput,
  type ProposalBound,
  type ProposalBounds,
  type UtilityModel,
} from "../../src/engines/optimization/negotiation/types.ts";
import { optimizeNegotiationProposal } from "../../src/engines/optimization/negotiation/optimizer.ts";
import { calculateSynergyPrice } from "../../src/engines/valuation/synergy_calculation.ts";
import type { SynergyInput } from "../../src/engines/valuation/types.ts";
import { emptyCost } from "../../src/agent_runtime/runner_support.ts";
import type {
  ClaimedRun,
  RuntimeActor,
  RuntimeScope,
  StepRecord,
} from "../../src/agent_runtime/model.ts";

Deno.test("production ports return exact deterministic engine results and receipts", async () => {
  const registry = createProductionCalculationRegistry();
  const cases = [
    {
      binding: binding(MATCHING_CALCULATION_BINDINGS, "calculation.portfolio"),
      input: calculationInput(portfolioInput()),
      engineReference:
        "src/engines/optimization/matching/portfolio_selection.ts",
      expected: selectPortfolio(portfolioInput()),
    },
    {
      binding: binding(MATCHING_CALCULATION_BINDINGS, "calculation.synergy"),
      input: calculationInput(synergyInput()),
      engineReference: "src/engines/valuation/synergy_calculation.ts",
      expected: synergyValue(),
    },
    {
      binding: binding(
        TERM_SHEET_CALCULATION_BINDINGS,
        "calculation.term-sheet",
      ),
      input: calculationInput(negotiationInput()),
      engineReference: "src/engines/optimization/negotiation/optimizer.ts",
      expected: optimizeNegotiationProposal(negotiationInput()),
    },
  ] as const;

  for (const testCase of cases) {
    const port = registry.resolve(testCase.binding.purePort);
    if (port === undefined) {
      throw new Error(
        'Production port "' + testCase.binding.purePort +
          '" was not registered.',
      );
    }
    const request = calculationRequest(testCase.binding, testCase.input);
    const first = await port.execute(request);
    const replay = await port.execute(request);
    assertEquals(replay, first);
    assertEquals(first.cost, emptyCost());
    assertEquals(first.value.calculation, {
      ...testCase.binding,
      engineReference: testCase.engineReference,
      result: testCase.expected,
    });
  }
});

Deno.test("production registry exposes no generic financial-risk calculation port", () => {
  const registry = createProductionCalculationRegistry();

  assertEquals(registry.resolve("portfolio-selection")?.deterministic, true);
  assertEquals(registry.resolve("synergy-pricing")?.deterministic, true);
  assertEquals(
    registry.resolve("negotiation-proposal-optimizer")?.deterministic,
    true,
  );
  assertEquals(registry.resolve("financial-value-calculations"), undefined);
});

Deno.test("production ports reject missing or malformed typed calculation contexts", async () => {
  const registry = createProductionCalculationRegistry();
  const portfolioBinding = binding(
    MATCHING_CALCULATION_BINDINGS,
    "calculation.portfolio",
  );
  const synergyBinding = binding(
    MATCHING_CALCULATION_BINDINGS,
    "calculation.synergy",
  );
  const termSheetBinding = binding(
    TERM_SHEET_CALCULATION_BINDINGS,
    "calculation.term-sheet",
  );

  await assertRejects(
    () =>
      registry.resolve(portfolioBinding.purePort)!.execute(
        calculationRequest(portfolioBinding, {
          dealId: "deal_calculation",
          query: "select",
          context: { criteria: portfolioInput().criteria },
        }),
      ),
    Error,
    "calculation.portfolio",
  );
  await assertRejects(
    () =>
      registry.resolve(synergyBinding.purePort)!.execute(
        calculationRequest(synergyBinding, {
          dealId: "deal_calculation",
          query: "synergy",
          context: {},
        }),
      ),
    Error,
    "calculation.synergy",
  );
  await assertRejects(
    () =>
      registry.resolve(termSheetBinding.purePort)!.execute(
        calculationRequest(termSheetBinding, {
          dealId: "deal_calculation",
          query: "term sheet",
          context: { seed: 146 },
        }),
      ),
    Error,
    "calculation.term-sheet",
  );
});

Deno.test("production ports reject a binding that does not match its declaration", async () => {
  const declared = binding(
    MATCHING_CALCULATION_BINDINGS,
    "calculation.portfolio",
  );
  const port = createProductionCalculationRegistry().resolve(
    declared.purePort,
  );
  if (port === undefined) {
    throw new Error("Portfolio production port is missing.");
  }

  await assertRejects(
    () =>
      port.execute(
        calculationRequest(
          { ...declared, action: "wrong_action" },
          portfolioInput(),
        ),
      ),
    Error,
    "does not match declared binding",
  );
});

function portfolioInput(): PortfolioSelectionRequest {
  return {
    candidates: [
      candidate("target-alpha", 100, 30, "software", 0.2),
      candidate("target-beta", 70, 20, "fintech", 0.1),
    ],
    criteria: {
      budgetLimit: 35,
      riskThreshold: 0.5,
      taxDebtCap: 20,
      seed: 146,
    },
  };
}

function calculationInput(context: object): Record<string, unknown> {
  return {
    dealId: "deal_calculation",
    query: "deterministic calculation",
    context,
  };
}

function candidate(
  id: string,
  synergyValue: number,
  acquisitionCost: number,
  sector: string,
  riskScore: number,
) {
  return {
    id,
    synergyValue,
    acquisitionCost,
    sector,
    riskScore,
    taxDebt: 0,
    eligibility: {
      contractVersion: "matching-eligibility/v1" as const,
      status: "eligible" as const,
      evidence: {
        evidenceVersion: "eligibility-v1",
        findingId: "finding-" + id,
        decisionRecordId: "decision-" + id,
        policyVersion: "matching-policy-v1",
        actorOrApprovalAuthority: "human-authority",
        effectiveAt: "2026-08-09T12:00:00.000Z",
        staleness: "current" as const,
      },
    },
  };
}

function synergyInput(): SynergyInput {
  const flow = (amount: number, period: number) => ({
    period: { value: period, unit: "years" as const },
    amount: { amount, currency: "BRL" as const },
  });
  return {
    standaloneValue: { amount: 100, currency: "BRL" },
    costSynergies: [flow(20, 1), flow(20, 2)],
    revenueSynergies: [flow(30, 1), flow(30, 2)],
    integrationCosts: [flow(10, 1), flow(10, 2)],
    discountRate: { decimal: 0.1 },
    taxRate: { decimal: 0.34 },
    revenueHaircut: { decimal: 0.1 },
    sharingCoefficient: { decimal: 0.5 },
    options: {
      rounding: { moneyScale: 2, ratioScale: 4, mode: "half-up" },
    },
  };
}

function synergyValue() {
  const outcome = calculateSynergyPrice(synergyInput());
  if (!outcome.ok) throw new Error(outcome.error.message);
  return outcome.value;
}

function negotiationInput(): NegotiationOptimizerInput {
  return {
    bounds: negotiationBounds(),
    utilities: utilityModel(),
    seed: 146,
    config: {
      populationSize: 12,
      maxGenerations: 5,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      tournamentSize: 3,
      alternativeCount: 3,
      stagnationGenerations: 3,
      minimumImprovement: 0.000001,
    },
  };
}

function negotiationBounds(): ProposalBounds {
  return {
    valuation: bound("valuation", 10, 20, "currency-amount"),
    cashPercentage: bound("cash", 0, 0.5, "fraction"),
    equityPercentage: bound("equity", 0, 0.5, "fraction"),
    earnOutPercentage: bound("earn-out", 0, 0.5, "fraction"),
    escrowPercentage: bound("escrow", 0, 0.5, "fraction"),
    earnOutTargetYears: bound("earn-out-years", 1, 5, "years"),
    nonCompeteMonths: bound("non-compete-months", 12, 60, "months"),
  };
}

function bound(
  id: string,
  minimum: number,
  maximum: number,
  units: string,
): ProposalBound {
  return {
    id,
    minimum,
    maximum,
    metadata: {
      source: "MAI-60 production-port fixture",
      policyVersion: "fixture-v1",
      units,
      effectiveDate: "2026-08-09",
      evidenceVersion: "fixture-v1",
      enforcement: "mandatory",
    },
  };
}

function utilityModel(): UtilityModel {
  const weights = {
    valuation: 0.2,
    cashPercentage: 0.2,
    equityPercentage: 0.2,
    earnOutPercentage: 0.1,
    escrowPercentage: 0.1,
    earnOutTargetYears: 0.1,
    nonCompeteMonths: 0.1,
  };
  const buyerDirections = {
    valuation: "lower" as const,
    cashPercentage: "lower" as const,
    equityPercentage: "higher" as const,
    earnOutPercentage: "higher" as const,
    escrowPercentage: "higher" as const,
    earnOutTargetYears: "lower" as const,
    nonCompeteMonths: "higher" as const,
  };
  const sellerDirections = {
    valuation: "higher" as const,
    cashPercentage: "higher" as const,
    equityPercentage: "lower" as const,
    earnOutPercentage: "lower" as const,
    escrowPercentage: "lower" as const,
    earnOutTargetYears: "higher" as const,
    nonCompeteMonths: "lower" as const,
  };
  return {
    buyer: {
      id: "buyer-production",
      version: "1",
      units: NEGOTIATION_UTILITY_UNITS,
      weights,
      directions: buyerDirections,
    },
    seller: {
      id: "seller-production",
      version: "1",
      units: NEGOTIATION_UTILITY_UNITS,
      weights,
      directions: sellerDirections,
    },
    reservation: {
      buyer: { minimum: 0.2, metadata: reservationMetadata("buyer") },
      seller: { minimum: 0.2, metadata: reservationMetadata("seller") },
    },
  };
}

function reservationMetadata(side: string) {
  return {
    source: "MAI-60 production-port fixture",
    policyVersion: "fixture-v1",
    units: "normalized-utility[0,1]",
    effectiveDate: "2026-08-09",
    evidenceVersion: side + "-fixture-v1",
    enforcement: "mandatory" as const,
  };
}

function binding(
  bindings: readonly CalculationBinding[],
  capability: string,
): CalculationBinding {
  const found = bindings.find((candidate) =>
    candidate.capability === capability
  );
  if (found === undefined) {
    throw new Error(
      'Calculation binding "' + capability + '" is missing.',
    );
  }
  return found;
}

function calculationRequest(
  binding: CalculationBinding,
  input: unknown,
): GovernedCalculationRequest {
  const now = new Date("2026-08-09T12:00:00.000Z");
  const scope: RuntimeScope = {
    tenantId: "tenant_calculation" as never,
    workspaceId: "workspace_calculation" as never,
    dealId: "deal_calculation" as never,
  };
  const actor: RuntimeActor = {
    actorId: "actor_calculation" as never,
    kind: "ai",
    state: "active",
  };
  const run: ClaimedRun = {
    runId: "run_calculation" as never,
    missionId: "mission_calculation" as never,
    planId: "plan_calculation" as never,
    planVersion: 1,
    scope,
    actor,
    correlationId: "correlation_calculation" as never,
    state: "running",
    aggregateVersion: 1 as never,
    sourceVersions: [],
    cost: emptyCost(),
    attemptCount: 1,
    leaseOwner: "worker_calculation",
    leaseExpiresAt: new Date("2026-08-09T12:01:00.000Z"),
    createdAt: now,
    updatedAt: now,
    attemptNumber: 1,
    workerId: "worker_calculation",
    attemptStartedAt: now,
  };
  const step: StepRecord = {
    stepId: "step_run_calculation-0" as never,
    runId: run.runId,
    ordinal: 0,
    name: binding.operation,
    kind: "compute",
    action: binding.action,
    input: { request: input },
    sourceVersions: [],
    state: "running",
    attemptCount: 1,
    createdAt: now,
    updatedAt: now,
  };
  return {
    capability: binding.capability,
    binding,
    input,
    step,
    context: { run, step },
  };
}
