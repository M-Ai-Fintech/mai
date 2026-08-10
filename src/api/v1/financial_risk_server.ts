import { withCorsHeaders } from "../server_runtime.ts";
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
): Promise<Response | undefined> {
  const path = new URL(request.url).pathname;
  if (
    path !== "/api/v1/financial-risk" &&
    !path.startsWith("/api/v1/financial-risk/")
  ) return undefined;
  if (dependencies.financialRisk === undefined) {
    return unavailable(headers);
  }
  return withCorsHeaders(
    await handleFinancialRiskV1Route(request, dependencies.financialRisk) ??
      new Response("Not Found", { status: 404 }),
    headers,
  );
}

function unavailable(headers: Headers): Response {
  return Response.json(
    { error: "Financial-risk route is not configured." },
    { status: 503, headers },
  );
}
