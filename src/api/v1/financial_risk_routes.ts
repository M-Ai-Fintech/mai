import {
  API_ERROR_CATALOG,
  createAcceptedJobEnvelope,
  createApiError,
  createProtectedNotFoundError,
  createSuccessEnvelope,
  type ErrorEnvelope,
  formatEtag,
  parseIdempotencyHeader,
  parseIfMatch,
  parseJobId,
  parseOperationId,
  type RequestContext,
} from "../../platform/api/v1.ts";
import type { ActorReference } from "../../platform/authz/v1.ts";
import type { DurableJob } from "../../platform/jobs/v1.ts";
import type { FinancialRiskInputLoader } from "../../financial_risk/application.ts";
import {
  FinancialRiskApplication,
  type FinancialRiskComputeRequest,
  type FinancialRiskInvalidationRequest,
} from "../../financial_risk/application.ts";
import { FinancialRiskError } from "../../financial_risk/errors.ts";
import {
  type FinancialRiskAssessmentId,
  parseFinancialRiskAssessmentId,
  parseFinancialRiskInvalidationId,
  parseFinancialRiskResultId,
} from "../../financial_risk/ids.ts";
import type { FinancialRiskScope } from "../../financial_risk/model.ts";
import {
  financialRiskAssessmentResponse,
  parseFinancialRiskReferences,
} from "./financial_risk_contracts.ts";

export interface FinancialRiskAuthenticatedContext {
  readonly context: RequestContext;
  readonly actor: ActorReference;
}

export interface FinancialRiskRequestContextPort {
  contextFor(
    request: Request,
  ):
    | Promise<FinancialRiskAuthenticatedContext>
    | FinancialRiskAuthenticatedContext;
}

export interface FinancialRiskV1RouteDependencies {
  readonly context: FinancialRiskRequestContextPort;
  readonly application: FinancialRiskApplication;
  readonly inputLoader: FinancialRiskInputLoader;
}

export async function handleFinancialRiskV1Route(
  request: Request,
  dependencies: FinancialRiskV1RouteDependencies,
): Promise<Response | null> {
  const route = parseRoute(new URL(request.url).pathname);
  if (route === undefined) return null;
  const authenticated = await dependencies.context.contextFor(request);
  try {
    if (request.method === "GET" && route.kind === "assessment") {
      return await readAssessment(
        route.assessmentId,
        authenticated,
        dependencies.application,
      );
    }
    if (request.method !== "POST") return methodNotAllowed();
    if (route.kind === "compute") {
      return await computeAssessment(
        route.assessmentId,
        authenticated,
        request,
        dependencies,
      );
    }
    if (route.kind === "invalidate") {
      return await invalidateAssessment(
        route.assessmentId,
        authenticated,
        request,
        dependencies,
      );
    }
    return methodNotAllowed();
  } catch (error) {
    return errorResponse(
      financialRiskApiError(error, authenticated.context.correlationId),
    );
  }
}

type Route =
  | {
    readonly kind: "assessment";
    readonly assessmentId: FinancialRiskAssessmentId;
  }
  | {
    readonly kind: "compute";
    readonly assessmentId: FinancialRiskAssessmentId;
  }
  | {
    readonly kind: "invalidate";
    readonly assessmentId: FinancialRiskAssessmentId;
  };

function parseRoute(path: string): Route | undefined {
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
  if (
    parts.length < 5 || parts[0] !== "api" || parts[1] !== "v1" ||
    parts[2] !== "financial-risk"
  ) {
    return undefined;
  }
  const assessment = parseFinancialRiskAssessmentId(decode(parts[4]));
  if (!assessment.ok || parts[3] !== "assessments") return undefined;
  if (parts.length === 5) {
    return { kind: "assessment", assessmentId: assessment.value };
  }
  if (parts.length !== 6) return undefined;
  if (parts[5] === "compute") {
    return { kind: "compute", assessmentId: assessment.value };
  }
  if (parts[5] === "invalidate") {
    return { kind: "invalidate", assessmentId: assessment.value };
  }
  return undefined;
}

