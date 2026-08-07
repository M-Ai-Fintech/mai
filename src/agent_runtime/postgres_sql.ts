import type { RunRecord, RuntimeAttemptRecord, RuntimeScope } from "./model.ts";
import type { RuntimeCommandIdentity, RuntimeRunClaim } from "./repository.ts";

export function missionSelect(): string {
  return `SELECT mission_id AS "missionId", tenant_id AS "tenantId",
    workspace_id AS "workspaceId", deal_id AS "dealId", actor_id AS "actorId",
    actor_kind AS "actorKind", actor_state AS "actorState", objective, state,
    aggregate_version AS "aggregateVersion", created_at AS "createdAt",
    updated_at AS "updatedAt" FROM agent_runtime.missions`;
}

export function planSelect(): string {
  return `SELECT plan_id AS "planId", mission_id AS "missionId",
    tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId",
    actor_id AS "actorId", actor_kind AS "actorKind", actor_state AS "actorState",
    version, state, steps, source_versions AS "sourceVersions", created_at AS "createdAt"
    FROM agent_runtime.plan_versions`;
}

export function runSelect(): string {
  return `SELECT ${runSelectColumns()} FROM agent_runtime.runs`;
}

export function runSelectColumns(): string {
  return `run_id AS "runId", mission_id AS "missionId", plan_id AS "planId",
    plan_version AS "planVersion", tenant_id AS "tenantId",
    workspace_id AS "workspaceId", deal_id AS "dealId", actor_id AS "actorId",
    actor_kind AS "actorKind", actor_state AS "actorState",
    correlation_id AS "correlationId", state,
    aggregate_version AS "aggregateVersion", source_versions AS "sourceVersions",
    model, cost_limit AS "costLimit", cost, attempt_count AS "attemptCount",
    failure, cancellation_requested_at AS "cancellationRequestedAt",
    next_attempt_at AS "nextAttemptAt", lease_owner AS "leaseOwner",
    lease_expires_at AS "leaseExpiresAt", created_at AS "createdAt",
    updated_at AS "updatedAt"`;
}

export function stepSelect(): string {
  return `SELECT step_id AS "stepId", run_id AS "runId", ordinal, name, kind,
    tool_name AS "toolName", action, resource_kind AS "resourceKind",
    resource_id AS "resourceId", input, source_versions AS "sourceVersions",
    state, attempt_count AS "attemptCount", result_id AS "resultId",
    created_at AS "createdAt", updated_at AS "updatedAt"
    FROM agent_runtime.steps`;
}

export function activitySelect(): string {
  return `SELECT activity_id AS "activityId", run_id AS "runId",
    step_id AS "stepId", tool_name AS "toolName", action,
    resource_kind AS "resourceKind", resource_id AS "resourceId",
    request_digest AS "requestDigest", state, authority, denial_reason AS "denialReason",
    created_at AS "createdAt", completed_at AS "completedAt"
    FROM agent_runtime.tool_activities`;
}

export function resultSelect(): string {
  return `SELECT result_id AS "resultId", run_id AS "runId", step_id AS "stepId",
    kind, value, lineage, cost, created_at AS "createdAt"
    FROM agent_runtime.results`;
}

export function artifactSelect(): string {
  return `SELECT artifact_id AS "artifactId", result_id AS "resultId",
    run_id AS "runId", step_id AS "stepId", artifact_type AS "artifactType",
    content_reference AS "contentReference", content_digest AS "contentDigest",
    state, source_versions AS "sourceVersions", created_at AS "createdAt"
    FROM agent_runtime.artifacts`;
}

export function scopeValues(scope: RuntimeScope): unknown[] {
  return [scope.tenantId, scope.workspaceId ?? null, scope.dealId ?? null];
}

export function scopedColumns(alias: string): string {
  return `${alias}.tenant_id = $2 AND ${alias}.workspace_id IS NOT DISTINCT FROM $3
    AND ${alias}.deal_id IS NOT DISTINCT FROM $4`;
}

export function scopedRunExists(alias: string): string {
  return `EXISTS (
    SELECT 1 FROM agent_runtime.runs scoped_run
    WHERE scoped_run.run_id = ${alias}.run_id
      AND scoped_run.tenant_id = $2
      AND scoped_run.workspace_id IS NOT DISTINCT FROM $3
      AND scoped_run.deal_id IS NOT DISTINCT FROM $4
  )`;
}

export function idempotencyValues(identity: RuntimeCommandIdentity): unknown[] {
  return [
    identity.scope.tenantId,
    identity.scope.workspaceId ?? null,
    identity.scope.dealId ?? null,
    identity.actorId,
    identity.commandType,
    identity.targetType,
    identity.targetId,
    identity.idempotencyKey,
  ];
}

export function terminalStates(): readonly string[] {
  return [
    "retry_scheduled",
    "succeeded",
    "failed",
    "cancelled",
    "invalidated",
    "dead_lettered",
  ];
}

export function startedAttempt(
  run: RunRecord,
  attemptNumber: number,
  claim: RuntimeRunClaim,
): RuntimeAttemptRecord {
  return {
    attemptId: `attempt_${run.runId}-${attemptNumber}-started`,
    scope: "run",
    subjectId: run.runId,
    runId: run.runId,
    attemptNumber,
    recordKind: "started",
    workerId: claim.workerId,
    leaseExpiresAt: claim.leaseUntil,
    startedAt: claim.now,
  };
}
