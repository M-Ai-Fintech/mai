export type HealthState = "healthy" | "not-ready" | "draining" | "stopped";

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
  private lifecycleState: "running" | "draining" | "stopped" = "running";

  constructor(private readonly service: string) {}

  setDatabaseState(connected: boolean): void {
    if (this.lifecycleState !== "running") return;
    this.databaseState = connected ? "healthy" : "not-ready";
  }

  /** Stops new work from being accepted while allowing health probes to run. */
  beginDrain(): void {
    if (this.lifecycleState === "running") this.lifecycleState = "draining";
  }

  /** Marks the process stopped after its server/worker has closed. */
  markStopped(): void {
    this.lifecycleState = "stopped";
  }

  isAcceptingTraffic(): boolean {
    return this.lifecycleState === "running";
  }

  live(): HealthSnapshot {
    const state = this.lifecycleState === "stopped" ? "stopped" : "healthy";
    return { service: this.service, state, checks: [] };
  }

  ready(): HealthSnapshot {
    if (this.lifecycleState === "draining") {
      return {
        service: this.service,
        state: "draining",
        checks: [{ name: "lifecycle", state: "draining" }],
      };
    }
    if (this.lifecycleState === "stopped") {
      return {
        service: this.service,
        state: "stopped",
        checks: [{ name: "lifecycle", state: "stopped" }],
      };
    }
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
