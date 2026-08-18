import {
  type CorrelationId,
  createApiError,
  createProtectedNotFoundError,
  createSuccessEnvelope,
  parseCorrelationHeader,
} from "../platform/api/v1.ts";
import {
  type DealAuthenticationPort,
  DealAuthenticationUnavailableError,
  type DealAuthorizationPort,
  type DealCommandContext,
  dealScope,
  requestedDealFields,
} from "../deal_management/v1.ts";
import { createDealContext } from "../deal_management/http_shared.ts";
import { DEAL_ACTION, DEAL_RESOURCE } from "../deal_management/service.ts";

export interface WorkspaceShellQueryPort {
  query<T>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ readonly rows: readonly T[]; readonly rowCount: number | null }>;
}

export interface WorkspaceShellRouteDependencies {
  readonly authentication: DealAuthenticationPort;
  readonly authorization: DealAuthorizationPort;
  readonly query: WorkspaceShellQueryPort;
  readonly now: () => string;
  readonly nextCorrelationId: () => CorrelationId;
}

interface WorkspaceRow {
  readonly workspaceId: string;
  readonly document: unknown;
}

/** Routes the authenticated workspace projection from the Deal dependency graph. */
export async function handleWorkspaceShellRoute(
  request: Request,
  dependencies: WorkspaceShellRouteDependencies | undefined,
  baseHeaders = new Headers(),
): Promise<Response | undefined> {
  if (new URL(request.url).pathname !== "/api/v1/workspace-shell") {
    return undefined;
  }
  const correlation = shellCorrelation(request, dependencies);
  if (correlation instanceof Response) return correlation;
  if (request.method !== "GET") return response("Not Found", 404, baseHeaders);
  if (dependencies === undefined) return unavailable(correlation, baseHeaders);
  return await configuredShell(request, dependencies, correlation, baseHeaders);
}

async function configuredShell(
  request: Request,
  dependencies: WorkspaceShellRouteDependencies,
  correlationId: CorrelationId,
  headers: Headers,
): Promise<Response> {
  const principal = await authenticate(request, dependencies, correlationId)
    .catch((error) => errorResponse(error, correlationId, headers));
  if (principal instanceof Response) return principal;
  try {
    const context = createDealContext(
      principal,
      correlationId,
      dependencies.now(),
    );
    if (!await canAccessWorkspace(dependencies, context)) {
      return protectedNotFound(correlationId, headers);
    }
    const organization = await loadOrganization(dependencies.query, principal);
    return organization === undefined
      ? protectedNotFound(correlationId, headers)
      : success(organization, correlationId, headers);
  } catch {
    return unavailable(correlationId, headers);
  }
}

async function authenticate(
  request: Request,
  dependencies: WorkspaceShellRouteDependencies,
  correlationId: CorrelationId,
) {
  const credential = request.headers.get("Authorization");
  if (credential === null || credential.trim() === "") {
    throw new Error("missing_authentication");
  }
  return await dependencies.authentication.authenticate({
    credential,
    request,
    correlationId,
  });
}

async function canAccessWorkspace(
  dependencies: WorkspaceShellRouteDependencies,
  context: DealCommandContext,
): Promise<boolean> {
  const decision = await dependencies.authorization.authorize({
    context,
    scope: dealScope(context),
    resource: { kind: DEAL_RESOURCE, id: "workspace-shell" },
    action: DEAL_ACTION.read,
    requestedFields: requestedDealFields(),
  });
  return decision.outcome === "allow";
}

async function loadOrganization(
  query: WorkspaceShellQueryPort,
  principal: Awaited<ReturnType<DealAuthenticationPort["authenticate"]>>,
) {
  const result = await query.query<WorkspaceRow>(workspaceQuery, [
    principal.tenantId,
    principal.workspaceId,
  ]);
  if (result.rowCount !== 1) return undefined;
  const row = result.rows[0];
  const document = record(row.document);
  return typeof document.name === "string" && document.name.trim() !== ""
    ? { id: row.workspaceId, name: document.name }
    : undefined;
}

function success(
  organization: { readonly id: string; readonly name: string },
  correlationId: CorrelationId,
  headers: Headers,
): Response {
  return response(
    createSuccessEnvelope({
      organization,
      permissions: ["workspace", "deal"],
      counts: {},
    }, { correlationId, freshness: "current" }),
    200,
    headers,
  );
}

function protectedNotFound(
  correlationId: CorrelationId,
  headers: Headers,
): Response {
  return response(createProtectedNotFoundError(correlationId), 404, headers);
}

function shellCorrelation(
  request: Request,
  dependencies: WorkspaceShellRouteDependencies | undefined,
): CorrelationId | Response {
  const received = request.headers.get("X-Correlation-Id");
  if (received === null) {
    return dependencies?.nextCorrelationId() ??
      "cor_workspace-shell-unavailable" as CorrelationId;
  }
  const parsed = parseCorrelationHeader(received);
  if (parsed.ok) return parsed.value;
  const fallback = dependencies?.nextCorrelationId() ??
    "cor_invalid" as CorrelationId;
  return response(
    createApiError({
      code: "VALIDATION_FAILED",
      message:
        "X-Correlation-Id is invalid; expected a canonical correlation identifier.",
      correlationId: fallback,
      retryable: false,
      fieldErrors: {},
    }),
    422,
    new Headers(),
  );
}

function errorResponse(
  error: unknown,
  correlationId: CorrelationId,
  headers: Headers,
): Response {
  const dependencyFailure = error instanceof DealAuthenticationUnavailableError;
  return response(
    createApiError({
      code: dependencyFailure ? "DEPENDENCY_UNAVAILABLE" : "UNAUTHENTICATED",
      message: dependencyFailure
        ? "Authentication provider is unavailable."
        : "Authentication failed.",
      correlationId,
      retryable: dependencyFailure,
    }),
    dependencyFailure ? 503 : 401,
    headers,
  );
}

function unavailable(correlationId: CorrelationId, headers: Headers): Response {
  return response(
    createApiError({
      code: "DEPENDENCY_UNAVAILABLE",
      message: "Workspace shell persistence is unavailable.",
      correlationId,
      retryable: true,
    }),
    503,
    headers,
  );
}

function response(
  body: unknown,
  status: number,
  baseHeaders: Headers,
): Response {
  const headers = new Headers(baseHeaders);
  headers.set("Content-Type", "application/json");
  return Response.json(body, { status, headers });
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : {};
}

const workspaceQuery = `SELECT workspace_id AS "workspaceId", document
  FROM iam.workspaces
  WHERE tenant_id = $1 AND workspace_id = $2 AND state = 'active'`;
