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
  parseDeliverableId,
  parseDeliverableVersionId,
} from "../../deliverables/ids.ts";
import {
  type DeliverableCommandInput,
  DeliverablesV1Application,
} from "./deliverables.ts";

const DELIVERABLES_PATH = "/api/v1/deliverables";

export interface DeliverablesRequestContextPort {
  contextFor(request: Request): Promise<RequestContext> | RequestContext;
}

export interface DeliverablesV1RouteDependencies {
  readonly context: DeliverablesRequestContextPort;
  readonly application: DeliverablesV1Application;
}

export async function handleDeliverablesV1Route(
  request: Request,
  dependencies: DeliverablesV1RouteDependencies,
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  if (path !== DELIVERABLES_PATH && !path.startsWith(`${DELIVERABLES_PATH}/`)) {
    return null;
  }
  const context = await dependencies.context.contextFor(request);
  if (path === DELIVERABLES_PATH && request.method === "GET") {
    return listDeliverables(url, context, dependencies.application);
  }
  const resource = deliverablePath(path);
  if (resource !== undefined && request.method === "GET") {
    return readDeliverable(context, resource, dependencies.application);
  }
  const command = commandPath(path);
  if (command !== undefined && request.method === "POST") {
    return runCommand(request, context, command, dependencies.application);
  }
  return methodNotAllowed(request.method === "GET" ? ["GET"] : ["GET", "POST"]);
}

async function listDeliverables(
  url: URL,
  context: RequestContext,
  application: DeliverablesV1Application,
): Promise<Response> {
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit === null
    ? 20
    : /^\d+$/.test(rawLimit)
    ? Number(rawLimit)
    : 0;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return validationResponse(
      context,
      "limit",
      "Expected an integer from 1 to 100.",
    );
  }
  const result = await application.list(context, limit);
  if (result.kind === "error") return errorResponse(result.error);
  return jsonResponse(
    createSuccessEnvelope(result.value.deliverables, {
      correlationId: context.correlationId,
      ...(result.value.nextCursor === undefined
        ? {}
        : { nextCursor: result.value.nextCursor }),
    }),
    200,
    context.correlationId,
  );
}

async function readDeliverable(
  context: RequestContext,
  deliverableId: Parameters<DeliverablesV1Application["read"]>[1],
  application: DeliverablesV1Application,
): Promise<Response> {
  const result = await application.read(context, deliverableId);
  if (result.kind === "error") return errorResponse(result.error);
  return jsonResponse(
    createSuccessEnvelope(result.value.deliverable, {
      correlationId: context.correlationId,
    }),
    200,
    context.correlationId,
    { ETag: result.value.etag },
  );
}

async function runCommand(
  request: Request,
  context: RequestContext,
  command: {
    readonly action: DeliverableCommandInput["action"];
    readonly targetId: DeliverableCommandInput["targetId"];
  },
  application: DeliverablesV1Application,
): Promise<Response> {
  const idempotency = parseIdempotencyHeader(
    request.headers.get("Idempotency-Key"),
  );
  const expectedVersion = parseIfMatch(request.headers.get("If-Match"));
  if (!idempotency.ok) {
    return validationResponse(
      context,
      "Idempotency-Key",
      "Expected a valid idempotency key.",
    );
  }
  if (!expectedVersion.ok) {
    return validationResponse(
      context,
      "If-Match",
      'Expected a strong ETag such as "v1".',
    );
  }
  const payload = await jsonPayload(request);
  if (payload === undefined) {
    return validationResponse(
      context,
      "body",
      "Expected a JSON object payload.",
    );
  }
  const input: DeliverableCommandInput = {
    action: command.action,
    commandType: `deliverables.${command.action}`,
    targetId: command.targetId,
    expectedVersion: expectedVersion.value,
    idempotencyKey: idempotency.value,
    payload,
  };
  const result = await application.command(context, input);
  if (result.kind === "error") return errorResponse(result.error);
  if (result.value.status === "in_progress") {
    return errorResponse(
      createApiError({
        code: "IDEMPOTENCY_CONFLICT",
        message: "An equivalent deliverable command is already in progress.",
        correlationId: context.correlationId,
        retryable: true,
      }),
    );
  }
  return jsonResponse(
    createAcceptedJobEnvelope({
      operationId: result.value.job.operationId,
      jobId: result.value.job.jobId,
      status: "queued",
      correlationId: context.correlationId,
    }),
    202,
    context.correlationId,
  );
}

function commandPath(
  path: string,
): {
  readonly action: DeliverableCommandInput["action"];
  readonly targetId: DeliverableCommandInput["targetId"];
} | undefined {
  const match = new RegExp(
    `^${DELIVERABLES_PATH}/([^/]+)/(approve|release|exports|distributions)$`,
  ).exec(path);
  if (match === null) return undefined;
  const version = parseDeliverableVersionId(decodeURIComponent(match[1]));
  if (!version.ok) return undefined;
  const action = match[2] === "approve"
    ? "approve"
    : match[2] === "release"
    ? "release"
    : match[2] === "exports"
    ? "export"
    : "distribute";
  return { action, targetId: version.value };
}

function deliverablePath(path: string) {
  const match = new RegExp(`^${DELIVERABLES_PATH}/([^/]+)$`).exec(path);
  if (match === null) return undefined;
  const deliverable = parseDeliverableId(decodeURIComponent(match[1]));
  return deliverable.ok ? deliverable.value : undefined;
}

async function jsonPayload(
  request: Request,
): Promise<Readonly<Record<string, unknown>> | undefined> {
  try {
    const value: unknown = await request.json();
    return isRecord(value) ? value : undefined;
  } catch (_error) {
    return undefined;
  }
}

function validationResponse(
  context: RequestContext,
  field: string,
  message: string,
): Response {
  return errorResponse(createApiError({
    code: "VALIDATION_FAILED",
    message: "The deliverable request is invalid.",
    correlationId: context.correlationId,
    retryable: false,
    fieldErrors: { [field]: [{ field, code: "INVALID_TYPE", message }] },
  }));
}

function errorResponse(error: ErrorEnvelope): Response {
  return jsonResponse(
    error,
    API_ERROR_CATALOG[error.error.code].httpStatus,
    error.error.correlationId,
  );
}

function jsonResponse(
  body: unknown,
  status: number,
  correlationId: string,
  extraHeaders: Readonly<Record<string, string>> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Correlation-Id": correlationId,
      ...extraHeaders,
    },
  });
}

function methodNotAllowed(methods: readonly string[]): Response {
  return new Response(null, {
    status: 405,
    headers: { Allow: methods.join(", ") },
  });
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
