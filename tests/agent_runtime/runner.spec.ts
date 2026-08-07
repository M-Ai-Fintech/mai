import { assertEquals } from "@std/assert";
import { InMemoryAgentRuntimeStore } from "../../src/agent_runtime/repository.ts";
import {
  AgentRuntimeRunner,
  type RuntimeStepExecutor,
  type SourceVersionChecker,
  type StepExecutionContext,
  type StepExecutionOutput,
} from "../../src/agent_runtime/runner.ts";
import { AgentRuntimeService } from "../../src/agent_runtime/service.ts";
import {
  type RuntimeAuthorizer,
  type ToolDefinition,
  ToolGateway,
} from "../../src/agent_runtime/tool_gateway.ts";
import type {
  PlanStepDefinition,
  RuntimeActor,
  SourceVersionReference,
  StepRecord,
} from "../../src/agent_runtime/model.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";

Deno.test("runner records tool/model lineage, cost, and retained attempts", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const tool = new RecordingProposalTool();
  const run = await queueRun(
    store,
    clock,
    [toolStep(1), modelStep(2)],
    "run_success",
  );
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([tool], new AllowingAuthorizer()),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "succeeded",
    runId: run.runId,
  });
  const results = await store.transaction((transaction) =>
    transaction.listResults(run.runId)
  );
  const attempts = await store.transaction((transaction) =>
    transaction.listAttempts(run.runId)
  );

  assertEquals(tool.invocations, 1);
  assertEquals(results.map(({ kind }) => kind), ["proposal", "calculation"]);
  assertEquals(results[1].lineage.prompt?.promptDigest, "prompt_digest");
  assertEquals(results[1].cost.totalCost, 3);
  assertEquals(
    attempts.filter(({ scope, recordKind }) =>
      scope === "run" && recordKind === "completed"
    ).map(({ outcome }) => outcome),
    ["succeeded"],
  );
});

Deno.test("denied tool fails the run without invoking the tool", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const tool = new RecordingProposalTool();
  const run = await queueRun(store, clock, [toolStep(1)], "run_denied");
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([tool], new DenyingAuthorizer()),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "failed",
    runId: run.runId,
  });
  const stored = await store.transaction((transaction) =>
    transaction.findRun(run.runId)
  );
  const activities = await store.transaction((transaction) =>
    transaction.listToolActivities(run.runId)
  );
  const steps = await store.transaction((transaction) =>
    transaction.listSteps(run.runId)
  );

  assertEquals(stored?.state, "failed");
  assertEquals(
    activities.map(({ state, denialReason }) => ({ state, denialReason })),
    [{ state: "denied", denialReason: "GRANT_REVOKED" }],
  );
  assertEquals(steps[0].state, "failed");
  assertEquals(tool.invocations, 0);
});

Deno.test("stale source versions invalidate before any tool effect", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const tool = new RecordingProposalTool();
  const source: SourceVersionReference = {
    sourceType: "document",
    sourceId: "document_alpha",
    version: 2 as never,
  };
  const run = await queueRun(
    store,
    clock,
    [toolStep(1, [source])],
    "run_stale",
    [source],
  );
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new StaleSources(),
    new ToolGateway([tool], new AllowingAuthorizer()),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "invalidated",
    runId: run.runId,
  });
  assertEquals(tool.invocations, 0);
  assertEquals(
    (await store.transaction((transaction) => transaction.findRun(run.runId)))
      ?.state,
    "invalidated",
  );
});

Deno.test("expired worker lease is recovered with a retained lease-expired attempt", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const tool = new RecordingProposalTool();
  const run = await queueRun(store, clock, [toolStep(1)], "run_recovery");
  await store.transaction((transaction) =>
    transaction.claimRun({
      workerId: "worker_old",
      now: clock.now(),
      leaseUntil: new Date(clock.now().getTime() + 1_000),
    })
  );
  clock.advance(2_000);
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([tool], new AllowingAuthorizer()),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_new", 60_000), {
    status: "succeeded",
    runId: run.runId,
  });
  const attempts = await store.transaction((transaction) =>
    transaction.listAttempts(run.runId)
  );
  assertEquals(
    attempts.filter(({ outcome }) => outcome === "lease_expired").length,
    1,
  );
  assertEquals(
    attempts.filter(({ scope, recordKind, workerId }) =>
      scope === "run" && recordKind === "started" && workerId === "worker_new"
    ).length,
    1,
  );
});

