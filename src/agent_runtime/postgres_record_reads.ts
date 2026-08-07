import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type {
  ArtifactRecord,
  MissionRecord,
  PlanRecord,
  ResultRecord,
  RuntimeAttemptRecord,
  RuntimeScope,
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
  scopedColumns,
  scopedRunExists,
  scopeValues,
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
  scope: RuntimeScope,
): Promise<MissionRecord | undefined> {
  const result = await transaction.query<RawMissionRow>(
    `${missionSelect()} WHERE mission_id = $1 AND ${
      scopedColumns("agent_runtime.missions")
    }`,
    [missionId, ...scopeValues(scope)],
  );
  return result.rows[0] === undefined ? undefined : toMission(result.rows[0]);
}

export async function loadPlan(
  transaction: TransactionHandle,
  planId: PlanId,
  scope: RuntimeScope,
): Promise<PlanRecord | undefined> {
  const result = await transaction.query<RawPlanRow>(
    `${planSelect()} WHERE plan_id = $1 AND ${
      scopedColumns("agent_runtime.plan_versions")
    }`,
    [planId, ...scopeValues(scope)],
  );
  return result.rows[0] === undefined ? undefined : toPlan(result.rows[0]);
}

export async function loadRun(
  transaction: TransactionHandle,
  runId: RunId,
  scope: RuntimeScope,
): Promise<RawRunRow | undefined> {
  const result = await transaction.query<RawRunRow>(
    `${runSelect()} WHERE run_id = $1 AND ${
      scopedColumns("agent_runtime.runs")
    }`,
    [runId, ...scopeValues(scope)],
  );
  return result.rows[0];
}

export async function loadStep(
  transaction: TransactionHandle,
  stepId: StepId,
  scope: RuntimeScope,
): Promise<StepRecord | undefined> {
  const result = await transaction.query<RawStepRow>(
    `${stepSelect()} WHERE step_id = $1 AND ${
      scopedRunExists("agent_runtime.steps")
    }`,
    [stepId, ...scopeValues(scope)],
  );
  return result.rows[0] === undefined ? undefined : toStep(result.rows[0]);
}

export async function listSteps(
  transaction: TransactionHandle,
  runId: RunId,
  scope: RuntimeScope,
): Promise<StepRecord[]> {
  const result = await transaction.query<RawStepRow>(
    `${stepSelect()} WHERE run_id = $1 AND ${
      scopedRunExists("agent_runtime.steps")
    } ORDER BY ordinal`,
    [runId, ...scopeValues(scope)],
  );
  return result.rows.map(toStep);
}

export async function listActivities(
  transaction: TransactionHandle,
  runId: RunId,
  scope: RuntimeScope,
): Promise<ToolActivityRecord[]> {
  const result = await transaction.query<RawActivityRow>(
    `${activitySelect()} WHERE run_id = $1 AND ${
      scopedRunExists("agent_runtime.tool_activities")
    } ORDER BY created_at, activity_id`,
    [runId, ...scopeValues(scope)],
  );
  return result.rows.map(toActivity);
}

export async function loadActivity(
  transaction: TransactionHandle,
  activityId: string,
  scope: RuntimeScope,
): Promise<ToolActivityRecord | undefined> {
  const result = await transaction.query<RawActivityRow>(
    `${activitySelect()} WHERE activity_id = $1 AND ${
      scopedRunExists("agent_runtime.tool_activities")
    }`,
    [activityId, ...scopeValues(scope)],
  );
  return result.rows[0] === undefined ? undefined : toActivity(result.rows[0]);
}

export async function listResults(
  transaction: TransactionHandle,
  runId: RunId,
  scope: RuntimeScope,
): Promise<ResultRecord[]> {
  const result = await transaction.query<RawResultRow>(
    `${resultSelect()} WHERE run_id = $1 AND ${
      scopedRunExists("agent_runtime.results")
    } ORDER BY created_at, result_id`,
    [runId, ...scopeValues(scope)],
  );
  return result.rows.map(toResult);
}

export async function loadResult(
  transaction: TransactionHandle,
  resultId: string,
  scope: RuntimeScope,
): Promise<ResultRecord | undefined> {
  const result = await transaction.query<RawResultRow>(
    `${resultSelect()} WHERE result_id = $1 AND ${
      scopedRunExists("agent_runtime.results")
    }`,
    [resultId, ...scopeValues(scope)],
  );
  return result.rows[0] === undefined ? undefined : toResult(result.rows[0]);
}

export async function listArtifacts(
  transaction: TransactionHandle,
  runId: RunId,
  scope: RuntimeScope,
): Promise<ArtifactRecord[]> {
  const result = await transaction.query<RawArtifactRow>(
    `${artifactSelect()} WHERE run_id = $1 AND ${
      scopedRunExists("agent_runtime.artifacts")
    } ORDER BY created_at, artifact_id`,
    [runId, ...scopeValues(scope)],
  );
  return result.rows.map(toArtifact);
}

export async function loadArtifact(
  transaction: TransactionHandle,
  artifactId: string,
  scope: RuntimeScope,
): Promise<ArtifactRecord | undefined> {
  const result = await transaction.query<RawArtifactRow>(
    `${artifactSelect()} WHERE artifact_id = $1 AND ${
      scopedRunExists("agent_runtime.artifacts")
    }`,
    [artifactId, ...scopeValues(scope)],
  );
  return result.rows[0] === undefined ? undefined : toArtifact(result.rows[0]);
}

export async function listAttempts(
  transaction: TransactionHandle,
  runId: RunId,
  scope: RuntimeScope,
): Promise<RuntimeAttemptRecord[]> {
  const result = await transaction.query<RawAttemptRow>(
    `SELECT attempt_id AS "attemptId", scope, subject_id AS "subjectId",
       run_id AS "runId", attempt_number AS "attemptNumber",
       record_kind AS "recordKind", worker_id AS "workerId",
       lease_expires_at AS "leaseExpiresAt", started_at AS "startedAt",
       completed_at AS "completedAt", outcome, failure
     FROM agent_runtime.attempts
     WHERE run_id = $1 AND ${
      scopedRunExists("agent_runtime.attempts")
    } ORDER BY attempt_record_id`,
    [runId, ...scopeValues(scope)],
  );
  return result.rows.map(toAttempt);
}

export async function loadAttempt(
  transaction: TransactionHandle,
  attemptId: string,
  scope: RuntimeScope,
): Promise<RuntimeAttemptRecord | undefined> {
  const result = await transaction.query<RawAttemptRow>(
    `SELECT attempt_id AS "attemptId", scope, subject_id AS "subjectId",
       run_id AS "runId", attempt_number AS "attemptNumber",
       record_kind AS "recordKind", worker_id AS "workerId",
       lease_expires_at AS "leaseExpiresAt", started_at AS "startedAt",
       completed_at AS "completedAt", outcome, failure
     FROM agent_runtime.attempts
     WHERE attempt_id = $1 AND ${scopedRunExists("agent_runtime.attempts")}`,
    [attemptId, ...scopeValues(scope)],
  );
  return result.rows[0] === undefined ? undefined : toAttempt(result.rows[0]);
}

export async function loadIdempotency(
  transaction: TransactionHandle,
  identity: RuntimeCommandIdentity,
): Promise<RawIdempotencyRow> {
  const result = await transaction.query<RawIdempotencyRow>(
    `SELECT payload_digest AS "payloadDigest", result_reference AS "resultReference"
     FROM agent_runtime.command_idempotency
     WHERE tenant_id = $1 AND workspace_id = $2
       AND deal_id = $3 AND actor_id = $4
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
