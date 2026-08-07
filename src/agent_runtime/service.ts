import { payloadDigest } from "../platform/persistence/idempotency.ts";
import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import {
  actorReference,
  authorizeRuntimeAction,
  RUNTIME_ACTION,
  RUNTIME_RESOURCE,
  type RuntimeAuthorizationPort,
} from "./authorization.ts";
import {
  assertPlanTransition,
  type MissionRecord,
  type PlanRecord,
  type PlanStepDefinition,
  type RunRecord,
  type RuntimeActor,
  type RuntimeScope,
  type SourceVersionReference,
  type StepRecord,
} from "./model.ts";
import type { MissionId, PlanId, RunId, StepId } from "./ids.ts";
import type {
  AgentRuntimeStore,
  RuntimeCommandIdentity,
  RuntimeTransaction,
} from "./repository.ts";

export interface RuntimeClock {
  now(): Date;
}

export interface CreateMissionInput {
  readonly missionId: MissionId;
  readonly objective: string;
  readonly idempotencyKey: string;
}

export interface CreatePlanInput {
  readonly planId: PlanId;
  readonly version: number;
  readonly steps: readonly PlanStepDefinition[];
  readonly sourceVersions: readonly SourceVersionReference[];
}

export interface QueueRunInput {
  readonly runId: RunId;
  readonly correlationId: RunRecord["correlationId"];
  readonly idempotencyKey: string;
  readonly sourceVersions: readonly SourceVersionReference[];
  readonly model?: RunRecord["model"];
  readonly costLimit?: number;
}

export class RuntimeCommandInProgressError extends Error {
  readonly code = "RUNTIME_COMMAND_IN_PROGRESS";

  constructor(commandType: string, targetId: string) {
    super(
      `Runtime command "${commandType}" for target "${targetId}" is already in progress; expected replay after completion.`,
    );
    this.name = "RuntimeCommandInProgressError";
  }
}

export class AgentRuntimeService {
  constructor(
    private readonly store: AgentRuntimeStore,
    private readonly clock: RuntimeClock,
    private readonly authorization: RuntimeAuthorizationPort,
  ) {}

  /**
   * Creates one durable mission with immutable idempotent command replay.
   *
   * @example await service.createMission(context, actor, input)
   */
  async createMission(
    context: RequestContext,
    actor: RuntimeActor,
    input: CreateMissionInput,
  ): Promise<MissionRecord> {
    const scope = scopeFromContext(context);
    await authorizeRuntimeAction(this.authorization, {
      context,
      actor: actorReference(actor),
      scope,
      resource: { kind: RUNTIME_RESOURCE.mission, id: input.missionId },
      action: RUNTIME_ACTION.createMission,
      requestedFields: [],
    });
    const identity = await commandIdentity(
      context,
      actor,
      scope,
      "mission.create",
      "mission",
      input.missionId,
      input.idempotencyKey,
      { objective: input.objective },
    );
    return this.store.transaction(async (transaction) => {
      const claim = await transaction.claimIdempotency(identity);
      if (claim.status === "replay") {
        return await requireMission(transaction, scope, input.missionId);
      }
      if (claim.status === "in_progress") {
        throw new RuntimeCommandInProgressError(
          "mission.create",
          input.missionId,
        );
      }
      const now = this.clock.now();
      const mission: MissionRecord = {
        missionId: input.missionId,
        scope,
        actor,
        objective: input.objective,
        state: "draft",
        aggregateVersion: 1 as AggregateVersion,
        createdAt: now,
        updatedAt: now,
      };
      await transaction.createMission(mission);
      await transaction.appendEvent(
        runtimeEvent(
          "mission",
          mission.missionId,
          mission.aggregateVersion,
          mission.scope,
          mission.actor,
          context,
          "mission.created",
          { objective: mission.objective },
          now,
        ),
      );
      await transaction.completeIdempotency(identity, mission.missionId);
      return mission;
    });
  }

