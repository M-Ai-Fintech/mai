import {
  type DocumentsV1RouteDependencies,
  handleDocumentsV1Route,
} from "./v1/documents_routes.ts";
import {
  type EvidenceKnowledgeV1RouteDependencies,
  handleEvidenceKnowledgeV1Route,
} from "./v1/evidence_knowledge_routes.ts";
import {
  handleNotificationV1Route,
  type NotificationV1RouteDependencies,
} from "./v1/notifications_routes.ts";
import {
  handleWorkManagementV1Route,
  type WorkManagementV1RouteDependencies,
} from "./v1/work_management_routes.ts";
import { withCorsHeaders } from "./server_runtime.ts";
import { ExecutableRequestContextError } from "./executable_request_context.ts";
import {
  DealAuthenticationError,
  DealAuthenticationUnavailableError,
} from "../deal_management/http_shared.ts";

export interface CoreWorkflowRouteDependencies {
  readonly documents?: DocumentsV1RouteDependencies;
  readonly evidenceKnowledge?: EvidenceKnowledgeV1RouteDependencies;
  readonly workManagement?: WorkManagementV1RouteDependencies;
  readonly notifications?: NotificationV1RouteDependencies;
}

/** Dispatches configured cross-context workflow HTTP routes.
 *
 * @example await routeCoreWorkflowRequest(request, dependencies, corsHeaders)
 */
export async function routeCoreWorkflowRequest(
  request: Request,
  dependencies: CoreWorkflowRouteDependencies,
  headers: Headers,
): Promise<Response | undefined> {
  try {
    return await routeCoreWorkflowRequestUnsafe(request, dependencies, headers);
  } catch (error) {
    return coreWorkflowFailure(error, headers);
  }
}

async function routeCoreWorkflowRequestUnsafe(
  request: Request,
  dependencies: CoreWorkflowRouteDependencies,
  headers: Headers,
): Promise<Response | undefined> {
  const path = new URL(request.url).pathname;
  if (hasPrefix(path, "/api/v1/documents")) {
    return await routeDocuments(request, dependencies.documents, headers);
  }
  if (hasPrefix(path, "/api/v1/evidence-knowledge")) {
    return routeEvidence(request, dependencies.evidenceKnowledge, headers);
  }
  if (hasPrefix(path, "/api/v1/work-management")) {
    return routeWorkManagement(request, dependencies.workManagement, headers);
  }
  if (hasPrefix(path, "/api/v1/notifications")) {
    return routeNotifications(request, dependencies.notifications, headers);
  }
  return undefined;
}

function coreWorkflowFailure(error: unknown, headers: Headers): Response {
  if (error instanceof ExecutableRequestContextError) {
    return safeError(error.status, error.code, error.message, headers);
  }
  if (error instanceof DealAuthenticationError) {
    return safeError(
      401,
      "AUTHENTICATION_FAILED",
      "Authentication failed.",
      headers,
    );
  }
  if (error instanceof DealAuthenticationUnavailableError) {
    return safeError(
      503,
      "AUTHENTICATION_UNAVAILABLE",
      "Authentication is unavailable.",
      headers,
    );
  }
  throw error;
}

function safeError(
  status: number,
  code: string,
  message: string,
  headers: Headers,
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  return Response.json(
    { error: { code, message, retryable: status === 503 } },
    { status, headers: responseHeaders },
  );
}

async function routeDocuments(
  request: Request,
  dependencies: DocumentsV1RouteDependencies | undefined,
  headers: Headers,
): Promise<Response> {
  if (dependencies === undefined) return unavailable(headers);
  const response = await handleDocumentsV1Route(request, dependencies);
  return withCorsHeaders(response ?? notFound(), headers);
}

async function routeEvidence(
  request: Request,
  dependencies: EvidenceKnowledgeV1RouteDependencies | undefined,
  headers: Headers,
): Promise<Response> {
  if (dependencies === undefined) return unavailable(headers);
  const response = await handleEvidenceKnowledgeV1Route(request, dependencies);
  return withCorsHeaders(response ?? notFound(), headers);
}

async function routeWorkManagement(
  request: Request,
  dependencies: WorkManagementV1RouteDependencies | undefined,
  headers: Headers,
): Promise<Response> {
  if (dependencies === undefined) return unavailable(headers);
  const response = await handleWorkManagementV1Route(request, dependencies);
  return withCorsHeaders(response ?? notFound(), headers);
}

async function routeNotifications(
  request: Request,
  dependencies: NotificationV1RouteDependencies | undefined,
  headers: Headers,
): Promise<Response> {
  if (dependencies === undefined) return unavailable(headers);
  return await handleNotificationV1Route(request, dependencies, headers) ??
    notFound();
}

function hasPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function unavailable(headers: Headers): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  return Response.json(
    { error: "Core workflow route is not configured." },
    { status: 503, headers: responseHeaders },
  );
}

function notFound(): Response {
  return new Response("Not Found", { status: 404 });
}
