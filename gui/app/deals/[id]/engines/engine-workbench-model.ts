export type Translation = (
  key: string,
  values?: Record<string, number | string>,
) => string;

export type EngineKey = "onnx" | "milp" | "ga";

export type EngineLoading = Record<EngineKey, boolean>;

export type OnnxInput = {
  name: string;
  sector: string;
  ebitda: number;
  revenue: number;
  assets: number;
  liabilities: number;
  cashflow: number;
  volatility: number;
};

export type MilpInput = {
  budget: number;
  riskTolerance: number;
};

export type GaInput = {
  valuationMin: number;
  valuationMax: number;
  cash: number;
  equity: number;
  earnOut: number;
  escrow: number;
  maxLeverage: number;
  minCoverage: number;
};

export type OnnxPredictionResult = {
  metrics: { insolvencyRisk: number; zScore: string };
  dcfRiskLabel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export type PortfolioOptimizationResult = {
  optimization: { status: string };
  totalSynergy: number;
  totalCost: number;
};

export type TermSheetAlternative = {
  valuation: number;
  fitness: number;
};

export type TermSheetRequest = {
  valuationMin: number;
  valuationMax: number;
  preferences: {
    cash: number;
    equity: number;
    earnOut: number;
    escrow: number;
  };
  maxLeverage: number;
  minCoverage: number;
};

export const initialEngineLoading: EngineLoading = {
  onnx: false,
  milp: false,
  ga: false,
};

export const defaultOnnxInput: OnnxInput = {
  name: "Target Corp Ltda",
  sector: "SaaS / Fintech",
  ebitda: 4500000,
  revenue: 15000000,
  assets: 20000000,
  liabilities: 12000000,
  cashflow: 3200000,
  volatility: 0.12,
};

export const defaultMilpInput: MilpInput = {
  budget: 50,
  riskTolerance: 0.4,
};

export const defaultGaInput: GaInput = {
  valuationMin: 80,
  valuationMax: 120,
  cash: 0.4,
  equity: 0.3,
  earnOut: 0.2,
  escrow: 0.1,
  maxLeverage: 4.0,
  minCoverage: 2.5,
};

export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function timestampConsoleLog(message: string, now: Date): string {
  return `[${now.toLocaleTimeString()}] ${message}`;
}

export function onnxRequestFromInput(input: OnnxInput): OnnxInput {
  return { ...input };
}

export function portfolioRequestFromInput(input: MilpInput): MilpInput {
  return { ...input };
}

export function termSheetRequestFromInput(input: GaInput): TermSheetRequest {
  return {
    valuationMin: input.valuationMin,
    valuationMax: input.valuationMax,
    preferences: termSheetPreferencesFromInput(input),
    maxLeverage: input.maxLeverage,
    minCoverage: input.minCoverage,
  };
}

export function termSheetPreferencesFromInput(
  input: GaInput,
): TermSheetRequest["preferences"] {
  return {
    cash: input.cash,
    equity: input.equity,
    earnOut: input.earnOut,
    escrow: input.escrow,
  };
}

export function onnxResultLogs(
  t: Translation,
  result: OnnxPredictionResult,
): string[] {
  return [
    t("engines.onnx.logs.done"),
    t("engines.onnx.logs.insolvency", {
      risk: (result.metrics.insolvencyRisk * 100).toFixed(2),
    }),
    t("engines.onnx.logs.zscore", { score: result.metrics.zScore }),
    t("engines.onnx.logs.dcf", { label: result.dcfRiskLabel }),
  ];
}

export function milpResultLogs(
  t: Translation,
  result: PortfolioOptimizationResult,
): string[] {
  return [
    t("engines.milp.logs.done", {
      status: result.optimization.status.toUpperCase(),
    }),
    t("engines.milp.logs.synergy", { score: result.totalSynergy }),
    t("engines.milp.logs.cost", { cost: result.totalCost }),
  ];
}

export function gaResultLogs(
  t: Translation,
  alternatives: TermSheetAlternative[],
): string[] {
  return [
    t("engines.ga.logs.done", { len: alternatives.length }),
    ...alternatives.map((alternative, index) =>
      termSheetAlternativeLog(t, alternative, index)
    ),
  ];
}

export function termSheetAlternativeLog(
  t: Translation,
  alternative: TermSheetAlternative,
  index: number,
): string {
  return t("engines.ga.logs.alt", {
    idx: index + 1,
    val: alternative.valuation.toFixed(2),
    fit: alternative.fitness.toFixed(4),
  });
}
