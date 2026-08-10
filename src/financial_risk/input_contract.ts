import type {
  AllowedAuthorizationDecision,
  FieldClassification,
  FieldMask,
  FieldName,
} from "../platform/authz/v1.ts";
import { field } from "../platform/authz/v1.ts";
import { FinancialRiskError } from "./errors.ts";
import type { FinancialRiskInput } from "./model.ts";

export type FinancialRiskInputField = keyof FinancialRiskInput;

export const FINANCIAL_RISK_INPUT_FIELDS: Readonly<
  Record<FinancialRiskInputField, FieldName>
> = Object.freeze({
  ebitda: field("financial_risk_input_ebitda"),
  revenue: field("financial_risk_input_revenue"),
  totalAssets: field("financial_risk_input_total_assets"),
  totalLiabilities: field("financial_risk_input_total_liabilities"),
  operatingCashFlow: field("financial_risk_input_operating_cash_flow"),
  historicalVolatility: field("financial_risk_input_historical_volatility"),
});

const FINANCIAL_RISK_INPUT_CLASSIFICATION: FieldClassification = "restricted";

export const FINANCIAL_RISK_INPUT_FIELD_MASK: FieldMask = Object.freeze({
  include: Object.freeze(Object.values(FINANCIAL_RISK_INPUT_FIELDS)),
  omit: Object.freeze([]),
  redact: Object.freeze([]),
  approvedClassifications: Object.freeze(
    Object.values(FINANCIAL_RISK_INPUT_FIELDS).map((name) => ({
      name,
      classification: FINANCIAL_RISK_INPUT_CLASSIFICATION,
    })),
  ),
});

export function assertFinancialRiskInputAccess(
  authorization: AllowedAuthorizationDecision,
  assessmentId: string,
): void {
  const granted = Object.values(FINANCIAL_RISK_INPUT_FIELDS).every((name) =>
    fieldGranted(authorization, name)
  );
  if (granted) return;
  throw new FinancialRiskError(
    "PROTECTED_NOT_FOUND",
    `Financial-risk assessment "${assessmentId}" is not available for the approved input field scope.`,
  );
}

export function financialRiskInputFieldGranted(
  authorization: AllowedAuthorizationDecision,
  key: FinancialRiskInputField,
): boolean {
  return fieldGranted(authorization, FINANCIAL_RISK_INPUT_FIELDS[key]);
}

function fieldGranted(
  authorization: AllowedAuthorizationDecision,
  name: FieldName,
): boolean {
  return authorization.fieldMask.include.includes(name) &&
    !authorization.fieldMask.omit.includes(name) &&
    !authorization.fieldMask.redact.includes(name) &&
    authorization.fieldMask.approvedClassifications.some((approved) =>
      approved.name === name &&
      approved.classification === FINANCIAL_RISK_INPUT_CLASSIFICATION
    );
}
