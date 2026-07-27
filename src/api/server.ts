import { AgentOrchestrator } from "../agent/index.ts";
import { TransactionRepository } from "../core/db/TransactionRepository.ts";
import { handleLegacyRoute } from "./routes/legacy.ts";
import { handleMvpRoute } from "./mvp_routes.ts";

const PORT = 8000;

function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Last-Event-ID",
  });
}

function withMvpHeaders(response: Response, cors: Headers): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of cors.entries()) headers.set(name, value);
  headers.set("X-MAI-Persistence", "mock-backed-in-memory");
  headers.set(
    "Access-Control-Expose-Headers",
    "X-MAI-Persistence, X-Resource-Version",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function routeRequest(
  request: Request,
  repository: TransactionRepository,
): Promise<Response> {
  const headers = corsHeaders();
  if (request.method === "OPTIONS") return new Response(null, { headers });
  try {
    return await routedResponse(request, repository, headers);
  } catch (error: unknown) {
    return unexpectedResponse(error, headers);
  }
}

async function routedResponse(
  request: Request,
  repository: TransactionRepository,
  headers: Headers,
): Promise<Response> {
  const mvpResponse = await handleMvpRoute(request, {
    executeChat: async ({ dealId, message }) => ({
      content: await AgentOrchestrator.executeAgentQuery(dealId, message),
      citations: [],
    }),
  });
  if (mvpResponse) return withMvpHeaders(mvpResponse, headers);
  return await handleLegacyRoute(request, repository, headers) ??
    new Response("Not Found", { status: 404, headers });
}

function unexpectedResponse(error: unknown, headers: Headers): Response {
  console.error("[API Error]", error);
  const message = error instanceof Error
    ? error.message
    : "Unexpected server error";
  return jsonResponse({ error: message }, headers, 500);
}

function jsonResponse(
  body: unknown,
  headers: Headers,
  status = 200,
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  return Response.json(body, { status, headers: responseHeaders });
}

async function connectRepository(
  repository: TransactionRepository,
): Promise<void> {
  const connected = await repository.connect();
  const message = connected
    ? "Database connected successfully."
    : "Database not connected. Running in fallback mode.";
  connected
    ? console.log(`[API Server] ${message}`)
    : console.warn(`[API Server] ${message}`);
}

export function startServer(): Deno.HttpServer {
  const repository = TransactionRepository.getRepoInstance();
  void connectRepository(repository);
  console.log(`[API Server] Starting on http://localhost:${PORT}`);
  return Deno.serve(
    { port: PORT },
    (request) => routeRequest(request, repository),
  );
}

if (import.meta.main) startServer();

export { jsonResponse };