async function readAssessment(
  assessmentId: FinancialRiskAssessmentId,
  authenticated: FinancialRiskAuthenticatedContext,
  application: FinancialRiskApplication,
): Promise<Response> {
  const result = await application.read(
    authenticated.context,
    authenticated.actor,
    assessmentId,
  );
  return Response.json(
    createSuccessEnvelope(financialRiskAssessmentResponse(result), {
      correlationId: authenticated.context.correlationId,
      freshness: result.state === "stale" || result.state === "superseded"
        ? "stale"
        : "current",
    }),
    responseOptions(authenticated.context, formatEtag(result.version)),
  );
}

async function computeAssessment(
  assessmentId: FinancialRiskAssessmentId,
  authenticated: FinancialRiskAuthenticatedContext,
  request: Request,
  dependencies: FinancialRiskV1RouteDependencies,
): Promise<Response> {
  const headers = commandHeaders(request, authenticated.context);
  if (headers.kind === "error") return headers.error;
  const body = await jsonBody(request);
  const parsed = body === undefined
    ? undefined
    : parseComputeBody(body, authenticated.context);
  if (parsed === undefined) {
    return validation(
      authenticated.context,
      "body",
      "Compute requires resultId, operationId, jobId, and exact version references.",
    );
  }
  const result = await dependencies.application.enqueueCompute({
    context: authenticated.context,
    actor: authenticated.actor,
    assessmentId,
    ...parsed,
    idempotencyKey: headers.idempotency,
    expectedVersion: headers.expectedVersion,
    loadInput: dependencies.inputLoader,
  });
  return accepted(result.job, authenticated.context);
}

async function invalidateAssessment(
  assessmentId: FinancialRiskAssessmentId,
  authenticated: FinancialRiskAuthenticatedContext,
  request: Request,
  dependencies: FinancialRiskV1RouteDependencies,
): Promise<Response> {
  const headers = commandHeaders(request, authenticated.context);
  if (headers.kind === "error") return headers.error;
  const body = await jsonBody(request);
  const parsed = body === undefined ? undefined : parseInvalidationBody(body);
  if (parsed === undefined) {
    return validation(
      authenticated.context,
      "body",
      "Invalidation requires resultId, invalidationId, operationId, jobId, and a reason.",
    );
  }
  const result = await dependencies.application.enqueueInvalidate({
    context: authenticated.context,
    actor: authenticated.actor,
    assessmentId,
    ...parsed,
    idempotencyKey: headers.idempotency,
    expectedVersion: headers.expectedVersion,
  });
  return accepted(result.job, authenticated.context);
}

function parseComputeBody(
  body: Readonly<Record<string, unknown>>,
  context: RequestContext,
):
  | Pick<
    FinancialRiskComputeRequest,
    "resultId" | "operationId" | "jobId" | "references"
  >
  | undefined {
  const resultId = parseFinancialRiskResultId(body.resultId);
  const operationId = parseOperationId(body.operationId);
  const jobId = parseJobId(body.jobId);
  const scope = requestScope(context);
  const references = scope === undefined
    ? undefined
    : parseFinancialRiskReferences(body.references, scope);
  if (
    !resultId.ok || !operationId.ok || !jobId.ok || references === undefined ||
    !references.ok
  ) return undefined;
  return {
    resultId: resultId.value,
    operationId: operationId.value,
    jobId: jobId.value,
    references: references.value,
  };
}