  async proposePlan(
    context: RequestContext,
    actor: RuntimeActor,
    missionId: MissionId,
    input: CreatePlanInput,
  ): Promise<PlanRecord> {
    const scope = scopeFromContext(context);
    await authorizeRuntimeAction(this.authorization, {
      context,
      actor: actorReference(actor),
      scope,
      resource: { kind: RUNTIME_RESOURCE.plan, id: input.planId },
      action: RUNTIME_ACTION.proposePlan,
      requestedFields: [],
    });
    return this.store.transaction(async (transaction) => {
      await requireMission(transaction, scope, missionId);
      const now = this.clock.now();
      const plan: PlanRecord = {
        planId: input.planId,
        missionId,
        scope,
        actor,
        version: input.version,
        state: "proposed",
        steps: Object.freeze([...input.steps]),
        sourceVersions: Object.freeze([...input.sourceVersions]),
        createdAt: now,
      };
      await transaction.createPlan(plan);
      await transaction.appendEvent(
        runtimeEvent(
          "plan",
          plan.planId,
          plan.version as AggregateVersion,
          plan.scope,
          plan.actor,
          context,
          "plan.proposed",
          { version: plan.version, stepCount: plan.steps.length },
          now,
        ),
      );
      return plan;
    });
  }

  async activatePlan(
    context: RequestContext,
    actor: RuntimeActor,
    planId: PlanId,
  ): Promise<PlanRecord> {
    const scope = scopeFromContext(context);
    await authorizeRuntimeAction(this.authorization, {
      context,
      actor: actorReference(actor),
      scope,
      resource: { kind: RUNTIME_RESOURCE.plan, id: planId },
      action: RUNTIME_ACTION.approvePlan,
      requestedFields: [],
      humanOnly: true,
    });
    return this.store.transaction(async (transaction) => {
      const plan = await transaction.findPlan(scope, planId);
      if (plan === undefined) {
        throw new Error(
          `Plan "${planId}" was not found; expected a proposed plan.`,
        );
      }
      assertSameScope(plan.scope, scope, planId);
      assertPlanTransition(plan.state, "active");
      const active = { ...plan, state: "active" as const };
      await transaction.updatePlan(active);
      await transaction.appendEvent(
        runtimeEvent(
          "plan",
          plan.planId,
          plan.version as AggregateVersion,
          plan.scope,
          actor,
          context,
          "plan.activated",
          { version: plan.version },
          this.clock.now(),
        ),
      );
      return active;
    });
  }

  async queueRun(
    context: RequestContext,
    actor: RuntimeActor,
    planId: PlanId,
    input: QueueRunInput,
  ): Promise<RunRecord> {
    const scope = scopeFromContext(context);
    await authorizeRuntimeAction(this.authorization, {
      context,
      actor: actorReference(actor),
      scope,
      resource: { kind: RUNTIME_RESOURCE.plan, id: planId },
      action: RUNTIME_ACTION.queueRun,
      requestedFields: [],
    });
    const identity = await commandIdentity(
      context,
      actor,
      scope,
      "run.queue",
      "plan",
      planId,
      input.idempotencyKey,
      input,
    );
    return this.store.transaction(async (transaction) => {
      const claim = await transaction.claimIdempotency(identity);
      if (claim.status === "replay") {
        return await requireRun(transaction, scope, input.runId);
      }
      if (claim.status === "in_progress") {
        throw new RuntimeCommandInProgressError("run.queue", planId);
      }
      const plan = await transaction.findPlan(scope, planId);
      if (plan === undefined || plan.state !== "active") {
        throw new Error(
          `Plan "${planId}" is not active in the requested scope; expected a scoped human-authorized active plan.`,
        );
      }
      const now = this.clock.now();
      const run = newRun(input, plan, scope, actor, now);
      await transaction.createRun(run);
      await createSteps(transaction, run, plan.steps, now);
      await transaction.appendEvent(
        runtimeEvent(
          "run",
          run.runId,
          run.aggregateVersion,
          run.scope,
          run.actor,
          context,
          "run.queued",
          { planId, planVersion: plan.version },
          now,
        ),
      );
      await transaction.completeIdempotency(identity, run.runId);
      return run;
    });
  }

  requestCancellation(
    context: RequestContext,
    actor: RuntimeActor,
    runId: RunId,
  ): Promise<void> {
    const scope = scopeFromContext(context);
    return this.cancelRun(context, actor, scope, runId);
  }

