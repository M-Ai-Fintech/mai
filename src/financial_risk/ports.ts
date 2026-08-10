import type { FinancialRiskInput } from "./model.ts";
import type { FinancialRiskInferenceResult } from "./inference.ts";

export interface FinancialRiskInferencePort {
  infer(input: FinancialRiskInput): Promise<FinancialRiskInferenceResult>;
}
