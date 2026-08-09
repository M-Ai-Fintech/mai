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
  updatePlan(plan: PlanRecord): Promise<void>;
  findMission(
    scope: RuntimeScope,
    missionId: MissionId,
  ): Promise<MissionRecord | undefined>;
  findPlan(
    scope: RuntimeScope,
    planId: PlanId,
  ): Promise<PlanRecord | undefined>;
  findRun(scope: RuntimeScope, runId: RunId): Promise<RunRecord | undefined>;
  findStep(
    scope: RuntimeScope,
    stepId: StepId,
  ): Promise<StepRecord | undefined>;
  findToolActivity(
    scope: RuntimeScope,
    activityId: string,
  ): Promise<ToolActivityRecord | undefined>;
  findResult(
    scope: RuntimeScope,
    resultId: string,
  ): Promise<ResultRecord | undefined>;
  findArtifact(
    scope: RuntimeScope,
    artifactId: string,
  ): Promise<ArtifactRecord | undefined>;
  findAttempt(
    scope: RuntimeScope,
    attemptId: string,
  ): Promise<RuntimeAttemptRecord | undefined>;
  listSteps(scope: RuntimeScope, runId: RunId): Promise<StepRecord[]>;
  claimRun(claim: RuntimeRunClaim): Promise<ClaimedRun | undefined>;
  claimRunById(
    runId: RunId,
    claim: RuntimeRunClaim,
  ): Promise<ClaimedRun | undefined>;
  assertRunLease(run: ClaimedRun, now: Date): Promise<void>;
  cancellationRequested(run: ClaimedRun, now: Date): Promise<boolean>;
  updateRun(
    run: ClaimedRun,
    update: RuntimeRunUpdate,
    now: Date,
  ): Promise<RunRecord>;
  updateStep(run: ClaimedRun, step: StepRecord, now: Date): Promise<void>;
  recordToolActivity(activity: ToolActivityRecord): Promise<void>;
  listToolActivities(
    scope: RuntimeScope,
    runId: RunId,
  ): Promise<ToolActivityRecord[]>;
  recordResult(result: ResultRecord): Promise<void>;
  listResults(scope: RuntimeScope, runId: RunId): Promise<ResultRecord[]>;
  recordArtifact(artifact: ArtifactRecord): Promise<void>;
  listArtifacts(scope: RuntimeScope, runId: RunId): Promise<ArtifactRecord[]>;
  appendAttempt(attempt: RuntimeAttemptRecord): Promise<void>;
  listAttempts(
    scope: RuntimeScope,
    runId: RunId,
  ): Promise<RuntimeAttemptRecord[]>;
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

export { InMemoryAgentRuntimeStore } from "./in_memory_repository.ts";
