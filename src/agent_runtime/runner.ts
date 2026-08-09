import type { Clock } from "../platform/persistence/idempotency.ts";
import type {
  ArtifactRecord,
  ClaimedRun,
  CostMetadata,
  ResultRecord,
  RuntimeAuthority,
  RuntimeLineage,
  SourceVersionReference,
  StepRecord,
  ToolActivityRecord,
} from "./model.ts";
import { runtimeAuthority } from "./authorization.ts";
import {
  assertCostMetadata,
  SourceVersionInvalidatedError,
  sourceVersionKey,
} from "./model.ts";
import type { ResultId, ToolActivityId } from "./ids.ts";
import type { AgentRuntimeStore, RuntimeTransaction } from "./repository.ts";
import { ToolGateway } from "./tool_gateway.ts";
import {
  assertPositive,
  assertSourcesCurrent,
  assertWithinCost,
  emptyCost,
  failureCode,
  failureStepState,
  isRunnableStep,
  mergeCost,
  runAttempt,
  RuntimeCancelledError,
  RuntimeCostCeilingError,
  RuntimeEffectDeniedError,
  runtimeEvent,
  RuntimeToolDeniedError,
  stepAttempt,
  stepAuthorizationRequest,
  toolActivity,
  toolRequest,
} from "./runner_support.ts";

export {
  RuntimeCancelledError,
  RuntimeCostCeilingError,
  RuntimeEffectDeniedError,
  RuntimeToolDeniedError,
} from "./runner_support.ts";

export interface SourceVersionChecker {
  isCurrent(reference: SourceVersionReference): Promise<boolean>;
}

export interface StepExecutionContext {
  readonly run: ClaimedRun;
  readonly step: StepRecord;
}

export interface StepExecutionOutput {
  readonly kind: "proposal" | "reversible_draft" | "calculation" | "read";
  readonly value: Readonly<Record<string, unknown>>;
  readonly lineage: RuntimeLineage;
  readonly cost: CostMetadata;
  readonly artifact?: Omit<
    ArtifactRecord,
    "runId" | "stepId" | "resultId" | "createdAt"
  >;
}

export interface RuntimeStepExecutor {
  /** Returns data only; the runner owns the fenced durable result boundary. */
  execute(
    step: StepRecord,
    context: StepExecutionContext,
  ): Promise<StepExecutionOutput>;
}

export type RuntimeRunnerOutcome =
  | { readonly status: "idle" }
  | {
    readonly status:
      | "succeeded"
      | "retry_scheduled"
      | "failed"
      | "dead_lettered"
      | "cancelled"
      | "invalidated";
    readonly runId: string;
  };

export class AgentRuntimeRunner {
  private readonly maxAttempts: number;

  constructor(
    private readonly store: AgentRuntimeStore,
    private readonly clock: Clock,
    private readonly sources: SourceVersionChecker,
    private readonly gateway: ToolGateway,
    private readonly executor: RuntimeStepExecutor,
    maxAttempts = 2,
  ) {
    this.maxAttempts = maxAttempts;
  }

  /**
   * Claims and executes one run while fencing every step boundary.
   *
   * @example await runner.executeOne("worker_alpha", 60_000)
   */
  async executeOne(
    workerId: string,
    leaseMilliseconds: number,
  ): Promise<RuntimeRunnerOutcome> {
    assertPositive(leaseMilliseconds, "lease milliseconds");
    const now = this.clock.now();
    const run = await this.store.transaction((transaction) =>
      transaction.claimRun({
        workerId,
        now,
        leaseUntil: new Date(now.getTime() + leaseMilliseconds),
      })
    );
    if (run === undefined) return { status: "idle" };
    try {
      await this.preflight(run);
      let cost = run.cost;
      const steps = await this.store.transaction((transaction) =>
        transaction.listSteps(run.scope, run.runId)
      );
      for (const step of steps.filter(isRunnableStep)) {
        const output = await this.executeStep(run, step, cost);
        cost = mergeCost(cost, output.cost);
        assertWithinCost(run, cost);
      }
      await this.completeRun(run, cost);
      return { status: "succeeded", runId: run.runId };
    } catch (error) {
      return await this.recordFailure(run, error);
    }
  }

  private async preflight(run: ClaimedRun): Promise<void> {
    await this.ensureRunnable(run);
    if (
      await this.store.transaction((transaction) =>
        transaction.cancellationRequested(run, this.clock.now())
      )
    ) throw new RuntimeCancelledError(run.runId);
    await assertSourcesCurrent(this.sources, run.sourceVersions);
  }

