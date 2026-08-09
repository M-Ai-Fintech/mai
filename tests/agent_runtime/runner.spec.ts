import { assertEquals, assertRejects } from "@std/assert";
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
  type ToolDefinition,
  ToolGateway,
} from "../../src/agent_runtime/tool_gateway.ts";
import type {
  PlanStepDefinition,
  RuntimeActor,
  SourceVersionReference,
  StepRecord,
} from "../../src/agent_runtime/model.ts";
import { RuntimeLeaseLostError } from "../../src/agent_runtime/model.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import {
  AllowingAuthorization,
  DenyingAuthorization,
  LeaseExpiringAuthorization,
  SequencedAuthorization,
} from "./authorization_support.ts";

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
    new ToolGateway([tool], new AllowingAuthorization()),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "succeeded",
    runId: run.runId,
  });
  const results = await store.transaction((transaction) =>
    transaction.listResults(run.scope, run.runId)
  );
  const attempts = await store.transaction((transaction) =>
    transaction.listAttempts(run.scope, run.runId)
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

Deno.test("runner persists tool-discovered evidence in result lineage", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const source: SourceVersionReference = {
    sourceType: "document_version",
    sourceId: "document_version_alpha",
    version: 3 as never,
    checksum: "a".repeat(64),
  };
  const run = await queueRun(store, clock, [toolStep(1)], "run_discovered");
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway(
      [new DiscoveringEvidenceTool(source)],
      new AllowingAuthorization(),
    ),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "succeeded",
    runId: run.runId,
  });
  const results = await store.transaction((transaction) =>
    transaction.listResults(run.scope, run.runId)
  );
  assertEquals(results[0]?.lineage.evidence, [source]);
});

Deno.test("runner rejects conflicting declared and discovered evidence receipts", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const declared: SourceVersionReference = {
    sourceType: "document_version",
    sourceId: "document_version_alpha",
    version: 3 as never,
    checksum: "a".repeat(64),
  };
  const conflicting = { ...declared, checksum: "b".repeat(64) };
  const run = await queueRun(
    store,
    clock,
    [toolStep(1, [declared])],
    "run_conflicting_evidence",
  );
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway(
      [new DiscoveringEvidenceTool(conflicting)],
      new AllowingAuthorization(),
    ),
    new RecordingModelExecutor(),
    1,
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "dead_lettered",
    runId: run.runId,
  });
  assertEquals(
    await store.transaction((transaction) =>
      transaction.listResults(run.scope, run.runId)
    ),
    [],
  );
  assertEquals(
    (await store.transaction((transaction) =>
      transaction.listToolActivities(run.scope, run.runId)
    )).map(({ state }) => state),
    ["failed"],
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
    new ToolGateway([tool], new DenyingAuthorization()),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "failed",
    runId: run.runId,
  });
  const stored = await store.transaction((transaction) =>
    transaction.findRun(run.scope, run.runId)
  );
  const activities = await store.transaction((transaction) =>
    transaction.listToolActivities(run.scope, run.runId)
  );
  const steps = await store.transaction((transaction) =>
    transaction.listSteps(run.scope, run.runId)
  );

  assertEquals(stored?.state, "failed");
  assertEquals(
    activities.map(({ state, denialReason }) => ({ state, denialReason })),
    [{ state: "denied", denialReason: "GRANT_REVOKED" }],
  );
  assertEquals(steps[0].state, "failed");
  assertEquals(tool.invocations, 0);
});

Deno.test("blocked governed tool output fails before the proposal step", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const tool = new SemanticStatusTool();
  const executor = new RecordingModelExecutor();
  const run = await queueRun(
    store,
    clock,
    [toolStep(1), modelStep(2)],
    "run_blocked_output",
  );
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([tool], new AllowingAuthorization()),
    executor,
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "failed",
    runId: run.runId,
  });
  assertEquals(executor.invocations, 0);
  assertEquals(
    (await store.transaction((transaction) =>
      transaction.findRun(run.scope, run.runId)
    ))?.state,
    "failed",
  );
  assertEquals(
    (await store.transaction((transaction) =>
      transaction.listToolActivities(run.scope, run.runId)
    )).map(({ state, denialReason }) => ({ state, denialReason })),
    [{
      state: "failed",
      denialReason: "TOOL_OUTPUT_UNAVAILABLE:SOURCE_VERSION_CHECK_UNAVAILABLE",
    }],
  );
  assertEquals(
    await store.transaction((transaction) =>
      transaction.listResults(run.scope, run.runId)
    ),
    [],
  );
});

Deno.test("lease loss during tool authorization blocks the tool effect", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const tool = new RecordingProposalTool();
  await queueRun(store, clock, [toolStep(1)], "run_lease_race");
  const authorizer = new LeaseExpiringAuthorization(() =>
    clock.advance(60_001)
  );
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([tool], authorizer),
    new RecordingModelExecutor(),
  );

  await assertRejects(
    () => runner.executeOne("worker_a", 60_000),
    RuntimeLeaseLostError,
  );
  assertEquals(tool.invocations, 0);
});

