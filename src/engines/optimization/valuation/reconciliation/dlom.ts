import type { DlomInput } from "../../../../shared/types.ts";

/**
 * Approximates the standard normal cumulative distribution function (CDF).
 * Abramowitz and Stegun formula 26.2.17 (maximum absolute error < 7.5e-8).
 */
export function cumulativeNormalCDF(x: number): number {
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1 / (1 + p * Math.abs(x));
  const z = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - z * ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;

  return x >= 0 ? cdf : 1 - cdf;
}

/**
 * Calculates DLOM rate using the Chaffe put-option ratio model.
 * DLOM = Put(S, S, T, r, sigma) / S = e^(-r*T)*N(-d2) - e^(-q*T)*N(-d1)
 */
export function computeChaffeDLOM(input: DlomInput): number {
  const {
    volatility: sigma,
    riskFreeRate: r,
    holdingPeriod: T,
    dividendYield = 0.0,
  } = input;

  if (T <= 0 || sigma <= 0) {
    return 0.0;
  }

  // Under K = S, ln(S/K) = 0.
  const d1 = ((r - dividendYield + (sigma * sigma) / 2) * T) /
    (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const nNegD1 = cumulativeNormalCDF(-d1);
  const nNegD2 = cumulativeNormalCDF(-d2);

  const dlomRate = Math.exp(-r * T) * nNegD2 -
    Math.exp(-dividendYield * T) * nNegD1;

  // Clip between 0% and 100% boundary
  return Math.max(0.0, Math.min(1.0, dlomRate));
}
