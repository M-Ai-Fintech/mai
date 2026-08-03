import { createApiError } from "../platform/api/v1.ts";
import { readDealProjection } from "./read_model.ts";
import { executeDealCommand } from "./http_commands.ts";
import { parseDealRouteId } from "./route_identifiers.ts";
import type { DealProjection } from "./contracts.ts";
import {
  mapDealError,
  safeCommandDto,
  writeResponse,
  writeSuccess,
} from "./http_response.ts";
import {
  createDealContext,
  type DealAuthenticatedPrincipal,
  DealAuthenticationError,
  DealAuthenticationUnavailableError,
  type DealManagementHttpDependencies,
  requestCorrelation,
  routeSegments,
} from "./http_shared.ts";

const DEAL_ROOT = "deals";

type DealSubresourceResponse =
  | DealProjection
  | {
    readonly dealId: DealProjection["id"];
    readonly version: DealProjection["version"];
    readonly mandate: DealProjection["mandate"];
  }
  | {
    readonly dealId: DealProjection["id"];
    readonly version: DealProjection["version"];
    readonly parties: DealProjection["parties"];
  };

/**
 * Routes one Deal Management HTTP request through authentication and policy.
 *
 * @example await handleDealManagementRoute(request, dependencies)
 */
export async function handleDealManagementRoute(
  request: Request,
  dependencies: DealManagementHttpDependencies | undefined,
  baseHeaders = new Headers(),
): Promise<Response | undefined> {
  const segments = routeSegments(request.url);
  if (segments === undefined || segments[0] !== DEAL_ROOT) return undefined;
  const correlation = requestCorrelation(request, dependencies);
  if (correlation.kind === "error") {
    return writeResponse(correlation.response, 400, baseHeaders);
  }
  if (dependencies === undefined) {
    return dependencyUnavailable(correlation.value, baseHeaders);
  }
  try {
    return await dispatchRoute(
      request,
      segments,
      dependencies,
      correlation.value,
      baseHeaders,
    );
  } catch (error) {
    return mapDealError(error, correlation.value, baseHeaders);
  }
}

async function dispatchRoute(
  request: Request,
  segments: readonly string[],
  dependencies: DealManagementHttpDependencies,
  correlationId: Parameters<typeof createDealContext>[1],
  baseHeaders: Headers,
): Promise<Response | undefined> {
  const principal = await authenticate(request, dependencies, correlationId);
  const context = createDealContext(
    principal,
    correlationId,
    dependencies.now(),
  );
  if (request.method === "GET") {
    return await readRoute(segments, context, dependencies, baseHeaders);
  }
  if (request.method === "POST") {
    return await commandRoute(
      request,
      segments,
      context,
      dependencies,
      baseHeaders,
    );
  }
  return undefined;
}

async function authenticate(
  request: Request,
  dependencies: DealManagementHttpDependencies,
  correlationId: Parameters<typeof createDealContext>[1],
): Promise<DealAuthenticatedPrincipal> {
  const credential = request.headers.get("Authorization");
  if (credential === null || credential.trim().length === 0) {
    throw new DealAuthenticationError("Authentication is required.");
  }
  return await authenticateWithProvider(
    request,
    dependencies,
    correlationId,
    credential,
  );
}

async function authenticateWithProvider(
  request: Request,
  dependencies: DealManagementHttpDependencies,
  correlationId: Parameters<typeof createDealContext>[1],
  credential: string,
): Promise<DealAuthenticatedPrincipal> {
  try {
    return await dependencies.authentication.authenticate({
      request,
      credential,
      correlationId,
    });
  } catch (error) {
    if (error instanceof DealAuthenticationUnavailableError) throw error;
    throw new DealAuthenticationError();
  }
}

async function readRoute(
  segments: readonly string[],
  context: ReturnType<typeof createDealContext>,
  dependencies: DealManagementHttpDependencies,
  baseHeaders: Headers,
): Promise<Response> {
  if (!isReadRoute(segments)) {
    return writeResponse("Not Found", 404, baseHeaders);
  }
  const parsedDealId = parseDealRouteId(segments[1]);
  const result = await readDealProjection({
    context,
    dealId: parsedDealId,
    repository: dependencies.repository,
    authorization: dependencies.authorization,
  });
  if (result.kind === "protected_not_found") {
    return writeResponse(result.response, 404, baseHeaders);
  }
  return writeSuccess(
    readRouteData(segments[2], result.value),
    context.request.correlationId,
    result.value.version,
    200,
    baseHeaders,
  );
}

function isReadRoute(segments: readonly string[]): boolean {
  return segments.length === 2 ||
    (segments.length === 3 && ["mandate", "parties"].includes(segments[2]));
}

function readRouteData(
  subresource: string | undefined,
  deal: DealProjection,
): DealSubresourceResponse {
  return subresource === "mandate"
    ? {
      dealId: deal.id,
      version: deal.version,
      mandate: deal.mandate,
    }
    : subresource === "parties"
    ? {
      dealId: deal.id,
      version: deal.version,
      parties: deal.parties,
    }
    : deal;
}

async function commandRoute(
  request: Request,
  segments: readonly string[],
  context: ReturnType<typeof createDealContext>,
  dependencies: DealManagementHttpDependencies,
  baseHeaders: Headers,
): Promise<Response> {
  if (segments.length < 1 || segments.length > 3) {
    return writeResponse("Not Found", 404, baseHeaders);
  }
  const result = await executeDealCommand({
    request,
    segments,
    context,
    service: dependencies.service,
  });
  return writeSuccess(
    safeCommandDto(result),
    context.request.correlationId,
    result.deal.version,
    result.operation === "created" ? 201 : 200,
    baseHeaders,
  );
}

function dependencyUnavailable(
  correlationId: Parameters<typeof createDealContext>[1],
  baseHeaders: Headers,
): Response {
  return writeResponse(
    createApiError({
      code: "DEPENDENCY_UNAVAILABLE",
      message: "Deal Management is not configured.",
      correlationId,
      retryable: true,
    }),
    503,
    baseHeaders,
  );
}
