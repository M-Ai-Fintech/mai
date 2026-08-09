import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  agentRuntimeMigrations,
  AgentRuntimeRunner,
  AgentRuntimeService,
  PostgresAgentRuntimeStore,
  RuntimeLeaseLostError,
  type StepExecutionContext,
  type StepExecutionOutput,
} from "../../src/agent_runtime/v1.ts";
import type {
  ClaimedRun,
  PlanStepDefinition,
  ResultRecord,
  RunRecord,
  RuntimeActor,
  RuntimeAttemptRecord,
  RuntimeScope,
  SourceVersionReference,
  StepRecord,
} from "../../src/agent_runtime/model.ts";
import type { QueueRunInput } from "../../src/agent_runtime/service.ts";
import {
  type RuntimeStepExecutor,
  type SourceVersionChecker,
} from "../../src/agent_runtime/runner.ts";
import { ToolGateway } from "../../src/agent_runtime/tool_gateway.ts";
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

interface AttemptSummary {
  readonly attemptNumber: number;
  readonly recordKind: RuntimeAttemptRecord["recordKind"];
  readonly workerId: string;
  readonly outcome?: string;
  readonly failure?: string;
}
Deno.test({
  name:
    "PostgreSQL claimRunById fences contention, exact replay, and stale completion",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    try {
      await applyMigrations(pool);
      const store = new PostgresAgentRuntimeStore(
        new PostgresTestTransactionPool(pool),
      );
      const clock = new FixedClock();
      const context = fixtureContext();
      const actor = fixtureActor();
      const service = new AgentRuntimeService(
        store,
        clock,
        new AllowingAuthorization(),
      );
      const planId = `plan_claim_by_id_${uniqueSuffix()}`;
      await createActivePlan(service, context, actor, planId);

      const olderInput = queueInput(`run_older_queued_${uniqueSuffix()}`);
      await service.queueRun(context, actor, planId as never, olderInput);
      clock.advance(1_000);
      const exactInput = queueInput(`run_exact_replay_${uniqueSuffix()}`);
      const exactRun = await service.queueRun(
        context,
        actor,
        planId as never,
        exactInput,
      );
      const queuedReplay = await service.queueRun(
        context,
        actor,
        planId as never,
        exactInput,
      );
      assertEquals(queuedReplay.runId, exactRun.runId);
      assertEquals(queuedReplay.state, "queued");

      const exactExecutor = new CountingModelExecutor("exact");
      const exactRunner = createRunner(store, clock, exactExecutor);
      assertEquals(
        await exactRunner.executeRun(
          "worker_exact",
          60_000,
          exactRun.runId,
        ),
        { status: "succeeded", runId: exactRun.runId },
      );
      assertEquals(exactExecutor.invocations, 1);
      await assertOlderRunUntouched(store, olderInput.runId);

      const exactCompletedRun = await findRun(store, exactRun.runId);
      assert(exactCompletedRun !== undefined);
      assertEquals(
        {
          state: exactCompletedRun.state,
          attemptCount: exactCompletedRun.attemptCount,
          leaseOwner: exactCompletedRun.leaseOwner,
          leaseExpiresAt: exactCompletedRun.leaseExpiresAt,
        },
        {
          state: "succeeded",
          attemptCount: 1,
          leaseOwner: undefined,
          leaseExpiresAt: undefined,
        },
      );
      const originalAttempts = await listRunAttempts(store, exactRun.runId);
      assertEquals(originalAttempts.map(attemptSummary), [
        {
          attemptNumber: 1,
          recordKind: "started",
          workerId: "worker_exact",
          outcome: undefined,
          failure: undefined,
        },
        {
          attemptNumber: 1,
          recordKind: "completed",
          workerId: "worker_exact",
          outcome: "succeeded",
          failure: undefined,
        },
      ]);
      const originalResults = await listResults(store, exactRun.runId);
      assertEquals(originalResults.length, 1);
      assertEquals(originalResults[0]?.value, { worker: "exact" });
      assertEquals(
        await exactRunner.executeRun(
          "worker_terminal_replay",
          60_000,
          exactRun.runId,
        ),
        { status: "busy", runId: exactRun.runId },
      );
      const terminalReplay = await service.queueRun(
        context,
        actor,
        planId as never,
        exactInput,
      );
      const replayedResults = await listResults(store, exactRun.runId);
      assertEquals(terminalReplay.runId, exactRun.runId);
      assertEquals(terminalReplay.state, "succeeded");
      assertEquals(
        replayedResults.map(({ resultId, value }) => ({ resultId, value })),
        originalResults.map(({ resultId, value }) => ({ resultId, value })),
      );
      assertEquals(
        (await listRunAttempts(store, exactRun.runId)).map(attemptSummary),
        originalAttempts.map(attemptSummary),
      );
      assertEquals(exactExecutor.invocations, 1);

      const contendedInput = queueInput(`run_contended_${uniqueSuffix()}`);
      const contendedRun = await service.queueRun(
        context,
        actor,
        planId as never,
        contendedInput,
      );
      const claimNow = clock.now();
      const raceClaims = await Promise.all([
        claimById(store, contendedRun.runId, "worker_race_a", claimNow),
        claimById(store, contendedRun.runId, "worker_race_b", claimNow),
      ]);
      const winners = raceClaims.filter(
        (claim): claim is ClaimedRun => claim !== undefined,
      );
      assertEquals(winners.length, 1);
      assertEquals(raceClaims.filter((claim) => claim === undefined).length, 1);
      const winner = winners[0];
      assert(winner !== undefined);
      const losingWorker = winner.workerId === "worker_race_a"
        ? "worker_race_b"
        : "worker_race_a";
      assertEquals(
        (await listRunAttempts(store, contendedRun.runId)).map((attempt) => ({
          attemptNumber: attempt.attemptNumber,
          recordKind: attempt.recordKind,
          workerId: attempt.workerId,
          outcome: attempt.outcome,
        })),
        [{
          attemptNumber: 1,
          recordKind: "started",
          workerId: winner.workerId,
          outcome: undefined,
        }],
      );

      clock.advance(2_000);
      const recoveryExecutor = new CountingModelExecutor("recovery");
      const recoveryRunner = createRunner(store, clock, recoveryExecutor);
      assertEquals(
        await recoveryRunner.executeRun(
          "worker_recovery",
          60_000,
          contendedRun.runId,
        ),
        { status: "succeeded", runId: contendedRun.runId },
      );
      assertEquals(recoveryExecutor.invocations, 1);
      await assertRejects(
        () =>
          store.transaction((transaction) =>
            transaction.updateRun(
              winner,
              { state: "succeeded", cost: winner.cost },
              clock.now(),
            )
          ),
        RuntimeLeaseLostError,
      );

      const completedRun = await findRun(store, contendedRun.runId);
      assert(completedRun !== undefined);
      assertEquals(
        {
          state: completedRun.state,
          attemptCount: completedRun.attemptCount,
          leaseOwner: completedRun.leaseOwner,
          leaseExpiresAt: completedRun.leaseExpiresAt,
        },
        {
          state: "succeeded",
          attemptCount: 2,
          leaseOwner: undefined,
          leaseExpiresAt: undefined,
        },
      );
      assertEquals(
        (await listRunAttempts(store, contendedRun.runId)).map(attemptSummary),
        [
          {
            attemptNumber: 1,
            recordKind: "started",
            workerId: winner.workerId,
            outcome: undefined,
            failure: undefined,
          },
          {
            attemptNumber: 1,
            recordKind: "completed",
            workerId: winner.workerId,
            outcome: "lease_expired",
            failure: "LEASE_EXPIRED",
          },
          {
            attemptNumber: 2,
            recordKind: "started",
            workerId: "worker_recovery",
            outcome: undefined,
            failure: undefined,
          },
          {
            attemptNumber: 2,
            recordKind: "completed",
            workerId: "worker_recovery",
            outcome: "succeeded",
            failure: undefined,
          },
        ],
      );
      assertEquals(
        (await listRunAttempts(store, contendedRun.runId)).filter((attempt) =>
          attempt.workerId === losingWorker
        ),
        [],
      );
    } finally {
      await pool.end();
    }
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
async function createActivePlan(
  service: AgentRuntimeService,
  context: RequestContext,
  actor: RuntimeActor,
  planId: string,
): Promise<void> {
  const suffix = uniqueSuffix();
  const missionId = `mission_claim_by_id_${suffix}`;
  await service.createMission(context, actor, {
    missionId: missionId as never,
    objective: "Exercise exact durable run claiming",
    idempotencyKey: `idem_mission_claim_by_id_${suffix}`,
  });
  await service.proposePlan(context, actor, missionId as never, {
    planId: planId as never,
    version: 1,
    steps: [modelStep(1)],
    sourceVersions: [],
  });
  await service.activatePlan(context, actor, planId as never);
}
function queueInput(runId: string): QueueRunInput {
  const suffix = uniqueSuffix();
  return {
    runId: runId as never,
    correlationId: `correlation_claim_by_id_${suffix}` as never,
    idempotencyKey: `idem_run_claim_by_id_${suffix}`,
    sourceVersions: [],
  };
}
async function claimById(
  store: PostgresAgentRuntimeStore,
  runId: string,
  workerId: string,
  now: Date,
): Promise<ClaimedRun | undefined> {
  return await store.transaction((transaction) =>
    transaction.claimRunById(runId as never, {
      workerId,
      now,
      leaseUntil: new Date(now.getTime() + 1_000),
    })
  );
}
function createRunner(
  store: PostgresAgentRuntimeStore,
  clock: FixedClock,
  executor: RuntimeStepExecutor,
): AgentRuntimeRunner {
  return new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([], new AllowingAuthorization()),
    executor,
  );
}
async function assertOlderRunUntouched(
  store: PostgresAgentRuntimeStore,
  runId: string,
): Promise<void> {
  const run = await findRun(store, runId);
  assert(run !== undefined);
  assertEquals(
    {
      state: run.state,
      attemptCount: run.attemptCount,
      leaseOwner: run.leaseOwner,
      leaseExpiresAt: run.leaseExpiresAt,
    },
    {
      state: "queued",
      attemptCount: 0,
      leaseOwner: undefined,
      leaseExpiresAt: undefined,
    },
  );
  assertEquals(await listRunAttempts(store, runId), []);
}
function findRun(
  store: PostgresAgentRuntimeStore,
  runId: string,
): Promise<RunRecord | undefined> {
  return store.transaction((transaction) =>
    transaction.findRun(fixtureScope(), runId as never)
  );
}
async function listResults(
  store: PostgresAgentRuntimeStore,
  runId: string,
): Promise<ResultRecord[]> {
  return await store.transaction((transaction) =>
    transaction.listResults(fixtureScope(), runId as never)
  );
}
async function listRunAttempts(
  store: PostgresAgentRuntimeStore,
  runId: string,
): Promise<RuntimeAttemptRecord[]> {
  return await store.transaction((transaction) =>
    transaction.listAttempts(fixtureScope(), runId as never)
  ).then((attempts) => attempts.filter(({ scope }) => scope === "run"));
}
function attemptSummary(attempt: RuntimeAttemptRecord): AttemptSummary {
  return {
    attemptNumber: attempt.attemptNumber,
    recordKind: attempt.recordKind,
    workerId: attempt.workerId,
    outcome: attempt.outcome,
    failure: attempt.failure,
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
    actorId: "actor_claim_by_id" as never,
    tenantId: "tenant_claim_by_id" as never,
    workspaceId: "workspace_claim_by_id" as never,
    dealId: "deal_claim_by_id" as never,
    correlationId: "correlation_claim_by_id" as never,
    origin: "job",
  };
}
function fixtureScope(): RuntimeScope {
  return {
    tenantId: "tenant_claim_by_id" as never,
    workspaceId: "workspace_claim_by_id" as never,
    dealId: "deal_claim_by_id" as never,
  };
}
function fixtureActor(): RuntimeActor {
  return {
    actorId: "actor_claim_by_id" as never,
    kind: "human",
    state: "active",
  };
}
function uniqueSuffix(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}
class FixedClock {
  private current = new Date("2026-08-09T12:00:00.000Z");

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}
class CurrentSources implements SourceVersionChecker {
  isCurrent(_reference: SourceVersionReference): Promise<boolean> {
    return Promise.resolve(true);
  }
}
class CountingModelExecutor implements RuntimeStepExecutor {
  invocations = 0;

  constructor(private readonly worker: string) {}

  execute(
    _step: StepRecord,
    _context: StepExecutionContext,
  ): Promise<StepExecutionOutput> {
    this.invocations++;
    return Promise.resolve({
      kind: "calculation",
      value: { worker: this.worker },
      lineage: { toolActivityIds: [], evidence: [] },
      cost: {
        currency: "USD",
        inputTokens: 0,
        outputTokens: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
      },
    });
  }
}
