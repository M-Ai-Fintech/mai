import type {
  ArtifactRecord,
  CostMetadata,
  MissionRecord,
  ModelMetadata,
  PlanRecord,
  ResultRecord,
  RunRecord,
  RuntimeActor,
  RuntimeAttemptRecord,
  RuntimeScope,
  StepRecord,
  ToolActivityRecord,
} from "./model.ts";
import type {
  ArtifactId,
  MissionId,
  PlanId,
  ResultId,
  RunId,
  StepId,
  ToolActivityId,
} from "./ids.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import { assertCostMetadata } from "./model.ts";
import {
  activityState,
  actorKind,
  actorState,
  artifactState,
  attemptRecordKind,
  attemptScope,
  missionState,
  planState,
  resultKind,
  runState,
  stepKind,
  stepState,
} from "./postgres_states.ts";

export interface RawMissionRow extends RawScopeRow {
  readonly missionId: string;
  readonly actorId: string;
  readonly actorKind: string;
  readonly actorState: string;
  readonly objective: string;
  readonly state: string;
  readonly aggregateVersion: string | number;
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
}

export interface RawPlanRow extends RawScopeRow {
  readonly planId: string;
  readonly missionId: string;
  readonly actorId: string;
  readonly actorKind: string;
  readonly actorState: string;
  readonly version: string | number;
  readonly state: string;
  readonly steps: unknown;
  readonly sourceVersions: unknown;
  readonly createdAt: Date | string;
}

export interface RawRunRow extends RawScopeRow {
  readonly runId: string;
  readonly missionId: string;
  readonly planId: string;
  readonly planVersion: string | number;
  readonly actorId: string;
  readonly actorKind: string;
  readonly actorState: string;
  readonly correlationId: string;
  readonly state: string;
  readonly aggregateVersion: string | number;
  readonly sourceVersions: unknown;
  readonly model: unknown;
  readonly costLimit: string | number | null;
  readonly cost: unknown;
  readonly attemptCount: number;
  readonly failure: string | null;
  readonly cancellationRequestedAt: Date | string | null;
  readonly nextAttemptAt: Date | string | null;
  readonly leaseOwner: string | null;
  readonly leaseExpiresAt: Date | string | null;
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
}

export interface RawStepRow {
  readonly stepId: string;
  readonly runId: string;
  readonly ordinal: number;
  readonly name: string;
  readonly kind: string;
  readonly toolName: string | null;
  readonly action: string | null;
  readonly resourceKind: string | null;
  readonly resourceId: string | null;
  readonly input: unknown;
  readonly sourceVersions: unknown;
  readonly state: string;
  readonly attemptCount: number;
  readonly resultId: string | null;
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
}

export interface RawActivityRow {
  readonly activityId: string;
  readonly runId: string;
  readonly stepId: string;
  readonly toolName: string;
  readonly action: string;
  readonly resourceKind: string;
  readonly resourceId: string;
  readonly requestDigest: string;
  readonly state: string;
  readonly authority: unknown;
  readonly denialReason: string | null;
  readonly createdAt: Date | string;
  readonly completedAt: Date | string | null;
}

export interface RawResultRow {
  readonly resultId: string;
  readonly runId: string;
  readonly stepId: string;
  readonly kind: string;
  readonly value: unknown;
  readonly lineage: unknown;
  readonly cost: unknown;
  readonly createdAt: Date | string;
}

export interface RawArtifactRow {
  readonly artifactId: string;
  readonly resultId: string;
  readonly runId: string;
  readonly stepId: string;
  readonly artifactType: string;
  readonly contentReference: string;
  readonly contentDigest: string;
  readonly state: string;
  readonly sourceVersions: unknown;
  readonly createdAt: Date | string;
}

export interface RawAttemptRow {
  readonly attemptId: string;
  readonly scope: string;
  readonly subjectId: string;
  readonly runId: string;
  readonly attemptNumber: number;
  readonly recordKind: string;
  readonly workerId: string;
  readonly leaseExpiresAt: Date | string;
  readonly startedAt: Date | string;
  readonly completedAt: Date | string | null;
  readonly outcome: string | null;
  readonly failure: string | null;
}

export interface RawIdempotencyRow {
  readonly payloadDigest: string;
  readonly resultReference: string | null;
}