  private async executeStep(
    run: ClaimedRun,
    step: StepRecord,
    currentCost: CostMetadata,
  ): Promise<StepExecutionOutput> {
    const startedAt = this.clock.now();
    const started = {
      ...step,
      state: "running" as const,
      attemptCount: step.attemptCount + 1,
      updatedAt: startedAt,
    };
    await this.store.transaction(async (transaction) => {
      await this.ensureLease(transaction, run);
      await transaction.updateStep(run, started, startedAt);
      await transaction.appendAttempt(
        stepAttempt(started, run, "started", startedAt),
      );
    });
    try {
      const output = step.kind === "tool"
        ? await this.executeTool(run, started)
        : await this.executeNonTool(run, started);
      assertWithinCost(run, mergeCost(currentCost, output.cost));
      await this.persistStepSuccess(run, started, output, currentCost);
      return output;
    } catch (error) {
      await this.persistStepFailure(run, started, error);
      throw error;
    }
  }

  private async executeTool(
    run: ClaimedRun,
    step: StepRecord,
  ): Promise<StepExecutionOutput> {
    if (
      step.toolName === undefined || step.action === undefined ||
      step.resourceKind === undefined || step.resourceId === undefined
    ) {
      throw new Error(
        `Step "${step.stepId}" tool definition is incomplete; expected tool, action, resource kind, and resource ID.`,
      );
    }
    const activity = toolActivity(run, step, this.clock.now());
    await this.recordToolActivity(run, activity);
    await this.ensureRunnable(run);
    const result = await this.gateway.invoke(
      toolRequest(
        run,
        step,
        activity.activityId,
        () => this.ensureRunnable(run),
      ),
    );
    if (result.status === "denied") {
      await this.recordToolActivity(run, {
        ...activity,
        state: "denied",
        denialReason: result.reason,
        completedAt: this.clock.now(),
      });
      throw new RuntimeToolDeniedError(step.toolName, result.reason);
    }
    if (result.status === "failed") {
      await this.recordToolActivity(run, {
        ...activity,
        state: "failed",
        completedAt: this.clock.now(),
      });
      throw new Error(
        `Tool "${step.toolName}" execution failed; expected a safe tool result.`,
      );
    }
    await this.ensureBeforeDurableEffect(run);
    await this.recordToolActivity(run, {
      ...activity,
      state: "succeeded",
      authority: result.authority,
      completedAt: this.clock.now(),
    });
    return {
      kind: result.output.kind,
      value: result.output.value,
      lineage: {
        toolActivityIds: [activity.activityId],
        evidence: mergeToolEvidence(
          step.sourceVersions,
          result.output.discoveredSourceVersions ?? [],
        ),
      },
      cost: emptyCost(),
    };
  }

  private executeNonTool(
    run: ClaimedRun,
    step: StepRecord,
  ): Promise<StepExecutionOutput> {
    return this.executeAuthorizedNonTool(run, step);
  }

  private async executeAuthorizedNonTool(
    run: ClaimedRun,
    step: StepRecord,
  ): Promise<StepExecutionOutput> {
    await this.authorizeStepEffect(run, step);
    const output = await this.executor.execute(step, {
      run,
      step,
    });
    await this.ensureBeforeDurableEffect(run);
    return output;
  }

  private async persistStepSuccess(
    run: ClaimedRun,
    step: StepRecord,
    output: StepExecutionOutput,
    currentCost: CostMetadata,
  ): Promise<void> {
    assertCostMetadata(output.cost);
    const now = this.clock.now();
    const resultId = `result_${step.stepId}-${step.attemptCount}` as ResultId;
    const result: ResultRecord = {
      resultId,
      runId: run.runId,
      stepId: step.stepId,
      kind: output.kind,
      value: output.value,
      lineage: output.lineage,
      cost: output.cost,
      createdAt: now,
    };
    await this.store.transaction(async (transaction) => {
      await this.ensureLease(transaction, run);
      await transaction.recordResult(result);
      if (output.artifact !== undefined) {
        await transaction.recordArtifact({
          ...output.artifact,
          resultId,
          runId: run.runId,
          stepId: step.stepId,
          createdAt: now,
        });
      }
      await transaction.updateStep(run, {
        ...step,
        state: "succeeded",
        resultId,
        updatedAt: now,
      }, now);
      await transaction.appendAttempt(
        stepAttempt(step, run, "completed", now, "succeeded"),
      );
      await transaction.appendEvent(
        runtimeEvent(run, "step.succeeded", {
          stepId: step.stepId,
          totalCost: mergeCost(currentCost, output.cost).totalCost,
        }, now),
      );
    });
  }

