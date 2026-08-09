import {
  type Action,
  action,
  type ActorReference,
  type AllowedAuthorizationDecision,
  type AuthorizationDecision,
  type RequestedField,
  type ResourceKind,
  resourceKind,
} from "../platform/authz/v1.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type { RuntimeActor, RuntimeAuthority, RuntimeScope } from "./model.ts";

export const RUNTIME_ACTION = Object.freeze({
  approvePlan: action("approve_plan"),
  cancelRun: action("cancel_run"),
  createMission: action("create_mission"),
  execute: action("execute"),
  proposePlan: action("propose_plan"),
  submitProposal: action("submit_proposal"),
  useMission: action("use_mission"),
  queueRun: action("queue_run"),
  read: action("read"),
});

export const RUNTIME_RESOURCE = Object.freeze({
  artifact: resourceKind("agent_artifact"),
  attempt: resourceKind("agent_attempt"),
  mission: resourceKind("agent_mission"),
  plan: resourceKind("agent_plan"),
  result: resourceKind("agent_result"),
  run: resourceKind("agent_run"),
  step: resourceKind("agent_step"),
  toolActivity: resourceKind("agent_tool_activity"),
});

export interface RuntimeAuthorizationInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: RuntimeScope;
  readonly resource: { readonly kind: ResourceKind; readonly id: string };
  readonly action: Action;
  readonly requestedFields: readonly RequestedField[];
  readonly humanOnly?: boolean;
}

export interface RuntimeAuthorizationPort {
  authorize(
    input: RuntimeAuthorizationInput,
  ): Promise<AuthorizationDecision> | AuthorizationDecision;
}

export async function authorizeRuntimeAction(
  port: RuntimeAuthorizationPort,
  input: RuntimeAuthorizationInput,
): Promise<AllowedAuthorizationDecision> {
  assertActorContext(input.context, input.actor);
  const decision = await port.authorize(input);
  return requireAllowed(decision, input.action, input.resource.id);
}

export class RuntimeActorContextMismatchError extends Error {
  readonly code = "RUNTIME_ACTOR_CONTEXT_MISMATCH";

  constructor(contextActorId: string, actorId: string) {
    super(
      `Runtime actor "${actorId}" does not match authenticated context actor "${contextActorId}"; expected the authenticated RequestContext actor.`,
    );
    this.name = "RuntimeActorContextMismatchError";
  }
}

export class RuntimeAuthorizationDeniedError extends Error {
  readonly code = "RUNTIME_AUTHORIZATION_DENIED";

  constructor(actionName: string, resourceId: string, reason: string) {
    super(
      `Runtime action "${actionName}" on resource "${resourceId}" was denied with reason "${reason}"; expected an allowed scoped authorization decision.`,
    );
    this.name = "RuntimeAuthorizationDeniedError";
  }
}

export function assertActorContext(
  context: RequestContext,
  actor: ActorReference,
): void {
  if (context.actorId === actor.id) return;
  throw new RuntimeActorContextMismatchError(context.actorId, actor.id);
}

export function actorReference(actor: RuntimeActor): ActorReference {
  return {
    id: actor.actorId,
    kind: actor.kind,
    state: actor.state,
  };
}

export function runtimeAuthority(
  decision: AllowedAuthorizationDecision,
  checkedAt = new Date(),
): RuntimeAuthority {
  return {
    snapshotReference: decision.authoritySnapshotReference ?? "authz-v1",
    decisionReference: decision.approvedScope.decisionReference,
    checkedAt,
  };
}

export function requireAllowed(
  decision: AuthorizationDecision,
  actionName: Action,
  resourceId: string,
): AllowedAuthorizationDecision {
  if (decision.outcome === "allow") return decision;
  throw new RuntimeAuthorizationDeniedError(
    actionName,
    resourceId,
    decision.reasonCode,
  );
}
