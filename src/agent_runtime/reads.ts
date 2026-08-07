import {
  createProtectedNotFoundError,
  type ErrorEnvelope,
} from "../platform/api/envelopes.ts";
import type { AuthorizationDecision } from "../platform/authz/v1.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import {
  actorReference,
  assertActorContext,
  RUNTIME_ACTION,
  RUNTIME_RESOURCE,
  type RuntimeAuthorizationPort,
} from "./authorization.ts";
import type {
  ArtifactRecord,
  MissionRecord,
  PlanRecord,
  ResultRecord,
  RunRecord,
  RuntimeActor,
  RuntimeAttemptRecord,
  RuntimeScope,
  StepRecord,
  ToolActivityRecord,
} from "./model.ts";
import type { MissionId, PlanId, RunId, StepId } from "./ids.ts";
import type { AgentRuntimeStore, RuntimeTransaction } from "./repository.ts";

export type RuntimeReadResult<T> =
  | {
    readonly kind: "loaded";
    readonly value: T;
    readonly decision: AuthorizationDecision;
  }
  | {
    readonly kind: "protected_not_found";
    readonly response: ErrorEnvelope;
  };

export class AgentRuntimeReadService {
  constructor(
    private readonly store: AgentRuntimeStore,
    private readonly authorization: RuntimeAuthorizationPort,
  ) {}

  getMission(
    context: RequestContext,
    actor: RuntimeActor,
    missionId: MissionId,
  ): Promise<RuntimeReadResult<MissionRecord>> {
    return this.readOne(
      context,
      actor,
      RUNTIME_RESOURCE.mission,
      missionId,
      (transaction, scope) => transaction.findMission(scope, missionId),
    );
  }

  getPlan(
    context: RequestContext,
    actor: RuntimeActor,
    planId: PlanId,
  ): Promise<RuntimeReadResult<PlanRecord>> {
    return this.readOne(
      context,
      actor,
      RUNTIME_RESOURCE.plan,
      planId,
      (transaction, scope) => transaction.findPlan(scope, planId),
    );
  }

  getRun(
    context: RequestContext,
    actor: RuntimeActor,
    runId: RunId,
  ): Promise<RuntimeReadResult<RunRecord>> {
    return this.readOne(
      context,
      actor,
      RUNTIME_RESOURCE.run,
      runId,
      (transaction, scope) => transaction.findRun(scope, runId),
    );
  }

  getStep(
    context: RequestContext,
    actor: RuntimeActor,
    stepId: StepId,
  ): Promise<RuntimeReadResult<StepRecord>> {
    return this.readOne(
      context,
      actor,
      RUNTIME_RESOURCE.step,
      stepId,
      (transaction, scope) => transaction.findStep(scope, stepId),
    );
  }

  getToolActivity(
    context: RequestContext,
    actor: RuntimeActor,
    activityId: string,
  ): Promise<RuntimeReadResult<ToolActivityRecord>> {
    return this.readOne(
      context,
      actor,
      RUNTIME_RESOURCE.toolActivity,
      activityId,
      (transaction, scope) => transaction.findToolActivity(scope, activityId),
    );
  }

  getResult(
    context: RequestContext,
    actor: RuntimeActor,
    resultId: string,
  ): Promise<RuntimeReadResult<ResultRecord>> {
    return this.readOne(
      context,
      actor,
      RUNTIME_RESOURCE.result,
      resultId,
      (transaction, scope) => transaction.findResult(scope, resultId),
    );
  }

  getArtifact(
    context: RequestContext,
    actor: RuntimeActor,
    artifactId: string,
  ): Promise<RuntimeReadResult<ArtifactRecord>> {
    return this.readOne(
      context,
      actor,
      RUNTIME_RESOURCE.artifact,
      artifactId,
      (transaction, scope) => transaction.findArtifact(scope, artifactId),
    );
  }

  getAttempt(
    context: RequestContext,
    actor: RuntimeActor,
    attemptId: string,
  ): Promise<RuntimeReadResult<RuntimeAttemptRecord>> {
    return this.readOne(
      context,
      actor,
      RUNTIME_RESOURCE.attempt,
      attemptId,
      (transaction, scope) => transaction.findAttempt(scope, attemptId),
    );
  }

