import { logOperationalEvent } from "../platform/operations/diagnostics.ts";
import { RuntimeReadiness } from "../platform/operations/health.ts";
import { type CorrelationId, parseCorrelationId } from "../platform/api/v1.ts";

/** Resolves one canonical correlation ID for transport and application use. */
export function requestCorrelationId(request: Request): CorrelationId {
  const supplied = parseCorrelationId(request.headers.get("X-Correlation-Id"));
  if (supplied.ok) return supplied.value;
  const generated = `cor_${crypto.randomUUID().replaceAll("-", "")}`;
  const parsed = parseCorrelationId(generated);
  if (parsed.ok) return parsed.value;
  throw new Error(
    `Generated correlation ID "${generated}" was invalid; expected a canonical cor_ identifier.`,
  );
}

/** Builds the API's explicit cross-origin contract.
 *
 * @example const headers = apiCorsHeaders()
 */
export function apiCorsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, If-Match, Idempotency-Key, Last-Event-ID, X-Correlation-Id, X-Workspace-Id, X-Deal-Id",
    "Access-Control-Expose-Headers": "ETag, X-Correlation-Id",
  });
}

/** Labels retained mock-backed MVP responses without hiding their persistence.
 *
 * @example const labelled = withMvpPersistenceHeaders(response, cors)
 */
export function withMvpPersistenceHeaders(
  response: Response,
  cors: Headers,
): Response {
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

export function withCorsHeaders(response: Response, cors: Headers): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of cors.entries()) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function withCorrelationId(
  response: Response,
  correlationId: string,
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Correlation-Id", correlationId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function requestWithCorrelation(
  request: Request,
  correlationId: string,
): Request {
  if (request.headers.get("X-Correlation-Id") === correlationId) return request;
  const headers = new Headers(request.headers);
  headers.set("X-Correlation-Id", correlationId);
  return new Request(request, { headers });
}

/** Returns a JSON response while preserving the caller's transport headers. */
export function jsonResponse(
  body: unknown,
  headers: Headers,
  status = 200,
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  return Response.json(body, { status, headers: responseHeaders });
}

export function configuredPort(
  environment: Readonly<Record<string, string | undefined>>,
): number {
  const raw = environment.MAI_API_PORT;
  if (raw === undefined) return 8000;
  const port = Number(raw);
  if (Number.isInteger(port) && port > 0 && port < 65_536) return port;
  throw new Error(
    `API environment "MAI_API_PORT" is "${raw}"; expected a TCP port from 1 to 65535.`,
  );
}

export function installApiShutdown(
  server: Deno.HttpServer,
  readiness: RuntimeReadiness,
): void {
  let shuttingDown = false;
  const shutdown = (signal: "SIGTERM" | "SIGINT"): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    readiness.beginDrain();
    logOperationalEvent("api.drain.started", { signal });
    void server.shutdown().then(() => readiness.markStopped());
  };
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    Deno.addSignalListener(signal, () => shutdown(signal));
  }
}
