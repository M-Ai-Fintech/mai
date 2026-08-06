import {
  API_ERROR_CATALOG,
  createApiError,
  createSuccessEnvelope,
  parseIfMatch,
} from "../../platform/api/v1.ts";
import { parseIdempotencyHeader } from "../../platform/api/v1.ts";
import {
  actor as workActor,
  aggregateVersion,
  approvalDecisionId,
  approvalRequestId,
  taskId,
  workEventId,
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

type ApprovalCommand = "open" | "approve" | "reject" | "withdraw";

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
  const command = route.command;
  if (
    request.method === "GET" && route.id !== undefined &&
    command === undefined
  ) {
    const id = routeId(route);
    const result = route.kind === "workstreams"
      ? await application.readWorkstream({
        context,
        actor,
        scope,
        id: workstreamId(id),
      })
      : route.kind === "tasks"
      ? await application.readTask({ context, actor, scope, id: taskId(id) })
      : await application.readApprovalRequest({
        context,
        actor,
        scope,
        id: approvalRequestId(id),
      });
    return writeResult(result, context.correlationId, 200);
  }
  if (request.method !== "POST") return methodNotAllowed();
  const body = await jsonBody(request);
  const metadata = commandMetadata(request, body, route.id);
  if (route.id === undefined && command === undefined) {
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
      : await application.createApprovalRequest(
        {
          ...metadata,
          context,
          actor,
          scope,
          id: approvalRequestId(requiredString(body.id, "id")),
          requesterId: actorId(requiredString(body.requesterId, "requesterId")),
          namedApproverId: actorId(
            requiredString(body.namedApproverId, "namedApproverId"),
          ),
          package: requiredObject(
            body.package,
            "package",
          ) as unknown as CreateApprovalRequestCommand["package"],
        } satisfies CreateApprovalRequestCommand,
      );
    return writeResult(result, context.correlationId, 201);
  }
  if (route.id !== undefined && route.kind !== "approval_requests") {
    if (route.kind === "workstreams" && route.id !== undefined) {
      const result = await application.transitionWorkstream(
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
      );
      return writeResult(result, context.correlationId, 200);
    }
    if (route.kind === "tasks" && route.id !== undefined) {
      const result = await application.transitionTask(
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
  }
  if (
    route.kind === "approval_requests" && route.id !== undefined &&
    route.command !== undefined
  ) {
    const id = approvalRequestId(route.id);
    if (route.command === "open" || route.command === "withdraw") {
      const result = route.command === "open"
        ? await application.openApprovalRequest({
          ...metadata,
          context,
          actor,
          scope,
          id,
        })
        : await application.withdrawApprovalRequest({
          ...metadata,
          context,
          actor,
          scope,
          id,
        });
      return writeResult(result, context.correlationId, 200);
    }
    const result = await application.decideApprovalRequest(
      {
        ...metadata,
        context,
        actor,
        scope,
        id,
        package: requiredObject(
          body.package,
          "package",
        ) as unknown as ApprovalDecisionCommand["package"],
        decisionId: approvalDecisionId(
          requiredString(body.decisionId, "decisionId"),
        ),
        outcome: route.command === "approve" ? "approved" : "rejected",
        ...(body.reason === undefined
          ? {}
          : { reason: requiredString(body.reason, "reason") }),
      } satisfies ApprovalDecisionCommand,
    );
    return writeResult(result, context.correlationId, 200);
  }
  return methodNotAllowed();
}

function parseRoute(pathname: string): WorkManagementRoute | undefined {
  const parts = pathname.split("/").filter(Boolean);
  if (
    parts[0] !== "api" || parts[1] !== "v1" || parts[2] !== "work-management"
  ) return undefined;
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
    return undefined;
  }
  if (collection !== "approval-requests") return undefined;
  if (parts.length === 4) return { kind: "approval_requests" };
  if (parts.length === 5) {
    return { kind: "approval_requests", id: decodeURIComponent(parts[4]) };
  }
  if (
    parts.length === 6 &&
    ["open", "approve", "reject", "withdraw"].includes(parts[5])
  ) {
    return {
      kind: "approval_requests",
      id: decodeURIComponent(parts[4]),
      command: parts[5] as ApprovalCommand,
    };
  }
  return undefined;
}

function routeId(route: WorkManagementRoute): string {
  if (route.id !== undefined) return route.id;
  throw new WorkManagementValidationError(
    "Work Management item ID is missing; expected a scoped resource identifier.",
  );
}

function commandMetadata(
  request: Request,
  body: Record<string, unknown>,
  id: string | undefined,
): WorkManagementCommandMetadata {
  const idempotency = parseIdempotencyHeader(
    request.headers.get("Idempotency-Key"),
  );
  if (!idempotency.ok) {
    throw new WorkManagementValidationError(
      "Idempotency-Key is required; expected an idem_ identifier.",
    );
  }
  const ifMatch = parseIfMatch(request.headers.get("If-Match"));
  const expectedVersion = id === undefined
    ? undefined
    : ifMatch.ok
    ? ifMatch.value
    : (() => {
      throw new WorkManagementValidationError(
        `If-Match is invalid; expected a strong \\"v<version>\\" ETag.`,
      );
    })();
  const event = body.eventId === undefined
    ? workEventId(`work_event_${idempotency.value.slice("idem_".length)}`)
    : workEventId(requiredString(body.eventId, "eventId"));
  const currentTargetVersion = body.currentTargetVersion === undefined
    ? undefined
    : aggregateVersion(Number(body.currentTargetVersion));
  return {
    idempotencyKey: idempotency.value,
    eventId: event,
    ...(expectedVersion === undefined ? {} : { expectedVersion }),
    ...(currentTargetVersion === undefined ? {} : { currentTargetVersion }),
  };
}

function requiredWorkspace(
  value: string | undefined,
): import("../../work_management/v1.ts").WorkspaceId {
  if (value !== undefined) {
    return value as import("../../work_management/v1.ts").WorkspaceId;
  }
  throw new WorkManagementValidationError(
    "Work Management requires workspace scope; expected an authenticated workspace ID.",
  );
}

function requireWorkspace(
  value: import("../../platform/api/v1.ts").WorkspaceId | undefined,
) {
  return requiredWorkspace(value);
}

function requireDeal(
  value: import("../../platform/api/v1.ts").DealId | undefined,
): import("../../work_management/v1.ts").DealId {
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

function requiredString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim() !== "") return value;
  throw new WorkManagementValidationError(
    `Field "${field}" is invalid; expected a non-empty string.`,
  );
}

function requiredObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new WorkManagementValidationError(
    `Field "${field}" is invalid; expected a JSON object.`,
  );
}

function requiredState<T extends string>(
  value: unknown,
  states: readonly T[],
): T {
  if (typeof value === "string" && states.includes(value as T)) {
    return value as T;
  }
  throw new WorkManagementValidationError(
    `State "${String(value)}" is invalid; expected one of ${
      states.join(", ")
    }.`,
  );
}

async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  const value: unknown = await request.json();
  return requiredObject(value, "body");
}

function writeResult(
  result: WorkManagementApiResult<unknown>,
  correlationId: import("../../platform/api/v1.ts").CorrelationId,
  successStatus: number,
): Response {
  if (result.kind === "error") {
    const status = API_ERROR_CATALOG[result.error.error.code].httpStatus;
    return Response.json(result.error, {
      status,
      headers: responseHeaders(correlationId),
    });
  }
  const value = result.value as {
    readonly value?: unknown;
    readonly etag?: string;
  };
  const etag = value.etag;
  const headers = responseHeaders(correlationId);
  if (etag !== undefined) headers.ETag = etag;
  return Response.json(
    createSuccessEnvelope(
      value.value ?? result.value,
      { correlationId },
    ),
    {
      status: successStatus,
      headers,
    },
  );
}

function validationResponse(
  error: unknown,
  correlationId: import("../../platform/api/v1.ts").CorrelationId | undefined,
): Response {
  const value = correlationId ??
    ("cor_route" as import("../../platform/api/v1.ts").CorrelationId);
  const message = error instanceof Error
    ? error.message
    : "The Work Management request is invalid; expected an authenticated scoped command.";
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
