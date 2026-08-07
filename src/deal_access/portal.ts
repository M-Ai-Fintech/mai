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
  readonly participation: DealParticipation;
  readonly grant: ExternalGrant;
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
  const request = authorizationInput(input);
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
): PortalAuthorizationInput {
  return {
    ...input,
    resource: input.object,
    clock: input.clock,
  };
}

export function portalNotFound(context: RequestContext): ErrorEnvelope {
  return createProtectedNotFoundError(context.correlationId);
}

export { authorizePortalAccess };
