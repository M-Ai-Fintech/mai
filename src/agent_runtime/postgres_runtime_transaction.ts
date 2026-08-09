import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import {
  assertRunTransition,
  assertStepTransition,
  RuntimeLeaseLostError,
} from "./model.ts";
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
import type { MissionId, PlanId, RunId, StepId } from "./ids.ts";
import { type RawRunRow, toRun } from "./postgres_rows.ts";
import type {
  RuntimeCommandIdentity,
  RuntimeEvent,
  RuntimeEventSink,
  RuntimeIdempotencyClaim,
  RuntimeRunClaim,
  RuntimeRunUpdate,
  RuntimeTransaction,
} from "./repository.ts";
import {
  idempotencyValues,
  runSelectColumns,
  scopeValues,
  startedAttempt,
  terminalStates,
} from "./postgres_sql.ts";
import {
  insertArtifact,
  insertAttempt,
  insertMission,
  insertPlan,
  insertResult,
  insertRun,
  insertStep,
  upsertToolActivity,
} from "./postgres_record_writes.ts";
import {
  listActivities,
  listArtifacts,
  listAttempts,
  listResults,
  listSteps,
  loadActivity,
  loadArtifact,
  loadAttempt,
  loadIdempotency,
  loadMission,
  loadPlan,
  loadResult,
  loadRun,
  loadStep,
} from "./postgres_record_reads.ts";
import {
  claimCandidate,
  claimCandidateById,
  claimCandidateRow,
  completeExpiredAttempt,
  loadRequiredRun,
} from "./postgres_runtime_claims.ts";

export class PostgresRuntimeTransaction implements RuntimeTransaction {
  constructor(
    private readonly transaction: TransactionHandle,
    private readonly eventSink?: RuntimeEventSink,
  ) {}

  async createMission(mission: MissionRecord): Promise<void> {
    await insertMission(this.transaction, mission);
  }

  async createPlan(plan: PlanRecord): Promise<void> {
    await insertPlan(this.transaction, plan);
  }

  async updatePlan(plan: PlanRecord): Promise<void> {
    const result = await this.transaction.query(
      `UPDATE agent_runtime.plan_versions
       SET state = $2
       WHERE plan_id = $1 AND tenant_id = $3
         AND workspace_id = $4
         AND deal_id = $5`,
      [plan.planId, plan.state, ...scopeValues(plan.scope)],
    );
    if (result.rowCount === 1) return;
    throw new Error(
      `Plan "${plan.planId}" update was not recorded; expected one scoped plan.`,
    );
  }

  async createRun(run: RunRecord): Promise<void> {
    await insertRun(this.transaction, run);
  }

  async createStep(step: StepRecord): Promise<void> {
    await insertStep(this.transaction, step);
  }

  findMission(
    scope: RuntimeScope,
    missionId: MissionId,
  ): Promise<MissionRecord | undefined> {
    return loadMission(this.transaction, missionId, scope);
  }

  findPlan(
    scope: RuntimeScope,
    planId: PlanId,
  ): Promise<PlanRecord | undefined> {
    return loadPlan(this.transaction, planId, scope);
  }

  async findRun(
    scope: RuntimeScope,
    runId: RunId,
  ): Promise<RunRecord | undefined> {
    const row = await loadRun(this.transaction, runId, scope);
    return row === undefined ? undefined : toRun(row);
  }

  findStep(
    scope: RuntimeScope,
    stepId: StepId,
  ): Promise<StepRecord | undefined> {
    return loadStep(this.transaction, stepId, scope);
  }

  findToolActivity(
    scope: RuntimeScope,
    activityId: string,
  ): Promise<ToolActivityRecord | undefined> {
    return loadActivity(this.transaction, activityId, scope);
  }

  findResult(
    scope: RuntimeScope,
    resultId: string,
  ): Promise<ResultRecord | undefined> {
    return loadResult(this.transaction, resultId, scope);
  }

  findArtifact(
    scope: RuntimeScope,
    artifactId: string,
  ): Promise<ArtifactRecord | undefined> {
    return loadArtifact(this.transaction, artifactId, scope);
  }

  findAttempt(
    scope: RuntimeScope,
    attemptId: string,
  ): Promise<RuntimeAttemptRecord | undefined> {
    return loadAttempt(this.transaction, attemptId, scope);
  }

  listSteps(scope: RuntimeScope, runId: RunId): Promise<StepRecord[]> {
    return listSteps(this.transaction, runId, scope);
  }

  async claimRun(claim: RuntimeRunClaim): Promise<ClaimedRun | undefined> {
    const candidate = await claimCandidate(this.transaction, claim.now);
    if (candidate === undefined) return undefined;
    return await this.claimCandidate(toRun(candidate), claim);
  }

