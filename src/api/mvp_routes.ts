/** HTTP adapter for the deterministic MVP_6 service boundary. */

import { z } from "zod";
import { jsonError } from "./contracts.ts";
import { MvpStoreError } from "./mvp_store.ts";
import { handleChatRoutes } from "./routes/chat.ts";
import { handleDashboardRoutes } from "./routes/dashboard.ts";
import { handleDealRoutes } from "./routes/deals.ts";
import {
  MvpRouteDependencies,
  resolveMvpRouteDependencies,
} from "./routes/dependencies.ts";
import { handleEngineAndDocumentRoutes } from "./routes/engines_documents.ts";
import { handleEntitiesAndTeamRoutes } from "./routes/entities_team.ts";
import { handleNotificationRoutes } from "./routes/notifications.ts";
import {
  HttpRouteError,
  MvpDomainRouteHandler,
  MvpRouteContext,
  validationError,
} from "./routes/shared.ts";

export type {
  ChatExecutionInput,
  ChatExecutionResult,
  DocumentExecutionInput,
  EngineExecutionInput,
  MvpRouteDependencies,
} from "./routes/dependencies.ts";

const domainRoutes: MvpDomainRouteHandler[] = [
  handleEntitiesAndTeamRoutes,
  handleDealRoutes,
  handleChatRoutes,
  handleEngineAndDocumentRoutes,
  handleNotificationRoutes,
  handleDashboardRoutes,
];

/**
 * Handle an MVP_6 route, returning `null` when the pathname is outside this
 * adapter. Domain handlers remain ordered to preserve the original matching
 * precedence while this module provides the stable public entry point.
 */
export async function handleMvpRoute(
  request: Request,
  dependencies: MvpRouteDependencies = {},
): Promise<Response | null> {
  const context = routeContext(request, dependencies);
  try {
    return await dispatchRoute(context);
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}

function routeContext(
  request: Request,
  dependencies: MvpRouteDependencies,
): MvpRouteContext {
  const url = new URL(request.url);
  return {
    request,
    url,
    path: url.pathname.replace(/\/+$/, "") || "/",
    method: request.method.toUpperCase(),
    ...resolveMvpRouteDependencies(dependencies),
  };
}

async function dispatchRoute(
  context: MvpRouteContext,
): Promise<Response | null> {
  for (const handleDomainRoute of domainRoutes) {
    const response = await handleDomainRoute(context);
    if (response) return response;
  }
  return null;
}

function routeErrorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) return validationError(error);
  if (error instanceof MvpStoreError || error instanceof HttpRouteError) {
    return jsonError(
      error.status,
      error.code,
      error.message,
      error.fieldErrors,
    );
  }
  return jsonError(
    500,
    "INTERNAL_ERROR",
    "The request could not be completed",
  );
}
