import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  agentRuntimeMigrations,
  AgentRuntimeReadService,
  AgentRuntimeRunner,
  AgentRuntimeService,
  PostgresAgentRuntimeStore,
  PostgresRuntimeAuditOutboxSink,
  RuntimeLeaseLostError,
  type RuntimeStepExecutor,
  type StepExecutionContext,
  type StepExecutionOutput,
  type ToolDefinition,
  ToolGateway,
} from "../../src/agent_runtime/v1.ts";
import type {
  PlanStepDefinition,
  RuntimeActor,
  SourceVersionReference,
  StepRecord,
} from "../../src/agent_runtime/model.ts";
import { auditActivityMigrations } from "../../src/audit_activity/migrations/index.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
  PostgresTestTransactionPool,
} from "../platform/support/postgres.ts";
import { AllowingAuthorization } from "./authorization_support.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name:
    "PostgreSQL Agent Runtime persists lineage, audit/outbox, and terminal attempts",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await applyMigrations(pool);
    const store = new PostgresAgentRuntimeStore(
      new PostgresTestTransactionPool(pool),
      new PostgresRuntimeAuditOutboxSink(),
    );
    const clock = new FixedClock();
    const service = new AgentRuntimeService(
      store,
      clock,
      new AllowingAuthorization(),
    );
    const context = fixtureContext();
    const actor = fixtureActor();
    const suffix = uniqueSuffix();
    const missionId = `mission_runtime_${suffix}`;
    const planId = `plan_runtime_${suffix}`;
    const runId = `run_runtime_${suffix}`;

    await service.createMission(context, actor, {
      missionId: missionId as never,
      objective: "Persist a bounded proposal",
      idempotencyKey: `idem_mission_runtime_${suffix}`,
    });
    await service.proposePlan(context, actor, missionId as never, {
      planId: planId as never,
      version: 1,
      steps: [toolStep(1), modelStep(2)],
      sourceVersions: [],
    });
    await service.activatePlan(context, actor, planId as never);
    const run = await service.queueRun(context, actor, planId as never, {
      runId: runId as never,
      correlationId: `cor_runtime_${suffix}` as never,
      idempotencyKey: `idem_run_runtime_${suffix}`,
      sourceVersions: [],
    });
    const tool = new PersistedProposalTool();
    const runner = new AgentRuntimeRunner(
      store,
      clock,
      new CurrentSources(),
      new ToolGateway([tool], new AllowingAuthorization()),
      new PersistedModelExecutor(),
    );

    assertEquals(await runner.executeOne("worker_runtime", 60_000), {
      status: "succeeded",
      runId,
    });
    const stored = await new AgentRuntimeReadService(
      store,
      new AllowingAuthorization(),
    ).getRun(context, actor, run.runId);
    const evidence = await store.transaction(async (transaction) => ({
      attempts: await transaction.listAttempts(run.scope, run.runId),
      results: await transaction.listResults(run.scope, run.runId),
      activities: await transaction.listToolActivities(run.scope, run.runId),
    }));
    assertEquals(
      stored.kind === "loaded" ? stored.value.state : undefined,
      "succeeded",
    );
    assertEquals(evidence.results.map(({ kind }) => kind), [
      "proposal",
      "calculation",
    ]);
    assertEquals(evidence.activities.map(({ state }) => state), ["succeeded"]);
    assertEquals(
      evidence.attempts.filter(({ scope, outcome }) =>
        scope === "run" && outcome === "succeeded"
      ).length,
      1,
    );
    assertEquals(tool.invocations, 1);

    const firstStep = await store.transaction((transaction) =>
      transaction.listSteps(run.scope, run.runId)
    ).then((steps) => steps[0]);
    assert(firstStep !== undefined);
    const otherContext = {
      ...context,
      workspaceId: "workspace_other" as never,
      dealId: "deal_other" as never,
      correlationId: `cor_other_${suffix}` as never,
    };
    const reads = new AgentRuntimeReadService(
      store,
      new AllowingAuthorization(),
    );
    const protectedReads = await Promise.all([
      reads.getMission(otherContext, actor, missionId as never),
      reads.getPlan(otherContext, actor, planId as never),
      reads.getRun(otherContext, actor, run.runId),
      reads.getStep(otherContext, actor, firstStep.stepId),
      reads.getToolActivity(
        otherContext,
        actor,
        evidence.activities[0]?.activityId ?? "activity_missing",
      ),
      reads.getResult(
        otherContext,
        actor,
        evidence.results[0]?.resultId ?? "result_missing",
      ),
      reads.getArtifact(otherContext, actor, "artifact_missing"),
      reads.getAttempt(
        otherContext,
        actor,
        evidence.attempts[0]?.attemptId ?? "attempt_missing",
      ),
      reads.listSteps(otherContext, actor, run.runId),
      reads.listToolActivities(otherContext, actor, run.runId),
      reads.listResults(otherContext, actor, run.runId),
      reads.listArtifacts(otherContext, actor, run.runId),
      reads.listAttempts(otherContext, actor, run.runId),
    ]);
    assert(protectedReads.every(({ kind }) => kind === "protected_not_found"));

    const eventCount = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM agent_runtime.runtime_events
       WHERE aggregate_id = $1`,
      [runId],
    );
    const auditCount = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM audit_activity.audit_events
       WHERE aggregate_id = $1`,
      [runId],
    );
    const outboxCount = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM platform.outbox
       WHERE aggregate_id = $1`,
      [runId],
    );
    assertEquals(eventCount.rows[0].count, "4");
    assertEquals(auditCount.rows[0].count, "4");
    assertEquals(outboxCount.rows[0].count, "4");
    await pool.end();
  },
});

Deno.test({
  name:
    "PostgreSQL Agent Runtime fences stale workers and retains lease expiry",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await applyMigrations(pool);
    const store = new PostgresAgentRuntimeStore(
      new PostgresTestTransactionPool(pool),
    );
    const clock = new FixedClock();
    const run = await queueRuntimeRun(store, clock, uniqueSuffix());
    const oldClaim = await store.transaction((transaction) =>
      transaction.claimRun({
        workerId: "worker_old",
        now: clock.now(),
        leaseUntil: new Date(clock.now().getTime() + 1_000),
      })
    );
    assert(oldClaim !== undefined);
    const claimedOld = oldClaim;
    clock.advance(2_000);
    const newClaim = await store.transaction((transaction) =>
      transaction.claimRun({
        workerId: "worker_new",
        now: clock.now(),
        leaseUntil: new Date(clock.now().getTime() + 60_000),
      })
    );
    assert(newClaim !== undefined);
    await assertRejects(
      () =>
        store.transaction((transaction) =>
          transaction.assertRunLease(claimedOld, clock.now())
        ),
      RuntimeLeaseLostError,
    );
    const steps = await store.transaction((transaction) =>
      transaction.listSteps(run.scope, run.runId)
    );
    const firstStep = steps[0];
    assert(firstStep !== undefined);
    await assertRejects(
      () =>
        store.transaction((transaction) =>
          transaction.updateStep(
            claimedOld,
            { ...firstStep, state: "running", updatedAt: clock.now() },
            clock.now(),
          )
        ),
      RuntimeLeaseLostError,
    );
    assertEquals(
      await store.transaction((transaction) =>
        transaction.listResults(run.scope, run.runId)
      ),
      [],
    );
    const attempts = await store.transaction((transaction) =>
      transaction.listAttempts(run.scope, run.runId)
    );
    assertEquals(
      attempts.filter(({ outcome }) => outcome === "lease_expired").length,
      1,
    );
    const immutableAttempt = attempts[0];
    assert(immutableAttempt !== undefined);
    await assertRejects(
      () =>
        pool.query(
          "UPDATE agent_runtime.attempts SET failure = 'MUTATED' WHERE attempt_id = $1",
          [immutableAttempt.attemptId],
        ),
      Error,
      "immutable",
    );
    await pool.end();
  },
});

async function applyMigrations(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
): Promise<void> {
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...auditActivityMigrations,
    ...agentRuntimeMigrations,
  ]);
}

async function queueRuntimeRun(
  store: PostgresAgentRuntimeStore,
  clock: FixedClock,
  suffix: string,
) {
  const service = new AgentRuntimeService(
    store,
    clock,
    new AllowingAuthorization(),
  );
  const context = fixtureContext();
  const actor = fixtureActor();
  const missionId = `mission_recovery_${suffix}`;
  const planId = `plan_recovery_${suffix}`;
  await service.createMission(context, actor, {
    missionId: missionId as never,
    objective: "Recover a run",
    idempotencyKey: `idem_recovery_mission_${suffix}`,
  });
  await service.proposePlan(context, actor, missionId as never, {
    planId: planId as never,
    version: 1,
    sourceVersions: [],
    steps: [modelStep(1)],
  });
  await service.activatePlan(context, actor, planId as never);
  return service.queueRun(context, actor, planId as never, {
    runId: `run_recovery_${suffix}` as never,
    correlationId: `cor_recovery_${suffix}` as never,
    idempotencyKey: `idem_recovery_run_${suffix}`,
    sourceVersions: [],
  });
}

function toolStep(ordinal: number): PlanStepDefinition {
  return {
    ordinal,
    name: "propose",
    kind: "tool",
    toolName: "proposal_tool",
    action: "draft",
    resourceKind: "proposal",
    resourceId: "proposal_alpha",
    input: { bounded: true },
    sourceVersions: [],
  };
}

function modelStep(ordinal: number): PlanStepDefinition {
  return {
    ordinal,
    name: "calculate",
    kind: "model",
    input: { bounded: true },
    sourceVersions: [],
  };
}

function fixtureContext(): RequestContext {
  return {
    actorId: "actor_runtime" as never,
    tenantId: "tenant_runtime" as never,
    workspaceId: "workspace_runtime" as never,
    correlationId: "cor_runtime" as never,
    origin: "job",
  };
}

function fixtureActor(): RuntimeActor {
  return { actorId: "actor_runtime" as never, kind: "human", state: "active" };
}

function uniqueSuffix(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

class FixedClock {
  private current = new Date("2026-08-07T12:00:00.000Z");

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

class CurrentSources {
  isCurrent(_reference: SourceVersionReference): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class PersistedProposalTool implements ToolDefinition {
  readonly name = "proposal_tool";
  readonly capability = "proposal" as const;
  invocations = 0;

  execute(): ReturnType<ToolDefinition["execute"]> {
    this.invocations++;
    return Promise.resolve({ kind: "proposal", value: { persisted: true } });
  }
}

class PersistedModelExecutor implements RuntimeStepExecutor {
  execute(
    _step: StepRecord,
    _context: StepExecutionContext,
  ): Promise<StepExecutionOutput> {
    return Promise.resolve({
      kind: "calculation",
      value: { persisted: true },
      lineage: {
        prompt: {
          templateReference: "runtime_prompt",
          templateVersion: "1",
          promptDigest: "runtime_prompt_digest",
        },
        model: { provider: "fake", model: "runtime_model", modelVersion: "1" },
        toolActivityIds: [],
        evidence: [],
      },
      cost: {
        currency: "USD",
        inputTokens: 1,
        outputTokens: 1,
        inputCost: 1,
        outputCost: 1,
        totalCost: 2,
      },
    });
  }
}
