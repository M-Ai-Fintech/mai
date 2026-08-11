import { DealRepository } from "../core/db/DealRepository.ts";
import { handleIdentityAccessRoute } from "../identity_access/http.ts";
import { handleMvpRoute } from "./mvp_routes.ts";
import { withMvpPersistenceHeaders } from "./server_runtime.ts";

/** Routes retained non-Deal surfaces without eagerly loading provider runtimes.
 *
 * @example await routeNonDealRequest(request, repository, headers)
 */
export async function routeNonDealRequest(
  request: Request,
  repository: DealRepository,
  headers: Headers,
): Promise<Response> {
  const identityResponse = await handleIdentityAccessRoute(
    request,
    undefined,
    headers,
  );
  if (identityResponse) return identityResponse;
  const mvpResponse = await handleMvpRoute(request, {
    executeChat: executeLegacyChat,
  });
  if (mvpResponse) return withMvpPersistenceHeaders(mvpResponse, headers);
  return await routeLegacyRequest(request, repository, headers) ??
    new Response("Not Found", { status: 404, headers });
}

async function routeLegacyRequest(
  request: Request,
  repository: DealRepository,
  headers: Headers,
): Promise<Response | null> {
  const { handleLegacyRoute } = await import("./routes/legacy.ts");
  return await handleLegacyRoute(request, repository, headers);
}

async function executeLegacyChat(input: {
  readonly dealId: string;
  readonly message: string;
}) {
  const { AgentOrchestrator } = await import("../agent/index.ts");
  return {
    content: await AgentOrchestrator.executeAgentQuery(
      input.dealId,
      input.message,
    ),
    citations: [],
  };
}
