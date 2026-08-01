import { parseWorkspaceId } from "../shared/contracts/identifiers.ts";
import { createProtectedNotFoundError } from "../platform/api/v1.ts";
import { createAdministrationContext } from "./context.ts";
import { createSessionContext } from "./authentication.ts";
import { IdentityAccessError } from "./errors.ts";
import { createAggregate, readAuthorizedIdentity } from "./http_commands.ts";
import {
  mapDomainError,
  safeAggregateDto,
  unauthenticated,
  writeError,
  writeResponse,
  writeSuccess,
} from "./http_response.ts";
import {
  type AuthenticatedPrincipal,
  type AuthenticatedRequest,
  type IdentityAccessHttpDependencies,
  readBody,
  requestCorrelation,
  requiredIdempotency,
  type RouteResult,
  routeSegments,
} from "./http_shared.ts";

const OWNED_COLLECTIONS = new Set([
  "institutions",
  "workspaces",
  "identities",
  "memberships",
  "invitations",
  "grants",
  "restrictions",
  "revocations",
]);
const WORKSPACE_HEADER = "X-Workspace-Id";
const SESSION_TTL_MS = 60 * 60 * 1000;

export async function handleIdentityAccessRoute(
  request: Request,
  dependencies: IdentityAccessHttpDependencies | undefined,
  baseHeaders = new Headers(),
): Promise<Response | undefined> {
  const segments = routeSegments(request.url);
  if (segments === undefined || !OWNED_COLLECTIONS.has(segments[0])) {
    return undefined;
  }
  const correlation = requestCorrelation(request, dependencies);
  if (correlation.kind === "error") {
    return writeResponse(correlation.response, 400, baseHeaders);
  }
  if (dependencies === undefined) {
    return writeError(
      {
        error: {
          code: "DEPENDENCY_UNAVAILABLE",
          message: "Identity access is not configured.",
          correlationId: correlation.value,
          retryable: true,
        },
      },
      503,
      baseHeaders,
    );
  }
  try {
    const authenticated = await authenticateRequest(
      request,
      dependencies,
      correlation.value,
    );
    if (authenticated.kind === "error") {
      return writeResponse(
        authenticated.response,
        authenticated.status,
        baseHeaders,
      );
    }
    if (request.method === "GET") {
      return await readRoute(
        segments,
        authenticated.value,
        dependencies,
        baseHeaders,
      );
    }
    if (request.method !== "POST") {
      return writeError(
        createProtectedNotFoundError(correlation.value),
        404,
        baseHeaders,
      );
    }
    return await createRoute(
      segments,
      authenticated.value,
      dependencies,
      request,
      baseHeaders,
    );
  } catch (error) {
    return mapDomainError(error, correlation.value, baseHeaders);
  }
}

async function authenticateRequest(
  request: Request,
  dependencies: IdentityAccessHttpDependencies,
  correlationIdValue: Parameters<typeof unauthenticated>[0],
): Promise<RouteResult> {
  const credential = request.headers.get("Authorization");
  if (credential === null || credential.trim().length === 0) {
    return {
      kind: "error",
      response: unauthenticated(correlationIdValue),
      status: 401,
    };
  }
  try {
    const principal = await dependencies.authentication.authenticate({
      credential,
    });
    const scopedPrincipal = selectWorkspace(principal, request);
    const now = dependencies.now();
    const session = createSessionContext({
      sessionId: dependencies.nextSessionId(),
      principal: scopedPrincipal,
      correlationId: correlationIdValue,
      issuedAt: now,
      expiresAt: new Date(Date.parse(now) + SESSION_TTL_MS).toISOString(),
    });
    dependencies.sessionRegistry?.register(session);
    return {
      kind: "ok",
      value: {
        session,
        context: createAdministrationContext({
          actor: scopedPrincipal.actor,
          request: session.toRequestContext("http"),
          now,
        }),
        correlationId: correlationIdValue,
      },
    };
  } catch (error) {
    if (
      error instanceof IdentityAccessError && error.code === "SCOPE_MISMATCH"
    ) {
      return {
        kind: "error",
        response: createProtectedNotFoundError(correlationIdValue),
        status: 404,
      };
    }
    return {
      kind: "error",
      response: unauthenticated(correlationIdValue),
      status: 401,
    };
  }
}

function selectWorkspace(
  principal: AuthenticatedPrincipal,
  request: Request,
): AuthenticatedPrincipal {
  const header = request.headers.get(WORKSPACE_HEADER);
  if (header === null) return principal;
  const parsed = parseWorkspaceId(header);
  if (!parsed.ok) {
    throw new IdentityAccessError(
      "INVALID_INPUT",
      `workspace header "${header}" is invalid.`,
    );
  }
  if (
    principal.workspaceId !== undefined &&
    principal.workspaceId !== parsed.value
  ) {
    throw new IdentityAccessError(
      "SCOPE_MISMATCH",
      `workspace "${parsed.value}" is outside the authenticated scope.`,
    );
  }
  return { ...principal, workspaceId: parsed.value };
}

async function readRoute(
  segments: readonly string[],
  authenticated: AuthenticatedRequest,
  dependencies: IdentityAccessHttpDependencies,
  baseHeaders: Headers,
): Promise<Response> {
  if (segments.length !== 2 || segments[0] !== "identities") {
    return writeError(
      createProtectedNotFoundError(authenticated.correlationId),
      404,
      baseHeaders,
    );
  }
  const result = await readAuthorizedIdentity(
    segments[1],
    authenticated,
    dependencies.repository,
    dependencies.policyClock,
  );
  if (result.kind === "protected_not_found") {
    return writeError(result.response, 404, baseHeaders);
  }
  return writeSuccess(
    result.value,
    authenticated.correlationId,
    undefined,
    200,
    baseHeaders,
  );
}

async function createRoute(
  segments: readonly string[],
  authenticated: AuthenticatedRequest,
  dependencies: IdentityAccessHttpDependencies,
  request: Request,
  baseHeaders: Headers,
): Promise<Response> {
  const body = await readBody(request);
  const result = await createAggregate(
    segments,
    body,
    authenticated,
    dependencies.service,
    requiredIdempotency(request, authenticated.correlationId),
    request.headers.get("If-Match"),
  );
  return writeSuccess(
    safeAggregateDto(result),
    authenticated.correlationId,
    result.version,
    201,
    baseHeaders,
  );
}

export type { IdentityAccessHttpDependencies } from "./http_shared.ts";
