import {
  API_ERROR_CATALOG,
  createApiError,
  createSuccessEnvelope,
  parseIdempotencyHeader,
  parseIfMatch,
} from "../../platform/api/v1.ts";
import {
  actor as workActor,
  approvalRequestId,
  taskId,
  workstreamId,
} from "../../work_management/v1.ts";
import {
  type WorkManagementApiResult,
  WorkManagementV1Application,
} from "./work_management.ts";
import type {
  ApprovalDecisionCommand,
  CreateApprovalRequestCommand,
  CreateTaskCommand,
  CreateWorkstreamCommand,
  TransitionTaskCommand,
  TransitionWorkstreamCommand,
  WorkManagementAuthenticatedContext,
  WorkManagementCommandMetadata,
  WorkManagementContextPort,
} from "./work_management_contracts.ts";
import { WorkManagementValidationError } from "./work_management_contracts.ts";
import {
  parseApprovalCreation,
  requiredObject,
  requiredState,
  requiredString,
} from "./work_management_validation.ts";

const BASE_PATH = "/api/v1/work-management";

export interface WorkManagementV1RouteDependencies {
  readonly context: WorkManagementContextPort;
  readonly application: WorkManagementV1Application;
}

export async function handleWorkManagementV1Route(
  request: Request,
  dependencies: WorkManagementV1RouteDependencies,
): Promise<Response | null> {
  const route = parseRoute(new URL(request.url).pathname);
  if (route === undefined) {
    return request.url.includes(BASE_PATH) ? methodNotAllowed() : null;
  }
  try {
    const authenticated = await dependencies.context.contextFor(request);
    return await dispatch(
      request,
      route,
      authenticated,
      dependencies.application,
    );
  } catch (error) {
    return validationResponse(error, undefined);
  }
}

type WorkManagementRoute =
  | {
    readonly kind: "workstreams";
    readonly id?: string;
    readonly command?: "transition";
  }
  | {
    readonly kind: "tasks";
    readonly id?: string;
    readonly command?: "transition";
  }
  | {
    readonly kind: "approval_requests";
    readonly id?: string;
    readonly command?: ApprovalCommand;
  };

type ApprovalCommand =
  | "open"
  | "approve"
  | "reject"
  | "withdraw"
  | "invalidate"
  | "expire";

async function dispatch(
  request: Request,
  route: WorkManagementRoute,
  authenticated: WorkManagementAuthenticatedContext,
  application: WorkManagementV1Application,
): Promise<Response> {
  const { context, actor } = authenticated;
  const scope = {
    tenantId: context.tenantId,
    workspaceId: requireWorkspace(context.workspaceId),
    dealId: requireDeal(context.dealId),
  };
  if (
    request.method === "GET" && route.id !== undefined &&
    route.command === undefined
  ) {
    const result = route.kind === "workstreams"
      ? await application.readWorkstream({
        context,
        actor,
        scope,
        id: workstreamId(route.id),
      })
      : route.kind === "tasks"
      ? await application.readTask({
        context,
        actor,
        scope,
        id: taskId(route.id),
      })
      : await application.readApprovalRequest({
        context,
        actor,
        scope,
        id: approvalRequestId(route.id),
      });
    return writeResult(result, context.correlationId, 200);
  }
  if (request.method !== "POST") return methodNotAllowed();
  const body = await jsonBody(request);
  rejectServerOwnedMetadata(body);
  const metadata = commandMetadata(request, requiresVersion(route));
  if (route.id === undefined && route.command === undefined) {
    return await createCollection(
      route,
      body,
      metadata,
      authenticated,
      scope,
      application,
    );
  }
  if (route.id !== undefined && route.kind !== "approval_requests") {
    return await transitionWorkItem(
      route,
      body,
      metadata,
      authenticated,
      scope,
      application,
    );
  }
  if (
    route.kind === "approval_requests" && route.id !== undefined &&
    route.command !== undefined
  ) {
    return await transitionApproval(
      route.id,
      route.command,
      body,
      metadata,
      authenticated,
      scope,
      application,
    );
  }
  return methodNotAllowed();
}

