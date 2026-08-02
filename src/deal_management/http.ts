import { createApiError } from "../platform/api/v1.ts";
import { dealId } from "./ids.ts";
import { readDealProjection } from "./read_model.ts";
import { executeDealCommand } from "./http_commands.ts";
import {
  mapDealError,
  safeCommandDto,
  writeResponse,
  writeSuccess,
} from "./http_response.ts";
import {
  createDealContext,
  DealAuthenticationError,
  type DealManagementHttpDependencies,
  requestCorrelation,
  RequestInputError,
  routeSegments,
} from "./http_shared.ts";

const DEAL_ROOT = "deals";

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
    const principal = await authenticate(
      request,
      dependencies,
      correlation.value,
    );
    const context = createDealContext(
      principal,
      correlation.value,
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
  } catch (error) {
    return mapDealError(error, correlation.value, baseHeaders);
  }
}

async function authenticate(
  request: Request,
  dependencies: DealManagementHttpDependencies,
  correlationId: Parameters<typeof createDealContext>[1],
) {
  const credential = request.headers.get("Authorization");
  if (credential === null || credential.trim().length === 0) {
    throw new DealAuthenticationError("Authentication is required.");
  }
  try {
    return await dependencies.authentication.authenticate({
      request,
      credential,
      correlationId,
    });
  } catch {
    throw new DealAuthenticationError();
  }
}

async function readRoute(
  segments: readonly string[],
  context: ReturnType<typeof createDealContext>,
  dependencies: DealManagementHttpDependencies,
  baseHeaders: Headers,
): Promise<Response> {
  if (
    segments.length !== 2 &&
    (segments.length !== 3 || !["mandate", "parties"].includes(segments[2]))
  ) return writeResponse("Not Found", 404, baseHeaders);
  const parsedDealId = parseRouteDealId(segments[1]);
  const result = await readDealProjection({
    context,
    dealId: parsedDealId,
    repository: dependencies.repository,
    authorization: dependencies.authorization,
  });
  if (result.kind === "protected_not_found") {
    return writeResponse(result.response, 404, baseHeaders);
  }
  const data = segments[2] === "mandate"
    ? {
      dealId: result.value.id,
      version: result.value.version,
      mandate: result.value.mandate,
    }
    : segments[2] === "parties"
    ? {
      dealId: result.value.id,
      version: result.value.version,
      parties: result.value.parties,
    }
    : result.value;
  return writeSuccess(
    data,
    context.request.correlationId,
    result.value.version,
    200,
    baseHeaders,
  );
}

function parseRouteDealId(value: string | undefined) {
  if (value === undefined) {
    throw new RequestInputError("dealId is required in the route.");
  }
  try {
    return dealId(value);
  } catch {
    throw new RequestInputError(
      `dealId "${value}" is invalid; expected a canonical Deal identifier.`,
    );
  }
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
