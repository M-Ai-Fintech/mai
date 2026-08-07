import { MatchingError, protectedNotFound } from "./errors.ts";
import {
  revokeOutreachAuthorization,
  transitionConflict,
  transitionRestriction,
} from "./transitions.ts";
import type {
  CandidateRestriction,
  MatchingConflict,
  OutreachAuthorization,
  ShortlistDecision,
} from "./model.ts";
import {
  ACTIONS,
  assertAuthority,
  assertCandidateReady,
  assertExpectedVersion,
  assertScope,
  authorizeCommand,
  authorizeHumanCommand,
  type MatchingRuntime,
  metadata,
  recordEffect,
  RESOURCES,
} from "./runtime.ts";
import type {
  ClearRestrictionInput,
  ConflictCommandInput,
  CreateConflictInput,
  OutreachCommandInput,
  RestrictionCommandInput,
  RevokeOutreachInput,
  ShortlistCommandInput,
} from "./service_contracts.ts";

export async function openConflictCommand(
  runtime: MatchingRuntime,
  input: CreateConflictInput,
): Promise<MatchingConflict> {
  assertScope(input.context, input.scope);
  await authorizeCommand(
    runtime,
    input,
    RESOURCES.conflict,
    ACTIONS.conflictWrite,
  );
  return await runtime.transactions.run(async (transaction) => {
    const candidate = await runtime.repository.findCandidate(
      transaction,
      input.scope,
      input.candidateId,
    );
    if (candidate === undefined) throw protectedNotFound(input.candidateId);
    const now = runtime.clock.now();
    const conflict: MatchingConflict = {
      aggregateType: "matching_conflict",
      id: input.id,
      scope: input.scope,
      version: 1,
      schemaVersion: 1,
      candidateId: candidate.id,
      kind: input.kind,
      state: "open",
      rationale: input.rationale,
      createdBy: input.actor.id,
      createdAt: now,
      updatedAt: now,
    };
    await runtime.repository.createConflict(transaction, conflict);
    await runtime.repository.updateCandidate(transaction, {
      ...candidate,
      conflictState: "open",
      version: candidate.version + 1,
      updatedAt: now,
    }, candidate.version);
    await recordEffect(
      runtime,
      transaction,
      input,
      conflict,
      "conflict_opened",
    );
    return conflict;
  }, metadata(input.context));
}

export async function resolveConflictCommand(
  runtime: MatchingRuntime,
  input: ConflictCommandInput,
): Promise<MatchingConflict> {
  assertScope(input.context, input.scope);
  await authorizeCommand(
    runtime,
    input,
    RESOURCES.conflict,
    ACTIONS.conflictWrite,
  );
  return await runtime.transactions.run(async (transaction) => {
    const conflict = await runtime.repository.findConflict(
      transaction,
      input.scope,
      input.id,
    );
    if (conflict === undefined) throw protectedNotFound(input.id);
    assertExpectedVersion(input.id, input.expectedVersion, conflict.version);
    const candidate = await runtime.repository.findCandidate(
      transaction,
      input.scope,
      conflict.candidateId,
    );
    if (candidate === undefined) throw protectedNotFound(conflict.candidateId);
    const updated = transitionConflict(
      conflict,
      "resolved",
      runtime.clock.now(),
    );
    await runtime.repository.updateConflict(
      transaction,
      updated,
      input.expectedVersion,
    );
    await runtime.repository.updateCandidate(transaction, {
      ...candidate,
      conflictState: "clear",
      version: candidate.version + 1,
      updatedAt: updated.updatedAt,
    }, candidate.version);
    await recordEffect(
      runtime,
      transaction,
      input,
      updated,
      "conflict_resolved",
    );
    return updated;
  }, metadata(input.context));
}

export async function openRestrictionCommand(
  runtime: MatchingRuntime,
  input: RestrictionCommandInput,
): Promise<CandidateRestriction> {
  assertScope(input.context, input.scope);
  await authorizeCommand(
    runtime,
    input,
    RESOURCES.restriction,
    ACTIONS.restrictionWrite,
  );
  return await runtime.transactions.run(async (transaction) => {
    const candidate = await runtime.repository.findCandidate(
      transaction,
      input.scope,
      input.candidateId,
    );
    if (candidate === undefined) throw protectedNotFound(input.candidateId);
    const now = runtime.clock.now();
    const restriction: CandidateRestriction = {
      aggregateType: "candidate_restriction",
      id: input.id,
      scope: input.scope,
      version: 1,
      schemaVersion: 1,
      candidateId: candidate.id,
      state: "active",
      category: input.category,
      createdBy: input.actor.id,
      createdAt: now,
      updatedAt: now,
    };
    await runtime.repository.createRestriction(transaction, restriction);
    await runtime.repository.updateCandidate(transaction, {
      ...candidate,
      restrictionState: "active",
      version: candidate.version + 1,
      updatedAt: now,
    }, candidate.version);
    await recordEffect(
      runtime,
      transaction,
      input,
      restriction,
      "restriction_opened",
    );
    return restriction;
  }, metadata(input.context));
}