  private async cancelRun(
    context: RequestContext,
    actor: RuntimeActor,
    scope: RuntimeScope,
    runId: RunId,
  ): Promise<void> {
    await authorizeRuntimeAction(this.authorization, {
      context,
      actor: actorReference(actor),
      scope,
      resource: { kind: RUNTIME_RESOURCE.run, id: runId },
      action: RUNTIME_ACTION.cancelRun,
      requestedFields: [],
    });
    return this.store.transaction(async (transaction) => {
      const run = await requireRun(transaction, scope, runId);
      assertSameScope(run.scope, scope, runId);
      await transaction.requestCancellation(runId, scope, this.clock.now());
      await transaction.appendEvent({
        eventId: `event_${runId}-cancel-requested`,
        scope,
        actor,
        correlationId: context.correlationId,
        aggregateType: "run",
        aggregateId: runId,
        aggregateVersion: run.aggregateVersion,
        eventType: "run.cancellation_requested",
        payload: {},
        occurredAt: this.clock.now(),
      });
    });
  }
}

function scopeFromContext(context: RequestContext): RuntimeScope {
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}

async function commandIdentity(
  context: RequestContext,
  actor: RuntimeActor,
  scope: RuntimeScope,
  commandType: string,
  targetType: string,
  targetId: string,
  idempotencyKey: string,
  payload: unknown,
): Promise<RuntimeCommandIdentity> {
  return {
    scope,
    actorId: actor.actorId,
    commandType,
    targetType,
    targetId,
    idempotencyKey,
    payloadDigest: await payloadDigest({ actorId: context.actorId, payload }),
    createdAt: new Date(),
  };
}

async function requireMission(
  transaction: RuntimeTransaction,
  scope: RuntimeScope,
  missionId: MissionId,
): Promise<MissionRecord> {
  const mission = await transaction.findMission(scope, missionId);
  if (mission !== undefined) return mission;
  throw new Error(
    `Mission "${missionId}" was not found; expected a durable mission.`,
  );
}

async function requireRun(
  transaction: RuntimeTransaction,
  scope: RuntimeScope,
  runId: RunId,
): Promise<RunRecord> {
  const run = await transaction.findRun(scope, runId);
  if (run !== undefined) return run;
  throw new Error(`Run "${runId}" was not found; expected a durable run.`);
}

function assertSameScope(
  left: RuntimeScope,
  right: RuntimeScope,
  subject: string,
): void {
  if (
    left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId
  ) return;
  throw new Error(
    `Runtime subject "${subject}" scope does not match the trusted request scope.`,
  );
}

function newRun(
  input: QueueRunInput,
  plan: PlanRecord,
  scope: RuntimeScope,
  actor: RuntimeActor,
  now: Date,
): RunRecord {
  return {
    runId: input.runId,
    missionId: plan.missionId,
    planId: plan.planId,
    planVersion: plan.version,
    scope,
    actor,
    correlationId: input.correlationId,
    state: "queued",
    aggregateVersion: 1 as AggregateVersion,
    sourceVersions: Object.freeze([...input.sourceVersions]),
    model: input.model,
    costLimit: input.costLimit,
    cost: emptyCost(),
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

async function createSteps(
  transaction: RuntimeTransaction,
  run: RunRecord,
  definitions: readonly PlanStepDefinition[],
  now: Date,
): Promise<void> {
  for (const definition of definitions) {
    const step: StepRecord = {
      stepId: `step_${run.runId}-${definition.ordinal}` as StepId,
      runId: run.runId,
      ordinal: definition.ordinal,
      name: definition.name,
      kind: definition.kind,
      toolName: definition.toolName,
      action: definition.action,
      resourceKind: definition.resourceKind,
      resourceId: definition.resourceId,
      input: definition.input,
      sourceVersions: definition.sourceVersions,
      state: "queued",
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await transaction.createStep(step);
  }
}

function runtimeEvent(
  aggregateType: string,
  aggregateId: string,
  aggregateVersion: AggregateVersion,
  scope: RuntimeScope,
  actor: RuntimeActor,
  context: RequestContext,
  eventType: string,
  payload: Readonly<Record<string, unknown>>,
  occurredAt: Date,
) {
  return {
    eventId: `event_${aggregateId}-${eventType.replaceAll(".", "-")}`,
    scope,
    actor,
    correlationId: context.correlationId,
    aggregateType,
    aggregateId,
    aggregateVersion,
    eventType,
    payload,
    occurredAt,
  };
}

function emptyCost() {
  return {
    currency: "USD",
    inputTokens: 0,
    outputTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
  };
}
