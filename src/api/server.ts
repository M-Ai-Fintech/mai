import { AgentOrchestrator } from "../agent/index.ts";
import { DealRepository } from "../core/db/DealRepository.ts";
import {
  createDealManagementComposition,
  type DealManagementComposition,
  type DealManagementCompositionConfig,
  type DealManagementCompositionResult,
} from "../deal_management/composition.ts";
import { handleIdentityAccessRoute } from "../identity_access/http.ts";
import { handleDealManagementRoute } from "../deal_management/http.ts";
import { handleLegacyRoute } from "./routes/legacy.ts";
import { handleMvpRoute } from "./mvp_routes.ts";
import {
  handleHealthRequest,
  RuntimeReadiness,
} from "../platform/operations/health.ts";

const PORT = 8000;

export interface ApiServerOptions {
  readonly dealManagement?:
    | DealManagementComposition
    | DealManagementCompositionConfig
    | DealManagementCompositionResult;
  readonly repository?: DealRepository;
}

export interface ApiServerRouter {
  readonly dealManagement: DealManagementCompositionResult;
  readonly repository: DealRepository;
  readonly readiness: RuntimeReadiness;
  handle(request: Request): Promise<Response>;
}

function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, If-Match, Idempotency-Key, Last-Event-ID, X-Correlation-Id, X-Workspace-Id",
    "Access-Control-Expose-Headers": "ETag, X-Correlation-Id",
  });
}

function withMvpHeaders(response: Response, cors: Headers): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of cors.entries()) headers.set(name, value);
  headers.set("X-MAI-Persistence", "mock-backed-in-memory");
  headers.set(
    "Access-Control-Expose-Headers",
    "X-MAI-Persistence, X-Resource-Version",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function routeRequest(
  request: Request,
  repository: DealRepository,
  dealManagement: DealManagementCompositionResult,
  readiness: RuntimeReadiness,
): Promise<Response> {
  const headers = corsHeaders();
  if (request.method === "OPTIONS") return new Response(null, { headers });
  const healthResponse = handleHealthRequest(request, readiness);
  if (healthResponse) return healthResponse;
  try {
    return await routedResponse(
      request,
      repository,
      dealManagement,
      headers,
    );
  } catch (error: unknown) {
    return unexpectedResponse(error, headers);
  }
}

async function routedResponse(
  request: Request,
  repository: DealRepository,
  dealManagement: DealManagementCompositionResult,
  headers: Headers,
): Promise<Response> {
  const dealManagementResponse = await handleDealManagementRoute(
    request,
    dealManagement.kind === "configured"
      ? dealManagement.composition.http
      : undefined,
    headers,
  );
  if (dealManagementResponse) return dealManagementResponse;
  const identityAccessResponse = await handleIdentityAccessRoute(
    request,
    undefined,
    headers,
  );
  if (identityAccessResponse) return identityAccessResponse;
  const mvpResponse = await handleMvpRoute(request, {
    executeChat: async ({ dealId, message }) => ({
      content: await AgentOrchestrator.executeAgentQuery(dealId, message),
      citations: [],
    }),
  });
  if (mvpResponse) return withMvpHeaders(mvpResponse, headers);
  return await handleLegacyRoute(request, repository, headers) ??
    new Response("Not Found", { status: 404, headers });
}

function unexpectedResponse(error: unknown, headers: Headers): Response {
  console.error("[API Error]", error);
  const message = error instanceof Error
    ? error.message
    : "Unexpected server error";
  return jsonResponse({ error: message }, headers, 500);
}

function jsonResponse(
  body: unknown,
  headers: Headers,
  status = 200,
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  return Response.json(body, { status, headers: responseHeaders });
}

async function connectRepository(
  repository: DealRepository,
  readiness: RuntimeReadiness,
): Promise<void> {
  const connected = await repository.connect();
  readiness.setDatabaseState(connected);
  const message = connected
    ? "Database connected successfully."
    : "Database not connected. Running in fallback mode.";
  connected
    ? console.log(`[API Server] ${message}`)
    : console.warn(`[API Server] ${message}`);
}

/**
 * Creates the application router with one explicit Deal dependency graph.
 *
 * Missing configuration is retained as a governed unavailable result, while
 * configured Deal and legacy routes share the same process-scoped pool.
 *
 * @example const router = createApiServer({ dealManagement: config })
 */
export function createApiServer(
  options: ApiServerOptions = {},
): ApiServerRouter {
  const dealManagement = resolveDealManagement(options.dealManagement);
  const repository = options.repository ??
    (dealManagement.kind === "configured"
      ? new DealRepository(dealManagement.composition.pool)
      : DealRepository.getRepoInstance());
  const readiness = new RuntimeReadiness("api");
  return {
    dealManagement,
    repository,
    readiness,
    handle: (request) =>
      routeRequest(request, repository, dealManagement, readiness),
  };
}

/**
 * Starts the HTTP server using the same explicit router used by tests.
 *
 * @example const server = startServer({ dealManagement: config })
 */
export function startServer(options: ApiServerOptions = {}): Deno.HttpServer {
  const router = createApiServer(options);
  void connectRepository(router.repository, router.readiness);
  console.log(`[API Server] Starting on http://localhost:${PORT}`);
  return Deno.serve(
    { port: PORT },
    router.handle,
  );
}

if (import.meta.main) startServer();

export { jsonResponse };

function resolveDealManagement(
  value: ApiServerOptions["dealManagement"],
): DealManagementCompositionResult {
  if (value === undefined) {
    return {
      kind: "unavailable",
      reason: "missing_configuration",
      message: "Deal Management is not configured.",
    };
  }
  if (isCompositionResult(value)) return value;
  if (isComposition(value)) {
    return { kind: "configured", composition: value };
  }
  return createDealManagementComposition(value);
}

function isCompositionResult(
  value: ApiServerOptions["dealManagement"],
): value is DealManagementCompositionResult {
  return typeof value === "object" && value !== null && "kind" in value;
}

function isComposition(
  value: ApiServerOptions["dealManagement"],
): value is DealManagementComposition {
  return typeof value === "object" && value !== null && "http" in value &&
    "pool" in value;
}
