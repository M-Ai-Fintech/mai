import { MatchingError, protectedNotFound } from "./errors.ts";
import {
  candidateAsOptimizerInput,
  createCandidateProjection,
  createMatchingCriteria,
  createMatchingRun,
  type MatchingCriteria,
  type MatchingRun,
} from "./model.ts";
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
import { matchingJobReceiptForRun } from "./jobs.ts";
import { transitionRun } from "./transitions.ts";
import type {
  ActivateCriteriaInput,
  CreateCriteriaInput,
  RunExecutionInput,
  StartRunInput,
  StartRunResult,
} from "./service_contracts.ts";

export async function createCriteriaCommand(
  runtime: MatchingRuntime,
  input: CreateCriteriaInput,
): Promise<MatchingCriteria> {
  assertScope(input.context, input.scope);
  await authorizeCommand(
    runtime,
    input,
    RESOURCES.criteria,
    ACTIONS.criteriaWrite,
  );
  const criteria = createMatchingCriteria({
    ...input,
    createdBy: input.actor.id,
    now: runtime.clock.now(),
  });
  return await runtime.transactions.run(async (transaction) => {
    const claim = await claimMatchingMutation(runtime, transaction, {
      scope: input.scope,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      commandType: "matching.criteria.create",
      targetType: "matching_criteria",
      targetId: criteria.id,
      payload: {
        selection: input.selection,
        optimizerContractVersion: input.optimizerContractVersion,
      },
      now: runtime.clock.now(),
    });
    if (replayReference(claim, criteria.id) !== undefined) {
      const replay = await runtime.repository.findCriteria(
        transaction,
        input.scope,
        criteria.id,
      );
      if (replay === undefined) throw protectedNotFound(criteria.id);
      return replay;
    }
    await runtime.repository.createCriteria(transaction, criteria);
    await recordEffect(
      runtime,
      transaction,
      input,
      criteria,
      "criteria_created",
    );
    await completeMatchingMutation(runtime, transaction, claim, criteria.id);
    return criteria;
  }, metadata(input.context));
}

export async function activateCriteriaCommand(
  runtime: MatchingRuntime,
  input: ActivateCriteriaInput,
): Promise<MatchingCriteria> {
  assertScope(input.context, input.scope);
  await authorizeCommand(
    runtime,
    input,
    RESOURCES.criteria,
    ACTIONS.criteriaWrite,
  );
  return await runtime.transactions.run(async (transaction) => {
    const claim = await claimMatchingMutation(runtime, transaction, {
      scope: input.scope,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      commandType: "matching.criteria.activate",
      targetType: "matching_criteria",
      targetId: input.id,
      payload: { expectedVersion: input.expectedVersion },
      now: runtime.clock.now(),
    });
    if (replayReference(claim, input.id) !== undefined) {
      const replay = await runtime.repository.findCriteria(
        transaction,
        input.scope,
        input.id,
      );
      if (replay === undefined) throw protectedNotFound(input.id);
      return replay;
    }
    const current = await runtime.repository.findCriteria(
      transaction,
      input.scope,
      input.id,
    );
    if (current === undefined) throw protectedNotFound(input.id);
    assertExpectedVersion(input.id, input.expectedVersion, current.version);
    const updated = {
      ...current,
      state: "active" as const,
      version: current.version + 1,
      updatedAt: runtime.clock.now(),
    };
    await runtime.repository.updateCriteria(
      transaction,
      updated,
      input.expectedVersion,
    );
    await recordEffect(
      runtime,
      transaction,
      input,
      updated,
      "criteria_activated",
    );
    await completeMatchingMutation(runtime, transaction, claim, updated.id);
    return updated;
  }, metadata(input.context));
}

