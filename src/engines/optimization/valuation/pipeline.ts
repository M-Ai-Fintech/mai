import type {
  ExtendedValuationInput,
  ExtendedValuationReport,
  ReconciledMethodResult,
  ValuationFlag,
} from "../../../shared/types.ts";
import { computeBookValue } from "./methods/book_value.ts";
import { computeDCF } from "./methods/discounted_cash_flow.ts";
import { computeEbitdaMultiple } from "./methods/ebitda.ts";
import { computeEnterpriseValue } from "./methods/enterprise_value.ts";
import { computeTerminalValue } from "./methods/growing_perpetuity.ts";
import { computeMarketCap } from "./methods/market_capitalization.ts";
import { computeContingencyDeductions } from "./reconciliation/contingencies.ts";
import { computeChaffeDLOM } from "./reconciliation/dlom.ts";
import { ReconciliationEngine } from "./reconciliation/index.ts";
import { computeJcpTaxShield } from "./reconciliation/jcp.ts";
import { resolveWeightsConfig } from "./weights.ts";

type MethodResults = ReturnType<typeof runMethods>;

export function evaluateValuation(
  input: ExtendedValuationInput,
  engineVersion: string,
): ExtendedValuationReport {
  const methods = runMethods(input);
  const values = methodValues(methods);
  const reconciliation = ReconciliationEngine.reconcile({
    values,
    weightsConfig: resolveWeightsConfig(input),
  });
  return buildReport(input, engineVersion, methods, values, reconciliation);
}

function runMethods(input: ExtendedValuationInput) {
  return {
    bookValue: computeBookValue(input.balanceSheet),
    dcf: computeDCF(input.cashFlowProjection),
    terminalValue: computeTerminalValue(input.terminalValue),
    marketCap: computeMarketCap(input.marketData),
    enterpriseValue: computeEnterpriseValue(input.enterpriseValue),
    ebitdaValuation: computeEbitdaMultiple(input.ebitdaMultiple),
  };
}

function methodValues(methods: MethodResults): number[] {
  return [
    methods.bookValue.value,
    methods.dcf.value,
    methods.terminalValue.value,
    methods.marketCap.value,
    methods.enterpriseValue.value,
    Number.isNaN(methods.ebitdaValuation.value)
      ? 0
      : methods.ebitdaValuation.value,
  ];
}

type ReconciliationResult = ReturnType<typeof ReconciliationEngine.reconcile>;

function buildReport(
  input: ExtendedValuationInput,
  engineVersion: string,
  methods: MethodResults,
  values: number[],
  reconciliation: ReconciliationResult,
): ExtendedValuationReport {
  const baseValue = weightedValue(values, reconciliation.weights);
  const adjustments = valuationAdjustments(input, baseValue);
  const reconciliationDetails = reconciliationReport(
    baseValue,
    adjustments,
    methods,
    values,
    reconciliation,
  );
  return valuationReport(input, engineVersion, methods, reconciliationDetails);
}

function valuationReport(
  input: ExtendedValuationInput,
  engineVersion: string,
  methods: MethodResults,
  reconciliation: ExtendedValuationReport["reconciliation"],
): ExtendedValuationReport {
  return {
    companyId: input.companyId,
    timestamp: new Date().toISOString(),
    engineVersion,
    ...methods,
    allFlags: collectFlags(methods),
    reconciliation,
  };
}

function reconciliationReport(
  baseValue: number,
  adjustments: ReturnType<typeof valuationAdjustments>,
  methods: MethodResults,
  values: number[],
  reconciliation: ReconciliationResult,
) {
  return {
    baseReconciledValue: baseValue,
    ...adjustments,
    methodBreakdown: methodBreakdown(methods, values, reconciliation.weights),
    optimizationStatus: reconciliation.status,
    optimizationMessage: reconciliation.message,
  };
}

function weightedValue(
  values: readonly number[],
  weights: readonly number[],
): number {
  return values.reduce(
    (total, value, index) => total + value * weights[index],
    0,
  );
}

function valuationAdjustments(
  input: ExtendedValuationInput,
  baseValue: number,
) {
  const dlomDiscountRate = input.dlom ? computeChaffeDLOM(input.dlom) : 0;
  const dlomDiscountAmount = baseValue * dlomDiscountRate;
  const jcpTaxShieldBenefit = jcpBenefit(input);
  const contingencyDeductions = contingencyDeductionsFor(input);
  return {
    dlomDiscountRate,
    dlomDiscountAmount,
    jcpTaxShieldBenefit,
    contingencyDeductions,
    finalReconciledValuation: baseValue - dlomDiscountAmount +
      jcpTaxShieldBenefit - contingencyDeductions,
  };
}

function jcpBenefit(input: ExtendedValuationInput): number {
  return input.jcp ? computeJcpTaxShield(input.jcp).taxShieldBenefit : 0;
}

function contingencyDeductionsFor(input: ExtendedValuationInput): number {
  return input.contingencies
    ? computeContingencyDeductions(input.contingencies)
    : 0;
}

function methodBreakdown(
  methods: MethodResults,
  values: number[],
  weights: readonly number[],
): ReconciledMethodResult[] {
  const names = [
    "Book Value",
    "Discounted Cash Flow (DCF)",
    "Growing Perpetuity (Terminal Value)",
    "Market Capitalization",
    "Enterprise Value (EV)",
    "EBITDA Multiple Valuation",
  ];
  const flags = methodFlags(methods);
  return names.map((method, index) =>
    reconciledMethod(method, values[index], weights[index], flags[index])
  );
}

function reconciledMethod(
  method: string,
  rawValue: number,
  weight: number,
  flags: readonly ValuationFlag[],
): ReconciledMethodResult {
  return {
    method,
    rawValue,
    weight,
    contribution: rawValue * weight,
    flags,
  };
}

function methodFlags(
  methods: MethodResults,
): ReadonlyArray<readonly ValuationFlag[]> {
  return [
    methods.bookValue.flags,
    methods.dcf.flags,
    methods.terminalValue.flags,
    [],
    methods.enterpriseValue.flags,
    methods.ebitdaValuation.flags,
  ];
}

function collectFlags(methods: MethodResults): ValuationFlag[] {
  return Array.from(new Set(methodFlags(methods).flat()));
}
