const SESSION_PATTERN = /^session_[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Resolves a server-only session while keeping production local fallbacks off. */
export function serverSession(
  cookieSession: string | undefined,
  environment: Readonly<Record<string, string | undefined>>,
): string | undefined {
  if (validSession(cookieSession)) return cookieSession;
  const demoSession = environment.NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED ===
      "true"
    ? environment.MAI_DEMO_SESSION_ID
    : undefined;
  if (validSession(demoSession)) return demoSession;
  const localSession = environment.NODE_ENV !== "production" &&
      environment.MAI_LOCAL_MVP_ENABLED === "true"
    ? environment.MAI_LOCAL_SESSION_ID
    : undefined;
  return validSession(localSession) ? localSession : undefined;
}

function validSession(value: string | undefined): value is string {
  return value !== undefined && SESSION_PATTERN.test(value);
}
