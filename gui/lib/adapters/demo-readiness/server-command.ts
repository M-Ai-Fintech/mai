export interface DemoCommandDispatch {
  dispatch(request: Request): Promise<Response>;
}

/** Forwards one authenticated demo command without exposing its session. */
export async function forwardDemoHumanCommand(
  incoming: Request,
  session: string | undefined,
  environment: Readonly<Record<string, string | undefined>>,
  transport: DemoCommandDispatch,
): Promise<Response> {
  if (session === undefined) return new Response(null, { status: 401 });
  const validation = validateCommand(incoming, environment);
  if (validation !== undefined) return validation;
  const target = commandTarget(environment);
  const response = await transport.dispatch(
    new Request(target, {
      method: "POST",
      headers: forwardedHeaders(incoming, session),
    }),
  );
  return safeResponse(response);
}

function validateCommand(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
): Response | undefined {
  if (environment.NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED !== "true") {
    return new Response(null, { status: 404 });
  }
  const expectedDeal = environment.MAI_DEMO_DEAL_ID ?? "deal_serra-azul";
  if (request.headers.get("X-Deal-Id") !== expectedDeal) {
    return new Response(null, { status: 403 });
  }
  if (request.headers.get("Idempotency-Key") !== "idem_investor-demo-execute") {
    return new Response(null, { status: 422 });
  }
  return canonicalCorrelation(request)
    ? undefined
    : new Response(null, { status: 422 });
}

function canonicalCorrelation(request: Request): boolean {
  const value = request.headers.get("X-Correlation-Id") ?? "";
  return /^cor_[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function commandTarget(
  environment: Readonly<Record<string, string | undefined>>,
): URL {
  const base = environment.MAI_API_BASE_URL ?? "http://127.0.0.1:8000";
  return new URL("/api/v1/demo-readiness/execute", base);
}

function forwardedHeaders(request: Request, session: string): Headers {
  const headers = new Headers({
    Authorization: `Bearer ${session}`,
    "X-Deal-Id": request.headers.get("X-Deal-Id") ?? "",
    "X-Correlation-Id": request.headers.get("X-Correlation-Id") ?? "",
    "Idempotency-Key": request.headers.get("Idempotency-Key") ?? "",
  });
  headers.set("Accept", "application/json");
  return headers;
}

function safeResponse(response: Response): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  const correlation = response.headers.get("X-Correlation-Id");
  if (correlation !== null) headers.set("X-Correlation-Id", correlation);
  return new Response(response.body, { status: response.status, headers });
}
