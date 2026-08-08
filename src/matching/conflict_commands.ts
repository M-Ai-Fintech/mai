import { protectedNotFound } from "./errors.ts";
import { transitionConflict, transitionRestriction } from "./transitions.ts";
import type { CandidateRestriction, MatchingConflict } from "./model.ts";
import {
  ACTIONS,
  assertExpectedVersion,
  assertScope,
  authorizeCommand,
  type MatchingRuntime,
  metadata,
  recordEffect,
  RESOURCES,
} from "./runtime.ts";
import {
  claimMatchingMutation,
  completeMatchingMutation,
  replayReference,
} from "./idempotency.ts";
import type {
  ClearRestrictionInput,
  ConflictCommandInput,
  CreateConflictInput,
  RestrictionCommandInput,
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
    const claim = await claimMatchingMutation(runtime, transaction, {
      scope: input.scope,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      commandType: "matching.conflict.open",
      targetType: "matching_conflict",
      targetId: input.id,
      payload: {
        candidateId: input.candidateId,
        kind: input.kind,
        rationale: input.rationale ?? null,
      },
      now: runtime.clock.now(),
    });
    if (replayReference(claim, input.id) !== undefined) {
      const replay = await runtime.repository.findConflict(
        transaction,
        input.scope,
        input.id,
      );
      if (replay === undefined) throw protectedNotFound(input.id);
      return replay;
    }
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
    await completeMatchingMutation(runtime, transaction, claim, conflict.id);
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
    const claim = await claimMatchingMutation(runtime, transaction, {
      scope: input.scope,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      commandType: "matching.conflict.resolve",
      targetType: "matching_conflict",
      targetId: input.id,
      payload: { expectedVersion: input.expectedVersion },
      now: runtime.clock.now(),
    });
    if (replayReference(claim, input.id) !== undefined) {
      const replay = await runtime.repository.findConflict(
        transaction,
        input.scope,
        input.id,
      );
      if (replay === undefined) throw protectedNotFound(input.id);
      return replay;
    }
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
    await completeMatchingMutation(runtime, transaction, claim, updated.id);
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
    const claim = await claimMatchingMutation(runtime, transaction, {
      scope: input.scope,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      commandType: "matching.restriction.open",
      targetType: "candidate_restriction",
      targetId: input.id,
      payload: {
        candidateId: input.candidateId,
        category: input.category,
      },
      now: runtime.clock.now(),
    });
    if (replayReference(claim, input.id) !== undefined) {
      const replay = await runtime.repository.findRestriction(
        transaction,
        input.scope,
        input.id,
      );
      if (replay === undefined) throw protectedNotFound(input.id);
      return replay;
    }
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
    await completeMatchingMutation(runtime, transaction, claim, restriction.id);
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
    const claim = await claimMatchingMutation(runtime, transaction, {
      scope: input.scope,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      commandType: "matching.restriction.clear",
      targetType: "candidate_restriction",
      targetId: input.id,
      payload: {
        candidateId: input.candidateId,
        expectedVersion: input.expectedVersion,
      },
      now: runtime.clock.now(),
    });
    if (replayReference(claim, input.id) !== undefined) {
      const replay = await runtime.repository.findRestriction(
        transaction,
        input.scope,
        input.id,
      );
      if (replay === undefined) throw protectedNotFound(input.id);
      return replay;
    }
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
    await completeMatchingMutation(runtime, transaction, claim, updated.id);
    return updated;
  }, metadata(input.context));
}

export {
  authorizeOutreachCommand,
  decideShortlistCommand,
  revokeOutreachCommand,
} from "./shortlist_outreach_commands.ts";