async function createCollection(
  route: WorkManagementRoute,
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: import("../../work_management/v1.ts").WorkScope,
  application: WorkManagementV1Application,
): Promise<Response> {
  const { context, actor } = authenticated;
  const result = route.kind === "workstreams"
    ? await application.createWorkstream(
      {
        ...metadata,
        context,
        actor,
        scope,
        id: workstreamId(requiredString(body.id, "id")),
        name: requiredString(body.name, "name"),
        ownerId: actorId(requiredString(body.ownerId, "ownerId")),
      } satisfies CreateWorkstreamCommand,
    )
    : route.kind === "tasks"
    ? await application.createTask(
      {
        ...metadata,
        context,
        actor,
        scope,
        id: taskId(requiredString(body.id, "id")),
        workstreamId: workstreamId(
          requiredString(body.workstreamId, "workstreamId"),
        ),
        ...(body.parentTaskId === undefined ? {} : {
          parentTaskId: taskId(
            requiredString(body.parentTaskId, "parentTaskId"),
          ),
        }),
        title: requiredString(body.title, "title"),
        assigneeId: actorId(requiredString(body.assigneeId, "assigneeId")),
      } satisfies CreateTaskCommand,
    )
    : await createApproval(body, metadata, authenticated, scope, application);
  return writeResult(result, context.correlationId, 201);
}

async function createApproval(
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: import("../../work_management/v1.ts").WorkScope,
  application: WorkManagementV1Application,
) {
  const parsed = parseApprovalCreation(body, scope);
  return await application.createApprovalRequest(
    {
      ...metadata,
      ...authenticated,
      scope,
      id: approvalRequestId(requiredString(body.id, "id")),
      namedApproverId: actorId(
        requiredString(body.namedApproverId, "namedApproverId"),
      ),
      ...parsed,
    } satisfies CreateApprovalRequestCommand,
  );
}

async function transitionWorkItem(
  route: Extract<
    WorkManagementRoute,
    { readonly kind: "workstreams" | "tasks" }
  >,
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: import("../../work_management/v1.ts").WorkScope,
  application: WorkManagementV1Application,
): Promise<Response> {
  const { context, actor } = authenticated;
  if (route.id === undefined) return methodNotAllowed();
  const result = route.kind === "workstreams"
    ? await application.transitionWorkstream(
      {
        ...metadata,
        context,
        actor,
        scope,
        id: workstreamId(route.id),
        toState: requiredState(body.toState, [
          "planned",
          "active",
          "blocked",
          "completed",
          "cancelled",
        ]),
      } satisfies TransitionWorkstreamCommand,
    )
    : await application.transitionTask(
      {
        ...metadata,
        context,
        actor,
        scope,
        id: taskId(route.id),
        toState: requiredState(body.toState, [
          "open",
          "in_progress",
          "blocked",
          "completed",
          "cancelled",
        ]),
      } satisfies TransitionTaskCommand,
    );
  return writeResult(result, context.correlationId, 200);
}

async function transitionApproval(
  routeId: string,
  command: ApprovalCommand,
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: import("../../work_management/v1.ts").WorkScope,
  application: WorkManagementV1Application,
): Promise<Response> {
  const input = {
    ...metadata,
    ...authenticated,
    scope,
    id: approvalRequestId(routeId),
    ...(body.reason === undefined
      ? {}
      : { reason: requiredString(body.reason, "reason") }),
  };
  const result = command === "open"
    ? await application.openApprovalRequest(input)
    : command === "withdraw"
    ? await application.withdrawApprovalRequest(input)
    : command === "invalidate"
    ? await application.invalidateApprovalRequest(input)
    : command === "expire"
    ? await application.expireApprovalRequest(input)
    : await application.decideApprovalRequest(
      {
        ...input,
        outcome: command === "approve" ? "approved" : "rejected",
      } satisfies ApprovalDecisionCommand,
    );
  return writeResult(result, authenticated.context.correlationId, 200);
}

function parseRoute(pathname: string): WorkManagementRoute | undefined {
  const parts = pathname.split("/").filter(Boolean);
  if (
    parts[0] !== "api" || parts[1] !== "v1" || parts[2] !== "work-management"
  ) return;
  const collection = parts[3];
  if (collection === "workstreams" || collection === "tasks") {
    if (parts.length === 4) return { kind: collection };
    if (parts.length === 5) {
      return { kind: collection, id: decodeURIComponent(parts[4]) };
    }
    if (parts.length === 6 && parts[5] === "transition") {
      return {
        kind: collection,
        id: decodeURIComponent(parts[4]),
        command: "transition",
      };
    }
    return;
  }
  if (collection !== "approval-requests") return;
  if (parts.length === 4) return { kind: "approval_requests" };
  if (parts.length === 5) {
    return { kind: "approval_requests", id: decodeURIComponent(parts[4]) };
  }
  const command = parseApprovalCommand(parts[5]);
  if (parts.length === 6 && command !== undefined) {
    return {
      kind: "approval_requests",
      id: decodeURIComponent(parts[4]),
      command,
    };
  }
}

