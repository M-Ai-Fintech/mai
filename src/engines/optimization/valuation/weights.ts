import type {
  CompanyProfile,
  ExtendedValuationInput,
  ValuationReconciliationWeights,
} from "../../../shared/types.ts";

const fallbackWeights: ValuationReconciliationWeights = {
  bookValue: { minWeight: 0, maxWeight: 0.30, priorWeight: 0.166 },
  dcf: { minWeight: 0.10, maxWeight: 0.50, priorWeight: 0.168 },
  terminalValue: { minWeight: 0, maxWeight: 0.30, priorWeight: 0.166 },
  marketCap: { minWeight: 0, maxWeight: 0.30, priorWeight: 0.166 },
  enterpriseValue: { minWeight: 0, maxWeight: 0.30, priorWeight: 0.168 },
  ebitdaValuation: { minWeight: 0, maxWeight: 0.40, priorWeight: 0.166 },
};

const startupWeights: ValuationReconciliationWeights = {
  bookValue: { minWeight: 0, maxWeight: 0.10, priorWeight: 0.05 },
  dcf: { minWeight: 0.30, maxWeight: 0.70, priorWeight: 0.50 },
  terminalValue: { minWeight: 0.05, maxWeight: 0.25, priorWeight: 0.15 },
  marketCap: { minWeight: 0, maxWeight: 0, priorWeight: 0 },
  enterpriseValue: { minWeight: 0, maxWeight: 0, priorWeight: 0 },
  ebitdaValuation: { minWeight: 0.10, maxWeight: 0.50, priorWeight: 0.30 },
};

const privateMatureWeights: ValuationReconciliationWeights = {
  bookValue: { minWeight: 0.10, maxWeight: 0.40, priorWeight: 0.30 },
  dcf: { minWeight: 0.10, maxWeight: 0.40, priorWeight: 0.25 },
  terminalValue: { minWeight: 0, maxWeight: 0.20, priorWeight: 0.10 },
  marketCap: { minWeight: 0, maxWeight: 0, priorWeight: 0 },
  enterpriseValue: { minWeight: 0, maxWeight: 0, priorWeight: 0 },
  ebitdaValuation: { minWeight: 0.15, maxWeight: 0.50, priorWeight: 0.35 },
};

const publicWeights: ValuationReconciliationWeights = {
  bookValue: { minWeight: 0.05, maxWeight: 0.20, priorWeight: 0.10 },
  dcf: { minWeight: 0.10, maxWeight: 0.40, priorWeight: 0.20 },
  terminalValue: { minWeight: 0, maxWeight: 0.20, priorWeight: 0.10 },
  marketCap: { minWeight: 0.10, maxWeight: 0.40, priorWeight: 0.20 },
  enterpriseValue: { minWeight: 0.10, maxWeight: 0.40, priorWeight: 0.20 },
  ebitdaValuation: { minWeight: 0.10, maxWeight: 0.45, priorWeight: 0.20 },
};

export function resolveWeightsConfig(
  input: ExtendedValuationInput,
): ValuationReconciliationWeights {
  const weights = { ...profileWeights(input.profile) };
  for (const key of weightKeys()) {
    const override = input.customWeights?.[key];
    if (override) weights[key] = { ...weights[key], ...override };
  }
  return weights;
}

function profileWeights(
  profile?: CompanyProfile,
): ValuationReconciliationWeights {
  if (!profile) return fallbackWeights;
  if (profile.listingStatus !== "private") return publicWeights;
  const isStartup = profile.stage === "startup" ||
    profile.sector === "technology";
  return isStartup ? startupWeights : privateMatureWeights;
}

function weightKeys(): Array<keyof ValuationReconciliationWeights> {
  return [
    "bookValue",
    "dcf",
    "terminalValue",
    "marketCap",
    "enterpriseValue",
    "ebitdaValuation",
  ];
}