export async function startRunCommand(
  runtime: MatchingRuntime,
  input: StartRunInput,
): Promise<StartRunResult> {
  assertScope(input.context, input.scope);
  await authorizeCommand(runtime, input, RESOURCES.run, ACTIONS.runCreate);
  return await runtime.transactions.run(async (transaction) => {
    const claim = await claimMatchingMutation(runtime, transaction, {
      scope: input.scope,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      commandType: "matching.run.start",
      targetType: "matching_run",
      targetId: input.id,
      payload: runPayload(input),
      now: runtime.clock.now(),
    });
    if (replayReference(claim, input.id) !== undefined) {
      const replay = await runtime.repository.findRun(
        transaction,
        input.scope,
        input.id,
      );
      if (replay === undefined) throw protectedNotFound(input.id);
      return { run: replay, job: matchingJobReceiptForRun(input.id) };
    }
    const criteria = await runtime.repository.findCriteria(
      transaction,
      input.scope,
      input.criteriaId,
    );
    if (criteria === undefined) throw protectedNotFound(input.criteriaId);
    if (criteria.state !== "active") {
      throw new MatchingError(
        "INVALID_CRITERIA",
        `Matching criteria "${criteria.id}" is "${criteria.state}"; expected active criteria before a run.`,
        criteria.id,
      );
    }
    const now = runtime.clock.now();
    const run = createMatchingRun({
      id: input.id,
      scope: input.scope,
      criteriaId: criteria.id,
      criteriaVersion: criteria.version,
      requestedBy: input.actor.id,
      now,
    });
    const projections = input.candidateInputs.map((candidate) =>
      createCandidateProjection({
        ...candidate,
        scope: input.scope,
        runId: run.id,
        now,
      })
    );
    const existing = await runtime.repository.findRun(
      transaction,
      input.scope,
      input.id,
    );
    if (existing !== undefined) {
      throw new MatchingError(
        "IDEMPOTENCY_CONFLICT",
        `Matching run "${input.id}" already exists; expected one stable start command target.`,
        input.id,
      );
    }
    await runtime.repository.createRun(transaction, run);
    const job = await runtime.scheduler.enqueue(transaction, {
      scope: input.scope,
      runId: run.id,
      criteriaId: criteria.id,
      criteriaVersion: criteria.version,
      actorId: input.actor.id,
      correlationId: input.context.correlationId,
      idempotencyKey: input.idempotencyKey,
      now,
      payload: runPayload(input),
    });
    await runtime.repository.replaceCandidates(
      transaction,
      input.scope,
      run.id,
      projections,
    );
    await recordEffect(runtime, transaction, input, run, "run_queued", {
      jobId: job.jobId,
      operationId: job.operationId,
      criteriaVersion: criteria.version,
    });
    await completeMatchingMutation(runtime, transaction, claim, run.id);
    return { run, job };
  }, metadata(input.context));
}

function runPayload(input: StartRunInput): Readonly<Record<string, unknown>> {
  return {
    command: "matching.run.start",
    runId: input.id,
    criteriaId: input.criteriaId,
    candidateInputs: input.candidateInputs,
  };
}

export async function executeRunCommand(
  runtime: MatchingRuntime,
  input: RunExecutionInput,
): Promise<MatchingRun> {
  assertScope(input.context, input.scope);
  await authorizeCommand(runtime, input, RESOURCES.run, ACTIONS.runExecute);
  return await runtime.transactions.run(async (transaction) => {
    const claim = await claimMatchingMutation(runtime, transaction, {
      scope: input.scope,
      actorId: input.actor.id,
      idempotencyKey: input.idempotencyKey,
      commandType: "matching.run.execute",
      targetType: "matching_run",
      targetId: input.id,
      payload: { runId: input.id },
      now: runtime.clock.now(),
    });
    if (replayReference(claim, input.id) !== undefined) {
      const replay = await runtime.repository.findRun(
        transaction,
        input.scope,
        input.id,
      );
      if (replay === undefined) throw protectedNotFound(input.id);
      return replay;
    }
    const run = await runtime.repository.findRun(
      transaction,
      input.scope,
      input.id,
    );
    if (run === undefined) throw protectedNotFound(input.id);
    if (run.state !== "queued") {
      throw new MatchingError(
        "INVALID_TRANSITION",
        `Matching run "${run.id}" is "${run.state}"; expected queued before execution.`,
        run.id,
      );
    }
    const criteria = await runtime.repository.findCriteria(
      transaction,
      input.scope,
      run.criteriaId,
    );
    if (criteria === undefined) throw protectedNotFound(run.criteriaId);
    const running = transitionRun(run, "running", runtime.clock.now());
    await runtime.repository.updateRun(transaction, running, run.version);
    const candidates = await runtime.repository.listCandidates(
      transaction,
      input.scope,
      run.id,
    );
    const ready = candidates.filter((candidate) =>
      candidate.restrictionState === "cleared" &&
      candidate.conflictState === "clear"
    );
    const result = runtime.compute.compute({
      criteriaVersion: criteria.version,
      criteria: criteria.selection,
      candidates: ready.map(candidateAsOptimizerInput),
    });
    const terminalState = result.selection.status === "optimal"
      ? "succeeded"
      : "infeasible";
    const completed = transitionRun(
      running,
      terminalState,
      runtime.clock.now(),
      result.selection,
    );
    await runtime.repository.updateRun(transaction, completed, running.version);
    await recordEffect(
      runtime,
      transaction,
      input,
      completed,
      "run_completed",
      {
        status: result.selection.status,
        consideredCandidateCount: result.selection.consideredCandidateCount,
      },
    );
    await completeMatchingMutation(runtime, transaction, claim, completed.id);
    return completed;
  }, metadata(input.context));
}
