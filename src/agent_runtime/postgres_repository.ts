import pg from "pg";
import type {
  TransactionHandle,
  TransactionPool,
} from "../platform/persistence/transaction.ts";
import { PostgresTransactionRunner } from "../platform/persistence/transaction.ts";
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
import type { MissionId, PlanId, RunId } from "./ids.ts";
import {
  type RawAttemptRow,
  type RawRunRow,
  toAttempt,
  toRun,
} from "./postgres_rows.ts";
import type {
  AgentRuntimeStore,
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
  runSelect,
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
  loadIdempotency,
  loadMission,
  loadPlan,
  loadRun,
  loadStep,
} from "./postgres_record_reads.ts";

export class PostgresAgentRuntimeStore implements AgentRuntimeStore {
  private readonly transactions: PostgresTransactionRunner;

  constructor(
    pool: TransactionPool | pg.Pool,
    private readonly eventSink?: RuntimeEventSink,
  ) {
    this.transactions = new PostgresTransactionRunner(pool);
  }

  transaction<TResult>(
    work: (transaction: RuntimeTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return this.transactions.run((transaction) =>
      work(new PostgresRuntimeTransaction(transaction, this.eventSink))
    );
  }
}

class PostgresRuntimeTransaction implements RuntimeTransaction {
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

  async createRun(run: RunRecord): Promise<void> {
    await insertRun(this.transaction, run);
  }

  async createStep(step: StepRecord): Promise<void> {
    await insertStep(this.transaction, step);
  }

  findMission(missionId: MissionId): Promise<MissionRecord | undefined> {
    return loadMission(this.transaction, missionId);
  }

  findPlan(planId: PlanId): Promise<PlanRecord | undefined> {
    return loadPlan(this.transaction, planId);
  }

  async findRun(runId: RunId): Promise<RunRecord | undefined> {
    const row = await loadRun(this.transaction, runId);
    return row === undefined ? undefined : toRun(row);
  }

  listSteps(runId: RunId): Promise<StepRecord[]> {
    return listSteps(this.transaction, runId);
  }

  async claimRun(claim: RuntimeRunClaim): Promise<ClaimedRun | undefined> {
    const candidate = await this.claimCandidate(claim.now);
    if (candidate === undefined) return undefined;
    const current = toRun(candidate);
    const attemptNumber = current.attemptCount + 1;
    await this.claimCandidateRow(current.runId, claim, attemptNumber);
    const updated = await this.loadRequiredRun(current.runId);
    if (current.state === "running") {
      await this.completeExpiredAttempt(current, claim.now);
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
         AND lease_owner = $3 AND attempt_count = $4
         AND lease_expires_at = $5 AND lease_expires_at > $6`,
      [
        run.runId,
        run.scope.tenantId,
        run.workerId,
        run.attemptNumber,
        run.leaseExpiresAt,
        now,
      ],
    );
    if (result.rowCount === 1) return;
    throw new RuntimeLeaseLostError(run.runId, run.workerId);
  }

  async cancellationRequested(run: ClaimedRun): Promise<boolean> {
    const result = await this.transaction.query<{ requested: boolean }>(
      `SELECT cancellation_requested_at IS NOT NULL AS requested
       FROM agent_runtime.runs
       WHERE run_id = $1 AND state = 'running' AND tenant_id = $2
         AND lease_owner = $3 AND attempt_count = $4
         AND lease_expires_at = $5 AND lease_expires_at > $6`,
      [
        run.runId,
        run.scope.tenantId,
        run.workerId,
        run.attemptNumber,
        run.leaseExpiresAt,
        this.now(),
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
         AND lease_owner = $9 AND attempt_count = $10
         AND lease_expires_at = $11 AND lease_expires_at > $7
       RETURNING ${runSelectColumns()}`,
      [
        run.runId,
        update.state,
        update.cost === undefined ? null : JSON.stringify(update.cost),
        update.failure ?? null,
        update.nextAttemptAt ?? null,
        terminalStates(),
        now,
        run.scope.tenantId,
        run.workerId,
        run.attemptNumber,
        run.leaseExpiresAt,
      ],
    );
    const row = result.rows[0];
    if (row !== undefined) return toRun(row);
    throw new RuntimeLeaseLostError(run.runId, run.workerId);
  }

