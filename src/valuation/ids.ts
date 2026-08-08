const MAX_ID_LENGTH = 96;

const brands = {
  model: Symbol("valuation-model-id"),
  scenario: Symbol("valuation-scenario-id"),
  input: Symbol("valuation-input-id"),
  result: Symbol("valuation-result-id"),
  comparison: Symbol("valuation-comparison-id"),
  job: Symbol("valuation-job-id"),
  approval: Symbol("valuation-approval-id"),
  invalidation: Symbol("valuation-invalidation-id"),
  audit: Symbol("valuation-audit-event-id"),
} as const;

export type ValuationModelId = string & {
  readonly [brands.model]: "ValuationModelId";
};
export type ValuationScenarioId = string & {
  readonly [brands.scenario]: "ValuationScenarioId";
};
export type ValuationInputId = string & {
  readonly [brands.input]: "ValuationInputId";
};
export type ValuationResultId = string & {
  readonly [brands.result]: "ValuationResultId";
};
export type ValuationComparisonId = string & {
  readonly [brands.comparison]: "ValuationComparisonId";
};
export type ValuationComputeJobId = string & {
  readonly [brands.job]: "ValuationComputeJobId";
};
export type ValuationApprovalId = string & {
  readonly [brands.approval]: "ValuationApprovalId";
};
export type ValuationInvalidationId = string & {
  readonly [brands.invalidation]: "ValuationInvalidationId";
};
export type ValuationAuditEventId = string & {
  readonly [brands.audit]: "ValuationAuditEventId";
};

export type {
  ActorId,
  AggregateVersion,
  CorrelationId,
  DealId,
  IdempotencyKey,
  JobId,
  OperationId,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";
export {
  parseActorId,
  parseAggregateVersion,
  parseCorrelationId,
  parseDealId,
  parseIdempotencyKey,
  parseJobId,
  parseOperationId,
  parseTenantId,
  parseWorkspaceId,
} from "../platform/api/v1.ts";

export const parseValuationModelId = parser<ValuationModelId>(
  "valuation_model_",
);
export const parseValuationScenarioId = parser<ValuationScenarioId>(
  "valuation_scenario_",
);
export const parseValuationInputId = parser<ValuationInputId>(
  "valuation_input_",
);
export const parseValuationResultId = parser<ValuationResultId>(
  "valuation_result_",
);
export const parseValuationComparisonId = parser<ValuationComparisonId>(
  "valuation_comparison_",
);
export const parseValuationComputeJobId = parser<ValuationComputeJobId>(
  "valuation_job_",
);
export const parseValuationApprovalId = parser<ValuationApprovalId>(
  "valuation_approval_",
);
export const parseValuationInvalidationId = parser<ValuationInvalidationId>(
  "valuation_invalidation_",
);
export const parseValuationAuditEventId = parser<ValuationAuditEventId>(
  "valuation_audit_",
);

export const parseModelId = parseValuationModelId;
export const parseScenarioId = parseValuationScenarioId;
export const parseInputId = parseValuationInputId;
export const parseResultId = parseValuationResultId;
export const parseComparisonId = parseValuationComparisonId;
export const parseApprovalId = parseValuationApprovalId;
export const parseInvalidationId = parseValuationInvalidationId;

export type IdentifierResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
    readonly ok: false;
    readonly issue: { readonly code: IdentifierIssueCode };
  };

type IdentifierIssueCode =
  | "INVALID_TYPE"
  | "EMPTY"
  | "SURROUNDING_WHITESPACE"
  | "WRONG_PREFIX"
  | "INCOMPLETE"
  | "INVALID_LENGTH"
  | "INVALID_FORMAT";

function parser<T>(prefix: string) {
  return (value: unknown): IdentifierResult<T> =>
    parseIdentifier(value, prefix) as IdentifierResult<T>;
}

function parseIdentifier(
  value: unknown,
  prefix: string,
): IdentifierResult<string> {
  if (typeof value !== "string") return failure("INVALID_TYPE");
  if (value.length === 0) return failure("EMPTY");
  if (value !== value.trim()) return failure("SURROUNDING_WHITESPACE");
  if (!value.startsWith(prefix)) return failure("WRONG_PREFIX");
  if (value.length === prefix.length) return failure("INCOMPLETE");
  if (value.length > MAX_ID_LENGTH) return failure("INVALID_LENGTH");
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length))
    ? { ok: true, value }
    : failure("INVALID_FORMAT");
}

function failure(code: IdentifierIssueCode): IdentifierResult<never> {
  return { ok: false, issue: { code } };
}
