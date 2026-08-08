const matchingIdBrand: unique symbol = Symbol("matching-id");

type MatchingId<Kind extends string> = string & {
  readonly [matchingIdBrand]: Kind;
};

export type CriteriaId = MatchingId<"CriteriaId">;
export type RunId = MatchingId<"RunId">;
export type CandidateId = MatchingId<"CandidateId">;
export type ConflictId = MatchingId<"ConflictId">;
export type RestrictionId = MatchingId<"RestrictionId">;
export type ShortlistDecisionId = MatchingId<"ShortlistDecisionId">;
export type OutreachAuthorizationId = MatchingId<"OutreachAuthorizationId">;

export function criteriaId(value: string): CriteriaId {
  return matchingId(value, "criteria_") as CriteriaId;
}

export function runId(value: string): RunId {
  return matchingId(value, "run_") as RunId;
}

export function candidateId(value: string): CandidateId {
  return matchingId(value, "candidate_") as CandidateId;
}

export function conflictId(value: string): ConflictId {
  return matchingId(value, "conflict_") as ConflictId;
}

export function restrictionId(value: string): RestrictionId {
  return matchingId(value, "restriction_") as RestrictionId;
}

export function shortlistDecisionId(value: string): ShortlistDecisionId {
  return matchingId(value, "shortlist_") as ShortlistDecisionId;
}

export function outreachAuthorizationId(
  value: string,
): OutreachAuthorizationId {
  return matchingId(value, "outreach_") as OutreachAuthorizationId;
}

function matchingId(value: string, prefix: string): string {
  if (
    value.startsWith(prefix) &&
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length))
  ) return value;
  throw new Error(
    `Matching identifier "${value}" is invalid; expected a lowercase ${prefix} identifier without issue IDs.`,
  );
}