  private async persistStepFailure(
    run: ClaimedRun,
    step: StepRecord,
    error: unknown,
  ): Promise<void> {
    const state = failureStepState(run, error, this.maxAttempts);
    const now = this.clock.now();
    await this.store.transaction(async (transaction) => {
      await this.ensureLease(transaction, run);
      await transaction.updateStep(
        run,
        { ...step, state, updatedAt: now },
        now,
      );
      await transaction.appendAttempt(
        stepAttempt(step, run, "completed", now, state, failureCode(error)),
      );
    });
  }

  private async completeRun(
    run: ClaimedRun,
    cost: CostMetadata,
  ): Promise<void> {
    const now = this.clock.now();
    await this.store.transaction(async (transaction) => {
      await transaction.updateRun(run, { state: "succeeded", cost }, now);
      await transaction.appendAttempt(
        runAttempt(run, "completed", now, "succeeded"),
      );
      await transaction.appendEvent(
        runtimeEvent(run, "run.succeeded", { totalCost: cost.totalCost }, now),
      );
    });
  }

  private async recordFailure(
    run: ClaimedRun,
    error: unknown,
  ): Promise<RuntimeRunnerOutcome> {
    const now = this.clock.now();
    const outcome = error instanceof SourceVersionInvalidatedError
      ? "invalidated"
      : error instanceof RuntimeCancelledError
      ? "cancelled"
      : error instanceof RuntimeToolDeniedError ||
          error instanceof RuntimeEffectDeniedError ||
          error instanceof RuntimeCostCeilingError
      ? "failed"
      : run.attemptNumber < this.maxAttempts
      ? "retry_scheduled"
      : "dead_lettered";
    const nextAttemptAt = outcome === "retry_scheduled"
      ? new Date(now.getTime() + 60_000)
      : undefined;
    await this.store.transaction(async (transaction) => {
      await transaction.updateRun(run, {
        state: outcome,
        nextAttemptAt,
        failure: failureCode(error),
      }, now);
      await transaction.appendAttempt(
        runAttempt(run, "completed", now, outcome, failureCode(error)),
      );
      await transaction.appendEvent(
        runtimeEvent(
          run,
          `run.${outcome}`,
          { failure: failureCode(error) },
          now,
        ),
      );
    });
    return { status: outcome, runId: run.runId };
  }

  private ensureRunnable(run: ClaimedRun): Promise<void> {
    return this.store.transaction(async (transaction) => {
      await this.ensureLease(transaction, run);
      if (await transaction.cancellationRequested(run, this.clock.now())) {
        throw new RuntimeCancelledError(run.runId);
      }
      await assertSourcesCurrent(this.sources, run.sourceVersions);
    });
  }

  private async ensureBeforeDurableEffect(run: ClaimedRun): Promise<void> {
    await this.store.transaction((transaction) =>
      this.ensureLease(transaction, run)
    );
  }

  private async recordToolActivity(
    run: ClaimedRun,
    activity: ToolActivityRecord,
  ): Promise<void> {
    await this.store.transaction(async (transaction) => {
      await this.ensureLease(transaction, run);
      await transaction.recordToolActivity(activity);
    });
  }

  private ensureLease(
    transaction: RuntimeTransaction,
    run: ClaimedRun,
  ): Promise<void> {
    return transaction.assertRunLease(run, this.clock.now());
  }

  private async authorizeStepEffect(
    run: ClaimedRun,
    step: StepRecord,
  ): Promise<RuntimeAuthority> {
    await this.ensureRunnable(run);
    const decision = await this.gateway.reauthorize(
      stepAuthorizationRequest(
        run,
        step,
        `activity_${step.stepId}-${step.attemptCount}` as ToolActivityId,
      ),
    );
    if (decision.outcome === "deny") {
      throw new RuntimeEffectDeniedError(step.stepId, decision.reasonCode);
    }
    await this.ensureRunnable(run);
    return runtimeAuthority(decision);
  }
}

function mergeToolEvidence(
  declared: readonly SourceVersionReference[],
  discovered: readonly SourceVersionReference[],
): readonly SourceVersionReference[] {
  const references = new Map<string, SourceVersionReference>();
  for (const reference of [...declared, ...discovered]) {
    references.set(sourceVersionKey(reference), reference);
  }
  return [...references.values()];
}
