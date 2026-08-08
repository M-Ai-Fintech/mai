import {
  API_ERROR_CATALOG,
  createAcceptedJobEnvelope,
  createApiError,
  createSuccessEnvelope,
  type ErrorEnvelope,
  parseIdempotencyHeader,
  parseIfMatch,
  type RequestContext,
} from "../../platform/api/v1.ts";
import {
  parseApprovalId,
  parseComparisonId,
  parseInvalidationId,
  parseJobId,
  parseOperationId,
  parseResultId,
  parseScenarioId,
} from "../../valuation/v1.ts";
import {
  type ApproveValuationRequest,
  type EnqueueValuationComputeRequest,
  type InvalidateValuationRequest,
  type ValuationAuthenticatedContext,
  ValuationV1Application,
} from "./valuation.ts";
import type {
  ValuationComparisonId,
  ValuationResultId,
  ValuationScenarioId,
} from "../../valuation/ids.ts";

const BASE_PATH = "/api/v1/valuation";

export interface ValuationRequestContextPort {
  contextFor(
    request: Request,
  ): Promise<ValuationAuthenticatedContext> | ValuationAuthenticatedContext;
}

export interface ValuationV1RouteDependencies {
  readonly context: ValuationRequestContextPort;
  readonly application: ValuationV1Application;
}

export async function handleValuationV1Route(
  request: Request,
  dependencies: ValuationV1RouteDependencies,
): Promise<Response | null> {
  const route = parseRoute(new URL(request.url).pathname);
  if (route === undefined) return null;
  const authenticated = await dependencies.context.contextFor(request);
  if (request.method === "GET") {
    return readRoute(route, authenticated, dependencies.application);
  }
  if (request.method !== "POST") return methodNotAllowed();
  if (route.kind === "compute") {
    return computeRoute(
      request,
      route.scenarioId,
      authenticated,
      dependencies.application,
    );
  }
  if (route.kind === "approve") {
    return approveRoute(
      request,
      route,
      authenticated,
      dependencies.application,
    );
  }
  if (route.kind === "invalidate") {
    return invalidateRoute(
      request,
      route.scenarioId,
      authenticated,
      dependencies.application,
    );
  }
  return methodNotAllowed();
}

type Route =
  | { readonly kind: "scenario"; readonly id: ValuationScenarioId }
  | { readonly kind: "result"; readonly id: ValuationResultId }
  | { readonly kind: "comparison"; readonly id: ValuationComparisonId }
  | { readonly kind: "compute"; readonly scenarioId: ValuationScenarioId }
  | {
    readonly kind: "approve";
    readonly scenarioId: ValuationScenarioId;
    readonly resultId: ValuationResultId;
  }
  | { readonly kind: "invalidate"; readonly scenarioId: ValuationScenarioId };

function parseRoute(path: string): Route | undefined {
  const normalized = path.replace(/\/+$/, "");
  if (normalized === BASE_PATH) return undefined;
  const parts = normalized.split("/").filter(Boolean);
  if (
    parts.length < 4 || parts[0] !== "api" || parts[1] !== "v1" ||
    parts[2] !== "valuation"
  ) return undefined;
  if (parts.length === 5 && parts[3] === "scenarios") {
    return scenarioRoute(parts[4]);
  }
  if (parts.length === 5 && parts[3] === "results") {
    return resultRoute(parts[4]);
  }
  if (parts.length === 5 && parts[3] === "comparisons") {
    return comparisonRoute(parts[4]);
  }
  if (
    parts.length === 6 && parts[3] === "scenarios" && parts[5] === "compute"
  ) return computeRoutePath(parts[4]);
  if (
    parts.length === 8 && parts[3] === "scenarios" && parts[5] === "results" &&
    parts[7] === "approve"
  ) return approveRoutePath(parts[4], parts[6]);
  if (
    parts.length === 6 && parts[3] === "scenarios" && parts[5] === "invalidate"
  ) return invalidateRoutePath(parts[4]);
  return undefined;
}

function scenarioRoute(raw: string): Route | undefined {
  const parsed = parseScenarioId(decodeURIComponent(raw));
  return parsed.ok ? { kind: "scenario", id: parsed.value } : undefined;
}

