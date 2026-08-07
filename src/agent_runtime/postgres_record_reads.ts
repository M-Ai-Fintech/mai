import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type {
  ArtifactRecord,
  MissionRecord,
  PlanRecord,
  ResultRecord,
  RuntimeAttemptRecord,
  StepRecord,
  ToolActivityRecord,
} from "./model.ts";
import type { MissionId, PlanId, RunId, StepId } from "./ids.ts";
import type { RuntimeCommandIdentity } from "./repository.ts";
import {
  activitySelect,
  artifactSelect,
  idempotencyValues,
  missionSelect,
  planSelect,
  resultSelect,
  runSelect,
  stepSelect,
} from "./postgres_sql.ts";
import {
  type RawActivityRow,
  type RawArtifactRow,
  type RawAttemptRow,
  type RawIdempotencyRow,
  type RawMissionRow,
  type RawPlanRow,
  type RawResultRow,
  type RawRunRow,
  type RawStepRow,
  toActivity,
  toArtifact,
  toAttempt,
  toMission,
  toPlan,
  toResult,
  toStep,
} from "./postgres_rows.ts";

export async function loadMission(
  transaction: TransactionHandle,
  missionId: MissionId,
): Promise<MissionRecord | undefined> {
  const result = await transaction.query<RawMissionRow>(
    `${missionSelect()} WHERE mission_id = $1`,
    [missionId],
  );
  return result.rows[0] === undefined ? undefined : toMission(result.rows[0]);
}

export async function loadPlan(
  transaction: TransactionHandle,
  planId: PlanId,
): Promise<PlanRecord | undefined> {
  const result = await transaction.query<RawPlanRow>(
    `${planSelect()} WHERE plan_id = $1`,
    [planId],
  );
  return result.rows[0] === undefined ? undefined : toPlan(result.rows[0]);
}

export async function loadRun(
  transaction: TransactionHandle,
  runId: RunId,
): Promise<RawRunRow | undefined> {
  const result = await transaction.query<RawRunRow>(
    `${runSelect()} WHERE run_id = $1`,
    [runId],
  );
  return result.rows[0];
}

export async function loadStep(
  transaction: TransactionHandle,
  stepId: StepId,
): Promise<StepRecord | undefined> {
  const result = await transaction.query<RawStepRow>(
    `${stepSelect()} WHERE step_id = $1`,
    [stepId],
  );
  return result.rows[0] === undefined ? undefined : toStep(result.rows[0]);
}

export async function listSteps(
  transaction: TransactionHandle,
  runId: RunId,
): Promise<StepRecord[]> {
  const result = await transaction.query<RawStepRow>(
    `${stepSelect()} WHERE run_id = $1 ORDER BY ordinal`,
    [runId],
  );
  return result.rows.map(toStep);
}

export async function listActivities(
  transaction: TransactionHandle,
  runId: RunId,
): Promise<ToolActivityRecord[]> {
  const result = await transaction.query<RawActivityRow>(
    `${activitySelect()} WHERE run_id = $1 ORDER BY created_at, activity_id`,
    [runId],
  );
  return result.rows.map(toActivity);
}

export async function listResults(
  transaction: TransactionHandle,
  runId: RunId,
): Promise<ResultRecord[]> {
  const result = await transaction.query<RawResultRow>(
    `${resultSelect()} WHERE run_id = $1 ORDER BY created_at, result_id`,
    [runId],
  );
  return result.rows.map(toResult);
}

export async function listArtifacts(
  transaction: TransactionHandle,
  runId: RunId,
): Promise<ArtifactRecord[]> {
  const result = await transaction.query<RawArtifactRow>(
    `${artifactSelect()} WHERE run_id = $1 ORDER BY created_at, artifact_id`,
    [runId],
  );
  return result.rows.map(toArtifact);
}

export async function listAttempts(
  transaction: TransactionHandle,
  runId: RunId,
): Promise<RuntimeAttemptRecord[]> {
  const result = await transaction.query<RawAttemptRow>(
    `SELECT attempt_id AS "attemptId", scope, subject_id AS "subjectId",
       run_id AS "runId", attempt_number AS "attemptNumber",
       record_kind AS "recordKind", worker_id AS "workerId",
       lease_expires_at AS "leaseExpiresAt", started_at AS "startedAt",
       completed_at AS "completedAt", outcome, failure
     FROM agent_runtime.attempts
     WHERE run_id = $1 ORDER BY attempt_record_id`,
    [runId],
  );
  return result.rows.map(toAttempt);
}

export async function loadIdempotency(
  transaction: TransactionHandle,
  identity: RuntimeCommandIdentity,
): Promise<RawIdempotencyRow> {
  const result = await transaction.query<RawIdempotencyRow>(
    `SELECT payload_digest AS "payloadDigest", result_reference AS "resultReference"
     FROM agent_runtime.command_idempotency
     WHERE tenant_id = $1 AND workspace_id IS NOT DISTINCT FROM $2
       AND deal_id IS NOT DISTINCT FROM $3 AND actor_id = $4
       AND command_type = $5 AND target_type = $6 AND target_id = $7
       AND idempotency_key = $8`,
    idempotencyValues(identity),
  );
  const row = result.rows[0];
  if (row !== undefined) return row;
  throw new Error(
    `Runtime idempotency key "${identity.idempotencyKey}" disappeared; expected a durable claim.`,
  );
}