function parseInvalidationBody(
  body: Readonly<Record<string, unknown>>,
):
  | Pick<
    FinancialRiskInvalidationRequest,
    "resultId" | "invalidationId" | "operationId" | "jobId" | "reason"
  >
  | undefined {
  const resultId = parseFinancialRiskResultId(body.resultId);
  const invalidationId = parseFinancialRiskInvalidationId(body.invalidationId);
  const operationId = parseOperationId(body.operationId);
  const jobId = parseJobId(body.jobId);
  const reason = typeof body.reason === "string" && body.reason.trim()
    ? body.reason
    : undefined;
  if (
    !resultId.ok || !invalidationId.ok || !operationId.ok || !jobId.ok ||
    reason === undefined
  ) return undefined;
  return {
    resultId: resultId.value,
    invalidationId: invalidationId.value,
    operationId: operationId.value,
    jobId: jobId.value,
    reason,
  };
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

function requestScope(context: RequestContext): FinancialRiskScope | undefined {
  if (context.workspaceId === undefined || context.dealId === undefined) {
    return undefined;
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}

function accepted(job: DurableJob, context: RequestContext): Response {
  if (job.operationId === undefined) {
    return errorResponse(dependencyError(context.correlationId));
  }
  return Response.json(
    createAcceptedJobEnvelope({
      operationId: job.operationId,
      jobId: job.jobId,
      status: "queued",
      correlationId: context.correlationId,
    }),
    responseOptions(context),
  );
}

function responseOptions(
  context: RequestContext,
  etag?: string,
): ResponseInit {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-Id": context.correlationId,
  });
  if (etag !== undefined) headers.set("ETag", etag);
  return { status: etag === undefined ? 202 : 200, headers };
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

function financialRiskApiError(
  error: unknown,
  correlationId: RequestContext["correlationId"],
): ErrorEnvelope {
  if (!(error instanceof FinancialRiskError)) {
    return dependencyError(correlationId);
  }
  if (
    error.code === "PROTECTED_NOT_FOUND" || error.code === "ACTOR_DENIED" ||
    error.code === "SCOPE_MISMATCH"
  ) {
    return createProtectedNotFoundError(correlationId);
  }
  if (error.code === "HUMAN_AUTHORITY_REQUIRED") {
    return createApiError({
      code: "ACTION_FORBIDDEN",
      message: "The requested financial-risk action is not permitted.",
      correlationId,
      retryable: false,
    });
  }
  if (
    error.code === "STALE_VERSION" || error.code === "VERSION_CONFLICT" ||
    error.code === "EXACT_VERSION_MISMATCH"
  ) {
    return createApiError({
      code: "STALE_VERSION",
      message: "The financial-risk references are stale; refresh and retry.",
      correlationId,
      retryable: true,
    });
  }
  if (
    error.code === "IDEMPOTENCY_CONFLICT" ||
    error.code === "IDEMPOTENCY_IN_PROGRESS"
  ) {
    return createApiError({
      code: "IDEMPOTENCY_CONFLICT",
      message:
        "The financial-risk command conflicts with an existing idempotency record.",
      correlationId,
      retryable: error.code === "IDEMPOTENCY_IN_PROGRESS",
    });
  }
  if (error.code === "DEPENDENCY_UNAVAILABLE") {
    return dependencyError(correlationId);
  }
  if (error.code === "INFERENCE_FAILED" || error.code === "CANCELLED") {
    return createApiError({
      code: "ASYNC_OPERATION_FAILED",
      message: "The financial-risk calculation could not be completed.",
      correlationId,
      retryable: false,
    });
  }
  return createApiError({
    code: "VALIDATION_FAILED",
    message: "The financial-risk command is invalid.",
    correlationId,
    retryable: false,
    fieldErrors: {
      command: [{
        field: "command",
        code: "INVALID_TYPE",
        message: "The financial-risk command is invalid.",
      }],
    },
  });
}

function dependencyError(
  correlationId: RequestContext["correlationId"],
): ErrorEnvelope {
  return createApiError({
    code: "DEPENDENCY_UNAVAILABLE",
    message: "Financial-risk calculation is temporarily unavailable.",
    correlationId,
    retryable: true,
  });
}

function methodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
