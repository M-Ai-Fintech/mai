import { assertEquals, assertMatch } from "@std/assert";
import { createApiServer } from "../../src/api/server.ts";
import type {
  DemoReadinessResult,
  DemoScreenFamily,
  DemoScreenReadModel,
  DemoShellReadModel,
} from "../../src/demo_readiness/contracts.ts";
import { DemoReadinessApplicationError } from "../../src/demo_readiness/application.ts";
import type { IdempotencyKey } from "../../src/platform/api/v1.ts";
import type { DemoReadinessRouteApplication } from "../../src/api/v1/demo_readiness_routes.ts";

class DemoRouteApplicationFake implements DemoReadinessRouteApplication {
  executeCalls = 0;
  failure?: DemoReadinessApplicationError;

  execute(
    _request: Request,
    _idempotencyKey: IdempotencyKey,
  ): Promise<DemoReadinessResult> {
    this.executeCalls += 1;
    return Promise.reject(
      new Error("Execution result is unused in this test."),
    );
  }

  readScreen(
    _request: Request,
    family: DemoScreenFamily,
  ): Promise<DemoScreenReadModel> {
    return Promise.resolve({ family, items: [] });
  }

  readShell(_request: Request): Promise<DemoShellReadModel> {
    if (this.failure !== undefined) return Promise.reject(this.failure);
    return Promise.resolve({
      organization: { id: "workspace_demo", name: "Synthetic demo" },
      deal: { id: "deal_serra-azul", name: "Serra Azul", phase: "diligence" },
      permissions: ["workspace", "deal"],
      counts: { tasks: 1, approvals: 1, notifications: 0 },
    });
  }
}

Deno.test("demo success shares exact CORS and generated correlation metadata", async () => {
  const response = await demoServer(new DemoRouteApplicationFake()).handle(
    shellRequest(),
  );
  const body = await response.json();
  const correlationId = response.headers.get("X-Correlation-Id") ?? "";

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
  assertMatch(correlationId, /^cor_[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assertEquals(body.meta.correlationId, correlationId);
});

Deno.test("demo errors retain CORS and exact correlation metadata", async () => {
  const application = new DemoRouteApplicationFake();
  application.failure = new DemoReadinessApplicationError(
    403,
    "DEMO_ACCESS_DENIED",
    "The demo workflow is unavailable for this authenticated scope.",
  );
  const response = await demoServer(application).handle(shellRequest());
  const body = await response.json();

  assertEquals(response.status, 403);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(
    body.error.correlationId,
    response.headers.get("X-Correlation-Id"),
  );
});

Deno.test("demo dependency failures are sanitized retryable 503 responses", async () => {
  const application = new DemoRouteApplicationFake();
  application.failure = new DemoReadinessApplicationError(
    503,
    "DEMO_DEPENDENCY_UNAVAILABLE",
    "The demo workflow dependency is temporarily unavailable.",
  );
  const response = await demoServer(application).handle(shellRequest());
  const body = await response.json();

  assertEquals(response.status, 503);
  assertEquals(body.error.code, "DEMO_DEPENDENCY_UNAVAILABLE");
  assertEquals(body.error.retryable, true);
  assertEquals(JSON.stringify(body).includes("PostgreSQL"), false);
});

Deno.test("demo execute rejects a missing idempotency key before application work", async () => {
  const application = new DemoRouteApplicationFake();
  const response = await demoServer(application).handle(
    new Request("http://localhost/api/v1/demo-readiness/execute", {
      method: "POST",
      headers: { "X-Correlation-Id": "cor_demo-route-test" },
    }),
  );

  assertEquals(response.status, 422);
  assertEquals(application.executeCalls, 0);
});

function demoServer(application: DemoReadinessRouteApplication) {
  return createApiServer({ demoReadiness: { application } });
}

function shellRequest(): Request {
  return new Request(
    "http://localhost/api/v1/demo-readiness/deals/deal_serra-azul/shell",
  );
}
