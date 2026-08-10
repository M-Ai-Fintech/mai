import { adapterCanaryModeFor, type AdapterMode } from "../feature-flags";

const FINANCIAL_RISK_READINESS_ENV =
  "NEXT_PUBLIC_FINANCIAL_RISK_ROUTE_READINESS";

export type FinancialRiskRouteReadiness = "registered" | "not-registered";

export interface FinancialRiskCanary {
  readonly mode: AdapterMode;
  readonly activation: AdapterMode;
  readonly routeReadiness: FinancialRiskRouteReadiness;
}

export function financialRiskCanaryFor(
  environment: Readonly<Record<string, string | undefined>> =
    runtimeEnvironment(),
): FinancialRiskCanary {
  const mode = configuredFinancialRiskMode(environment);
  const routeReadiness = configuredFinancialRiskReadiness(environment);
  return {
    mode,
    activation: financialRiskActivation(mode, routeReadiness),
    routeReadiness,
  };
}

function configuredFinancialRiskMode(
  environment: Readonly<Record<string, string | undefined>>,
): AdapterMode {
  return adapterCanaryModeFor("financial-risk", environment);
}

function configuredFinancialRiskReadiness(
  environment: Readonly<Record<string, string | undefined>>,
): FinancialRiskRouteReadiness {
  return environment[FINANCIAL_RISK_READINESS_ENV] === "registered"
    ? "registered"
    : "not-registered";
}

function financialRiskActivation(
  mode: AdapterMode,
  readiness: FinancialRiskRouteReadiness,
): AdapterMode {
  if (mode !== "v1") return mode;
  return readiness === "registered" ? "v1" : "off";
}

function runtimeEnvironment(): Readonly<Record<string, string | undefined>> {
  return typeof process === "undefined" ? {} : process.env;
}
