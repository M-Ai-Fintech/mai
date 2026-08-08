import { MatchingError, protectedNotFound } from "./errors.ts";
import type { OutreachAuthorization, ShortlistDecision } from "./model.ts";
import {
  ACTIONS,
  assertAuthority,
  assertCandidateReady,
  assertExpectedVersion,
  assertScope,
  assertValidShortlistSource,
  authorizeHumanCommand,
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
  OutreachCommandInput,
  RevokeOutreachInput,
  ShortlistCommandInput,
} from "./service_contracts.ts";
import { revokeOutreachAuthorization } from "./transitions.ts";

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
    const claim = await claimMatchingMutation(runtime, transaction, {
      scope: input.scope,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      commandType: "matching.shortlist.decide",
      targetType: "shortlist_decision",
      targetId: input.id,
      payload: {
        runId: input.runId,
        candidateId: input.candidateId,
        state: input.state,
        authoritySnapshotReference: input.authoritySnapshotReference,
        expectedVersion: input.expectedVersion ?? null,
      },
      now: runtime.clock.now(),
    });
    if (replayReference(claim, input.id) !== undefined) {
      const replay = await runtime.repository.findShortlistDecision(
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
    assertCandidateReady(candidate);
    const run = await runtime.repository.findRun(
      transaction,
      input.scope,
      input.runId,
    );
    if (run === undefined) throw protectedNotFound(input.runId);
    assertValidShortlistSource(candidate, run);
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
    await completeMatchingMutation(runtime, transaction, claim, shortlist.id);
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
    const claim = await claimMatchingMutation(runtime, transaction, {
      scope: input.scope,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      commandType: "matching.outreach.authorize",
      targetType: "outreach_authorization",
      targetId: input.id,
      payload: {
        shortlistDecisionId: input.shortlistDecisionId,
        candidateId: input.candidateId,
        authoritySnapshotReference: input.authoritySnapshotReference,
      },
      now: runtime.clock.now(),
    });
    if (replayReference(claim, input.id) !== undefined) {
      const replay = await runtime.repository.findOutreachAuthorization(
        transaction,
        input.scope,
        input.id,
      );
      if (replay === undefined) throw protectedNotFound(input.id);
      return replay;
    }
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
    const run = await runtime.repository.findRun(
      transaction,
      input.scope,
      shortlist.runId,
    );
    if (run === undefined) throw protectedNotFound(shortlist.runId);
    assertValidShortlistSource(candidate, run);
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
    await completeMatchingMutation(
      runtime,
      transaction,
      claim,
      authorization.id,
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
    const claim = await claimMatchingMutation(runtime, transaction, {
      scope: input.scope,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      commandType: "matching.outreach.revoke",
      targetType: "outreach_authorization",
      targetId: input.id,
      payload: {
        shortlistDecisionId: input.shortlistDecisionId,
        candidateId: input.candidateId,
        authoritySnapshotReference: input.authoritySnapshotReference,
        expectedVersion: input.expectedVersion,
      },
      now: runtime.clock.now(),
    });
    if (replayReference(claim, input.id) !== undefined) {
      const replay = await runtime.repository.findOutreachAuthorization(
        transaction,
        input.scope,
        input.id,
      );
      if (replay === undefined) throw protectedNotFound(input.id);
      return replay;
    }
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
    await completeMatchingMutation(runtime, transaction, claim, updated.id);
    return updated;
  }, metadata(input.context));
}