function parseApprovalCommand(
  value: string | undefined,
): ApprovalCommand | undefined {
  if (
    value === "open" || value === "approve" || value === "reject" ||
    value === "withdraw" || value === "invalidate" || value === "expire"
  ) return value;
}

function commandMetadata(
  request: Request,
  versionRequired: boolean,
): WorkManagementCommandMetadata {
  const idempotency = parseIdempotencyHeader(
    request.headers.get("Idempotency-Key"),
  );
  if (!idempotency.ok) {
    throw new WorkManagementValidationError(
      "Idempotency-Key is required; expected an idem_ identifier.",
    );
  }
  if (!versionRequired) return { idempotencyKey: idempotency.value };
  const ifMatch = parseIfMatch(request.headers.get("If-Match"));
  if (!ifMatch.ok) {
    throw new WorkManagementValidationError(
      'If-Match is invalid; expected one strong "v<version>" ETag.',
    );
  }
  return { idempotencyKey: idempotency.value, expectedVersion: ifMatch.value };
}

function requiresVersion(route: WorkManagementRoute): boolean {
  return route.id !== undefined || route.kind === "tasks";
}

function rejectServerOwnedMetadata(body: Record<string, unknown>): void {
  const forbidden = ["eventId", "decisionId", "currentTargetVersion"].find((
    field,
  ) => body[field] !== undefined);
  if (forbidden === undefined) return;
  throw new WorkManagementValidationError(
    `Field "${forbidden}" is server-owned; expected semantic identity derived by Work Management.`,
  );
}

function requireWorkspace(
  value: import("../../platform/api/v1.ts").WorkspaceId | undefined,
) {
  if (value !== undefined) return value;
  throw new WorkManagementValidationError(
    "Work Management requires workspace scope; expected an authenticated workspace ID.",
  );
}

function requireDeal(
  value: import("../../platform/api/v1.ts").DealId | undefined,
) {
  if (value !== undefined) return value;
  throw new WorkManagementValidationError(
    "Work Management requires deal scope; expected an authenticated deal ID.",
  );
}

function actorId(value: string): import("../../work_management/v1.ts").ActorId {
  try {
    return workActor(value);
  } catch {
    throw new WorkManagementValidationError(
      `Actor ID "${value}" is invalid; expected a canonical actor_ identifier.`,
    );
  }
}

async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  return requiredObject(await request.json(), "body");
}

function writeResult(
  result: WorkManagementApiResult<unknown>,
  correlationId: import("../../platform/api/v1.ts").CorrelationId,
  successStatus: number,
): Response {
  if (result.kind === "error") {
    return Response.json(result.error, {
      status: API_ERROR_CATALOG[result.error.error.code].httpStatus,
      headers: responseHeaders(correlationId),
    });
  }
  const view = readView(result.value);
  const headers = responseHeaders(correlationId);
  if (view.etag !== undefined) headers.ETag = view.etag;
  return Response.json(createSuccessEnvelope(view.value, { correlationId }), {
    status: successStatus,
    headers,
  });
}

function readView(
  value: unknown,
): { readonly value: unknown; readonly etag?: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { value };
  }
  const record = Object.fromEntries(Object.entries(value));
  if (typeof record.etag !== "string" || !("value" in record)) return { value };
  return { value: record.value, etag: record.etag };
}

function validationResponse(
  error: unknown,
  correlationId: import("../../platform/api/v1.ts").CorrelationId | undefined,
): Response {
  const value = correlationId ??
    ("cor_route" as import("../../platform/api/v1.ts").CorrelationId);
  const message = validationPublicMessage(error);
  return Response.json(
    createApiError({
      code: "VALIDATION_FAILED",
      message,
      correlationId: value,
      retryable: false,
      fieldErrors: {
        request: [{ field: "request", code: "INVALID_TYPE", message }],
      },
    }),
    { status: 422, headers: responseHeaders(value) },
  );
}

function validationPublicMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : "";
  if (detail.includes("server-owned")) {
    return "The request contains server-owned fields.";
  }
  if (detail.toLowerCase().includes("payload")) {
    return "The request payload is invalid.";
  }
  if (detail.includes("cross-Deal")) {
    return "The requested cross-Deal reference is invalid.";
  }
  if (detail.includes("Idempotency-Key")) {
    return "The request is invalid: Idempotency-Key is required.";
  }
  if (detail.toLowerCase().includes("strong")) {
    return "The request is invalid: a strong ETag is required in If-Match.";
  }
  if (detail.includes("If-Match")) {
    return "The request is invalid: If-Match is required.";
  }
  return "The Work Management request is invalid.";
}

function responseHeaders(
  correlationId: import("../../platform/api/v1.ts").CorrelationId,
): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-Id": correlationId,
  };
}

function methodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
}
