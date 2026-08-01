export type HealthState = "healthy" | "not-ready";

export interface HealthCheck {
  readonly name: string;
  readonly state: HealthState;
}

export interface HealthSnapshot {
  readonly service: string;
  readonly state: HealthState;
  readonly checks: readonly HealthCheck[];
}

export class RuntimeReadiness {
  private databaseState: HealthState = "not-ready";

  constructor(private readonly service: string) {}

  setDatabaseState(connected: boolean): void {
    this.databaseState = connected ? "healthy" : "not-ready";
  }

  live(): HealthSnapshot {
    return { service: this.service, state: "healthy", checks: [] };
  }

  ready(): HealthSnapshot {
    return {
      service: this.service,
      state: this.databaseState,
      checks: [{ name: "database", state: this.databaseState }],
    };
  }
}

export function healthResponse(snapshot: HealthSnapshot): Response {
  const status = snapshot.state === "healthy" ? 200 : 503;
  return Response.json(snapshot, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function handleHealthRequest(
  request: Request,
  readiness: RuntimeReadiness,
): Response | null {
  if (request.method !== "GET") return null;
  const path = new URL(request.url).pathname;
  if (path === "/health/live") return healthResponse(readiness.live());
  if (path === "/health/ready") return healthResponse(readiness.ready());
  return null;
}
