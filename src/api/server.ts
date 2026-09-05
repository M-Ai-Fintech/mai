import type { CorrelationId } from "../platform/api/v1.ts";
import { DealRepository } from "../core/db/DealRepository.ts";
import type { DealManagementCompositionResult } from "../deal_management/composition.ts";
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
import {
  type FinancialRiskServerRouteDependencies,
  routeFinancialRiskRequest,
} from "./v1/financial_risk_server.ts";
import {
  type CoreWorkflowRouteDependencies,
  routeCoreWorkflowRequest,
} from "./core_workflow_routes.ts";
import {
  type DemoReadinessV1RouteDependencies,
  handleDemoReadinessV1Route,
} from "./v1/demo_readiness_routes.ts";
import { RuntimeReadiness } from "../platform/operations/health.ts";
import {
  logOperationalEvent,
  safeErrorCode,
} from "../platform/operations/diagnostics.ts";
import {
  apiCorsHeaders,
  configuredPort,
  installApiShutdown,
  jsonResponse,
  requestCorrelationId,
  requestWithCorrelation,
  withCorrelationId,
  withCorsHeaders,
} from "./server_runtime.ts";
import { routeNonDealRequest } from "./non_deal_routes.ts";
import { loadExecutableDealManagement } from "./deal_management_bootstrap.ts";
import {
  createExecutableNegotiationComposition,
  type ExecutableNegotiationConfig,
} from "./negotiation_executable_composition.ts";
import { createExecutableCoreWorkflowComposition } from "./core_workflow_executable_composition.ts";
import {
  createExecutableDemoReadinessComposition,
} from "./demo_readiness_executable_composition.ts";
import { loadExecutableDemoReadinessConfig } from "../demo_readiness/executable_config.ts";
import {
  handleWorkspaceShellRoute,
  type WorkspaceShellRouteDependencies,
} from "./workspace_shell_routes.ts";
import {
  configuredWorkspaceShell,
  type DealManagementInput,
  resolveDealManagementComposition,
} from "./workspace_shell_composition.ts";
import type { ExecutableCapabilityDependencies } from "./capability_readiness.ts";
import type { CapabilityFamily } from "./contracts/capability_readiness.ts";
import { executableCapabilityDependencies } from "./capability_composition.ts";
import { handleOperationalRoute } from "./operational_routes.ts";

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

export type WaveJRouteDependencies = FinancialRiskServerRouteDependencies;

export type { CoreWorkflowRouteDependencies } from "./core_workflow_routes.ts";

export interface ApiServerOptions {
  readonly capabilityFailures?: Readonly<
    Partial<Record<CapabilityFamily, true>>
  >;
  readonly coreWorkflow?: CoreWorkflowRouteDependencies;
  readonly demoReadiness?: DemoReadinessV1RouteDependencies;
  readonly dealManagement?: DealManagementInput;
  readonly repository?: DealRepository;
  readonly waveG?: WaveGRouteDependencies;
  readonly waveH?: WaveHRouteDependencies;
  readonly waveJ?: WaveJRouteDependencies;
  readonly workspaceShell?: WorkspaceShellRouteDependencies;
}

export interface ApiServerRouter {
  readonly coreWorkflow: CoreWorkflowRouteDependencies;
  readonly demoReadiness?: DemoReadinessV1RouteDependencies;
  readonly dealManagement: DealManagementCompositionResult;
  readonly repository: DealRepository;
  readonly readiness: RuntimeReadiness;
  readonly waveG: WaveGRouteDependencies;
  readonly waveH: WaveHRouteDependencies;
  readonly waveJ: WaveJRouteDependencies;
  readonly workspaceShell?: WorkspaceShellRouteDependencies;
  handle(request: Request): Promise<Response>;
}