Deno.test("runner reauthorizes each model effect and stops after permission loss", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const run = await queueRun(
    store,
    clock,
    [modelStep(1), modelStep(2)],
    "run_permission_loss",
  );
  const executor = new RecordingModelExecutor();
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([], new SequencedAuthorizer(["allow", "deny"])),
    executor,
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "failed",
    runId: run.runId,
  });
  assertEquals(executor.invocations, 1);
  assertEquals(
    (await store.transaction((transaction) => transaction.listSteps(run.runId)))
      .map(({ state }) => state),
    ["succeeded", "failed"],
  );
});

Deno.test("cancellation is durable and observed before the first effect", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const tool = new RecordingProposalTool();
  const run = await queueRun(store, clock, [toolStep(1)], "run_cancelled");
  const service = new AgentRuntimeService(store, clock);
  await service.requestCancellation(fixtureContext(), run.runId);
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([tool], new AllowingAuthorizer()),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "cancelled",
    runId: run.runId,
  });
  assertEquals(tool.invocations, 0);
});

Deno.test("cost ceiling fails closed without retaining an over-ceiling result", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const run = await queueRun(
    store,
    clock,
    [modelStep(1)],
    "run_cost_ceiling",
    [],
    2,
  );
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([], new AllowingAuthorizer()),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "failed",
    runId: run.runId,
  });
  assertEquals(
    await store.transaction((transaction) =>
      transaction.listResults(run.runId)
    ),
    [],
  );
});

Deno.test("retry retains the failed attempt and replays the retryable step", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const run = await queueRun(store, clock, [modelStep(1)], "run_retry");
  const executor = new FailingOnceModelExecutor();
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([], new AllowingAuthorizer()),
    executor,
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "retry_scheduled",
    runId: run.runId,
  });
  clock.advance(60_000);
  assertEquals(await runner.executeOne("worker_b", 60_000), {
    status: "succeeded",
    runId: run.runId,
  });
  const attempts = await store.transaction((transaction) =>
    transaction.listAttempts(run.runId)
  );
  assertEquals(
    attempts.filter(({ scope, outcome }) =>
      scope === "run" && outcome === "retry_scheduled"
    ).length,
    1,
  );
  assertEquals(executor.invocations, 2);
});

async function queueRun(
  store: InMemoryAgentRuntimeStore,
  clock: MutableClock,
  steps: readonly PlanStepDefinition[],
  runId: string,
  sourceVersions: readonly SourceVersionReference[] = [],
  costLimit?: number,
) {
  const service = new AgentRuntimeService(store, clock);
  const context = fixtureContext();
  const actor = fixtureActor();
  await service.createMission(context, actor, {
    missionId: `mission_${runId}` as never,
    objective: "Execute bounded proposal",
    idempotencyKey: `mission-command-${runId}`,
  });
  await service.proposePlan(context, actor, `mission_${runId}` as never, {
    planId: `plan_${runId}` as never,
    version: 1,
    sourceVersions,
    steps,
  });
  await service.activatePlan(context, actor, `plan_${runId}` as never);
  return service.queueRun(context, actor, `plan_${runId}` as never, {
    runId: runId as never,
    correlationId: `cor_${runId}` as never,
    idempotencyKey: `run-command-${runId}`,
    sourceVersions,
    ...(costLimit === undefined ? {} : { costLimit }),
  });
}

