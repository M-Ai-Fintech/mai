import {
  type ApprovedScopeToken,
  type AuthorizationDecision,
  guardedLoad,
} from "../platform/authz/v1.ts";
import {
  createProtectedNotFoundError,
  type ErrorEnvelope,
} from "../platform/api/v1.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
import type {
  DealParticipation,
  ExternalGrant,
  PortalObjectKind,
  PortalObjectSnapshot,
} from "./model.ts";
import type { DealAccessRepository } from "./repository.ts";
import type { ExternalGrantId } from "./ids.ts";
import {
  authorizePortalAccess,
  buildPortalAuthorizationRequest,
  type PortalAuthorizationInput,
} from "./policy.ts";
import {
  type PortalObjectProjection,
  projectPortalObject,
} from "./projection.ts";
import type { PortalFieldName } from "./portal_fields.ts";

export interface PortalObjectLoader {
  load(scope: ApprovedScopeToken): Promise<PortalObjectSnapshot | undefined>;
}

export type PortalReadResult =
  | {
    readonly kind: "loaded";
    readonly value: PortalObjectProjection;
    readonly decision: AuthorizationDecision & { readonly outcome: "allow" };
  }
  | { readonly kind: "protected_not_found"; readonly response: ErrorEnvelope };

export interface ReadPortalObjectInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly repository: DealAccessRepository;
  readonly grantId: ExternalGrantId;
  readonly object: {
    readonly objectId: string;
    readonly kind: PortalObjectKind;
  };
  readonly action: "read";
  readonly purpose: string;
  readonly sponsor: ActorId;
  readonly requestedExpiry: string;
  readonly requestedFields: readonly PortalFieldName[];
  readonly clock: { now(): string };
  readonly loader: PortalObjectLoader;
}

export async function readPortalObject(
  input: ReadPortalObjectInput,
): Promise<PortalReadResult> {
  const state = await loadPortalState(input);
  if (state === undefined) {
    return {
      kind: "protected_not_found",
      response: portalNotFound(input.context),
    };
  }
  const request = authorizationInput(input, state);
  const guarded = await guardedLoad(
    buildPortalAuthorizationRequest(request),
    input.loader,
  );
  if (guarded.kind === "protected_not_found") return guarded;
  if (guarded.decision.outcome === "deny") {
    return {
      kind: "protected_not_found",
      response: portalNotFound(input.context),
    };
  }
  if (
    guarded.value.internalId !== input.object.objectId ||
    guarded.value.kind !== input.object.kind
  ) {
    return {
      kind: "protected_not_found",
      response: portalNotFound(input.context),
    };
  }
  return {
    kind: "loaded",
    value: projectPortalObject(
      guarded.value,
      guarded.decision,
      input.requestedFields,
    ),
    decision: guarded.decision,
  };
}

function authorizationInput(
  input: ReadPortalObjectInput,
  state: {
    readonly participation: DealParticipation;
    readonly grant: ExternalGrant;
  },
): PortalAuthorizationInput {
  return {
    context: input.context,
    actor: input.actor,
    participation: state.participation,
    grant: state.grant,
    resource: input.object,
    action: input.action,
    purpose: input.purpose,
    sponsor: input.sponsor,
    requestedExpiry: input.requestedExpiry,
    requestedFields: input.requestedFields,
    clock: input.clock,
  };
}

function loadPortalState(
  input: ReadPortalObjectInput,
): Promise<
  | { readonly participation: DealParticipation; readonly grant: ExternalGrant }
  | undefined
> {
  const scope = portalScope(input.context);
  if (scope === undefined) return Promise.resolve(undefined);
  return input.repository.transaction(async (store) => {
    const grant = await store.findGrant(scope, input.grantId);
    if (grant === undefined) return undefined;
    const participation = await store.findParticipation(
      scope,
      grant.participationId,
    );
    if (participation === undefined) return undefined;
    if (!sameScope(grant.scope, participation.scope)) return undefined;
    if (grant.participationId !== participation.id) return undefined;
    return { participation, grant };
  });
}

function portalScope(
  context: RequestContext,
): DealParticipation["scope"] | undefined {
  if (context.workspaceId === undefined || context.dealId === undefined) {
    return undefined;
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}

function sameScope(
  left: DealParticipation["scope"],
  right: DealParticipation["scope"],
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

export function portalNotFound(context: RequestContext): ErrorEnvelope {
  return createProtectedNotFoundError(context.correlationId);
}

export { authorizePortalAccess };