async function routeRequest(
  request: Request,
  repository: DealRepository,
  dealManagement: DealManagementCompositionResult,
  waveG: WaveGRouteDependencies,
  waveH: WaveHRouteDependencies,
  waveJ: WaveJRouteDependencies,
  coreWorkflow: CoreWorkflowRouteDependencies,
  demoReadiness: DemoReadinessV1RouteDependencies | undefined,
  workspaceShell: WorkspaceShellRouteDependencies | undefined,
  readiness: RuntimeReadiness,
  capabilityDependencies: ExecutableCapabilityDependencies,
  capabilityFailures: Readonly<Partial<Record<CapabilityFamily, true>>>,
): Promise<Response> {
  const headers = apiCorsHeaders();
  const correlationId = requestCorrelationId(request);
  if (request.method === "OPTIONS") return new Response(null, { headers });
  const operationalResponse = handleOperationalRoute(
    request,
    readiness,
    { dependencies: capabilityDependencies, failures: capabilityFailures },
    correlationId,
    headers,
  );
  if (operationalResponse) return operationalResponse;
  try {
    return withCorrelationId(
      await routedResponse(
        request,
        repository,
        dealManagement,
        waveG,
        waveH,
        waveJ,
        coreWorkflow,
        demoReadiness,
        workspaceShell,
        headers,
        correlationId,
      ),
      correlationId,
    );
  } catch (error: unknown) {
    return unexpectedResponse(error, headers, correlationId);
  }
}