function toolStep(
  ordinal: number,
  sourceVersions: readonly SourceVersionReference[] = [],
): PlanStepDefinition {
  return {
    ordinal,
    name: "read",
    kind: "tool",
    toolName: "proposal_tool",
    action: "read",
    resourceKind: "evidence",
    resourceId: "evidence_alpha",
    input: { query: "alpha" },
    sourceVersions,
  };
}

function modelStep(ordinal: number): PlanStepDefinition {
  return {
    ordinal,
    name: "calculate",
    kind: "model",
    input: { prompt: "draft" },
    sourceVersions: [],
  };
}

function fixtureContext(): RequestContext {
  return {
    actorId: "actor_alpha" as never,
    tenantId: "tenant_alpha" as never,
    workspaceId: "workspace_alpha" as never,
    correlationId: "cor_alpha" as never,
    origin: "job",
  };
}

function fixtureActor(): RuntimeActor {
  return { actorId: "actor_alpha" as never, kind: "human", state: "active" };
}

class MutableClock {
  private current = new Date("2026-08-07T12:00:00.000Z");

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

class StaleSources implements SourceVersionChecker {
  isCurrent(_reference: SourceVersionReference): Promise<boolean> {
    return Promise.resolve(false);
  }
}

class AllowingAuthorizer implements RuntimeAuthorizer {
  authorize(): ReturnType<RuntimeAuthorizer["authorize"]> {
    return Promise.resolve({
      outcome: "allow",
      authority: {
        snapshotReference: "authority_alpha",
        decisionReference: "decision_alpha",
        checkedAt: new Date("2026-08-07T12:00:00.000Z"),
      },
    });
  }
}

class DenyingAuthorizer implements RuntimeAuthorizer {
  authorize(): ReturnType<RuntimeAuthorizer["authorize"]> {
    return Promise.resolve({ outcome: "deny", reason: "GRANT_REVOKED" });
  }
}

class SequencedAuthorizer implements RuntimeAuthorizer {
  private position = 0;

  constructor(private readonly decisions: readonly ("allow" | "deny")[]) {}

  authorize(): ReturnType<RuntimeAuthorizer["authorize"]> {
    const decision = this.decisions[this.position++] ?? "deny";
    return decision === "allow"
      ? Promise.resolve({
        outcome: "allow",
        authority: {
          snapshotReference: "authority_alpha",
          decisionReference: "decision_alpha",
          checkedAt: new Date("2026-08-07T12:00:00.000Z"),
        },
      })
      : Promise.resolve({ outcome: "deny", reason: "GRANT_REVOKED" });
  }
}

class RecordingProposalTool implements ToolDefinition {
  readonly name = "proposal_tool";
  readonly capability = "proposal" as const;
  invocations = 0;

  execute() {
    this.invocations++;
    return Promise.resolve({
      kind: "proposal" as const,
      value: { proposed: true },
    });
  }
}

class RecordingModelExecutor implements RuntimeStepExecutor {
  invocations = 0;

  execute(
    _step: StepRecord,
    _context: StepExecutionContext,
  ): Promise<StepExecutionOutput> {
    this.invocations++;
    return Promise.resolve({
      kind: "calculation",
      value: { result: 42 },
      lineage: {
        prompt: {
          templateReference: "prompt_template",
          templateVersion: "1",
          promptDigest: "prompt_digest",
        },
        model: { provider: "fake", model: "model_alpha", modelVersion: "1" },
        toolActivityIds: [],
        evidence: [],
      },
      cost: {
        currency: "USD",
        inputTokens: 10,
        outputTokens: 5,
        inputCost: 1,
        outputCost: 2,
        totalCost: 3,
      },
    });
  }
}

class FailingOnceModelExecutor extends RecordingModelExecutor {
  override execute(
    step: StepRecord,
    context: StepExecutionContext,
  ): Promise<StepExecutionOutput> {
    if (this.invocations === 0) {
      this.invocations++;
      return Promise.reject(new Error("TRANSIENT_MODEL_FAILURE"));
    }
    return super.execute(step, context);
  }
}
