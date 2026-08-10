const MAX_ID_LENGTH = 96;

const brands = {
  assessment: Symbol("financial-risk-assessment-id"),
  result: Symbol("financial-risk-result-id"),
  invalidation: Symbol("financial-risk-invalidation-id"),
} as const;

export type FinancialRiskAssessmentId = string & {
  readonly [brands.assessment]: "FinancialRiskAssessmentId";
};
export type FinancialRiskResultId = string & {
  readonly [brands.result]: "FinancialRiskResultId";
};
export type FinancialRiskInvalidationId = string & {
  readonly [brands.invalidation]: "FinancialRiskInvalidationId";
};

export type FinancialRiskIdentifierResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
    readonly ok: false;
    readonly issue: { readonly code: FinancialRiskIdentifierIssue };
  };

export type FinancialRiskIdentifierIssue =
  | "INVALID_TYPE"
  | "EMPTY"
  | "SURROUNDING_WHITESPACE"
  | "WRONG_PREFIX"
  | "INCOMPLETE"
  | "INVALID_LENGTH"
  | "INVALID_FORMAT";

export const parseFinancialRiskAssessmentId = parser<FinancialRiskAssessmentId>(
  "risk_assessment_",
);
export const parseFinancialRiskResultId = parser<FinancialRiskResultId>(
  "risk_result_",
);
export const parseFinancialRiskInvalidationId = parser<
  FinancialRiskInvalidationId
>("risk_invalidation_");

function parser<T>(prefix: string) {
  return (value: unknown): FinancialRiskIdentifierResult<T> => {
    const issue = identifierIssue(value, prefix);
    return issue === undefined
      ? { ok: true, value: value as T }
      : { ok: false, issue: { code: issue } };
  };
}

function identifierIssue(
  value: unknown,
  prefix: string,
): FinancialRiskIdentifierIssue | undefined {
  if (typeof value !== "string") return "INVALID_TYPE";
  if (value.length === 0) return "EMPTY";
  if (value !== value.trim()) return "SURROUNDING_WHITESPACE";
  if (!value.startsWith(prefix)) return "WRONG_PREFIX";
  if (value.length === prefix.length) return "INCOMPLETE";
  if (value.length > MAX_ID_LENGTH) return "INVALID_LENGTH";
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length))
    ? undefined
    : "INVALID_FORMAT";
}