  async claimRunById(
    runId: RunId,
    claim: RuntimeRunClaim,
  ): Promise<ClaimedRun | undefined> {
    const candidate = await claimCandidateById(
      this.transaction,
      runId,
      claim.now,
    );
    return candidate === undefined
      ? undefined
      : await this.claimCandidate(toRun(candidate), claim);
  }

  private async claimCandidate(
    current: RunRecord,
    claim: RuntimeRunClaim,
  ): Promise<ClaimedRun> {
    const attemptNumber = current.attemptCount + 1;
    await claimCandidateRow(
      this.transaction,
      current.runId,
      claim,
      attemptNumber,
    );
    const updated = await loadRequiredRun(
      this.transaction,
      current.runId,
      current.scope,
    );
    if (current.state === "running") {
      await completeExpiredAttempt(this.transaction, current, claim.now);
    }
    const started = startedAttempt(updated, attemptNumber, claim);
    await this.appendAttempt(started);
    return {
      ...updated,
      state: "running",
      attemptNumber,
      workerId: claim.workerId,
      attemptStartedAt: claim.now,
      leaseExpiresAt: claim.leaseUntil,
    };
  }

  async assertRunLease(run: ClaimedRun, now: Date): Promise<void> {
    const result = await this.transaction.query(
      `SELECT 1 FROM agent_runtime.runs
       WHERE run_id = $1 AND state = 'running' AND tenant_id = $2
         AND workspace_id = $3
         AND deal_id = $4
         AND lease_owner = $5 AND attempt_count = $6
         AND lease_expires_at = $7 AND lease_expires_at > $8
       FOR UPDATE`,
      [
        run.runId,
        ...scopeValues(run.scope),
        run.workerId,
        run.attemptNumber,
        run.leaseExpiresAt,
        now,
      ],
    );
    if (result.rowCount === 1) return;
    throw new RuntimeLeaseLostError(run.runId, run.workerId);
  }

  async cancellationRequested(run: ClaimedRun, now: Date): Promise<boolean> {
    const result = await this.transaction.query<{ requested: boolean }>(
      `SELECT cancellation_requested_at IS NOT NULL AS requested
       FROM agent_runtime.runs
       WHERE run_id = $1 AND state = 'running' AND tenant_id = $2
         AND workspace_id = $3
         AND deal_id = $4
         AND lease_owner = $5 AND attempt_count = $6
         AND lease_expires_at = $7 AND lease_expires_at > $8
       FOR UPDATE`,
      [
        run.runId,
        ...scopeValues(run.scope),
        run.workerId,
        run.attemptNumber,
        run.leaseExpiresAt,
        now,
      ],
    );
    const row = result.rows[0];
    if (row !== undefined) return row.requested;
    throw new RuntimeLeaseLostError(run.runId, run.workerId);
  }

  async updateRun(
    run: ClaimedRun,
    update: RuntimeRunUpdate,
    now: Date,
  ): Promise<RunRecord> {
    assertRunTransition("running", update.state);
    await this.assertRunLease(run, now);
    const result = await this.transaction.query<RawRunRow>(
      `UPDATE agent_runtime.runs
       SET state = $2, cost = COALESCE($3::jsonb, cost), failure = $4,
           next_attempt_at = $5,
           lease_owner = CASE WHEN $2 = ANY($6::text[]) THEN NULL ELSE lease_owner END,
           lease_expires_at = CASE WHEN $2 = ANY($6::text[]) THEN NULL ELSE lease_expires_at END,
           aggregate_version = aggregate_version + 1, updated_at = $7
       WHERE run_id = $1 AND state = 'running' AND tenant_id = $8
         AND workspace_id = $9
         AND deal_id = $10
         AND lease_owner = $11 AND attempt_count = $12
         AND lease_expires_at = $13 AND lease_expires_at > $7
       RETURNING ${runSelectColumns()}`,
      [
        run.runId,
        update.state,
        update.cost === undefined ? null : JSON.stringify(update.cost),
        update.failure ?? null,
        update.nextAttemptAt ?? null,
        terminalStates(),
        now,
        ...scopeValues(run.scope),
        run.workerId,
        run.attemptNumber,
        run.leaseExpiresAt,
      ],
    );
    const row = result.rows[0];
    if (row !== undefined) return toRun(row);
    throw new RuntimeLeaseLostError(run.runId, run.workerId);
  }

  async updateStep(
    run: ClaimedRun,
    step: StepRecord,
    now: Date,
  ): Promise<void> {
    await this.assertRunLease(run, now);
    const current = await loadStep(this.transaction, step.stepId, run.scope);
    if (current === undefined) {
      throw new Error(
        `Step "${step.stepId}" was not found; expected a durable runtime step.`,
      );
    }
    if (current.state !== step.state) {
      assertStepTransition(current.state, step.state);
    }
    const result = await this.transaction.query(
      `UPDATE agent_runtime.steps
       SET state = $2, attempt_count = $3, result_id = $4, updated_at = $5
       WHERE step_id = $1 AND run_id = $6`,
      [
        step.stepId,
        step.state,
        step.attemptCount,
        step.resultId ?? null,
        step.updatedAt,
        step.runId,
      ],
    );
    if (result.rowCount === 1) return;
    throw new Error(
      `Step "${step.stepId}" update was fenced; expected its current runtime run.`,
    );
  }

