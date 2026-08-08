import { MatchingError } from "./errors.ts";
import type {
  CandidateRestriction,
  CriteriaState,
  MatchingConflict,
  MatchingCriteria,
  MatchingRun,
  OutreachAuthorization,
  RunState,
  ShortlistDecision,
  ShortlistDecisionState,
} from "./model.ts";

export function transitionCriteria(
  criteria: MatchingCriteria,
  state: CriteriaState,
  now: Date,
): MatchingCriteria {
  assertTransition("criteria", criteria.id, criteria.state, state, [
    "draft->active",
    "active->superseded",
  ]);
  return { ...criteria, state, version: criteria.version + 1, updatedAt: now };
}

export function transitionRun(
  run: MatchingRun,
  state: RunState,
  now: Date,
  result?: MatchingRun["result"],
): MatchingRun {
  assertTransition("run", run.id, run.state, state, [
    "queued->running",
    "queued->cancelled",
    "running->succeeded",
    "running->infeasible",
    "running->failed",
    "running->cancelled",
  ]);
  return {
    ...run,
    state,
    result,
    version: run.version + 1,
    updatedAt: now,
  };
}

export function transitionConflict(
  conflict: MatchingConflict,
  state: "resolved" | "waived",
  now: Date,
): MatchingConflict {
  assertTransition("conflict", conflict.id, conflict.state, state, [
    "open->resolved",
    "open->waived",
  ]);
  return { ...conflict, state, version: conflict.version + 1, updatedAt: now };
}

export function transitionRestriction(
  restriction: CandidateRestriction,
  now: Date,
): CandidateRestriction {
  if (restriction.state !== "active") {
    throw invalidTransition(
      "restriction",
      restriction.id,
      restriction.state,
      "cleared",
    );
  }
  return {
    ...restriction,
    state: "cleared",
    version: restriction.version + 1,
    updatedAt: now,
  };
}

export function transitionShortlistDecision(
  decision: ShortlistDecision,
  state: ShortlistDecisionState,
  now: Date,
): ShortlistDecision {
  assertTransition("shortlist", decision.id, decision.state, state, [
    "proposed->shortlisted",
    "proposed->removed",
    "shortlisted->removed",
  ]);
  return { ...decision, state, version: decision.version + 1, updatedAt: now };
}

export function revokeOutreachAuthorization(
  authorization: OutreachAuthorization,
  now: Date,
): OutreachAuthorization {
  if (authorization.state !== "authorized") {
    throw invalidTransition(
      "outreach authorization",
      authorization.id,
      authorization.state,
      "revoked",
    );
  }
  return {
    ...authorization,
    state: "revoked",
    version: authorization.version + 1,
    updatedAt: now,
  };
}

function assertTransition(
  aggregate: string,
  id: string,
  from: string,
  to: string,
  allowed: readonly string[],
): void {
  if (allowed.includes(`${from}->${to}`)) return;
  throw invalidTransition(aggregate, id, from, to);
}

function invalidTransition(
  aggregate: string,
  id: string,
  from: string,
  to: string,
): MatchingError {
  return new MatchingError(
    "INVALID_TRANSITION",
    `Matching ${aggregate} "${id}" cannot transition from "${from}" to "${to}"; expected an allowed state transition.`,
    id,
  );
}
