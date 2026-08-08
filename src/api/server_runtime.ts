import { logOperationalEvent } from "../platform/operations/diagnostics.ts";
import { RuntimeReadiness } from "../platform/operations/health.ts";

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
