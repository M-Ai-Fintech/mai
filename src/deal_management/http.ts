import { createApiError } from "../platform/api/v1.ts";
import { readDealProjection } from "./read_model.ts";
import {
  type DealLifecycleReadProjection,
  readDealLifecycleProjection as loadDealLifecycleProjection,
} from "./lifecycle/projection.ts";
import { executeDealCommand } from "./http_commands.ts";
import { parseDealRouteId } from "./route_identifiers.ts";
import type { DealProjection } from "./contracts.ts";
import { projectDealCommandResult } from "./projection.ts";
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
  | DealLifecycleReadProjection
  | {
    readonly dealId: DealProjection["id"];
    readonly version: DealProjection["version"];
    readonly mandate: DealProjection["mandate"];
  }
  | {
    readonly dealId: DealProjection["id"];
    readonly version: DealProjection["version"];
    readonly parties: DealProjection["parties"];
  }
  | {
    readonly dealId: DealProjection["id"];
    readonly version: DealProjection["version"];
    readonly milestones: DealLifecycleReadProjection["lifecycle"]["milestones"];
  }
  | {
    readonly dealId: DealProjection["id"];
    readonly version: DealProjection["version"];
    readonly activity: DealLifecycleReadProjection["activity"];
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
  return await dispatchConfigured(
    request,
    segments,
    dependencies,
    correlation.value,
    baseHeaders,
  );
}

async function dispatchConfigured(
  request: Request,
  segments: readonly string[],
  dependencies: DealManagementHttpDependencies,
  correlationId: Parameters<typeof createDealContext>[1],
  baseHeaders: Headers,
) {
  try {
    return await dispatchRoute(
      request,
      segments,
      dependencies,
      correlationId,
      baseHeaders,
    );
  } catch (error) {
    return mapDealError(error, correlationId, baseHeaders);
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
  return await dispatchMethod(
    request,
    segments,
    context,
    dependencies,
    baseHeaders,
  );
}

async function dispatchMethod(
  request: Request,
  segments: readonly string[],
  context: ReturnType<typeof createDealContext>,
  dependencies: DealManagementHttpDependencies,
  baseHeaders: Headers,
) {
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
  if (isLifecycleReadRoute(segments)) {
    const result = await readLifecycleProjection(
      parsedDealId,
      context,
      dependencies,
    );
    if (result.kind === "protected_not_found") {
      return writeResponse(result.response, 404, baseHeaders);
    }
    return lifecycleReadSuccess(
      segments[2],
      result.value,
      context,
      baseHeaders,
    );
  }
  const result = await readProjection(parsedDealId, context, dependencies);
  if (result.kind === "protected_not_found") {
    return writeResponse(result.response, 404, baseHeaders);
  }
  return readSuccess(segments[2], result.value, context, baseHeaders);
}

function readProjection(
  dealId: Parameters<typeof readDealProjection>[0]["dealId"],
  context: ReturnType<typeof createDealContext>,
  dependencies: DealManagementHttpDependencies,
) {
  return readDealProjection({
    context,
    dealId,
    repository: dependencies.repository,
    authorization: dependencies.authorization,
  });
}

function readSuccess(
  subresource: string | undefined,
  deal: DealProjection,
  context: ReturnType<typeof createDealContext>,
  baseHeaders: Headers,
) {
  return writeSuccess(
    readRouteData(subresource, deal),
    context.request.correlationId,
    deal.version,
    200,
    baseHeaders,
  );
}

function readLifecycleProjection(
  dealId: Parameters<typeof loadDealLifecycleProjection>[0]["dealId"],
  context: ReturnType<typeof createDealContext>,
  dependencies: DealManagementHttpDependencies,
) {
  return loadDealLifecycleProjection({
    context,
    dealId,
    repository: dependencies.repository,
    authorization: dependencies.authorization,
  });
}

function lifecycleReadSuccess(
  subresource: string | undefined,
  value: DealLifecycleReadProjection,
  context: ReturnType<typeof createDealContext>,
  baseHeaders: Headers,
): Response {
  return writeSuccess(
    lifecycleRouteData(subresource, value),
    context.request.correlationId,
    value.lifecycle.version,
    200,
    baseHeaders,
  );
}

function isReadRoute(segments: readonly string[]): boolean {
  return segments.length === 2 ||
    (segments.length === 3 &&
      ["mandate", "parties", "lifecycle", "milestones", "activity"].includes(
        segments[2],
      ));
}

function isLifecycleReadRoute(segments: readonly string[]): boolean {
  return segments.length === 3 &&
    ["lifecycle", "milestones", "activity"].includes(segments[2]);
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

function lifecycleRouteData(
  subresource: string | undefined,
  value: DealLifecycleReadProjection,
): DealSubresourceResponse {
  const dealId = value.lifecycle.dealId;
  const version = value.lifecycle.version;
  if (subresource === "milestones") {
    return {
      dealId,
      version,
      milestones: value.lifecycle.milestones,
    };
  }
  if (subresource === "activity") {
    return {
      dealId,
      version,
      activity: value.activity,
    };
  }
  return value;
}

async function commandRoute(
  request: Request,
  segments: readonly string[],
  context: ReturnType<typeof createDealContext>,
  dependencies: DealManagementHttpDependencies,
  baseHeaders: Headers,
): Promise<Response> {
  if (segments.length < 1 || segments.length > 5) {
    return writeResponse("Not Found", 404, baseHeaders);
  }
  const result = await executeDealCommand({
    request,
    segments,
    context,
    service: dependencies.service,
  });
  return writeSuccess(
    result.lifecycle === undefined
      ? safeCommandDto(result)
      : projectDealCommandResult(result),
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
