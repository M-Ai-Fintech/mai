import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type {
  ActorId,
  CorrelationId,
} from "../shared/contracts/identifiers.ts";
import type {
  ArtifactRecord,
  ClaimedRun,
  MissionRecord,
  PlanRecord,
  ResultRecord,
  RunRecord,
  RuntimeActor,
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

export interface RuntimeEvent {
  readonly eventId: string;
  readonly scope: RuntimeScope;
  readonly actor: RuntimeActor;
  readonly correlationId: CorrelationId;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: AggregateVersion;
  readonly eventType: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
}

export interface RuntimeEventSink {
  append(transaction: TransactionHandle, event: RuntimeEvent): Promise<void>;
}

export interface RuntimeCommandIdentity {
  readonly scope: RuntimeScope;
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly idempotencyKey: string;
  readonly payloadDigest: string;
  readonly createdAt: Date;
}

export type RuntimeIdempotencyClaim =
  | { readonly status: "claimed" }
  | { readonly status: "in_progress" }
  | { readonly status: "replay"; readonly resultReference: string };

export interface RuntimeRunClaim {
  readonly workerId: string;
  readonly now: Date;
  readonly leaseUntil: Date;
}

export interface RuntimeRunUpdate {
  readonly state: RunRecord["state"];
  readonly cost?: RunRecord["cost"];
  readonly failure?: string;
  readonly nextAttemptAt?: Date;
}

export interface RuntimeTransaction {
  createMission(mission: MissionRecord): Promise<void>;
  createPlan(plan: PlanRecord): Promise<void>;
  createRun(run: RunRecord): Promise<void>;
  createStep(step: StepRecord): Promise<void>;
  findMission(missionId: MissionId): Promise<MissionRecord | undefined>;
  findPlan(planId: PlanId): Promise<PlanRecord | undefined>;
  findRun(runId: RunId): Promise<RunRecord | undefined>;
  listSteps(runId: RunId): Promise<StepRecord[]>;
  claimRun(claim: RuntimeRunClaim): Promise<ClaimedRun | undefined>;
  assertRunLease(run: ClaimedRun, now: Date): Promise<void>;
  cancellationRequested(run: ClaimedRun): Promise<boolean>;
  updateRun(
    run: ClaimedRun,
    update: RuntimeRunUpdate,
    now: Date,
  ): Promise<RunRecord>;
  updateStep(step: StepRecord): Promise<void>;
  recordToolActivity(activity: ToolActivityRecord): Promise<void>;
  listToolActivities(runId: RunId): Promise<ToolActivityRecord[]>;
  recordResult(result: ResultRecord): Promise<void>;
  listResults(runId: RunId): Promise<ResultRecord[]>;
  recordArtifact(artifact: ArtifactRecord): Promise<void>;
  listArtifacts(runId: RunId): Promise<ArtifactRecord[]>;
  appendAttempt(attempt: RuntimeAttemptRecord): Promise<void>;
  listAttempts(runId: RunId): Promise<RuntimeAttemptRecord[]>;
  claimIdempotency(
    identity: RuntimeCommandIdentity,
  ): Promise<RuntimeIdempotencyClaim>;
  completeIdempotency(
    identity: RuntimeCommandIdentity,
    resultReference: string,
  ): Promise<void>;
  appendEvent(event: RuntimeEvent): Promise<void>;
  requestCancellation(
    runId: RunId,
    scope: RuntimeScope,
    requestedAt: Date,
  ): Promise<void>;
}

export interface AgentRuntimeStore {
  transaction<TResult>(
    work: (transaction: RuntimeTransaction) => Promise<TResult>,
  ): Promise<TResult>;
}

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

  createRun(run: RunRecord): Promise<void> {
    this.runs.set(run.runId, run);
    return Promise.resolve();
  }

  createStep(step: StepRecord): Promise<void> {
    this.steps.set(step.stepId, step);
    return Promise.resolve();
  }

  findMission(missionId: MissionId): Promise<MissionRecord | undefined> {
    return Promise.resolve(this.missions.get(missionId));
  }

  findPlan(planId: PlanId): Promise<PlanRecord | undefined> {
    return Promise.resolve(this.plans.get(planId));
  }

  findRun(runId: RunId): Promise<RunRecord | undefined> {
    return Promise.resolve(this.runs.get(runId));
  }

  listSteps(runId: RunId): Promise<StepRecord[]> {
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
    if (candidate === undefined) return undefined;
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
    const attempt = startedAttempt(
      running,
      attemptNumber,
      claim.workerId,
      claim.leaseUntil,
      claim.now,
    );
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
      current.leaseExpiresAt?.getTime() === run.leaseExpiresAt.getTime() &&
      current.leaseExpiresAt > now
    ) return Promise.resolve();
    return Promise.reject(new RuntimeLeaseLostError(run.runId, run.workerId));
  }

  cancellationRequested(run: ClaimedRun): Promise<boolean> {
    return Promise.resolve(
      this.runs.get(run.runId)?.cancellationRequestedAt !== undefined,
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

  updateStep(step: StepRecord): Promise<void> {
    const current = this.steps.get(step.stepId);
    if (current !== undefined && current.state !== step.state) {
      assertStepTransition(current.state, step.state);
    }
    this.steps.set(step.stepId, step);
    return Promise.resolve();
  }

  recordToolActivity(activity: ToolActivityRecord): Promise<void> {
    this.activities.set(activity.activityId, activity);
    return Promise.resolve();
  }

  listToolActivities(runId: RunId): Promise<ToolActivityRecord[]> {
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

  listResults(runId: RunId): Promise<ResultRecord[]> {
    return Promise.resolve(
      [...this.results.values()].filter((result) => result.runId === runId),
    );
  }

  recordArtifact(artifact: ArtifactRecord): Promise<void> {
    this.artifacts.set(artifact.artifactId, artifact);
    return Promise.resolve();
  }

  listArtifacts(runId: RunId): Promise<ArtifactRecord[]> {
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

  listAttempts(runId: RunId): Promise<RuntimeAttemptRecord[]> {
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
}

function sameScope(left: RuntimeScope, right: RuntimeScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function isClaimable(run: RunRecord, now: Date): boolean {
  if (run.state === "queued") return true;
  if (run.state === "retry_scheduled") {
    return run.nextAttemptAt === undefined || run.nextAttemptAt <= now;
  }
  return run.state === "running" && run.leaseExpiresAt !== undefined &&
    run.leaseExpiresAt <= now;
}

function isTerminalRun(state: RunRecord["state"]): boolean {
  return ["succeeded", "failed", "cancelled", "invalidated", "dead_lettered"]
    .includes(state);
}

function startedAttempt(
  run: RunRecord,
  attemptNumber: number,
  workerId: string,
  leaseExpiresAt: Date,
  startedAt: Date,
): RuntimeAttemptRecord {
  return {
    attemptId: `attempt_${run.runId}-${attemptNumber}-started`,
    scope: "run",
    subjectId: run.runId,
    runId: run.runId,
    attemptNumber,
    recordKind: "started",
    workerId,
    leaseExpiresAt,
    startedAt,
  };
}

function idempotencyKey(identity: RuntimeCommandIdentity): string {
  return [
    identity.scope.tenantId,
    identity.scope.workspaceId ?? "",
    identity.scope.dealId ?? "",
    identity.actorId,
    identity.commandType,
    identity.targetType,
    identity.targetId,
    identity.idempotencyKey,
  ].join("|");
}
