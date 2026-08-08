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
import {
  handleValuationV1Route,
  type ValuationV1RouteDependencies,
} from "./v1/valuation_routes.ts";
import {
  handleMatchingV1Route,
  type MatchingV1RouteDependencies,
} from "./v1/matching_routes.ts";
import {
  type DeliverablesV1RouteDependencies,
  handleDeliverablesV1Route,
} from "./v1/deliverables_routes.ts";
import { type ClosingV1RouteDependencies } from "./v1/closing.ts";
import { handleClosingV1Route } from "./v1/closing_routes.ts";
import {
  handleNegotiationV1Route,
  type NegotiationV1RouteDependencies,
} from "./v1/negotiation_routes.ts";
import {
  type DealGovernanceV1RouteDependencies,
  handleDealGovernanceV1Route,
} from "./v1/deal_governance_routes.ts";
import { handleLegacyRoute } from "./routes/legacy.ts";
import { handleMvpRoute } from "./mvp_routes.ts";
import {
  handleHealthRequest,
  RuntimeReadiness,
} from "../platform/operations/health.ts";
import { loadExecutableDealManagement } from "./deal_management_bootstrap.ts";
import {
  createExecutableNegotiationComposition,
  type ExecutableNegotiationConfig,
} from "./negotiation_executable_composition.ts";

const PORT = 8000;

export interface WaveGRouteDependencies {
  readonly valuation?: ValuationV1RouteDependencies;
  readonly matching?: MatchingV1RouteDependencies;
  readonly deliverables?: DeliverablesV1RouteDependencies;
  readonly closing?: ClosingV1RouteDependencies;
  readonly governance?: DealGovernanceV1RouteDependencies;
}

export interface WaveHRouteDependencies {
  readonly negotiation?: NegotiationV1RouteDependencies;
}

export interface ApiServerOptions {
  readonly dealManagement?:
    | DealManagementComposition
    | DealManagementCompositionConfig
    | DealManagementCompositionResult;
  readonly repository?: DealRepository;
  readonly waveG?: WaveGRouteDependencies;
  readonly waveH?: WaveHRouteDependencies;
}

export interface ApiServerRouter {
  readonly dealManagement: DealManagementCompositionResult;
  readonly repository: DealRepository;
  readonly readiness: RuntimeReadiness;
  readonly waveG: WaveGRouteDependencies;
  readonly waveH: WaveHRouteDependencies;
  handle(request: Request): Promise<Response>;
}

function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, If-Match, Idempotency-Key, Last-Event-ID, X-Correlation-Id, X-Workspace-Id, X-Deal-Id",
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
  waveG: WaveGRouteDependencies,
  waveH: WaveHRouteDependencies,
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
      waveG,
      waveH,
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
  waveG: WaveGRouteDependencies,
  waveH: WaveHRouteDependencies,
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
  const waveHResponse = await routeWaveHRequest(request, waveH, headers);
  if (waveHResponse !== undefined) return waveHResponse;
  const waveGResponse = await routeWaveGRequest(request, waveG, headers);
  if (waveGResponse !== undefined) return waveGResponse;
  return await nonDealResponse(request, repository, headers);
}

async function routeWaveHRequest(
  request: Request,
  dependencies: WaveHRouteDependencies,
  headers: Headers,
): Promise<Response | undefined> {
  const path = new URL(request.url).pathname;
  if (!hasRoutePrefix(path, "/api/v1/negotiation")) return undefined;
  if (dependencies.negotiation === undefined) return waveHUnavailable(headers);
  return withCorsHeaders(
    await handleNegotiationV1Route(request, dependencies.negotiation) ??
      notFoundResponse(),
    headers,
  );
}

