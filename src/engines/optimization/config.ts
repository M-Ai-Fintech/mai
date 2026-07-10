export interface OptimizationConfig {
  maxLeverage: number;
  minCoverage: number;
  valuationFloor: number;
  enableKycConstraints: boolean;
  enableFinancialConstraints: boolean;
}

export const defaultConfig: OptimizationConfig = {
  maxLeverage: 6.0,
  minCoverage: 1.5,
  valuationFloor: 0,
  enableKycConstraints: true,
  enableFinancialConstraints: true,
};
