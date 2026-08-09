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
import type {
  MissionRecord,
  PlanRecord,
  PlanStepDefinition,
  RunRecord,
  RuntimeActor,
  RuntimeScope,
  StepRecord,
} from "./model.ts";
import { runtimeScopeFromContext } from "./model.ts";
import type { MissionId, PlanId, RunId, StepId } from "./ids.ts";
import type {
  AgentRuntimeStore,
  RuntimeCommandIdentity,
  RuntimeTransaction,
} from "./repository.ts";
import { RuntimeClock, RuntimeCommandInProgressError } from "./service.ts";

export interface SubmitProposalInput {
  readonly missionId: MissionId;
  readonly planId: PlanId;
  readonly runId: RunId;
  readonly objective: string;
  readonly planVersion: number;
  readonly steps: readonly PlanStepDefinition[];
  readonly correlationId: RunRecord["correlationId"];
  readonly idempotencyKey: string;
  readonly sourceVersions: RunRecord["sourceVersions"];
  readonly model?: RunRecord["model"];
  readonly costLimit?: number;
}

/** Submits proposal-only work without granting the human-only plan action. */
export class AgentRuntimeProposalService {
  constructor(
    private readonly store: AgentRuntimeStore,
    private readonly clock: RuntimeClock,
    private readonly authorization: RuntimeAuthorizationPort,
  ) {}

  async submit(
    context: RequestContext,
    actor: RuntimeActor,
    input: SubmitProposalInput,
  ): Promise<RunRecord> {
    const scope = runtimeScopeFromContext(context);
    await authorizeRuntimeAction(this.authorization, {
      context,
      actor: actorReference(actor),
      scope,
      resource: { kind: RUNTIME_RESOURCE.run, id: input.runId },
      action: RUNTIME_ACTION.submitProposal,
      requestedFields: [],
    });
    const identity = await proposalCommandIdentity(
      context,
      actor,
      scope,
      input,
    );
    return this.store.transaction(async (transaction) => {
      const claim = await transaction.claimIdempotency(identity);
      if (claim.status === "replay") {
        return await requireRun(transaction, scope, input.runId);
      }
      if (claim.status === "in_progress") {
        throw new RuntimeCommandInProgressError("proposal.submit", input.runId);
      }
      return await persistProposal(
        transaction,
        context,
        actor,
        scope,
        input,
        this.clock.now(),
        identity,
      );
    });
  }
}

async function persistProposal(
  transaction: RuntimeTransaction,
  context: RequestContext,
  actor: RuntimeActor,
  scope: RuntimeScope,
  input: SubmitProposalInput,
  now: Date,
  identity: RuntimeCommandIdentity,
): Promise<RunRecord> {
  const mission = proposalMission(input, scope, actor, now);
  const plan = proposalPlan(input, mission, now);
  const run = proposalRun(input, plan, scope, actor, now);
  await transaction.createMission(mission);
  await transaction.createPlan(plan);
  await transaction.createRun(run);
  await createSteps(transaction, run, plan.steps, now);
  await transaction.appendEvent(proposalEvent(context, run, plan, now));
  await transaction.completeIdempotency(identity, run.runId);
  return run;
}

function proposalMission(
  input: SubmitProposalInput,
  scope: RuntimeScope,
  actor: RuntimeActor,
  now: Date,
): MissionRecord {
  return {
    missionId: input.missionId,
    scope,
    actor,
    objective: input.objective,
    state: "active",
    aggregateVersion: 1 as AggregateVersion,
    createdAt: now,
    updatedAt: now,
  };
}

function proposalPlan(
  input: SubmitProposalInput,
  mission: MissionRecord,
  now: Date,
): PlanRecord {
  return {
    planId: input.planId,
    missionId: mission.missionId,
    scope: mission.scope,
    actor: mission.actor,
    version: input.planVersion,
    state: "active",
    steps: Object.freeze([...input.steps]),
    sourceVersions: Object.freeze([...input.sourceVersions]),
    createdAt: now,
  };
}

function proposalRun(
  input: SubmitProposalInput,
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

async function proposalCommandIdentity(
  context: RequestContext,
  actor: RuntimeActor,
  scope: RuntimeScope,
  input: SubmitProposalInput,
): Promise<RuntimeCommandIdentity> {
  return {
    scope,
    actorId: actor.actorId,
    commandType: "proposal.submit",
    targetType: "run",
    targetId: input.runId,
    idempotencyKey: input.idempotencyKey,
    payloadDigest: await payloadDigest({
      actorId: context.actorId,
      payload: input,
    }),
    createdAt: new Date(),
  };
}

async function requireRun(
  transaction: RuntimeTransaction,
  scope: RuntimeScope,
  runId: RunId,
): Promise<RunRecord> {
  const run = await transaction.findRun(scope, runId);
  if (run !== undefined) return run;
  throw new Error(
    `Run "${runId}" was not found; expected a durable proposal run.`,
  );
}

function proposalEvent(
  context: RequestContext,
  run: RunRecord,
  plan: PlanRecord,
  occurredAt: Date,
) {
  return {
    eventId: `event_${run.runId}-proposal-submitted`,
    scope: run.scope,
    actor: run.actor,
    correlationId: context.correlationId,
    aggregateType: "run",
    aggregateId: run.runId,
    aggregateVersion: run.aggregateVersion,
    eventType: "proposal.submitted",
    payload: { planId: plan.planId, planVersion: plan.version },
    occurredAt,
  };
}

function emptyCost(): RunRecord["cost"] {
  return {
    currency: "USD",
    inputTokens: 0,
    outputTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
  };
}