async function routeWaveGRequest(
  request: Request,
  dependencies: WaveGRouteDependencies,
  headers: Headers,
): Promise<Response | undefined> {
  const path = new URL(request.url).pathname;
  if (hasRoutePrefix(path, "/api/v1/valuation")) {
    return await routeConfiguredWaveGRequest(
      request,
      dependencies.valuation,
      handleValuationV1Route,
      headers,
    );
  }
  if (hasRoutePrefix(path, "/api/v1/matching")) {
    return await routeConfiguredWaveGRequest(
      request,
      dependencies.matching,
      handleMatchingV1Route,
      headers,
    );
  }
  if (hasRoutePrefix(path, "/api/v1/deliverables")) {
    return await routeConfiguredWaveGRequest(
      request,
      dependencies.deliverables,
      handleDeliverablesV1Route,
      headers,
    );
  }
  if (hasRoutePrefix(path, "/api/v1/closing")) {
    return await routeConfiguredWaveGRequest(
      request,
      dependencies.closing,
      handleClosingV1Route,
      headers,
    );
  }
  if (hasRoutePrefix(path, "/api/v1/deal-governance")) {
    return await routeConfiguredWaveGRequest(
      request,
      dependencies.governance,
      handleDealGovernanceV1Route,
      headers,
    );
  }
  return undefined;
}

async function routeConfiguredWaveGRequest<TDependencies>(
  request: Request,
  dependencies: TDependencies | undefined,
  handler: (
    request: Request,
    dependencies: TDependencies,
  ) => Promise<Response | null>,
  headers: Headers,
): Promise<Response> {
  if (dependencies === undefined) return waveGUnavailable(headers);
  return withCorsHeaders(
    await handler(request, dependencies) ?? notFoundResponse(),
    headers,
  );
}

function hasRoutePrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function waveGUnavailable(headers: Headers): Response {
  return jsonResponse(
    { error: "Wave G route is not configured." },
    headers,
    503,
  );
}

function waveHUnavailable(headers: Headers): Response {
  return jsonResponse(
    { error: "Wave H route is not configured." },
    headers,
    503,
  );
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}

async function nonDealResponse(
  request: Request,
  repository: DealRepository,
  headers: Headers,
): Promise<Response> {
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
    waveG: options.waveG ?? {},
    waveH: options.waveH ?? {},
    handle: (request) =>
      routeRequest(
        request,
        repository,
        dealManagement,
        options.waveG ?? {},
        options.waveH ?? {},
        readiness,
      ),
  };
}

/**
 * Starts the HTTP server using the same explicit router used by tests.
 *
 * @example const server = startServer({ dealManagement: config })
 */
export function startServer(options?: ApiServerOptions): Deno.HttpServer {
  const router = options === undefined
    ? createExecutableApiServer()
    : createApiServer(options);
  void connectRepository(router.repository, router.readiness);
  console.log(`[API Server] Starting on http://localhost:${PORT}`);
  return Deno.serve(
    { port: PORT },
    router.handle,
  );
}

/** Creates the exact production router used by the executable entry point. */
export function createExecutableApiServer(
  environment?: Readonly<Record<string, string | undefined>>,
  options: {
    readonly dealManagement?: ApiServerOptions["dealManagement"];
    readonly waveH?: WaveHRouteDependencies;
    readonly negotiation?: ExecutableNegotiationConfig;
  } = {},
): ApiServerRouter {
  let dealManagement: ApiServerOptions["dealManagement"];
  try {
    dealManagement = options.dealManagement ??
      loadExecutableDealManagement(environment);
  } catch (error) {
    throw error;
  }
  if (options.waveH !== undefined) {
    return createApiServer({ dealManagement, waveH: options.waveH });
  }
  const resolved = resolveDealManagement(dealManagement);
  if (resolved.kind !== "configured") {
    return createApiServer({ dealManagement, waveH: {} });
  }
  try {
    const negotiation = createExecutableNegotiationComposition({
      deal: resolved.composition,
      config: options.negotiation,
    });
    return createApiServer({
      dealManagement,
      waveH: { negotiation },
    });
  } catch (error) {
    console.error("[API Server] Negotiation composition unavailable", error);
    return createApiServer({ dealManagement, waveH: {} });
  }
}

if (import.meta.main) startServer();

export { jsonResponse };

function withCorsHeaders(response: Response, cors: Headers): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of cors.entries()) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
