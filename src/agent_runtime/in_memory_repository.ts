import type {
  ArtifactRecord,
  ClaimedRun,
  MissionRecord,
  PlanRecord,
  ResultRecord,
  RunRecord,
  RuntimeAttemptRecord,
  RuntimeScope,
  StepRecord,
  ToolActivityRecord,
} from "./model.ts";
import {
  assertRunTransition,
  assertStepTransition,
  RuntimeLeaseLostError,
} from "./model.ts";
import type { MissionId, PlanId, RunId, StepId } from "./ids.ts";
import type {
  AgentRuntimeStore,
  RuntimeCommandIdentity,
  RuntimeEvent,
  RuntimeIdempotencyClaim,
  RuntimeRunClaim,
  RuntimeRunUpdate,
  RuntimeTransaction,
} from "./repository.ts";
import {
  idempotencyKey,
  isClaimable,
  isTerminalRun,
  sameScope,
  startedAttempt,
} from "./in_memory_repository_helpers.ts";

export class InMemoryAgentRuntimeStore
  implements AgentRuntimeStore, RuntimeTransaction {
  private readonly missions = new Map<MissionId, MissionRecord>();
  private readonly plans = new Map<PlanId, PlanRecord>();
  private readonly runs = new Map<RunId, RunRecord>();
  private readonly steps = new Map<StepId, StepRecord>();
  private readonly activities = new Map<string, ToolActivityRecord>();
  private readonly results = new Map<string, ResultRecord>();
  private readonly artifacts = new Map<string, ArtifactRecord>();
  private readonly attempts = new Map<RunId, RuntimeAttemptRecord[]>();
  private readonly idempotency = new Map<
    string,
    { digest: string; result?: string }
  >();
  readonly events: RuntimeEvent[] = [];

  transaction<TResult>(
    work: (transaction: RuntimeTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return work(this);
  }

  createMission(mission: MissionRecord): Promise<void> {
    this.missions.set(mission.missionId, mission);
    return Promise.resolve();
  }

  createPlan(plan: PlanRecord): Promise<void> {
    this.plans.set(plan.planId, plan);
    return Promise.resolve();
  }

  updatePlan(plan: PlanRecord): Promise<void> {
    const current = this.plans.get(plan.planId);
    if (current === undefined || !sameScope(current.scope, plan.scope)) {
      return Promise.reject(
        new Error(
          `Plan "${plan.planId}" was not found in the requested scope; expected a durable scoped plan.`,
        ),
      );
    }
    this.plans.set(plan.planId, plan);
    return Promise.resolve();
  }

  createRun(run: RunRecord): Promise<void> {
    this.runs.set(run.runId, run);
    return Promise.resolve();
  }

  createStep(step: StepRecord): Promise<void> {
    this.steps.set(step.stepId, step);
    return Promise.resolve();
  }

  findMission(
    scope: RuntimeScope,
    missionId: MissionId,
  ): Promise<MissionRecord | undefined> {
    const mission = this.missions.get(missionId);
    return Promise.resolve(
      mission !== undefined && sameScope(mission.scope, scope)
        ? mission
        : undefined,
    );
  }

  findPlan(
    scope: RuntimeScope,
    planId: PlanId,
  ): Promise<PlanRecord | undefined> {
    const plan = this.plans.get(planId);
    return Promise.resolve(
      plan !== undefined && sameScope(plan.scope, scope) ? plan : undefined,
    );
  }

  findRun(scope: RuntimeScope, runId: RunId): Promise<RunRecord | undefined> {
    const run = this.runs.get(runId);
    return Promise.resolve(
      run !== undefined && sameScope(run.scope, scope) ? run : undefined,
    );
  }

  findStep(
    scope: RuntimeScope,
    stepId: StepId,
  ): Promise<StepRecord | undefined> {
    const step = this.steps.get(stepId);
    const run = step === undefined ? undefined : this.runs.get(step.runId);
    return Promise.resolve(
      step !== undefined && run !== undefined && sameScope(run.scope, scope)
        ? step
        : undefined,
    );
  }

  findToolActivity(
    scope: RuntimeScope,
    activityId: string,
  ): Promise<ToolActivityRecord | undefined> {
    const activity = this.activities.get(activityId);
    const run = activity === undefined
      ? undefined
      : this.runs.get(activity.runId);
    return Promise.resolve(
      activity !== undefined && run !== undefined && sameScope(run.scope, scope)
        ? activity
        : undefined,
    );
  }

  findResult(
    scope: RuntimeScope,
    resultId: string,
  ): Promise<ResultRecord | undefined> {
    const result = this.results.get(resultId);
    const run = result === undefined ? undefined : this.runs.get(result.runId);
    return Promise.resolve(
      result !== undefined && run !== undefined && sameScope(run.scope, scope)
        ? result
        : undefined,
    );
  }

  findArtifact(
    scope: RuntimeScope,
    artifactId: string,
  ): Promise<ArtifactRecord | undefined> {
    const artifact = this.artifacts.get(artifactId);
    const run = artifact === undefined
      ? undefined
      : this.runs.get(artifact.runId);
    return Promise.resolve(
      artifact !== undefined && run !== undefined && sameScope(run.scope, scope)
        ? artifact
        : undefined,
    );
  }

  findAttempt(
    scope: RuntimeScope,
    attemptId: string,
  ): Promise<RuntimeAttemptRecord | undefined> {
    for (const records of this.attempts.values()) {
      const attempt = records.find((record) => record.attemptId === attemptId);
      if (attempt === undefined) continue;
      const run = this.runs.get(attempt.runId);
      return Promise.resolve(
        run !== undefined && sameScope(run.scope, scope) ? attempt : undefined,
      );
    }
    return Promise.resolve(undefined);
  }

  listSteps(scope: RuntimeScope, runId: RunId): Promise<StepRecord[]> {
    if (!this.runInScope(scope, runId)) return Promise.resolve([]);
    return Promise.resolve(
      [...this.steps.values()].filter((step) => step.runId === runId).sort((
        a,
        b,
      ) => a.ordinal - b.ordinal),
    );
  }

  async claimRun(claim: RuntimeRunClaim): Promise<ClaimedRun | undefined> {
    const candidate = [...this.runs.values()]
      .filter((run) => isClaimable(run, claim.now))
      .sort((left, right) =>
        left.createdAt.getTime() - right.createdAt.getTime()
      )[0];
    return candidate === undefined
      ? undefined
      : await this.claimCandidate(candidate, claim);
  }

  async claimRunById(
    runId: RunId,
    claim: RuntimeRunClaim,
  ): Promise<ClaimedRun | undefined> {
    const candidate = this.runs.get(runId);
    if (candidate === undefined || !isClaimable(candidate, claim.now)) {
      return undefined;
    }
    return await this.claimCandidate(candidate, claim);
  }

  private async claimCandidate(
    candidate: RunRecord,
    claim: RuntimeRunClaim,
  ): Promise<ClaimedRun> {
    const attemptNumber = candidate.attemptCount + 1;
    if (candidate.state === "running") {
      await this.completeExpiredAttempt(candidate, claim.now);
    }
    const running: RunRecord & { readonly state: "running" } = {
      ...candidate,
      state: "running",
      attemptCount: attemptNumber,
      leaseOwner: claim.workerId,
      leaseExpiresAt: claim.leaseUntil,
      nextAttemptAt: undefined,
      updatedAt: claim.now,
    };
    this.runs.set(candidate.runId, running);
    const attempt = startedAttempt(running, attemptNumber, claim);
    await this.appendAttempt(attempt);
    return {
      ...running,
      attemptNumber,
      workerId: claim.workerId,
      attemptStartedAt: claim.now,
      leaseExpiresAt: claim.leaseUntil,
    };
  }

  assertRunLease(run: ClaimedRun, now: Date): Promise<void> {
    const current = this.runs.get(run.runId);
    if (
      current?.state === "running" && current.leaseOwner === run.workerId &&
      current.attemptCount === run.attemptNumber &&
      sameScope(current.scope, run.scope) &&
      current.leaseExpiresAt?.getTime() === run.leaseExpiresAt.getTime() &&
      current.leaseExpiresAt > now
    ) return Promise.resolve();
    return Promise.reject(new RuntimeLeaseLostError(run.runId, run.workerId));
  }

  cancellationRequested(run: ClaimedRun, now: Date): Promise<boolean> {
    return this.assertRunLease(run, now).then(() =>
      this.runs.get(run.runId)?.cancellationRequestedAt !== undefined
    );
  }

  async updateRun(
    run: ClaimedRun,
    update: RuntimeRunUpdate,
    now: Date,
  ): Promise<RunRecord> {
    await this.assertRunLease(run, now);
    const current = this.runs.get(run.runId)!;
    if (current.state !== update.state) {
      assertRunTransition(current.state, update.state);
    }
    const updated: RunRecord = {
      ...current,
      state: update.state,
      cost: update.cost ?? current.cost,
      failure: update.failure,
      nextAttemptAt: update.nextAttemptAt,
      leaseOwner:
        update.state === "retry_scheduled" || isTerminalRun(update.state)
          ? undefined
          : current.leaseOwner,
      leaseExpiresAt:
        update.state === "retry_scheduled" || isTerminalRun(update.state)
          ? undefined
          : current.leaseExpiresAt,
      updatedAt: now,
    };
    this.runs.set(run.runId, updated);
    return updated;
  }

  async updateStep(
    run: ClaimedRun,
    step: StepRecord,
    now: Date,
  ): Promise<void> {
    await this.assertRunLease(run, now);
    const current = this.steps.get(step.stepId);
    if (current === undefined || current.runId !== run.runId) {
      throw new Error(
        `Step "${step.stepId}" was not found for run "${run.runId}"; expected a scoped runtime step.`,
      );
    }
    if (current.state !== step.state) {
      assertStepTransition(current.state, step.state);
    }
    this.steps.set(step.stepId, step);
  }

  recordToolActivity(activity: ToolActivityRecord): Promise<void> {
    this.activities.set(activity.activityId, activity);
    return Promise.resolve();
  }

  listToolActivities(
    scope: RuntimeScope,
    runId: RunId,
  ): Promise<ToolActivityRecord[]> {
    if (!this.runInScope(scope, runId)) return Promise.resolve([]);
    return Promise.resolve(
      [...this.activities.values()].filter((activity) =>
        activity.runId === runId
      ),
    );
  }

  recordResult(result: ResultRecord): Promise<void> {
    this.results.set(result.resultId, result);
    return Promise.resolve();
  }

  listResults(scope: RuntimeScope, runId: RunId): Promise<ResultRecord[]> {
    if (!this.runInScope(scope, runId)) return Promise.resolve([]);
    return Promise.resolve(
      [...this.results.values()].filter((result) => result.runId === runId),
    );
  }

  recordArtifact(artifact: ArtifactRecord): Promise<void> {
    this.artifacts.set(artifact.artifactId, artifact);
    return Promise.resolve();
  }

  listArtifacts(scope: RuntimeScope, runId: RunId): Promise<ArtifactRecord[]> {
    if (!this.runInScope(scope, runId)) return Promise.resolve([]);
    return Promise.resolve(
      [...this.artifacts.values()].filter((artifact) =>
        artifact.runId === runId
      ),
    );
  }

  appendAttempt(attempt: RuntimeAttemptRecord): Promise<void> {
    const records = this.attempts.get(attempt.runId) ?? [];
    records.push(attempt);
    this.attempts.set(attempt.runId, records);
    return Promise.resolve();
  }

  listAttempts(
    scope: RuntimeScope,
    runId: RunId,
  ): Promise<RuntimeAttemptRecord[]> {
    if (!this.runInScope(scope, runId)) return Promise.resolve([]);
    return Promise.resolve([...(this.attempts.get(runId) ?? [])]);
  }

  claimIdempotency(
    identity: RuntimeCommandIdentity,
  ): Promise<RuntimeIdempotencyClaim> {
    const key = idempotencyKey(identity);
    const existing = this.idempotency.get(key);
    if (existing === undefined) {
      this.idempotency.set(key, { digest: identity.payloadDigest });
      return Promise.resolve({ status: "claimed" });
    }
    if (existing.digest !== identity.payloadDigest) {
      return Promise.reject(
        new Error(
          `Runtime idempotency key "${identity.idempotencyKey}" payload digest changed; expected the original command payload.`,
        ),
      );
    }
    if (existing.result === undefined) {
      return Promise.resolve({ status: "in_progress" });
    }
    return Promise.resolve({
      status: "replay",
      resultReference: existing.result,
    });
  }

  completeIdempotency(
    identity: RuntimeCommandIdentity,
    resultReference: string,
  ): Promise<void> {
    const key = idempotencyKey(identity);
    const existing = this.idempotency.get(key);
    if (existing?.digest !== identity.payloadDigest) {
      return Promise.reject(
        new Error(
          `Runtime idempotency key "${identity.idempotencyKey}" cannot complete; expected the claimed payload.`,
        ),
      );
    }
    this.idempotency.set(key, {
      digest: identity.payloadDigest,
      result: resultReference,
    });
    return Promise.resolve();
  }

  appendEvent(event: RuntimeEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }

  requestCancellation(
    runId: RunId,
    scope: RuntimeScope,
    requestedAt: Date,
  ): Promise<void> {
    const run = this.runs.get(runId);
    if (run === undefined || !sameScope(run.scope, scope)) {
      return Promise.reject(
        new Error(`Run "${runId}" was not found in the requested scope.`),
      );
    }
    if (isTerminalRun(run.state)) {
      return Promise.reject(
        new Error(
          `Run "${runId}" cannot be cancelled from terminal state "${run.state}".`,
        ),
      );
    }
    this.runs.set(runId, {
      ...run,
      cancellationRequestedAt: run.cancellationRequestedAt ?? requestedAt,
      updatedAt: requestedAt,
    });
    return Promise.resolve();
  }

  private async completeExpiredAttempt(
    run: RunRecord,
    completedAt: Date,
  ): Promise<void> {
    const records = this.attempts.get(run.runId) ?? [];
    const started = records.find((record) =>
      record.recordKind === "started" &&
      record.attemptNumber === run.attemptCount && record.scope === "run"
    );
    if (started === undefined) return;
    await this.appendAttempt({
      ...started,
      attemptId: `${started.attemptId}-completed`,
      recordKind: "completed",
      completedAt,
      outcome: "lease_expired",
      failure: "LEASE_EXPIRED",
    });
  }

  private runInScope(scope: RuntimeScope, runId: RunId): boolean {
    const run = this.runs.get(runId);
    return run !== undefined && sameScope(run.scope, scope);
  }
}