export interface RawScopeRow {
  readonly tenantId: string;
  readonly workspaceId: string | null;
  readonly dealId: string | null;
}

export function toMission(row: RawMissionRow): MissionRecord {
  return {
    missionId: row.missionId as MissionId,
    scope: toScope(row),
    actor: toActor(row),
    objective: row.objective,
    state: missionState(row.state),
    aggregateVersion: positiveInteger(
      row.aggregateVersion,
      "mission aggregate version",
    ) as AggregateVersion,
    createdAt: databaseDate(row.createdAt, row.missionId),
    updatedAt: databaseDate(row.updatedAt, row.missionId),
  };
}

export function toPlan(row: RawPlanRow): PlanRecord {
  return {
    planId: row.planId as PlanId,
    missionId: row.missionId as MissionId,
    scope: toScope(row),
    actor: toActor(row),
    version: positiveInteger(row.version, "plan version"),
    state: planState(row.state),
    steps: freezeArray(row.steps, row.planId),
    sourceVersions: freezeArray(row.sourceVersions, row.planId),
    createdAt: databaseDate(row.createdAt, row.planId),
  } as PlanRecord;
}

export function toRun(row: RawRunRow): RunRecord {
  return {
    runId: row.runId as RunId,
    missionId: row.missionId as MissionId,
    planId: row.planId as PlanId,
    planVersion: positiveInteger(row.planVersion, "run plan version"),
    scope: toScope(row),
    actor: toActor(row),
    correlationId: row.correlationId as CorrelationId,
    state: runState(row.state),
    aggregateVersion: positiveInteger(
      row.aggregateVersion,
      "run aggregate version",
    ) as AggregateVersion,
    sourceVersions: freezeArray(row.sourceVersions, row.runId),
    model: optionalModel(row.model, row.runId),
    costLimit: optionalNumber(row.costLimit, row.runId),
    cost: toCost(row.cost, row.runId),
    attemptCount: row.attemptCount,
    ...(row.failure === null ? {} : { failure: row.failure }),
    ...(row.cancellationRequestedAt === null ? {} : {
      cancellationRequestedAt: databaseDate(
        row.cancellationRequestedAt,
        row.runId,
      ),
    }),
    ...(row.nextAttemptAt === null
      ? {}
      : { nextAttemptAt: databaseDate(row.nextAttemptAt, row.runId) }),
    ...(row.leaseOwner === null ? {} : { leaseOwner: row.leaseOwner }),
    ...(row.leaseExpiresAt === null
      ? {}
      : { leaseExpiresAt: databaseDate(row.leaseExpiresAt, row.runId) }),
    createdAt: databaseDate(row.createdAt, row.runId),
    updatedAt: databaseDate(row.updatedAt, row.runId),
  };
}

export function toStep(row: RawStepRow): StepRecord {
  return {
    stepId: row.stepId as StepId,
    runId: row.runId as RunId,
    ordinal: row.ordinal,
    name: row.name,
    kind: stepKind(row.kind),
    toolName: row.toolName ?? undefined,
    action: row.action ?? undefined,
    resourceKind: row.resourceKind ?? undefined,
    resourceId: row.resourceId ?? undefined,
    input: objectValue(row.input, row.stepId),
    sourceVersions: freezeArray(row.sourceVersions, row.stepId),
    state: stepState(row.state),
    attemptCount: row.attemptCount,
    resultId: row.resultId === null ? undefined : row.resultId as ResultId,
    createdAt: databaseDate(row.createdAt, row.stepId),
    updatedAt: databaseDate(row.updatedAt, row.stepId),
  };
}

export function toActivity(row: RawActivityRow): ToolActivityRecord {
  return {
    activityId: row.activityId as ToolActivityId,
    runId: row.runId as RunId,
    stepId: row.stepId as StepId,
    toolName: row.toolName,
    action: row.action,
    resourceKind: row.resourceKind,
    resourceId: row.resourceId,
    requestDigest: row.requestDigest,
    state: activityState(row.state),
    authority: row.authority === null ? undefined : objectValue(
      row.authority,
      row.activityId,
    ) as unknown as ToolActivityRecord["authority"],
    denialReason: row.denialReason ?? undefined,
    createdAt: databaseDate(row.createdAt, row.activityId),
    completedAt: row.completedAt === null
      ? undefined
      : databaseDate(row.completedAt, row.activityId),
  };
}