function resultRoute(raw: string): Route | undefined {
  const parsed = parseResultId(decodeURIComponent(raw));
  return parsed.ok ? { kind: "result", id: parsed.value } : undefined;
}

function comparisonRoute(raw: string): Route | undefined {
  const parsed = parseComparisonId(decodeURIComponent(raw));
  return parsed.ok ? { kind: "comparison", id: parsed.value } : undefined;
}

function computeRoutePath(raw: string): Route | undefined {
  const parsed = parseScenarioId(decodeURIComponent(raw));
  return parsed.ok ? { kind: "compute", scenarioId: parsed.value } : undefined;
}

function approveRoutePath(
  scenarioRaw: string,
  resultRaw: string,
): Route | undefined {
  const scenario = parseScenarioId(decodeURIComponent(scenarioRaw));
  const result = parseResultId(decodeURIComponent(resultRaw));
  return scenario.ok && result.ok
    ? { kind: "approve", scenarioId: scenario.value, resultId: result.value }
    : undefined;
}

function invalidateRoutePath(raw: string): Route | undefined {
  const parsed = parseScenarioId(decodeURIComponent(raw));
  return parsed.ok
    ? { kind: "invalidate", scenarioId: parsed.value }
    : undefined;
}

async function readRoute(
  route: Route,
  authenticated: ValuationAuthenticatedContext,
  application: ValuationV1Application,
): Promise<Response> {
  const result = route.kind === "scenario"
    ? await application.readScenario(authenticated, route.id)
    : route.kind === "result"
    ? await application.readResult(authenticated, route.id)
    : route.kind === "comparison"
    ? await application.readComparison(authenticated, route.id)
    : undefined;
  if (result === undefined) return methodNotAllowed();
  if (result.kind === "error") return errorResponse(result.error);
  return Response.json(
    createSuccessEnvelope(result.value.value, {
      correlationId: authenticated.context.correlationId,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Correlation-Id": authenticated.context.correlationId,
        ETag: result.value.etag,
      },
    },
  );
}

async function computeRoute(
  request: Request,
  scenarioId: ValuationScenarioId,
  authenticated: ValuationAuthenticatedContext,
  application: ValuationV1Application,
): Promise<Response> {
  const headers = commandHeaders(request, authenticated.context);
  if (headers.kind === "error") return headers.error;
  const body = await jsonBody(request);
  const jobId = body === undefined ? undefined : parseJobId(body.jobId);
  const operationId = body === undefined
    ? undefined
    : parseOperationId(body.operationId);
  if (
    body === undefined || jobId === undefined || !jobId.ok ||
    operationId === undefined || !operationId.ok
  ) {
    return validation(
      authenticated.context,
      "body",
      "Compute requires jobId and operationId identifiers.",
    );
  }
  const timeoutMs = optionalTimeout(body.timeoutMs);
  if (body.timeoutMs !== undefined && timeoutMs === undefined) {
    return validation(
      authenticated.context,
      "timeoutMs",
      "Expected a positive timeout in milliseconds.",
    );
  }
  const input: EnqueueValuationComputeRequest = {
    authenticated,
    scenarioId,
    jobId: jobId.value,
    operationId: operationId.value,
    idempotencyKey: headers.idempotency,
    expectedVersion: headers.expectedVersion,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  };
  const result = await application.enqueueCompute(input);
  if (result.kind === "error") return errorResponse(result.error);
  return Response.json(
    createAcceptedJobEnvelope({
      operationId: result.value.operationId!,
      jobId: result.value.jobId,
      status: "queued",
      correlationId: authenticated.context.correlationId,
    }),
    {
      status: 202,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Correlation-Id": authenticated.context.correlationId,
      },
    },
  );
}

async function approveRoute(
  request: Request,
  route: Extract<Route, { readonly kind: "approve" }>,
  authenticated: ValuationAuthenticatedContext,
  application: ValuationV1Application,
): Promise<Response> {
  const headers = commandHeaders(request, authenticated.context);
  if (headers.kind === "error") return headers.error;
  const body = await jsonBody(request);
  const approvalId = body === undefined
    ? undefined
    : parseApprovalId(body.approvalId);
  if (approvalId === undefined || !approvalId.ok) {
    return validation(
      authenticated.context,
      "approvalId",
      "Expected an approval identifier.",
    );
  }
  const input: ApproveValuationRequest = {
    authenticated,
    scenarioId: route.scenarioId,
    resultId: route.resultId,
    approvalId: approvalId.value,
    idempotencyKey: headers.idempotency,
    expectedVersion: headers.expectedVersion,
  };
  const result = await application.approve(input);
  if (result.kind === "error") return errorResponse(result.error);
  return Response.json(
    createSuccessEnvelope(result.value, {
      correlationId: authenticated.context.correlationId,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Correlation-Id": authenticated.context.correlationId,
      },
    },
  );
}

