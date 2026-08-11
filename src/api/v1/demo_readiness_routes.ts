import {
  DemoReadinessApplicationError,
} from "../../demo_readiness/application.ts";
import type {
  DemoReadinessResult,
  DemoScreenFamily,
  DemoScreenReadModel,
  DemoShellReadModel,
} from "../../demo_readiness/contracts.ts";
import type { IdempotencyKey } from "../../platform/api/v1.ts";
import { demoScope } from "../../demo_readiness/runner.ts";
import {
  ExecutableRequestContextError,
} from "../executable_request_context.ts";
import {
  DealAuthenticationError,
  DealAuthenticationUnavailableError,
} from "../../deal_management/http_shared.ts";
import { parseIdempotencyKey } from "../../platform/api/v1.ts";

const BASE_PATH = "/api/v1/demo-readiness";
const screenFamilies: readonly DemoScreenFamily[] = [
  "command-center",
  "deals-portfolio",
  "deal-overview",
  "documents-vdr",
  "diligence-decision-room",
  "valuation-lab",
  "matching-universe",
  "negotiation-room",
  "tasks-approvals",
  "deal-activity-audit",
  "deliverables-exports",
];

export interface DemoReadinessV1RouteDependencies {
  readonly application: DemoReadinessRouteApplication;
}

export interface DemoReadinessRouteApplication {
  execute(
    request: Request,
    idempotencyKey: IdempotencyKey,
  ): Promise<DemoReadinessResult>;
  readScreen(
    request: Request,
    family: DemoScreenFamily,
  ): Promise<DemoScreenReadModel>;
  readShell(request: Request): Promise<DemoShellReadModel>;
}

/** Handles the authenticated local investor-demo application contract.
 *
 * @example await handleDemoReadinessV1Route(request, dependencies)
 */
export async function handleDemoReadinessV1Route(
  request: Request,
  dependencies: DemoReadinessV1RouteDependencies,
): Promise<Response | undefined> {
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  if (path === `${BASE_PATH}/execute`) {
    return request.method === "POST"
      ? await execute(request, dependencies.application)
      : methodNotAllowed("POST");
  }
  const screen = screenPath(path);
  if (screen !== undefined) {
    return request.method === "GET"
      ? await readScreen(request, screen, dependencies.application)
      : methodNotAllowed("GET");
  }
  if (path === `${BASE_PATH}/deals/${demoScope.dealId}/shell`) {
    return request.method === "GET"
      ? await readShell(request, dependencies.application)
      : methodNotAllowed("GET");
  }
  return path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)
    ? new Response("Not Found", { status: 404 })
    : undefined;
}

async function readShell(
  request: Request,
  application: DemoReadinessRouteApplication,
): Promise<Response> {
  try {
    return success(await application.readShell(request), request, 200);
  } catch (error) {
    return failure(error, request);
  }
}

async function execute(
  request: Request,
  application: DemoReadinessRouteApplication,
): Promise<Response> {
  try {
    const parsed = parseIdempotencyKey(
      request.headers.get("Idempotency-Key"),
    );
    if (!parsed.ok) {
      return errorResponse(
        422,
        "VALIDATION_FAILED",
        "Idempotency-Key is invalid; expected an idem_ identifier.",
        request,
      );
    }
    const result = await application.execute(request, parsed.value);
    return success(result, request, 201);
  } catch (error) {
    return failure(error, request);
  }
}

async function readScreen(
  request: Request,
  family: DemoScreenFamily,
  application: DemoReadinessRouteApplication,
): Promise<Response> {
  try {
    const result = await application.readScreen(request, family);
    return success(result, request, 200);
  } catch (error) {
    return failure(error, request);
  }
}

function screenPath(path: string): DemoScreenFamily | undefined {
  const match = new RegExp(
    `^${BASE_PATH}/deals/([^/]+)/screens/([^/]+)$`,
  ).exec(path);
  if (match === null) return undefined;
  const dealId = safeDecode(match[1]);
  const decodedFamily = safeDecode(match[2]);
  if (dealId !== demoScope.dealId || decodedFamily === undefined) {
    return undefined;
  }
  const family = decodedFamily as DemoScreenFamily;
  return screenFamilies.includes(family) ? family : undefined;
}

function safeDecode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function success(body: unknown, request: Request, status: number): Response {
  return Response.json(
    {
      data: body,
      meta: {
        correlationId: request.headers.get("X-Correlation-Id") ??
          "cor_demo-readiness",
        freshness: "current",
      },
    },
    { status, headers: { "Content-Type": "application/json" } },
  );
}

function failure(error: unknown, request: Request): Response {
  if (error instanceof ExecutableRequestContextError) {
    return errorResponse(error.status, error.code, error.message, request);
  }
  if (error instanceof DemoReadinessApplicationError) {
    return errorResponse(error.status, error.code, error.message, request);
  }
  if (error instanceof DealAuthenticationError) {
    return errorResponse(
      401,
      "AUTHENTICATION_FAILED",
      "Authentication failed.",
      request,
    );
  }
  if (error instanceof DealAuthenticationUnavailableError) {
    return errorResponse(
      503,
      "AUTHENTICATION_UNAVAILABLE",
      "Authentication is unavailable.",
      request,
    );
  }
  throw error;
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  request: Request,
): Response {
  return Response.json({
    error: {
      code,
      message,
      correlationId: request.headers.get("X-Correlation-Id") ??
        "cor_demo-readiness",
      retryable: status === 503,
    },
  }, { status, headers: { "Content-Type": "application/json" } });
}

function methodNotAllowed(method: "GET" | "POST"): Response {
  return new Response(null, { status: 405, headers: { Allow: method } });
}