  async recordToolActivity(activity: ToolActivityRecord): Promise<void> {
    await upsertToolActivity(this.transaction, activity);
  }

  listToolActivities(
    scope: RuntimeScope,
    runId: RunId,
  ): Promise<ToolActivityRecord[]> {
    return listActivities(this.transaction, runId, scope);
  }

  async recordResult(result: ResultRecord): Promise<void> {
    await insertResult(this.transaction, result);
  }

  listResults(scope: RuntimeScope, runId: RunId): Promise<ResultRecord[]> {
    return listResults(this.transaction, runId, scope);
  }

  async recordArtifact(artifact: ArtifactRecord): Promise<void> {
    await insertArtifact(this.transaction, artifact);
  }

  listArtifacts(scope: RuntimeScope, runId: RunId): Promise<ArtifactRecord[]> {
    return listArtifacts(this.transaction, runId, scope);
  }

  async appendAttempt(attempt: RuntimeAttemptRecord): Promise<void> {
    await insertAttempt(this.transaction, attempt);
  }

  listAttempts(
    scope: RuntimeScope,
    runId: RunId,
  ): Promise<RuntimeAttemptRecord[]> {
    return listAttempts(this.transaction, runId, scope);
  }

  async claimIdempotency(
    identity: RuntimeCommandIdentity,
  ): Promise<RuntimeIdempotencyClaim> {
    const inserted = await this.transaction.query(
      `INSERT INTO agent_runtime.command_idempotency (
         tenant_id, workspace_id, deal_id, actor_id, command_type,
         target_type, target_id, idempotency_key, payload_digest, claimed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      [
        ...idempotencyValues(identity),
        identity.payloadDigest,
        identity.createdAt,
      ],
    );
    if (inserted.rowCount === 1) return { status: "claimed" };
    const existing = await loadIdempotency(this.transaction, identity);
    if (existing.payloadDigest !== identity.payloadDigest) {
      throw new Error(
        `Runtime idempotency key "${identity.idempotencyKey}" payload digest changed; expected the original command payload.`,
      );
    }
    return existing.resultReference === null
      ? { status: "in_progress" }
      : { status: "replay", resultReference: existing.resultReference };
  }

  async completeIdempotency(
    identity: RuntimeCommandIdentity,
    resultReference: string,
  ): Promise<void> {
    const result = await this.transaction.query(
      `UPDATE agent_runtime.command_idempotency
       SET result_reference = $9, completed_at = $10
       WHERE tenant_id = $1 AND workspace_id = $2
         AND deal_id = $3 AND actor_id = $4
         AND command_type = $5 AND target_type = $6 AND target_id = $7
         AND idempotency_key = $8 AND payload_digest = $11`,
      [
        ...idempotencyValues(identity),
        resultReference,
        identity.createdAt,
        identity.payloadDigest,
      ],
    );
    if (result.rowCount === 1) return;
    throw new Error(
      `Runtime idempotency key "${identity.idempotencyKey}" could not complete; expected the original claimed payload.`,
    );
  }

  async appendEvent(event: RuntimeEvent): Promise<void> {
    await this.transaction.query(
      `INSERT INTO agent_runtime.runtime_events (
         event_id, tenant_id, workspace_id, deal_id, actor_id, actor_kind,
         actor_state, correlation_id, aggregate_type, aggregate_id,
         aggregate_version, event_type, payload, occurred_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        event.eventId,
        ...scopeValues(event.scope),
        event.actor.actorId,
        event.actor.kind,
        event.actor.state,
        event.correlationId,
        event.aggregateType,
        event.aggregateId,
        event.aggregateVersion,
        event.eventType,
        JSON.stringify(event.payload),
        event.occurredAt,
      ],
    );
    if (this.eventSink !== undefined) {
      await this.eventSink.append(this.transaction, event);
    }
  }

  async requestCancellation(
    runId: RunId,
    scope: RuntimeScope,
    requestedAt: Date,
  ): Promise<void> {
    const result = await this.transaction.query(
      `UPDATE agent_runtime.runs
       SET cancellation_requested_at = COALESCE(cancellation_requested_at, $5),
           updated_at = $5
       WHERE run_id = $1 AND tenant_id = $2
         AND workspace_id = $3
         AND deal_id = $4
         AND state IN ('queued', 'running', 'retry_scheduled')`,
      [runId, ...scopeValues(scope), requestedAt],
    );
    if (result.rowCount === 1) return;
    throw new Error(
      `Run "${runId}" cancellation was not recorded; expected one non-terminal scoped run.`,
    );
  }
}
