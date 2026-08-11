import { parseDealId, type RequestContext } from "../platform/api/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import type { DealAuthenticationPort } from "../deal_management/http_shared.ts";
import { correlationFromRequest } from "./v1/negotiation.ts";

export interface ExecutableAuthenticatedContext {
  readonly context: RequestContext;
  readonly actor: ActorReference;
}

export class ExecutableRequestContextError extends Error {
  constructor(
    readonly status: 400 | 401,
    readonly code: "AUTHENTICATION_REQUIRED" | "DEAL_SCOPE_REQUIRED",
    message: string,
  ) {
    super(message);
    this.name = "ExecutableRequestContextError";
  }
}

/** Builds one context-owned request identity from persisted Identity Access.
 *
 * @example await context.contextFor(request)
 */
export class ExecutableRequestContext {
  private readonly actors = new WeakMap<RequestContext, ActorReference>();

  constructor(private readonly authentication: DealAuthenticationPort) {}

  async contextFor(request: Request): Promise<ExecutableAuthenticatedContext> {
    const credential = requiredCredential(request);
    const correlationId = correlationFromRequest(request);
    const principal = await this.authentication.authenticate({
      credential,
      request,
      correlationId,
    });
    const dealId = requiredDealId(request);
    const context: RequestContext = {
      actorId: principal.actor.id,
      sessionId: principal.sessionId,
      identityId: principal.identityId,
      tenantId: principal.tenantId,
      workspaceId: principal.workspaceId,
      dealId,
      correlationId,
      origin: "http",
    };
    this.actors.set(context, principal.actor);
    return {
      actor: principal.actor,
      context,
    };
  }

  actorFor(context: RequestContext): ActorReference {
    const actor = this.actors.get(context);
    if (actor !== undefined) return actor;
    throw new ExecutableRequestContextError(
      401,
      "AUTHENTICATION_REQUIRED",
      "The request context is not bound to an authenticated actor.",
    );
  }
}

function requiredCredential(request: Request): string {
  const credential = request.headers.get("Authorization")?.trim();
  if (credential) return credential;
  throw new ExecutableRequestContextError(
    401,
    "AUTHENTICATION_REQUIRED",
    "An authenticated Identity Access session is required.",
  );
}

function requiredDealId(
  request: Request,
): NonNullable<RequestContext["dealId"]> {
  const parsed = parseDealId(request.headers.get("X-Deal-Id")?.trim());
  if (parsed.ok) return parsed.value;
  throw new ExecutableRequestContextError(
    400,
    "DEAL_SCOPE_REQUIRED",
    "A canonical X-Deal-Id scope is required.",
  );
}
