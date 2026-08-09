import type { GovernedRuntimeReceiptReader } from "../../src/agent/governed.ts";
import type { RuntimeReadResult } from "../../src/agent_runtime/reads.ts";
import type {
  ResultRecord,
  RunRecord,
  StepRecord,
  ToolActivityRecord,
} from "../../src/agent_runtime/model.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";

export class NamedFakeAgentRuntimeReadService
  implements GovernedRuntimeReceiptReader {
  readonly calls: string[] = [];
  private runReadCount = 0;

  constructor(
    private readonly runs: readonly RunRecord[],
    private readonly activities: readonly ToolActivityRecord[],
    private readonly result: ResultRecord | undefined,
    private readonly afterActivity?: () => void,
    private readonly durableStep?: StepRecord,
  ) {}

  getRun(
    context: RequestContext,
    actor: RunRecord["actor"],
    runId: RunRecord["runId"],
  ): Promise<RuntimeReadResult<RunRecord>> {
    this.calls.push(`run:${runId}`);
    const run = this.runs[Math.min(this.runReadCount++, this.runs.length - 1)];
    return Promise.resolve(
      run !== undefined && this.authorized(context, actor, runId)
        ? loaded(run)
        : this.notFound(),
    );
  }

  getResult(
    context: RequestContext,
    actor: RunRecord["actor"],
    resultId: string,
  ): Promise<RuntimeReadResult<ResultRecord>> {
    this.calls.push(`result:${resultId}`);
    return Promise.resolve(
      this.result !== undefined && this.result.resultId === resultId &&
        this.authorized(context, actor, this.result.runId)
        ? loaded(this.result)
        : this.notFound(),
    );
  }

  getStep(
    context: RequestContext,
    actor: RunRecord["actor"],
    stepId: string,
  ): Promise<RuntimeReadResult<StepRecord>> {
    this.calls.push(`step:${stepId}`);
    const result = this.result;
    if (
      result === undefined || result.stepId !== stepId ||
      !this.authorized(context, actor, result.runId)
    ) return Promise.resolve(this.notFound<StepRecord>());
    return Promise.resolve(loaded(this.durableStep ?? governedStep(result)));
  }

  getToolActivity(
    context: RequestContext,
    actor: RunRecord["actor"],
    activityId: string,
  ): Promise<RuntimeReadResult<ToolActivityRecord>> {
    this.calls.push(`activity:${activityId}`);
    const activity = this.activities.find((item) =>
      item.activityId === activityId
    );
    const receipt = activity !== undefined &&
        this.authorized(context, actor, this.runs[0]?.runId)
      ? loaded(activity)
      : this.notFound<ToolActivityRecord>();
    if (receipt.kind === "loaded") this.afterActivity?.();
    return Promise.resolve(receipt);
  }

  private authorized(
    context: RequestContext,
    actor: RunRecord["actor"],
    runId: RunRecord["runId"] | undefined,
  ): boolean {
    const firstRun = this.runs[0];
    return firstRun !== undefined && runId === firstRun.runId &&
      actor.actorId === firstRun.actor.actorId &&
      context.actorId === actor.actorId &&
      context.tenantId === firstRun.scope.tenantId &&
      context.workspaceId === firstRun.scope.workspaceId &&
      context.dealId === firstRun.scope.dealId;
  }

  private notFound<T>(): RuntimeReadResult<T> {
    return { kind: "protected_not_found", response: {} as never };
  }
}

function loaded<T>(value: T): RuntimeReadResult<T> {
  return { kind: "loaded", value, decision: {} as never };
}

export function governedStep(result: ResultRecord): StepRecord {
  const now = result.createdAt;
  const lineage = result.lineage;
  return {
    stepId: result.stepId,
    runId: result.runId,
    ordinal: 1,
    name: "governed-proposal",
    kind: "model",
    input: {
      governed: {
        definition: lineage.definition,
        prompt: lineage.prompt,
        modelPolicyReference: lineage.modelPolicyReference,
        capability: "evidence.search",
      },
    },
    sourceVersions: [],
    state: "succeeded",
    attemptCount: 1,
    resultId: result.resultId,
    createdAt: now,
    updatedAt: now,
  };
}
