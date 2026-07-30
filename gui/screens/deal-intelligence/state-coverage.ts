import type { DealFamily, DealState } from "./DealIntelligenceBody";

/** Family-owned state matrix; stories provide bounded rendered coverage for each category. */
export const dealStateCoverage: Readonly<Record<DealFamily, readonly DealState[]>> = {
  overview: ["default", "loading", "restricted", "stale", "error"],
  dossier: ["default", "stale", "restricted", "error"],
  documents: ["default", "loading", "stale", "restricted", "error"],
  diligence: ["default", "stale", "restricted", "invalidated", "recorded", "error"],
  valuation: ["default", "stale", "restricted", "error"],
  matching: ["default", "restricted", "stale"],
};
