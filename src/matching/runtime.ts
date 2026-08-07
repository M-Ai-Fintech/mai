import {
  action,
  type ActorReference,
  type AuthorizationDecision,
  resourceKind,
} from "../platform/authz/v1.ts";
import type { AggregateVersion, RequestContext } from "../platform/api/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import { MatchingError, protectedNotFound } from "./errors.ts";
import type { MatchingEffectInput, MatchingEffects } from "./effects.ts";
import type { MatchingRepository } from "./repository.ts";
import type { MatchingTransactionRunner } from "./transaction.ts";
import {
  type CandidateProjection,
  candidateReadiness,
  type MatchingScope,
} from "./model.ts";
import type {
  MatchingAuthorizationPort,
  MatchingClock,
} from "./service_contracts.ts";
import type { MatchingComputePort } from "./compute.ts";
import type { MatchingRunScheduler } from "./jobs.ts";

export const ACTIONS = Object.freeze({
  criteriaWrite: action("matching_criteria_write"),
  runCreate: action("matching_run_create"),
  runExecute: action("matching_run_execute"),
  candidateRead: action("matching_candidate_read"),
  conflictRead: action("matching_conflict_read"),
  conflictWrite: action("matching_conflict_write"),
  restrictionWrite: action("matching_restriction_write"),
  shortlistWrite: action("matching_shortlist_write"),
  outreachWrite: action("matching_outreach_write"),
});

export const RESOURCES = Object.freeze({
  criteria: resourceKind("matching_criteria"),
  run: resourceKind("matching_run"),
  candidate: resourceKind("matching_candidate"),
  conflict: resourceKind("matching_conflict"),
  restriction: resourceKind("matching_restriction"),
  shortlist: resourceKind("matching_shortlist"),
  outreach: resourceKind("matching_outreach"),
});

export interface MatchingRuntime {
  readonly transactions: MatchingTransactionRunner;
  readonly repository: MatchingRepository;
  readonly authorization: MatchingAuthorizationPort;
  readonly compute: MatchingComputePort;
  readonly scheduler: MatchingRunScheduler;
  readonly effects: MatchingEffects;
  readonly clock: MatchingClock;
}

export function assertScope(
  context: RequestContext,
  scope: MatchingScope,
): void {
  if (
    context.tenantId === scope.tenantId &&
    context.workspaceId === scope.workspaceId &&
    context.dealId === scope.dealId
  ) return;
  throw new MatchingError(
    "ACTION_FORBIDDEN",
    `Matching request scope does not match authenticated tenant "${context.tenantId}", workspace "${context.workspaceId}", and deal "${context.dealId}".`,
  );
}

export async function authorizeRead(
  runtime: MatchingRuntime,
  input: ScopedResourceInput,
  resource: ReturnType<typeof resourceKind>,
  requestedAction: ReturnType<typeof action>,
): Promise<AuthorizationDecision> {
  const decision = await runtime.authorization.authorize({
    ...input,
    resource: { kind: resource, id: input.id },
    action: requestedAction,
  });
  if (decision.outcome === "deny") throw protectedNotFound(input.id);
  return decision;
}

export async function authorizeCommand(
  runtime: MatchingRuntime,
  input: ScopedResourceInput,
  resource: ReturnType<typeof resourceKind>,
  requestedAction: ReturnType<typeof action>,
): Promise<AuthorizationDecision> {
  const decision = await runtime.authorization.authorize({
    ...input,
    resource: { kind: resource, id: input.id },
    action: requestedAction,
  });
  if (decision.outcome === "deny") {
    throw new MatchingError(
      "ACTION_FORBIDDEN",
      `Actor "${input.actor.id}" is not authorized for matching action "${requestedAction}" on "${input.id}".`,
      input.id,
    );
  }
  return decision;
}

export async function authorizeHumanCommand(
  runtime: MatchingRuntime,
  input: ScopedResourceInput,
  resource: ReturnType<typeof resourceKind>,
  requestedAction: ReturnType<typeof action>,
): Promise<AuthorizationDecision> {
  if (input.actor.kind !== "human") {
    throw new MatchingError(
      "HUMAN_AUTHORITY_REQUIRED",
      `Actor "${input.actor.id}" is "${input.actor.kind}"; expected a human shortlist or outreach authority.`,
      input.id,
    );
  }
  const decision = await runtime.authorization.authorize({
    ...input,
    resource: { kind: resource, id: input.id },
    action: requestedAction,
    humanOnly: true,
  });
  if (decision.outcome === "deny") {
    throw new MatchingError(
      "ACTION_FORBIDDEN",
      `Actor "${input.actor.id}" is not authorized for human matching authority on "${input.id}".`,
      input.id,
    );
  }
  return decision;
}

export async function recordEffect(
  runtime: MatchingRuntime,
  transaction: TransactionHandle,
  input: ScopedActorInput,
  aggregate: AggregateLike,
  eventType: string,
  payload: Readonly<Record<string, string | number>> = {},
): Promise<void> {
  const effect: MatchingEffectInput = {
    context: input.context,
    scope: input.scope,
    actor: input.actor,
    aggregateType: aggregate.aggregateType,
    aggregateId: aggregate.id,
    aggregateVersion: aggregate.version as AggregateVersion,
    eventType,
    payload,
    occurredAt: runtime.clock.now(),
  };
  await runtime.effects.append(transaction, effect);
}

export function assertExpectedVersion(
  id: string,
  expected: number,
  actual: number,
): void {
  if (expected === actual) return;
  throw new MatchingError(
    "VERSION_CONFLICT",
    `Matching aggregate "${id}" version "${actual}" does not match expected version "${expected}".`,
    id,
  );
}

export function assertAuthority(
  reference: string,
  decision: AuthorizationDecision,
): void {
  if (
    decision.outcome === "allow" &&
    decision.authoritySnapshotReference === reference &&
    reference.trim()
  ) return;
  throw new MatchingError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Authority snapshot "${reference}" is not the exact active authorization snapshot; expected the allowed human authority reference.`,
  );
}

export function assertCandidateReady(candidate: CandidateProjection): void {
  const readiness = candidateReadiness(candidate);
  if (readiness === "restricted") {
    throw new MatchingError(
      "RESTRICTION_BLOCKING",
      `Candidate "${candidate.id}" is restricted; expected restriction clearance before shortlist or outreach.`,
      candidate.id,
    );
  }
  if (readiness === "conflicted") {
    throw new MatchingError(
      "CONFLICT_BLOCKING",
      `Candidate "${candidate.id}" has an open conflict; expected conflict resolution before shortlist or outreach.`,
      candidate.id,
    );
  }
}

export function metadata(
  context: RequestContext,
): Readonly<Record<string, string>> {
  return { correlationId: context.correlationId };
}

export interface ScopedResourceInput extends ScopedActorInput {
  readonly id: string;
}

export interface ScopedActorInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
}

export interface AggregateLike {
  readonly aggregateType: string;
  readonly id: string;
  readonly version: number;
}
