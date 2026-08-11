import { describe, expect, it } from "vitest";
import {
  type DemoCommandDispatch,
  forwardDemoHumanCommand,
} from "./server-command";

class RecordingCommandDispatch implements DemoCommandDispatch {
  requests: Request[] = [];

  dispatch(request: Request): Promise<Response> {
    this.requests.push(request);
    return Promise.resolve(Response.json({ data: { persisted: true } }, {
      status: 201,
      headers: { "X-Correlation-Id": "cor_browser-command" },
    }));
  }
}

describe("demo readiness server command", () => {
  it("forwards the server-side session and exact command scope", async () => {
    const transport = new RecordingCommandDispatch();
    const response = await forwardDemoHumanCommand(
      commandRequest(),
      "session_investor-demo",
      enabledEnvironment(),
      transport,
    );

    expect(response.status).toBe(201);
    expect(transport.requests).toHaveLength(1);
    expect(transport.requests[0].headers.get("Authorization")).toBe(
      "Bearer session_investor-demo",
    );
    expect(transport.requests[0].url).toBe(
      "http://127.0.0.1:18071/api/v1/demo-readiness/execute",
    );
  });

  it("denies absent identity and cross-deal scope before dispatch", async () => {
    const transport = new RecordingCommandDispatch();
    const anonymous = await forwardDemoHumanCommand(
      commandRequest(),
      undefined,
      enabledEnvironment(),
      transport,
    );
    const crossScope = await forwardDemoHumanCommand(
      commandRequest("deal_other-scope"),
      "session_investor-demo",
      enabledEnvironment(),
      transport,
    );

    expect(anonymous.status).toBe(401);
    expect(crossScope.status).toBe(403);
    expect(transport.requests).toHaveLength(0);
  });
});

function commandRequest(dealId = "deal_serra-azul"): Request {
  return new Request("http://localhost/commands/demo-readiness/execute", {
    method: "POST",
    headers: {
      "X-Deal-Id": dealId,
      "X-Correlation-Id": "cor_browser-command",
      "Idempotency-Key": "idem_investor-demo-execute",
    },
  });
}

function enabledEnvironment(): Readonly<Record<string, string>> {
  return {
    NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
    MAI_API_BASE_URL: "http://127.0.0.1:18071",
  };
}