async function invalidateRoute(
  request: Request,
  scenarioId: ValuationScenarioId,
  authenticated: ValuationAuthenticatedContext,
  application: ValuationV1Application,
): Promise<Response> {
  const headers = commandHeaders(request, authenticated.context);
  if (headers.kind === "error") return headers.error;
  const body = await jsonBody(request);
  if (body === undefined) {
    return validation(
      authenticated.context,
      "body",
      "Invalidation requires a JSON object payload.",
    );
  }
  const invalidationId = parseInvalidationId(body.invalidationId);
  const kind = body.kind === "stale" || body.kind === "invalidated"
    ? body.kind
    : undefined;
  const reason = typeof body.reason === "string" && body.reason.trim()
    ? body.reason
    : undefined;
  const resultId = body.resultId === undefined
    ? undefined
    : parseResultId(body.resultId);
  if (
    !invalidationId.ok || kind === undefined || reason === undefined ||
    (resultId !== undefined && !resultId.ok)
  ) {
    return validation(
      authenticated.context,
      "body",
      "Invalidation requires a kind, reason, invalidationId, and an optional resultId.",
    );
  }
  const input: InvalidateValuationRequest = {
    authenticated,
    scenarioId,
    invalidationId: invalidationId.value,
    resultId: resultId === undefined ? undefined : resultId.value,
    idempotencyKey: headers.idempotency,
    expectedVersion: headers.expectedVersion,
    kind,
    reason,
    sourceReference: optionalText(body.sourceReference),
  };
  const result = await application.invalidate(input);
  if (result.kind === "error") return errorResponse(result.error);
  return Response.json(
    createSuccessEnvelope(result.value, {
      correlationId: authenticated.context.correlationId,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Correlation-Id": authenticated.context.correlationId,
      },
    },
  );
}

function commandHeaders(
  request: Request,
  context: RequestContext,
): {
  readonly kind: "ok";
  readonly idempotency: import("../../platform/api/v1.ts").IdempotencyKey;
  readonly expectedVersion: import("../../platform/api/v1.ts").AggregateVersion;
} | { readonly kind: "error"; readonly error: Response } {
  const idempotency = parseIdempotencyHeader(
    request.headers.get("Idempotency-Key"),
  );
  const expectedVersion = parseIfMatch(request.headers.get("If-Match"));
  if (!idempotency.ok) {
    return {
      kind: "error",
      error: validation(
        context,
        "Idempotency-Key",
        "Expected a valid idempotency key.",
      ),
    };
  }
  if (!expectedVersion.ok) {
    return {
      kind: "error",
      error: validation(
        context,
        "If-Match",
        'Expected a strong ETag such as "v1".',
      ),
    };
  }
  return {
    kind: "ok",
    idempotency: idempotency.value,
    expectedVersion: expectedVersion.value,
  };
}

async function jsonBody(
  request: Request,
): Promise<Readonly<Record<string, unknown>> | undefined> {
  try {
    const value: unknown = await request.json();
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function optionalTimeout(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

function optionalText(value: unknown): string | undefined {
  return value === undefined
    ? undefined
    : typeof value === "string" && value.trim()
    ? value
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validation(
  context: RequestContext,
  field: string,
  message: string,
): Response {
  return errorResponse(
    createApiError({
      code: "VALIDATION_FAILED",
      message,
      correlationId: context.correlationId,
      retryable: false,
      fieldErrors: { [field]: [{ field, code: "INVALID_TYPE", message }] },
    }),
  );
}

function errorResponse(error: ErrorEnvelope): Response {
  return Response.json(error, {
    status: API_ERROR_CATALOG[error.error.code].httpStatus,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Correlation-Id": error.error.correlationId,
    },
  });
}

function methodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
}
