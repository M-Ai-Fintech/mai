import { withCorsHeaders } from "../server_runtime.ts";
import { type CorrelationId, createApiError } from "../../platform/api/v1.ts";
import {
  type FinancialRiskV1RouteDependencies,
  handleFinancialRiskV1Route,
} from "./financial_risk_routes.ts";

export interface FinancialRiskServerRouteDependencies {
  readonly financialRisk?: FinancialRiskV1RouteDependencies;
}

export async function routeFinancialRiskRequest(
  request: Request,
  dependencies: FinancialRiskServerRouteDependencies,
  headers: Headers,
  correlationId: CorrelationId,
): Promise<Response | undefined> {
  const path = new URL(request.url).pathname;
  if (
    path !== "/api/v1/financial-risk" &&
    !path.startsWith("/api/v1/financial-risk/") &&
    path !== "/api/v1/jobs" &&
    !path.startsWith("/api/v1/jobs/")
  ) return undefined;
  if (dependencies.financialRisk === undefined) {
    return unavailable(headers, correlationId);
  }
  return withCorsHeaders(
    await handleFinancialRiskV1Route(request, dependencies.financialRisk) ??
      new Response("Not Found", { status: 404 }),
    headers,
  );
}

function unavailable(headers: Headers, correlationId: CorrelationId): Response {
  return Response.json(
    createApiError({
      code: "DEPENDENCY_UNAVAILABLE",
      message: "Financial-risk route is not configured.",
      correlationId,
      retryable: true,
    }),
    { status: 503, headers },
  );
}