  async updateStep(step: StepRecord): Promise<void> {
    const current = await loadStep(this.transaction, step.stepId);
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

  listToolActivities(runId: RunId): Promise<ToolActivityRecord[]> {
    return listActivities(this.transaction, runId);
  }

  async recordResult(result: ResultRecord): Promise<void> {
    await insertResult(this.transaction, result);
  }

  listResults(runId: RunId): Promise<ResultRecord[]> {
    return listResults(this.transaction, runId);
  }

  async recordArtifact(artifact: ArtifactRecord): Promise<void> {
    await insertArtifact(this.transaction, artifact);
  }

  listArtifacts(runId: RunId): Promise<ArtifactRecord[]> {
    return listArtifacts(this.transaction, runId);
  }

  async appendAttempt(attempt: RuntimeAttemptRecord): Promise<void> {
    await insertAttempt(this.transaction, attempt);
  }

  listAttempts(runId: RunId): Promise<RuntimeAttemptRecord[]> {
    return listAttempts(this.transaction, runId);
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
       WHERE tenant_id = $1 AND workspace_id IS NOT DISTINCT FROM $2
         AND deal_id IS NOT DISTINCT FROM $3 AND actor_id = $4
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
         AND workspace_id IS NOT DISTINCT FROM $3
         AND deal_id IS NOT DISTINCT FROM $4
         AND state IN ('queued', 'running', 'retry_scheduled')`,
      [runId, ...scopeValues(scope), requestedAt],
    );
    if (result.rowCount === 1) return;
    throw new Error(
      `Run "${runId}" cancellation was not recorded; expected one non-terminal scoped run.`,
    );
  }

  private async claimCandidate(now: Date): Promise<RawRunRow | undefined> {
    const result = await this.transaction.query<RawRunRow>(
      `${runSelect()}
       WHERE state = 'queued'
          OR (state = 'retry_scheduled' AND (next_attempt_at IS NULL OR next_attempt_at <= $1))
          OR (state = 'running' AND lease_expires_at <= $1)
       ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`,
      [now],
    );
    return result.rows[0];
  }

  private async claimCandidateRow(
    runId: RunId,
    claim: RuntimeRunClaim,
    attemptNumber: number,
  ): Promise<void> {
    const result = await this.transaction.query(
      `UPDATE agent_runtime.runs
       SET state = 'running', attempt_count = $2, lease_owner = $3,
           lease_expires_at = $4, next_attempt_at = NULL, updated_at = $5
       WHERE run_id = $1`,
      [runId, attemptNumber, claim.workerId, claim.leaseUntil, claim.now],
    );
    if (result.rowCount === 1) return;
    throw new Error(
      `Run "${runId}" could not be claimed; expected the locked candidate row.`,
    );
  }

  private async completeExpiredAttempt(
    run: RunRecord,
    completedAt: Date,
  ): Promise<void> {
    const result = await this.transaction.query<RawAttemptRow>(
      `SELECT attempt_id AS "attemptId", scope, subject_id AS "subjectId",
         run_id AS "runId", attempt_number AS "attemptNumber",
         record_kind AS "recordKind", worker_id AS "workerId",
         lease_expires_at AS "leaseExpiresAt", started_at AS "startedAt",
         completed_at AS "completedAt", outcome, failure
       FROM agent_runtime.attempts
       WHERE run_id = $1 AND scope = 'run' AND attempt_number = $2
         AND record_kind = 'started'
       ORDER BY attempt_record_id DESC LIMIT 1`,
      [run.runId, run.attemptCount],
    );
    const started = result.rows[0];
    if (started === undefined) return;
    const record = toAttempt(started);
    await this.appendAttempt({
      ...record,
      attemptId: `${record.attemptId}-completed`,
      recordKind: "completed",
      completedAt,
      outcome: "lease_expired",
      failure: "LEASE_EXPIRED",
    });
  }

  private async loadRequiredRun(runId: RunId): Promise<RunRecord> {
    const row = await loadRun(this.transaction, runId);
    if (row !== undefined) return toRun(row);
    throw new Error(
      `Run "${runId}" disappeared while being claimed; expected a durable runtime row.`,
    );
  }

  private now(): Date {
    return new Date();
  }
}