export function toResult(row: RawResultRow): ResultRecord {
  return {
    resultId: row.resultId as ResultId,
    runId: row.runId as RunId,
    stepId: row.stepId as StepId,
    kind: resultKind(row.kind),
    value: objectValue(row.value, row.resultId),
    lineage: objectValue(
      row.lineage,
      row.resultId,
    ) as unknown as ResultRecord["lineage"],
    cost: toCost(row.cost, row.resultId),
    createdAt: databaseDate(row.createdAt, row.resultId),
  };
}

export function toArtifact(row: RawArtifactRow): ArtifactRecord {
  return {
    artifactId: row.artifactId as ArtifactId,
    resultId: row.resultId as ResultId,
    runId: row.runId as RunId,
    stepId: row.stepId as StepId,
    artifactType: row.artifactType,
    contentReference: row.contentReference,
    contentDigest: row.contentDigest,
    state: artifactState(row.state),
    sourceVersions: freezeArray(row.sourceVersions, row.artifactId),
    createdAt: databaseDate(row.createdAt, row.artifactId),
  };
}

export function toAttempt(row: RawAttemptRow): RuntimeAttemptRecord {
  return {
    attemptId: row.attemptId,
    scope: attemptScope(row.scope),
    subjectId: row.scope === "run"
      ? row.subjectId as RunId
      : row.subjectId as StepId,
    runId: row.runId as RunId,
    attemptNumber: row.attemptNumber,
    recordKind: attemptRecordKind(row.recordKind),
    workerId: row.workerId,
    leaseExpiresAt: databaseDate(row.leaseExpiresAt, row.attemptId),
    startedAt: databaseDate(row.startedAt, row.attemptId),
    ...(row.completedAt === null
      ? {}
      : { completedAt: databaseDate(row.completedAt, row.attemptId) }),
    ...(row.outcome === null ? {} : { outcome: row.outcome }),
    ...(row.failure === null ? {} : { failure: row.failure }),
  };
}

function toScope(row: RawScopeRow): RuntimeScope {
  return {
    tenantId: row.tenantId as TenantId,
    ...(row.workspaceId === null
      ? {}
      : { workspaceId: row.workspaceId as WorkspaceId }),
    ...(row.dealId === null ? {} : { dealId: row.dealId as DealId }),
  };
}

function toActor(
  row: { actorId: string; actorKind: string; actorState: string },
): RuntimeActor {
  return {
    actorId: row.actorId as ActorId,
    kind: actorKind(row.actorKind),
    state: actorState(row.actorState),
  };
}

function toCost(value: unknown, subject: string): CostMetadata {
  const cost = objectValue(value, subject) as unknown as CostMetadata;
  assertCostMetadata(cost);
  return cost;
}

function optionalModel(
  value: unknown,
  subject: string,
): ModelMetadata | undefined {
  if (value === null) return undefined;
  return objectValue(value, subject) as unknown as ModelMetadata;
}

function objectValue(
  value: unknown,
  subject: string,
): Readonly<Record<string, unknown>> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Readonly<Record<string, unknown>>;
  }
  throw new Error(
    `Runtime JSON value for "${subject}" is invalid; expected a JSON object.`,
  );
}

function freezeArray<T>(value: unknown, subject: string): readonly T[] {
  if (Array.isArray(value)) return Object.freeze([...value]) as readonly T[];
  throw new Error(
    `Runtime JSON value for "${subject}" is invalid; expected a JSON array.`,
  );
}

function databaseDate(value: Date | string, subject: string): Date {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;
  throw new Error(
    `Runtime date for "${subject}" is invalid; expected a PostgreSQL timestamp.`,
  );
}

function positiveInteger(value: string | number, subject: string): number {
  const parsed = Number(value);
  if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  throw new Error(
    `Runtime integer for "${subject}" is invalid; expected a positive safe integer.`,
  );
}

function optionalNumber(
  value: string | number | null,
  subject: string,
): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  throw new Error(
    `Runtime number for "${subject}" is invalid; expected a non-negative number.`,
  );
}