export async function clearRestrictionCommand(
  runtime: MatchingRuntime,
  input: ClearRestrictionInput,
): Promise<CandidateRestriction> {
  assertScope(input.context, input.scope);
  await authorizeCommand(
    runtime,
    input,
    RESOURCES.restriction,
    ACTIONS.restrictionWrite,
  );
  return await runtime.transactions.run(async (transaction) => {
    const restriction = await runtime.repository.findRestriction(
      transaction,
      input.scope,
      input.id,
    );
    if (restriction === undefined) throw protectedNotFound(input.id);
    assertExpectedVersion(input.id, input.expectedVersion, restriction.version);
    const candidate = await runtime.repository.findCandidate(
      transaction,
      input.scope,
      restriction.candidateId,
    );
    if (candidate === undefined) {
      throw protectedNotFound(restriction.candidateId);
    }
    const updated = transitionRestriction(restriction, runtime.clock.now());
    await runtime.repository.updateRestriction(
      transaction,
      updated,
      input.expectedVersion,
    );
    await runtime.repository.updateCandidate(transaction, {
      ...candidate,
      restrictionState: "cleared",
      version: candidate.version + 1,
      updatedAt: updated.updatedAt,
    }, candidate.version);
    await recordEffect(
      runtime,
      transaction,
      input,
      updated,
      "restriction_cleared",
    );
    return updated;
  }, metadata(input.context));
}

export async function decideShortlistCommand(
  runtime: MatchingRuntime,
  input: ShortlistCommandInput,
): Promise<ShortlistDecision> {
  assertScope(input.context, input.scope);
  const decision = await authorizeHumanCommand(
    runtime,
    input,
    RESOURCES.shortlist,
    ACTIONS.shortlistWrite,
  );
  assertAuthority(input.authoritySnapshotReference, decision);
  return await runtime.transactions.run(async (transaction) => {
    const candidate = await runtime.repository.findCandidate(
      transaction,
      input.scope,
      input.candidateId,
    );
    if (candidate === undefined) throw protectedNotFound(input.candidateId);
    assertCandidateReady(candidate);
    const run = await runtime.repository.findRun(
      transaction,
      input.scope,
      input.runId,
    );
    if (run === undefined) throw protectedNotFound(input.runId);
    const now = runtime.clock.now();
    const shortlist: ShortlistDecision = {
      aggregateType: "shortlist_decision",
      id: input.id,
      scope: input.scope,
      version: 1,
      schemaVersion: 1,
      runId: run.id,
      candidateId: candidate.id,
      state: input.state,
      decidedBy: input.actor.id,
      authoritySnapshotReference: input.authoritySnapshotReference,
      createdAt: now,
      updatedAt: now,
    };
    await runtime.repository.createShortlistDecision(transaction, shortlist);
    await recordEffect(
      runtime,
      transaction,
      input,
      shortlist,
      "shortlist_decided",
      { state: input.state },
    );
    return shortlist;
  }, metadata(input.context));
}

export async function authorizeOutreachCommand(
  runtime: MatchingRuntime,
  input: OutreachCommandInput,
): Promise<OutreachAuthorization> {
  assertScope(input.context, input.scope);
  const decision = await authorizeHumanCommand(
    runtime,
    input,
    RESOURCES.outreach,
    ACTIONS.outreachWrite,
  );
  assertAuthority(input.authoritySnapshotReference, decision);
  return await runtime.transactions.run(async (transaction) => {
    const shortlist = await runtime.repository.findShortlistDecision(
      transaction,
      input.scope,
      input.shortlistDecisionId,
    );
    if (shortlist === undefined) {
      throw protectedNotFound(input.shortlistDecisionId);
    }
    if (
      shortlist.state !== "shortlisted" ||
      shortlist.candidateId !== input.candidateId
    ) {
      throw new MatchingError(
        "ACTION_FORBIDDEN",
        `Shortlist decision "${shortlist.id}" does not authorize candidate "${input.candidateId}" for outreach.`,
        shortlist.id,
      );
    }
    const candidate = await runtime.repository.findCandidate(
      transaction,
      input.scope,
      input.candidateId,
    );
    if (candidate === undefined) throw protectedNotFound(input.candidateId);
    assertCandidateReady(candidate);
    const now = runtime.clock.now();
    const authorization: OutreachAuthorization = {
      aggregateType: "outreach_authorization",
      id: input.id,
      scope: input.scope,
      version: 1,
      schemaVersion: 1,
      shortlistDecisionId: shortlist.id,
      candidateId: candidate.id,
      state: "authorized",
      authorizedBy: input.actor.id,
      authoritySnapshotReference: input.authoritySnapshotReference,
      createdAt: now,
      updatedAt: now,
    };
    await runtime.repository.createOutreachAuthorization(
      transaction,
      authorization,
    );
    await recordEffect(
      runtime,
      transaction,
      input,
      authorization,
      "outreach_authorized",
    );
    return authorization;
  }, metadata(input.context));
}

export async function revokeOutreachCommand(
  runtime: MatchingRuntime,
  input: RevokeOutreachInput,
): Promise<OutreachAuthorization> {
  assertScope(input.context, input.scope);
  const decision = await authorizeHumanCommand(
    runtime,
    input,
    RESOURCES.outreach,
    ACTIONS.outreachWrite,
  );
  assertAuthority(input.authoritySnapshotReference, decision);
  return await runtime.transactions.run(async (transaction) => {
    const current = await runtime.repository.findOutreachAuthorization(
      transaction,
      input.scope,
      input.id,
    );
    if (current === undefined) throw protectedNotFound(input.id);
    assertExpectedVersion(input.id, input.expectedVersion, current.version);
    const updated = revokeOutreachAuthorization(current, runtime.clock.now());
    await runtime.repository.updateOutreachAuthorization(
      transaction,
      updated,
      input.expectedVersion,
    );
    await recordEffect(
      runtime,
      transaction,
      input,
      updated,
      "outreach_revoked",
    );
    return updated;
  }, metadata(input.context));
}