Deno.test("lease loss during executor authorization blocks the executor effect", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const executor = new RecordingModelExecutor();
  await queueRun(store, clock, [modelStep(1)], "run_executor_lease_race");
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway(
      [],
      new LeaseExpiringAuthorization(() => clock.advance(60_001)),
    ),
    executor,
  );

  await assertRejects(
    () => runner.executeOne("worker_a", 60_000),
    RuntimeLeaseLostError,
  );
  assertEquals(executor.invocations, 0);
});

Deno.test("lease loss during executor execution fences durable success", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const executor = new LeaseExpiringModelExecutor(() => clock.advance(60_001));
  const run = await queueRun(
    store,
    clock,
    [modelStep(1)],
    "run_executor_effect_race",
  );
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([], new AllowingAuthorization()),
    executor,
  );

  await assertRejects(
    () => runner.executeOne("worker_a", 60_000),
    RuntimeLeaseLostError,
  );
  assertEquals(executor.invocations, 1);
  assertEquals(
    await store.transaction((transaction) =>
      transaction.listResults(run.scope, run.runId)
    ),
    [],
  );
  assertEquals(
    (await store.transaction((transaction) =>
      transaction.listSteps(run.scope, run.runId)
    ))[0]?.state,
    "running",
  );
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
    new ToolGateway([tool], new AllowingAuthorization()),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "invalidated",
    runId: run.runId,
  });
  assertEquals(tool.invocations, 0);
  assertEquals(
    (await store.transaction((transaction) =>
      transaction.findRun(run.scope, run.runId)
    ))
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
    new ToolGateway([tool], new AllowingAuthorization()),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_new", 60_000), {
    status: "succeeded",
    runId: run.runId,
  });
  const attempts = await store.transaction((transaction) =>
    transaction.listAttempts(run.scope, run.runId)
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
    new ToolGateway([], new SequencedAuthorization(["allow", "deny"])),
    executor,
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "failed",
    runId: run.runId,
  });
  assertEquals(executor.invocations, 1);
  assertEquals(
    (await store.transaction((transaction) =>
      transaction.listSteps(run.scope, run.runId)
    ))
      .map(({ state }) => state),
    ["succeeded", "failed"],
  );
});

Deno.test("cancellation is durable and observed before the first effect", async () => {
  const store = new InMemoryAgentRuntimeStore();
  const clock = new MutableClock();
  const tool = new RecordingProposalTool();
  const run = await queueRun(store, clock, [toolStep(1)], "run_cancelled");
  const service = new AgentRuntimeService(
    store,
    clock,
    new AllowingAuthorization(),
  );
  await service.requestCancellation(
    fixtureContext(),
    fixtureActor(),
    run.runId,
  );
  const runner = new AgentRuntimeRunner(
    store,
    clock,
    new CurrentSources(),
    new ToolGateway([tool], new AllowingAuthorization()),
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
    new ToolGateway([], new AllowingAuthorization()),
    new RecordingModelExecutor(),
  );

  assertEquals(await runner.executeOne("worker_a", 60_000), {
    status: "failed",
    runId: run.runId,
  });
  assertEquals(
    await store.transaction((transaction) =>
      transaction.listResults(run.scope, run.runId)
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
    new ToolGateway([], new AllowingAuthorization()),
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
    transaction.listAttempts(run.scope, run.runId)
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
  const service = new AgentRuntimeService(
    store,
    clock,
    new AllowingAuthorization(),
  );
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
    dealId: "deal_alpha" as never,
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

class DiscoveringEvidenceTool implements ToolDefinition {
  readonly name = "proposal_tool";
  readonly capability = "proposal" as const;

  constructor(private readonly source: SourceVersionReference) {}

  execute() {
    return Promise.resolve({
      kind: "proposal" as const,
      value: {
        status: "ok",
        reference: {
          documentVersionId: this.source.sourceId,
          version: this.source.version,
          checksum: { algorithm: "sha256", value: this.source.checksum },
        },
      },
      discoveredSourceVersions: [this.source],
    });
  }
}

class SemanticStatusTool implements ToolDefinition {
  readonly name = "proposal_tool";
  readonly capability = "proposal" as const;

  execute() {
    return Promise.resolve({
      kind: "proposal" as const,
      value: {
        status: "unavailable",
        reasonCode: "SOURCE_VERSION_CHECK_UNAVAILABLE",
      },
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

class LeaseExpiringModelExecutor extends RecordingModelExecutor {
  constructor(private readonly advance: () => void) {
    super();
  }

  override execute(
    step: StepRecord,
    context: StepExecutionContext,
  ): Promise<StepExecutionOutput> {
    this.advance();
    return super.execute(step, context);
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
