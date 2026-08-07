import type {
  ClaimedRun,
  CostMetadata,
  RuntimeAttemptRecord,
  SourceVersionReference,
  StepRecord,
} from "./model.ts";
import { action, resourceKind } from "../platform/authz/v1.ts";
import { actorReference } from "./authorization.ts";
import {
  assertCostMetadata,
  RuntimeLeaseLostError,
  SourceVersionInvalidatedError,
} from "./model.ts";
import type { ToolActivityId } from "./ids.ts";
import type { SourceVersionChecker } from "./runner.ts";
import {
  type RuntimeAuthorizationRequest,
  type ToolInvocationRequest,
} from "./tool_gateway.ts";

export class RuntimeToolDeniedError extends Error {
  readonly code = "RUNTIME_TOOL_DENIED";

  constructor(toolName: string, reason: string) {
    super(
      `Tool "${toolName}" was denied with reason "${reason}"; expected no tool effect.`,
    );
    this.name = "RuntimeToolDeniedError";
  }
}

export class RuntimeCancelledError extends Error {
  readonly code = "RUNTIME_CANCELLED";

  constructor(runId: string) {
    super(
      `Run "${runId}" was cancelled before the next effect; expected durable cancellation observation.`,
    );
    this.name = "RuntimeCancelledError";
  }
}

export class RuntimeCostCeilingError extends Error {
  readonly code = "RUNTIME_COST_CEILING";

  constructor(runId: string, cost: number, limit: number) {
    super(
      `Run "${runId}" cost "${cost}" exceeded ceiling "${limit}"; expected the configured durable cost limit.`,
    );
    this.name = "RuntimeCostCeilingError";
  }
}

export class RuntimeEffectDeniedError extends Error {
  readonly code = "RUNTIME_EFFECT_DENIED";

  constructor(stepId: string, reason: string) {
    super(
      `Step "${stepId}" effect was denied with reason "${reason}"; expected no external effect.`,
    );
    this.name = "RuntimeEffectDeniedError";
  }
}

export function isRunnableStep(step: StepRecord): boolean {
  return step.state === "queued" || step.state === "retry_scheduled";
}

export async function assertSourcesCurrent(
  checker: SourceVersionChecker,
  references: readonly SourceVersionReference[],
): Promise<void> {
  for (const reference of references) {
    if (!await checker.isCurrent(reference)) {
      throw new SourceVersionInvalidatedError(reference);
    }
  }
}

export function assertWithinCost(run: ClaimedRun, cost: CostMetadata): void {
  if (run.costLimit === undefined || cost.totalCost <= run.costLimit) return;
  throw new RuntimeCostCeilingError(run.runId, cost.totalCost, run.costLimit);
}

export function mergeCost(
  left: CostMetadata,
  right: CostMetadata,
): CostMetadata {
  if (left.currency !== right.currency) {
    throw new Error(
      `Runtime cost currency "${right.currency}" does not match "${left.currency}"; expected one run currency.`,
    );
  }
  const total: CostMetadata = {
    currency: left.currency,
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    inputCost: left.inputCost + right.inputCost,
    outputCost: left.outputCost + right.outputCost,
    totalCost: left.totalCost + right.totalCost,
  };
  assertCostMetadata(total);
  return total;
}

export function toolActivity(
  run: ClaimedRun,
  step: StepRecord,
  createdAt: Date,
) {
  return {
    activityId:
      `activity_${step.stepId}-${step.attemptCount}` as ToolActivityId,
    runId: run.runId,
    stepId: step.stepId,
    toolName: step.toolName!,
    action: step.action!,
    resourceKind: step.resourceKind!,
    resourceId: step.resourceId!,
    requestDigest: `digest_${step.stepId}-${step.attemptCount}`,
    state: "requested" as const,
    createdAt,
  };
}

export function toolRequest(
  run: ClaimedRun,
  step: StepRecord,
  activityId: ToolActivityId,
  beforeEffect: () => Promise<void>,
): ToolInvocationRequest {
  return {
    activityId,
    context: runtimeContext(run),
    actor: run.actor,
    scope: run.scope,
    toolName: step.toolName!,
    action: step.action!,
    resourceKind: step.resourceKind!,
    resourceId: step.resourceId!,
    input: step.input,
    sourceVersions: step.sourceVersions,
    beforeEffect,
  };
}