async function routedResponse(
  request: Request,
  repository: DealRepository,
  dealManagement: DealManagementCompositionResult,
  waveG: WaveGRouteDependencies,
  waveH: WaveHRouteDependencies,
  waveJ: WaveJRouteDependencies,
  coreWorkflow: CoreWorkflowRouteDependencies,
  demoReadiness: DemoReadinessV1RouteDependencies | undefined,
  workspaceShell: WorkspaceShellRouteDependencies | undefined,
  headers: Headers,
  correlationId: CorrelationId,
): Promise<Response> {
  const workspaceShellResponse = await handleWorkspaceShellRoute(
    request,
    workspaceShell,
    headers,
  );
  if (workspaceShellResponse !== undefined) return workspaceShellResponse;
  const dealManagementResponse = await handleDealManagementRoute(
    request,
    dealManagement.kind === "configured"
      ? dealManagement.composition.http
      : undefined,
    headers,
  );
  if (dealManagementResponse) return dealManagementResponse;
  const demoResponse = demoReadiness === undefined
    ? undefined
    : await handleDemoReadinessV1Route(
      requestWithCorrelation(request, correlationId),
      demoReadiness,
    );
  if (demoResponse !== undefined) return withCorsHeaders(demoResponse, headers);
  const coreWorkflowResponse = await routeCoreWorkflowRequest(
    request,
    coreWorkflow,
    headers,
  );
  if (coreWorkflowResponse !== undefined) return coreWorkflowResponse;
  const waveHResponse = await routeWaveHRequest(request, waveH, headers);
  if (waveHResponse !== undefined) return waveHResponse;
  const waveJResponse = await routeFinancialRiskRequest(
    request,
    waveJ,
    headers,
    correlationId,
  );
  if (waveJResponse !== undefined) return waveJResponse;
  const waveGResponse = await routeWaveGRequest(request, waveG, headers);
  if (waveGResponse !== undefined) return waveGResponse;
  return await routeNonDealRequest(request, repository, headers);
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

function unexpectedResponse(
  error: unknown,
  headers: Headers,
  correlationId: string,
): Response {
  logOperationalEvent("api.error", {
    correlationId,
    errorCode: safeErrorCode(error),
  });
  return jsonResponse(
    { error: "Unexpected server error", correlationId },
    headers,
    500,
  );
}

async function connectRepository(
  repository: DealRepository,
  readiness: RuntimeReadiness,
): Promise<void> {
  const connected = await repository.connect();
  readiness.setDatabaseState(connected);
  logOperationalEvent("api.database", {
    state: connected ? "connected" : "not-ready",
  });
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
  const dealManagement = resolveDealManagementComposition(
    options.dealManagement,
  );
  const repository = options.repository ??
    (dealManagement.kind === "configured"
      ? new DealRepository(dealManagement.composition.pool)
      : DealRepository.getRepoInstance());
  const readiness = new RuntimeReadiness("api");
  const workspaceShell = options.workspaceShell ??
    configuredWorkspaceShell(dealManagement);
  const capabilityDependencies = executableCapabilityDependencies(
    dealManagement,
    options,
    workspaceShell,
  );
  return {
    coreWorkflow: options.coreWorkflow ?? {},
    demoReadiness: options.demoReadiness,
    dealManagement,
    repository,
    readiness,
    waveG: options.waveG ?? {},
    waveH: options.waveH ?? {},
    waveJ: options.waveJ ?? {},
    workspaceShell,
    handle: (request) =>
      routeRequest(
        request,
        repository,
        dealManagement,
        options.waveG ?? {},
        options.waveH ?? {},
        options.waveJ ?? {},
        options.coreWorkflow ?? {},
        options.demoReadiness,
        workspaceShell,
        readiness,
        capabilityDependencies,
        options.capabilityFailures ?? {},
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
  const port = configuredPort(Deno.env.toObject());
  logOperationalEvent("api.starting", { port });
  const server = Deno.serve({ port }, router.handle);
  installApiShutdown(server, router.readiness);
  return server;
}

/** Creates the exact production router used by the executable entry point. */
export function createExecutableApiServer(
  environment?: Readonly<Record<string, string | undefined>>,
  options: {
    readonly dealManagement?: ApiServerOptions["dealManagement"];
    readonly waveH?: WaveHRouteDependencies;
    readonly waveJ?: WaveJRouteDependencies;
    readonly negotiation?: ExecutableNegotiationConfig;
    readonly coreWorkflow?: CoreWorkflowRouteDependencies;
  } = {},
): ApiServerRouter {
  const executableEnvironment = environment ?? Deno.env.toObject();
  let dealManagement: ApiServerOptions["dealManagement"];
  try {
    dealManagement = options.dealManagement ??
      loadExecutableDealManagement(executableEnvironment);
  } catch (error) {
    throw error;
  }
  const resolved = resolveDealManagementComposition(dealManagement);
  if (resolved.kind !== "configured") {
    return createApiServer({
      dealManagement,
      coreWorkflow: options.coreWorkflow,
      waveH: options.waveH ?? {},
      waveJ: options.waveJ,
    });
  }
  const coreWorkflow = options.coreWorkflow ??
    createExecutableCoreWorkflowComposition(resolved.composition).routes;
  const demoConfig = loadExecutableDemoReadinessConfig(executableEnvironment);
  const demoReadiness = demoConfig === undefined
    ? undefined
    : createExecutableDemoReadinessComposition(
      resolved.composition,
      demoConfig,
    );
  if (options.waveH !== undefined) {
    return createApiServer({
      dealManagement,
      coreWorkflow,
      demoReadiness,
      waveH: options.waveH,
      waveJ: options.waveJ,
    });
  }
  try {
    const negotiation = createExecutableNegotiationComposition({
      deal: resolved.composition,
      config: options.negotiation,
    });
    return createApiServer({
      dealManagement,
      coreWorkflow,
      demoReadiness,
      waveH: { negotiation },
      waveJ: options.waveJ,
    });
  } catch (error) {
    console.error("[API Server] Negotiation composition unavailable", error);
    return createApiServer({
      dealManagement,
      coreWorkflow,
      demoReadiness,
      waveH: {},
      waveJ: options.waveJ,
      capabilityFailures: { "negotiation-room": true },
    });
  }
}

if (import.meta.main) startServer();

export { jsonResponse } from "./server_runtime.ts";
