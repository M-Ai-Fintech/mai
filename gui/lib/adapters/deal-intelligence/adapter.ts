import { type AdapterReadOptions, readFamilyAdapter } from "../runtime";
import type { AdapterReadModel, AdapterResult } from "../contracts";

export type DealIntelligenceFamily =
  | "deal-overview"
  | "target-dossier"
  | "documents-vdr"
  | "diligence-decision-room"
  | "valuation-lab"
  | "matching-universe";

export const dealIntelligenceFamilies: readonly DealIntelligenceFamily[] = [
  "deal-overview",
  "target-dossier",
  "documents-vdr",
  "diligence-decision-room",
  "valuation-lab",
  "matching-universe",
];

export function isDealIntelligenceFamily(
  value: string,
): value is DealIntelligenceFamily {
  return dealIntelligenceFamilies.includes(value as DealIntelligenceFamily);
}

export function readDealIntelligenceFamily(
  family: DealIntelligenceFamily,
  options: AdapterReadOptions = {},
  previousAdapter?: () => Promise<AdapterResult<AdapterReadModel>>,
): Promise<AdapterResult<AdapterReadModel>> {
  return readFamilyAdapter(family, options, previousAdapter);
}

export {
  computeFinancialRiskAssessmentAdapter,
  financialRiskPollerFor,
  invalidateFinancialRiskAssessmentAdapter,
  pollFinancialRiskJob,
  presentFinancialRiskAssessment,
  presentFinancialRiskJob,
  readFinancialRiskAssessmentAdapter,
} from "./financial-risk";
export type {
  FinancialRiskAssessmentPresentation,
  FinancialRiskComputeResult,
  FinancialRiskComputeSuccess,
  FinancialRiskJobPollResult,
  FinancialRiskJobPollSuccess,
  FinancialRiskJobPresentation,
  FinancialRiskReadData,
  FinancialRiskReadFailure,
  FinancialRiskReadResult,
  FinancialRiskReadSuccess,
} from "./financial-risk";
