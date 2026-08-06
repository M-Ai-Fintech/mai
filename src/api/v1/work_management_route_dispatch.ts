import {
  approvalRequestId,
  taskId,
  workstreamId,
} from "../../work_management/v1.ts";
import type { WorkScope } from "../../work_management/v1.ts";
import type {
  ApprovalDecisionCommand,
  CreateApprovalRequestCommand,
  CreateTaskCommand,
  CreateWorkstreamCommand,
  TransitionTaskCommand,
  TransitionWorkstreamCommand,
  WorkManagementApiResult,
  WorkManagementAuthenticatedContext,
  WorkManagementCommandMetadata,
} from "./work_management_contracts.ts";
import type { WorkManagementV1Application } from "./work_management.ts";
import {
  actorId,
  commandMetadata,
  jsonBody,
  rejectServerOwnedMetadata,
  requiresVersion,
  workScope,
} from "./work_management_route_parsing.ts";
import type {
  ApprovalCommand,
  WorkManagementRoute,
} from "./work_management_route_types.ts";
import {
  parseApprovalCreation,
  requiredState,
  requiredString,
} from "./work_management_validation.ts";
import {
  methodNotAllowed,
  writeResult,
} from "./work_management_route_responses.ts";

type ApprovalTransitionInput = Parameters<
  WorkManagementV1Application["openApprovalRequest"]
>[0];

/** Dispatches a parsed Work Management v1 route to its application operation.
 *
 * @example await dispatch(request, route, authenticated, application)
 */
export function dispatch(
  request: Request,
  route: WorkManagementRoute,
  authenticated: WorkManagementAuthenticatedContext,
  application: WorkManagementV1Application,
): Promise<Response> {
  const scope = workScope(authenticated.context);
  if (isReadRequest(request, route)) {
    return readResource(route, authenticated, scope, application);
  }
  return dispatchCommand(request, route, authenticated, scope, application);
}

async function dispatchCommand(
  request: Request,
  route: WorkManagementRoute,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
  application: WorkManagementV1Application,
): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed();
  const body = await jsonBody(request);
  rejectServerOwnedMetadata(body);
  return routeCommand(
    route,
    body,
    commandMetadata(request, requiresVersion(route)),
    authenticated,
    scope,
    application,
  );
}

function isReadRequest(
  request: Request,
  route: WorkManagementRoute,
): boolean {
  return request.method === "GET" && route.id !== undefined &&
    route.command === undefined;
}

async function readResource(
  route: WorkManagementRoute,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
  application: WorkManagementV1Application,
): Promise<Response> {
  const { context, actor } = authenticated;
  const result = await readByRouteKind(
    route,
    context,
    actor,
    scope,
    application,
  );
  return writeResult(result, context.correlationId, 200);
}

function readByRouteKind(
  route: WorkManagementRoute,
  context: WorkManagementAuthenticatedContext["context"],
  actor: WorkManagementAuthenticatedContext["actor"],
  scope: WorkScope,
  application: WorkManagementV1Application,
): Promise<WorkManagementApiResult<unknown>> {
  if (route.kind === "workstreams") {
    return application.readWorkstream({
      context,
      actor,
      scope,
      id: workstreamId(route.id!),
    });
  }
  if (route.kind === "tasks") {
    return application.readTask({
      context,
      actor,
      scope,
      id: taskId(route.id!),
    });
  }
  return application.readApprovalRequest({
    context,
    actor,
    scope,
    id: approvalRequestId(route.id!),
  });
}

