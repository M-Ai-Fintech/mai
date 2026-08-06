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

export async function dispatch(
  request: Request,
  route: WorkManagementRoute,
  authenticated: WorkManagementAuthenticatedContext,
  application: WorkManagementV1Application,
): Promise<Response> {
  const scope = workScope(authenticated.context);
  if (isReadRequest(request, route)) {
    return readResource(route, authenticated, scope, application);
  }
  if (request.method !== "POST") return methodNotAllowed();
  const body = await jsonBody(request);
  rejectServerOwnedMetadata(body);
  const metadata = commandMetadata(request, requiresVersion(route));
  return routeCommand(
    route,
    body,
    metadata,
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
  const result = route.kind === "workstreams"
    ? await application.readWorkstream({
      context,
      actor,
      scope,
      id: workstreamId(route.id!),
    })
    : route.kind === "tasks"
    ? await application.readTask({
      context,
      actor,
      scope,
      id: taskId(route.id!),
    })
    : await application.readApprovalRequest({
      context,
      actor,
      scope,
      id: approvalRequestId(route.id!),
    });
  return writeResult(result, context.correlationId, 200);
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
  const { context, actor } = authenticated;
  const result = route.kind === "workstreams"
    ? await application.transitionWorkstream(
      {
        ...metadata,
        context,
        actor,
        scope,
        id: workstreamId(route.id!),
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
        id: taskId(route.id!),
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
  scope: WorkScope,
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
