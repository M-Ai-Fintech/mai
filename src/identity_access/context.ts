import {
  parseActorId,
  parseCorrelationId,
  parseTenantId,
  parseWorkspaceId,
} from "../shared/contracts/identifiers.ts";
import { type RequestContext } from "../shared/contracts/request_context.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import { IdentityAccessError } from "./errors.ts";
import type { AdministrationContext } from "./contracts.ts";
import { actorId, correlationId, tenantId, workspaceId } from "./ids.ts";

export function createAdministrationContext(input: {
  readonly actor: ActorReference;
  readonly request: RequestContext;
  readonly now: string;
}): AdministrationContext {
  assertContextIds(input.request);
  if (input.request.actorId !== input.actor.id) {
    throw new IdentityAccessError(
      "SCOPE_MISMATCH",
      `actor "${input.actor.id}" does not match request actor "${input.request.actorId}".`,
    );
  }
  if (!Number.isFinite(Date.parse(input.now))) {
    throw new IdentityAccessError(
      "INVALID_INPUT",
      `context time "${input.now}" is not a valid instant.`,
    );
  }
  return Object.freeze({
    actor: Object.freeze({ ...input.actor }),
    actorId: actorId(input.request.actorId),
    tenantId: tenantId(input.request.tenantId),
    correlationId: correlationId(input.request.correlationId),
    ...(input.request.workspaceId === undefined
      ? {}
      : { workspaceId: workspaceId(input.request.workspaceId) }),
    now: input.now,
  });
}

export function withWorkspaceContext(
  context: AdministrationContext,
  workspaceIdValue: string,
): AdministrationContext {
  return Object.freeze({
    ...context,
    workspaceId: workspaceId(workspaceIdValue),
  });
}

function assertContextIds(request: RequestContext): void {
  if (!parseActorId(request.actorId).ok) throw invalidContext("actor");
  if (!parseTenantId(request.tenantId).ok) throw invalidContext("tenant");
  if (!parseCorrelationId(request.correlationId).ok) {
    throw invalidContext("correlation");
  }
  if (
    request.workspaceId !== undefined &&
    !parseWorkspaceId(request.workspaceId).ok
  ) {
    throw invalidContext("workspace");
  }
}

function invalidContext(label: string): IdentityAccessError {
  return new IdentityAccessError(
    "INVALID_INPUT",
    `${label} context value is invalid; expected a canonical identifier.`,
  );
}
