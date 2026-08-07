const MAX_ID_LENGTH = 96;

const brands = {
  finding: Symbol("finding-id"),
  impact: Symbol("impact-id"),
  request: Symbol("decision-request-id"),
  record: Symbol("decision-record-id"),
  history: Symbol("decision-history-id"),
} as const;

export type FindingId = string & { readonly [brands.finding]: "FindingId" };
export type ImpactId = string & { readonly [brands.impact]: "ImpactId" };
export type DecisionRequestId = string & {
  readonly [brands.request]: "DecisionRequestId";
};
export type DecisionRecordId = string & {
  readonly [brands.record]: "DecisionRecordId";
};
export type DecisionHistoryId = string & {
  readonly [brands.history]: "DecisionHistoryId";
};

export type {
  ActorId,
  AggregateVersion,
  DealId,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";
export type { EvidenceId, FactVersionId } from "../evidence_knowledge/v1.ts";
export {
  parseActorId as parseActor,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../platform/api/v1.ts";
export { parseFactVersionId } from "../evidence_knowledge/v1.ts";

export const parseFindingId = parser<FindingId>("finding_");
export const parseImpactId = parser<ImpactId>("impact_");
export const parseDecisionRequestId = parser<DecisionRequestId>(
  "decision_request_",
);
export const parseDecisionRecordId = parser<DecisionRecordId>(
  "decision_record_",
);
export const parseDecisionHistoryId = parser<DecisionHistoryId>(
  "decision_history_",
);

function parser<T>(prefix: string) {
  return (value: unknown): IdentifierResult<T> =>
    parseIdentifier(value, prefix) as IdentifierResult<T>;
}

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
