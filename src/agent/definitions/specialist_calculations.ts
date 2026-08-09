import { calculationBinding } from "./factory.ts";

export const MATCHING_CALCULATION_BINDINGS = Object.freeze([
  calculationBinding(
    "calculation.portfolio",
    "portfolio-selection",
    "select_portfolio",
    "select_portfolio",
  ),
  calculationBinding(
    "calculation.synergy",
    "synergy-pricing",
    "calculate_synergy_price",
    "calculate_synergy_price",
  ),
]);

export const FINANCIAL_RISK_UNAVAILABLE = Object.freeze({
  capability: "calculation.financial-risk",
  reason:
    "Financial-risk calculation is unavailable until MAI-65 supplies the governed model-backed domain service; valuation calculations do not implement financial-risk semantics.",
});

export const TERM_SHEET_CALCULATION_BINDINGS = Object.freeze([
  calculationBinding(
    "calculation.term-sheet",
    "negotiation-proposal-optimizer",
    "optimize_term_sheet",
    "optimize_term_sheet",
  ),
]);