function routeCommand(
  route: WorkManagementRoute,
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
  application: WorkManagementV1Application,
): Promise<Response> {
  if (route.id === undefined && route.command === undefined) {
    return createCollection(
      route,
      body,
      metadata,
      authenticated,
      scope,
      application,
    );
  }
  if (route.id !== undefined && route.kind !== "approval_requests") {
    return transitionWorkItem(
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
    return transitionApproval(
      route.id,
      route.command,
      body,
      metadata,
      authenticated,
      scope,
      application,
    );
  }
  return Promise.resolve(methodNotAllowed());
}

async function createCollection(
  route: WorkManagementRoute,
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
  application: WorkManagementV1Application,
): Promise<Response> {
  const result = await createByRouteKind(
    route,
    body,
    metadata,
    authenticated,
    scope,
    application,
  );
  const { context } = authenticated;
  return writeResult(result, context.correlationId, 201);
}

function createByRouteKind(
  route: WorkManagementRoute,
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
  application: WorkManagementV1Application,
): Promise<WorkManagementApiResult<unknown>> {
  if (route.kind === "workstreams") {
    return application.createWorkstream(
      workstreamCreation(body, metadata, authenticated, scope),
    );
  }
  if (route.kind === "tasks") {
    return application.createTask(
      taskCreation(body, metadata, authenticated, scope),
    );
  }
  return createApproval(body, metadata, authenticated, scope, application);
}

function workstreamCreation(
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
): CreateWorkstreamCommand {
  return {
    ...metadata,
    ...authenticated,
    scope,
    id: workstreamId(requiredString(body.id, "id")),
    name: requiredString(body.name, "name"),
    ownerId: actorId(requiredString(body.ownerId, "ownerId")),
  };
}

function taskCreation(
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
): CreateTaskCommand {
  return {
    ...metadata,
    ...authenticated,
    scope,
    id: taskId(requiredString(body.id, "id")),
    workstreamId: workstreamId(
      requiredString(body.workstreamId, "workstreamId"),
    ),
    ...(body.parentTaskId === undefined ? {} : {
      parentTaskId: taskId(requiredString(body.parentTaskId, "parentTaskId")),
    }),
    title: requiredString(body.title, "title"),
    assigneeId: actorId(requiredString(body.assigneeId, "assigneeId")),
  };
}

async function createApproval(
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
  application: WorkManagementV1Application,
): Promise<WorkManagementApiResult<unknown>> {
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
  scope: WorkScope,
  application: WorkManagementV1Application,
): Promise<Response> {
  const result = route.kind === "workstreams"
    ? await application.transitionWorkstream(
      workstreamTransition(route, body, metadata, authenticated, scope),
    )
    : await application.transitionTask(
      taskTransition(route, body, metadata, authenticated, scope),
    );
  const { context } = authenticated;
  return writeResult(result, context.correlationId, 200);
}

function workstreamTransition(
  route: Extract<WorkManagementRoute, { readonly kind: "workstreams" }>,
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
): TransitionWorkstreamCommand {
  return {
    ...metadata,
    ...authenticated,
    scope,
    id: workstreamId(route.id!),
    toState: requiredState(body.toState, [
      "planned",
      "active",
      "blocked",
      "completed",
      "cancelled",
    ]),
  };
}

function taskTransition(
  route: Extract<WorkManagementRoute, { readonly kind: "tasks" }>,
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
): TransitionTaskCommand {
  return {
    ...metadata,
    ...authenticated,
    scope,
    id: taskId(route.id!),
    toState: requiredState(body.toState, [
      "open",
      "in_progress",
      "blocked",
      "completed",
      "cancelled",
    ]),
  };
}

async function transitionApproval(
  routeId: string,
  command: ApprovalCommand,
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
  application: WorkManagementV1Application,
): Promise<Response> {
  const input = approvalTransitionInput(
    routeId,
    body,
    metadata,
    authenticated,
    scope,
  );
  const result = await applyApprovalTransition(command, input, application);
  return writeResult(result, authenticated.context.correlationId, 200);
}

function approvalTransitionInput(
  routeId: string,
  body: Record<string, unknown>,
  metadata: WorkManagementCommandMetadata,
  authenticated: WorkManagementAuthenticatedContext,
  scope: WorkScope,
): ApprovalTransitionInput {
  return {
    ...metadata,
    ...authenticated,
    scope,
    id: approvalRequestId(routeId),
    ...(body.reason === undefined
      ? {}
      : { reason: requiredString(body.reason, "reason") }),
  };
}

function applyApprovalTransition(
  command: ApprovalCommand,
  input: ApprovalTransitionInput,
  application: WorkManagementV1Application,
): Promise<WorkManagementApiResult<unknown>> {
  if (command === "open") return application.openApprovalRequest(input);
  if (command === "withdraw") return application.withdrawApprovalRequest(input);
  if (command === "invalidate") {
    return application.invalidateApprovalRequest(input);
  }
  if (command === "expire") return application.expireApprovalRequest(input);
  return application.decideApprovalRequest(
    {
      ...input,
      outcome: command === "approve" ? "approved" : "rejected",
    } satisfies ApprovalDecisionCommand,
  );
}
