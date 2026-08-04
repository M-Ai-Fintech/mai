import {
  API_ERROR_CATALOG,
  createAcceptedJobEnvelope,
  createApiError,
  createSuccessEnvelope,
  type ErrorEnvelope,
  parseAggregateVersion,
  parseIdempotencyHeader,
  parseIfMatch,
  parseOpaqueCursor,
  type RequestContext,
} from "../../platform/api/v1.ts";
import {
  type DocumentId,
  parseDocumentId,
  parseDocumentVersionId,
} from "../../documents/ids.ts";
import {
  type DocumentCommandInput,
  DocumentsV1Application,
} from "./documents.ts";

const DOCUMENTS_PATH = "/api/v1/documents";

export interface DocumentsRequestContextPort {
  contextFor(request: Request): Promise<RequestContext> | RequestContext;
}

export interface DocumentsV1RouteDependencies {
  readonly context: DocumentsRequestContextPort;
  readonly application: DocumentsV1Application;
}

export async function handleDocumentsV1Route(
  request: Request,
  dependencies: DocumentsV1RouteDependencies,
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  if (path !== DOCUMENTS_PATH && !path.startsWith(`${DOCUMENTS_PATH}/`)) {
    return null;
  }
  const context = await dependencies.context.contextFor(request);
  if (path === DOCUMENTS_PATH && request.method === "GET") {
    return await listDocuments(url, context, dependencies.application);
  }
  const command = commandPath(path);
  if (command !== undefined && request.method === "POST") {
    return await runDocumentCommand(
      request,
      context,
      command,
      dependencies.application,
    );
  }
  const resource = documentPath(path);
  if (resource !== undefined && request.method === "GET") {
    return await readDocument(context, resource, dependencies.application);
  }
  return methodNotAllowed(request.method === "GET" ? ["GET"] : ["GET", "POST"]);
}

async function listDocuments(
  url: URL,
  context: RequestContext,
  application: DocumentsV1Application,
): Promise<Response> {
  const limit = parseLimit(url.searchParams.get("limit"));
  if (limit === undefined) {
    return validationResponse(
      context,
      "limit",
      "Expected an integer from 1 to 100.",
    );
  }
  const rawCursor = url.searchParams.get("cursor");
  const cursor = rawCursor === null ? undefined : parseOpaqueCursor(rawCursor);
  if (cursor !== undefined && !cursor.ok) {
    return validationResponse(
      context,
      "cursor",
      "Expected an opaque pagination cursor.",
    );
  }
  const result = await application.list(
    context,
    cursor === undefined ? undefined : cursor.value,
    limit,
  );
  if (result.kind === "error") return errorResponse(result.error);
  const envelope = createSuccessEnvelope(result.value.documents, {
    correlationId: context.correlationId,
    ...(result.value.nextCursor === undefined
      ? {}
      : { nextCursor: result.value.nextCursor }),
  });
  return jsonResponse(envelope, 200, context.correlationId);
}

async function readDocument(
  context: RequestContext,
  documentId: DocumentId,
  application: DocumentsV1Application,
): Promise<Response> {
  const result = await application.read(context, documentId);
  if (result.kind === "error") return errorResponse(result.error);
  return jsonResponse(
    createSuccessEnvelope(result.value.document, {
      correlationId: context.correlationId,
    }),
    200,
    context.correlationId,
    { ETag: result.value.etag },
  );
}

async function runDocumentCommand(
  request: Request,
  context: RequestContext,
  command: {
    readonly action: "upload" | "sync" | "process";
    readonly documentId: DocumentId;
  },
  application: DocumentsV1Application,
): Promise<Response> {
  const headers = request.headers;
  const idempotency = parseIdempotencyHeader(headers.get("Idempotency-Key"));
  const expectedVersion = parseIfMatch(headers.get("If-Match"));
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
  const payload = await requestPayload(request);
  if (payload === undefined) {
    return validationResponse(
      context,
      "body",
      "Expected a JSON object payload.",
    );
  }
  const input = commandInput(
    command,
    expectedVersion.value,
    idempotency.value,
    payload,
  );
  if (input === undefined) {
    return validationResponse(
      context,
      "body",
      "Processing requires an exact document version reference.",
    );
  }
  const result = await application.command(context, input);
  if (result.kind === "error") return errorResponse(result.error);
  if (result.value.status === "in_progress") {
    return errorResponse(createApiError({
      code: "IDEMPOTENCY_CONFLICT",
      message: "An equivalent document command is already in progress.",
      correlationId: context.correlationId,
      retryable: true,
    }));
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

function commandInput(
  command: {
    readonly action: "upload" | "sync" | "process";
    readonly documentId: DocumentId;
  },
  expectedVersion: DocumentCommandInput["expectedVersion"],
  idempotencyKey: DocumentCommandInput["idempotencyKey"],
  payload: Readonly<Record<string, unknown>>,
): DocumentCommandInput | undefined {
  const commandType =
    `documents.${command.action}` as DocumentCommandInput["commandType"];
  const inputVersionReferences = command.action === "process"
    ? processReference(payload, command.documentId)
    : undefined;
  if (command.action === "process" && inputVersionReferences === undefined) {
    return undefined;
  }
  return {
    action: command.action,
    commandType,
    documentId: command.documentId,
    expectedVersion,
    idempotencyKey,
    payload,
    ...(inputVersionReferences === undefined ? {} : { inputVersionReferences }),
  };
}

function processReference(
  payload: Readonly<Record<string, unknown>>,
  documentId: DocumentId,
): DocumentCommandInput["inputVersionReferences"] {
  const versionId = parseDocumentVersionId(payload.documentVersionId);
  const version = parseAggregateVersion(payload.version);
  if (!versionId.ok || !version.ok) return undefined;
  return [{
    aggregateType: "DocumentVersion",
    aggregateId: versionId.value,
    version: version.value,
    documentId,
  }];
}

function commandPath(
  path: string,
): {
  readonly action: "upload" | "sync" | "process";
  readonly documentId: DocumentId;
} | undefined {
  const match = new RegExp(
    `^${DOCUMENTS_PATH}/([^/]+)/(upload|sync|process)$`,
  ).exec(path);
  if (match === null) return undefined;
  const documentId = parseDocumentId(decodeURIComponent(match[1]));
  if (!documentId.ok) return undefined;
  return {
    action: match[2] as "upload" | "sync" | "process",
    documentId: documentId.value,
  };
}

function documentPath(path: string): DocumentId | undefined {
  const match = new RegExp(`^${DOCUMENTS_PATH}/([^/]+)$`).exec(path);
  if (match === null) return undefined;
  const documentId = parseDocumentId(decodeURIComponent(match[1]));
  return documentId.ok ? documentId.value : undefined;
}

function parseLimit(value: string | null): number | undefined {
  if (value === null) return 20;
  if (!/^\d+$/.test(value)) return undefined;
  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit > 0 && limit <= 100
    ? limit
    : undefined;
}

async function requestPayload(
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
    message: "The document request is invalid.",
    correlationId: context.correlationId,
    retryable: false,
    fieldErrors: {
      [field]: [{ field, code: "INVALID_TYPE", message }],
    },
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
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-Id": correlationId,
    ...extraHeaders,
  });
  return Response.json(body, { status, headers });
}

function methodNotAllowed(methods: readonly string[]): Response {
  return new Response(null, {
    status: 405,
    headers: {
      Allow: methods.join(", "),
    },
  });
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