  listSteps(
    context: RequestContext,
    actor: RuntimeActor,
    runId: RunId,
  ): Promise<RuntimeReadResult<StepRecord[]>> {
    return this.readRunChildren(
      context,
      actor,
      runId,
      (transaction, scope) => transaction.listSteps(scope, runId),
    );
  }

  listToolActivities(
    context: RequestContext,
    actor: RuntimeActor,
    runId: RunId,
  ): Promise<RuntimeReadResult<ToolActivityRecord[]>> {
    return this.readRunChildren(
      context,
      actor,
      runId,
      (transaction, scope) => transaction.listToolActivities(scope, runId),
    );
  }

  listResults(
    context: RequestContext,
    actor: RuntimeActor,
    runId: RunId,
  ): Promise<RuntimeReadResult<ResultRecord[]>> {
    return this.readRunChildren(
      context,
      actor,
      runId,
      (transaction, scope) => transaction.listResults(scope, runId),
    );
  }

  listArtifacts(
    context: RequestContext,
    actor: RuntimeActor,
    runId: RunId,
  ): Promise<RuntimeReadResult<ArtifactRecord[]>> {
    return this.readRunChildren(
      context,
      actor,
      runId,
      (transaction, scope) => transaction.listArtifacts(scope, runId),
    );
  }

  listAttempts(
    context: RequestContext,
    actor: RuntimeActor,
    runId: RunId,
  ): Promise<RuntimeReadResult<RuntimeAttemptRecord[]>> {
    return this.readRunChildren(
      context,
      actor,
      runId,
      (transaction, scope) => transaction.listAttempts(scope, runId),
    );
  }

  private async readOne<T>(
    context: RequestContext,
    actor: RuntimeActor,
    resourceKind: (typeof RUNTIME_RESOURCE)[keyof typeof RUNTIME_RESOURCE],
    resourceId: string,
    load: (
      transaction: RuntimeTransaction,
      scope: RuntimeScope,
    ) => Promise<T | undefined>,
  ): Promise<RuntimeReadResult<T>> {
    const scope = scopeFromContext(context);
    const decision = await this.authorize(
      context,
      actor,
      scope,
      resourceKind,
      resourceId,
    );
    if (decision.outcome === "deny") return protectedNotFound(context);
    return this.store.transaction(async (transaction) => {
      const value = await load(transaction, scope);
      return value === undefined
        ? protectedNotFound(context)
        : { kind: "loaded", value, decision };
    });
  }

  private async readRunChildren<T>(
    context: RequestContext,
    actor: RuntimeActor,
    runId: RunId,
    load: (
      transaction: RuntimeTransaction,
      scope: RuntimeScope,
    ) => Promise<T>,
  ): Promise<RuntimeReadResult<T>> {
    const scope = scopeFromContext(context);
    const decision = await this.authorize(
      context,
      actor,
      scope,
      RUNTIME_RESOURCE.run,
      runId,
    );
    if (decision.outcome === "deny") return protectedNotFound(context);
    return this.store.transaction(async (transaction) => {
      if (await transaction.findRun(scope, runId) === undefined) {
        return protectedNotFound(context);
      }
      return {
        kind: "loaded",
        value: await load(transaction, scope),
        decision,
      };
    });
  }

  private authorize(
    context: RequestContext,
    actor: RuntimeActor,
    scope: RuntimeScope,
    resourceKind: (typeof RUNTIME_RESOURCE)[keyof typeof RUNTIME_RESOURCE],
    resourceId: string,
  ): Promise<AuthorizationDecision> {
    assertActorContext(context, actorReference(actor));
    return Promise.resolve(this.authorization.authorize({
      context,
      actor: actorReference(actor),
      scope,
      resource: { kind: resourceKind, id: resourceId },
      action: RUNTIME_ACTION.read,
      requestedFields: [],
    }));
  }
}

function scopeFromContext(context: RequestContext): RuntimeScope {
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}

function protectedNotFound(
  context: RequestContext,
): RuntimeReadResult<never> {
  return {
    kind: "protected_not_found",
    response: createProtectedNotFoundError(context.correlationId),
  };
}
