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

/** Handles one Work Management v1 request or returns null for another route.
 *
 * @example await handleWorkManagementV1Route(request, dependencies)
 */
export async function handleWorkManagementV1Route(
  request: Request,
  dependencies: WorkManagementV1RouteDependencies,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const route = parseWorkManagementRoute(path);
  if (route === undefined) return unmatchedWorkManagementRoute(path);
  const authenticated = await authenticate(request, dependencies);
  if (authenticated instanceof Response) return authenticated;
  return dispatchSafely(
    request,
    route,
    authenticated,
    dependencies.application,
  );
}

function unmatchedWorkManagementRoute(path: string): Response | null {
  return isWorkManagementPath(path) ? methodNotAllowed() : null;
}

async function dispatchSafely(
  request: Request,
  route: Parameters<typeof dispatch>[1],
  authenticated: WorkManagementAuthenticatedContext,
  application: WorkManagementV1Application,
): Promise<Response> {
  try {
    return await dispatch(request, route, authenticated, application);
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
