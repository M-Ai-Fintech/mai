import {
  action,
  type ActorReference,
  type AuthorizationDecision,
} from "../platform/authz/v1.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import type { WorkScope } from "./ids.ts";
import { assertHumanActor, WorkManagementError } from "./model.ts";

export interface WorkManagementAuthorizationInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: WorkScope;
  readonly resource: { readonly kind: string; readonly id: string };
  readonly action: string;
  readonly humanOnly?: boolean;
  readonly resourceState?: string;
}

export interface WorkManagementAuthorizationPort {
  /** Synchronous commands require a transaction-local MAI-106 adapter. */
  readonly transactionSafe?: true;
  readonly transactionMode?: "postgres_transaction_local";
  authorize(
    input: WorkManagementAuthorizationInput,
  ): Promise<AuthorizationDecision> | AuthorizationDecision;
}

export interface AuthorizationSubject {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: WorkScope;
  readonly id: string;
}

export class WorkManagementAuthorization {
  constructor(private readonly port: WorkManagementAuthorizationPort) {}

  authorize(
    input: AuthorizationSubject,
    actionName: string,
    kind: string,
    humanOnly = false,
    resourceState?: string,
  ): Promise<AuthorizationDecision> | AuthorizationDecision {
    return this.port.authorize({
      context: input.context,
      actor: input.actor,
      scope: input.scope,
      resource: { kind, id: input.id },
      action: action(actionName),
      humanOnly,
      resourceState,
    });
  }

  async requireAllowed(
    input: AuthorizationSubject,
    actionName: string,
    kind: string,
    humanOnly = false,
    resourceState?: string,
  ): Promise<AuthorizationDecision> {
    if (humanOnly) assertHumanActor(input.actor, `${actionName} ${kind}`);
    const decision = await this.authorize(
      input,
      actionName,
      kind,
      humanOnly,
      resourceState,
    );
    if (decision.outcome === "allow") return decision;
    throw new WorkManagementError(
      "HUMAN_AUTHORITY_REQUIRED",
      `Actor "${input.actor.id}" is not authorized to ${actionName} ${kind}; expected an allowed scoped command.`,
    );
  }
}
