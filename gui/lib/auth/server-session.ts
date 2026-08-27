const SESSION_PATTERN = /^session_[a-z0-9]+(?:-[a-z0-9]+)*$/;
type SyntheticSessionRuntime = "local" | "local-demo" | "test";

/** Resolves a server-only session while keeping production local fallbacks off. */
export function serverSession(
  cookieSession: string | undefined,
  environment: Readonly<Record<string, string | undefined>>,
): string | undefined {
  if (validSession(cookieSession)) return cookieSession;
  const runtime = approvedSyntheticSessionRuntime(environment);
  const demoSession = runtime !== undefined &&
      environment.NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED === "true"
    ? environment.MAI_DEMO_SESSION_ID
    : undefined;
  if (runtime !== undefined && validSession(demoSession)) return demoSession;
  const localSession = runtime === "local" &&
      environment.MAI_LOCAL_MVP_ENABLED === "true"
    ? environment.MAI_LOCAL_SESSION_ID
    : undefined;
  return validSession(localSession) ? localSession : undefined;
}

function approvedSyntheticSessionRuntime(
  environment: Readonly<Record<string, string | undefined>>,
): SyntheticSessionRuntime | undefined {
  if (environment.NODE_ENV === "production") return undefined;
  if (environment.LOCAL_RUNTIME_PROFILE === "local") return "local";
  if (environment.DENO_ENV === "local-demo") return "local-demo";
  return environment.DENO_ENV === "test" ? "test" : undefined;
}

function validSession(value: string | undefined): value is string {
  return value !== undefined && SESSION_PATTERN.test(value);
}
