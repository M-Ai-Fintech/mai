import type { WorkManagementV1Application } from "./work_management.ts";
import type {
  WorkManagementAuthenticatedContext,
  WorkManagementContextPort,
} from "./work_management_contracts.ts";
import {
  contextFailureResponse,
  methodNotAllowed,
  validationResponse,
} from "./work_management_route_responses.ts";
import {
  isWorkManagementPath,
  parseWorkManagementRoute,
} from "./work_management_route_parsing.ts";
import { dispatch } from "./work_management_route_dispatch.ts";

export interface WorkManagementV1RouteDependencies {
  readonly context: WorkManagementContextPort;
  readonly application: WorkManagementV1Application;
}

export async function handleWorkManagementV1Route(
  request: Request,
  dependencies: WorkManagementV1RouteDependencies,
): Promise<Response | null> {
  const route = parseWorkManagementRoute(new URL(request.url).pathname);
  if (route === undefined) {
    return isWorkManagementPath(new URL(request.url).pathname)
      ? methodNotAllowed()
      : null;
  }
  const authenticated = await authenticate(request, dependencies);
  if (authenticated instanceof Response) return authenticated;
  try {
    return await dispatch(
      request,
      route,
      authenticated,
      dependencies.application,
    );
  } catch (error) {
    return validationResponse(error, authenticated.context.correlationId);
  }
}

async function authenticate(
  request: Request,
  dependencies: WorkManagementV1RouteDependencies,
): Promise<WorkManagementAuthenticatedContext | Response> {
  try {
    return await dependencies.context.contextFor(request);
  } catch (error) {
    return contextFailureResponse(error, request);
  }
}