export function stepAuthorizationRequest(
  run: ClaimedRun,
  step: StepRecord,
  activityId: ToolActivityId,
): RuntimeAuthorizationRequest {
  return {
    activityId,
    context: runtimeContext(run),
    actor: actorReference(run.actor),
    scope: run.scope,
    action: action(step.action ?? `execute_${step.kind}`),
    resource: {
      kind: resourceKind(step.resourceKind ?? "agent_runtime"),
      id: step.resourceId ?? step.stepId,
    },
    requestedFields: [],
  };
}

function runtimeContext(run: ClaimedRun) {
  return {
    actorId: run.actor.actorId,
    tenantId: run.scope.tenantId,
    ...(run.scope.workspaceId === undefined
      ? {}
      : { workspaceId: run.scope.workspaceId }),
    ...(run.scope.dealId === undefined ? {} : { dealId: run.scope.dealId }),
    correlationId: run.correlationId,
    origin: "job" as const,
  };
}

export function runAttempt(
  run: ClaimedRun,
  recordKind: RuntimeAttemptRecord["recordKind"],
  at: Date,
  outcome?: string,
  failure?: string,
): RuntimeAttemptRecord {
  return {
    attemptId: `attempt_${run.runId}-${run.attemptNumber}-${recordKind}`,
    scope: "run",
    subjectId: run.runId,
    runId: run.runId,
    attemptNumber: run.attemptNumber,
    recordKind,
    workerId: run.workerId,
    leaseExpiresAt: run.leaseExpiresAt,
    startedAt: run.attemptStartedAt,
    ...(recordKind === "completed" ? { completedAt: at } : {}),
    ...(outcome === undefined ? {} : { outcome }),
    ...(failure === undefined ? {} : { failure }),
  };
}

export function stepAttempt(
  step: StepRecord,
  run: ClaimedRun,
  recordKind: RuntimeAttemptRecord["recordKind"],
  at: Date,
  outcome?: string,
  failure?: string,
): RuntimeAttemptRecord {
  return {
    attemptId: `attempt_${step.stepId}-${step.attemptCount}-${recordKind}`,
    scope: "step",
    subjectId: step.stepId,
    runId: run.runId,
    attemptNumber: step.attemptCount,
    recordKind,
    workerId: run.workerId,
    leaseExpiresAt: run.leaseExpiresAt,
    startedAt: recordKind === "started" ? at : run.attemptStartedAt,
    ...(recordKind === "completed" ? { completedAt: at } : {}),
    ...(outcome === undefined ? {} : { outcome }),
    ...(failure === undefined ? {} : { failure }),
  };
}

export function runtimeEvent(
  run: ClaimedRun,
  eventType: string,
  payload: Readonly<Record<string, unknown>>,
  occurredAt: Date,
) {
  const subject = typeof payload.stepId === "string"
    ? `-${payload.stepId}`
    : "";
  return {
    eventId: `event_${run.runId}-${
      eventType.replaceAll(".", "-")
    }${subject}-${occurredAt.getTime()}`,
    scope: run.scope,
    actor: run.actor,
    correlationId: run.correlationId,
    aggregateType: "run",
    aggregateId: run.runId,
    aggregateVersion: run.aggregateVersion,
    eventType,
    payload,
    occurredAt,
  };
}

export function emptyCost(): CostMetadata {
  return {
    currency: "USD",
    inputTokens: 0,
    outputTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
  };
}

export function failureCode(error: unknown): string {
  if (error instanceof SourceVersionInvalidatedError) return error.code;
  if (error instanceof RuntimeCancelledError) return error.code;
  if (error instanceof RuntimeToolDeniedError) return error.code;
  if (error instanceof RuntimeEffectDeniedError) return error.code;
  if (error instanceof RuntimeCostCeilingError) return error.code;
  if (error instanceof RuntimeLeaseLostError) return error.code;
  return "RUNTIME_STEP_FAILED";
}

export function failureStepState(
  run: ClaimedRun,
  error: unknown,
  maxAttempts: number,
): StepRecord["state"] {
  if (error instanceof SourceVersionInvalidatedError) return "invalidated";
  if (error instanceof RuntimeCancelledError) return "cancelled";
  if (
    error instanceof RuntimeToolDeniedError ||
    error instanceof RuntimeEffectDeniedError ||
    error instanceof RuntimeCostCeilingError
  ) return "failed";
  return run.attemptNumber < maxAttempts ? "retry_scheduled" : "failed";
}

export function assertPositive(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new Error(
    `Runtime ${label} "${value}" is invalid; expected a positive safe integer.`,
  );
}
