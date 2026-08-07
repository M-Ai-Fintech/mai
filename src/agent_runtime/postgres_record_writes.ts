import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type {
  ArtifactRecord,
  MissionRecord,
  PlanRecord,
  ResultRecord,
  RunRecord,
  RuntimeAttemptRecord,
  StepRecord,
  ToolActivityRecord,
} from "./model.ts";
import { scopeValues } from "./postgres_sql.ts";

export async function insertMission(
  transaction: TransactionHandle,
  mission: MissionRecord,
): Promise<void> {
  await transaction.query(
    `INSERT INTO agent_runtime.missions (
       mission_id, tenant_id, workspace_id, deal_id, actor_id, actor_kind,
       actor_state, objective, state, aggregate_version, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      mission.missionId,
      ...scopeValues(mission.scope),
      mission.actor.actorId,
      mission.actor.kind,
      mission.actor.state,
      mission.objective,
      mission.state,
      mission.aggregateVersion,
      mission.createdAt,
      mission.updatedAt,
    ],
  );
}

export async function insertPlan(
  transaction: TransactionHandle,
  plan: PlanRecord,
): Promise<void> {
  await transaction.query(
    `INSERT INTO agent_runtime.plan_versions (
       plan_id, mission_id, tenant_id, workspace_id, deal_id, actor_id,
       actor_kind, actor_state, version, state, steps, source_versions, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (plan_id) DO UPDATE SET state = EXCLUDED.state`,
    [
      plan.planId,
      plan.missionId,
      ...scopeValues(plan.scope),
      plan.actor.actorId,
      plan.actor.kind,
      plan.actor.state,
      plan.version,
      plan.state,
      JSON.stringify(plan.steps),
      JSON.stringify(plan.sourceVersions),
      plan.createdAt,
    ],
  );
}

export async function insertRun(
  transaction: TransactionHandle,
  run: RunRecord,
): Promise<void> {
  await transaction.query(
    `INSERT INTO agent_runtime.runs (
       run_id, mission_id, plan_id, plan_version, tenant_id, workspace_id,
       deal_id, actor_id, actor_kind, actor_state, correlation_id, state,
       aggregate_version, source_versions, model, cost_limit, cost,
       attempt_count, failure, cancellation_requested_at, next_attempt_at,
       lease_owner, lease_expires_at, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
       $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
     )`,
    [
      run.runId,
      run.missionId,
      run.planId,
      run.planVersion,
      ...scopeValues(run.scope),
      run.actor.actorId,
      run.actor.kind,
      run.actor.state,
      run.correlationId,
      run.state,
      run.aggregateVersion,
      JSON.stringify(run.sourceVersions),
      run.model === undefined ? null : JSON.stringify(run.model),
      run.costLimit ?? null,
      JSON.stringify(run.cost),
      run.attemptCount,
      run.failure ?? null,
      run.cancellationRequestedAt ?? null,
      run.nextAttemptAt ?? null,
      run.leaseOwner ?? null,
      run.leaseExpiresAt ?? null,
      run.createdAt,
      run.updatedAt,
    ],
  );
}

export async function insertStep(
  transaction: TransactionHandle,
  step: StepRecord,
): Promise<void> {
  await transaction.query(
    `INSERT INTO agent_runtime.steps (
       step_id, run_id, ordinal, name, kind, tool_name, action,
       resource_kind, resource_id, input, source_versions, state,
       attempt_count, result_id, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      step.stepId,
      step.runId,
      step.ordinal,
      step.name,
      step.kind,
      step.toolName ?? null,
      step.action ?? null,
      step.resourceKind ?? null,
      step.resourceId ?? null,
      JSON.stringify(step.input),
      JSON.stringify(step.sourceVersions),
      step.state,
      step.attemptCount,
      step.resultId ?? null,
      step.createdAt,
      step.updatedAt,
    ],
  );
}

export async function upsertToolActivity(
  transaction: TransactionHandle,
  activity: ToolActivityRecord,
): Promise<void> {
  await transaction.query(
    `INSERT INTO agent_runtime.tool_activities (
       activity_id, run_id, step_id, tool_name, action, resource_kind,
       resource_id, request_digest, state, authority, denial_reason,
       created_at, completed_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (activity_id) DO UPDATE SET
       state = EXCLUDED.state, authority = EXCLUDED.authority,
       denial_reason = EXCLUDED.denial_reason,
       completed_at = EXCLUDED.completed_at`,
    [
      activity.activityId,
      activity.runId,
      activity.stepId,
      activity.toolName,
      activity.action,
      activity.resourceKind,
      activity.resourceId,
      activity.requestDigest,
      activity.state,
      activity.authority === undefined
        ? null
        : JSON.stringify(activity.authority),
      activity.denialReason ?? null,
      activity.createdAt,
      activity.completedAt ?? null,
    ],
  );
}

export async function insertResult(
  transaction: TransactionHandle,
  result: ResultRecord,
): Promise<void> {
  await transaction.query(
    `INSERT INTO agent_runtime.results (
       result_id, run_id, step_id, kind, value, lineage, cost, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      result.resultId,
      result.runId,
      result.stepId,
      result.kind,
      JSON.stringify(result.value),
      JSON.stringify(result.lineage),
      JSON.stringify(result.cost),
      result.createdAt,
    ],
  );
}

export async function insertArtifact(
  transaction: TransactionHandle,
  artifact: ArtifactRecord,
): Promise<void> {
  await transaction.query(
    `INSERT INTO agent_runtime.artifacts (
       artifact_id, result_id, run_id, step_id, artifact_type,
       content_reference, content_digest, state, source_versions, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      artifact.artifactId,
      artifact.resultId,
      artifact.runId,
      artifact.stepId,
      artifact.artifactType,
      artifact.contentReference,
      artifact.contentDigest,
      artifact.state,
      JSON.stringify(artifact.sourceVersions),
      artifact.createdAt,
    ],
  );
}

export async function insertAttempt(
  transaction: TransactionHandle,
  attempt: RuntimeAttemptRecord,
): Promise<void> {
  await transaction.query(
    `INSERT INTO agent_runtime.attempts (
       attempt_id, scope, subject_id, run_id, attempt_number, record_kind,
       worker_id, lease_expires_at, started_at, completed_at, outcome, failure
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      attempt.attemptId,
      attempt.scope,
      attempt.subjectId,
      attempt.runId,
      attempt.attemptNumber,
      attempt.recordKind,
      attempt.workerId,
      attempt.leaseExpiresAt,
      attempt.startedAt,
      attempt.completedAt ?? null,
      attempt.outcome ?? null,
      attempt.failure ?? null,
    ],
  );
}
