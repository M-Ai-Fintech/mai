import { assertEquals, assertExists } from "@std/assert";
import { createApiServer } from "../../../src/api/server.ts";
import {
  FinancialRiskApplication,
} from "../../../src/financial_risk/application.ts";
import { InMemoryFinancialRiskRepository } from "../../../src/financial_risk/repository.ts";
import {
  type FinancialRiskAuthenticatedContext,
  type FinancialRiskRequestContextPort,
  type FinancialRiskV1RouteDependencies,
  handleFinancialRiskV1Route,
} from "../../../src/api/v1/financial_risk_routes.ts";
import {
  computeRequest,
  FakeFinancialRiskAuthorization,
  FakeFinancialRiskInference,
  financialRiskActor,
  financialRiskContext,
  financialRiskReferences,
  RecordingFinancialRiskJobPort,
  RecordingInputLoader,
  RecordingReferenceVerifier,
} from "../../financial_risk/support.ts";

Deno.test("financial-risk API enqueues a durable job without claiming a result", async () => {
  const fixture = financialRiskRoutes();
  const compute = await handleFinancialRiskV1Route(
    request(
      "/api/v1/financial-risk/assessments/risk_assessment_alpha/compute",
      {
        method: "POST",
        headers: commandHeaders(),
        body: JSON.stringify({
          resultId: "risk_result_alpha",
          operationId: "op_api-compute",
          jobId: "job_api-compute",
          references: financialRiskReferences(),
        }),
      },
    ),
    fixture.dependencies,
  );
  assertExists(compute);
  assertEquals(compute.status, 202);
  const accepted = await responseBody(compute);
  assertEquals(accepted.data.status, "queued");
  assertEquals(accepted.data.jobId, "job_api-compute");
  assertEquals(fixture.jobs.jobs.has("job_api-compute"), true);

  const read = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/assessments/risk_assessment_alpha"),
    fixture.dependencies,
  );
  assertExists(read);
  assertEquals(read.status, 404);
});

Deno.test("financial-risk API requires command concurrency and idempotency headers", async () => {
  const fixture = financialRiskRoutes();
  const response = await handleFinancialRiskV1Route(
    request(
      "/api/v1/financial-risk/assessments/risk_assessment_alpha/compute",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ),
    fixture.dependencies,
  );
  assertExists(response);
  assertEquals(response.status, 422);
  const error = (await responseBody(response)).error;
  assertExists(error);
  assertEquals(error.code, "VALIDATION_FAILED");
  assertEquals(fixture.authorization.calls, 0);
});

Deno.test("financial-risk API rejects a basis from another exact deal scope", async () => {
  const fixture = financialRiskRoutes();
  const references = financialRiskReferences();
  const body = {
    resultId: "risk_result_alpha",
    operationId: "op_api-scope",
    jobId: "job_api-scope",
    references: {
      ...references,
      evidenceBasis: {
        ...references.evidenceBasis,
        scope: {
          ...references.evidenceBasis.scope,
          dealId: "deal_other" as never,
        },
      },
    },
  };
  const response = await handleFinancialRiskV1Route(
    request(
      "/api/v1/financial-risk/assessments/risk_assessment_alpha/compute",
      {
        method: "POST",
        headers: commandHeaders(),
        body: JSON.stringify(body),
      },
    ),
    fixture.dependencies,
  );
  assertExists(response);
  assertEquals(response.status, 422);
  assertEquals(fixture.authorization.calls, 0);
});

Deno.test("financial-risk API invalidates with an append-only stale result", async () => {
  const fixture = financialRiskRoutes();
  await fixture.application.compute(computeRequest({
    idempotencyKey: "idem_api-seed" as never,
    operationId: "op_api-seed" as never,
    jobId: "job_api-seed" as never,
  }));
  const response = await handleFinancialRiskV1Route(
    request(
      "/api/v1/financial-risk/assessments/risk_assessment_alpha/invalidate",
      {
        method: "POST",
        headers: commandHeaders("idem_api-invalidate-command", '"v1"'),
        body: JSON.stringify({
          resultId: "risk_result_stale",
          invalidationId: "risk_invalidation_alpha",
          operationId: "op_api-invalidate",
          jobId: "job_api-invalidate",
          reason: "A source version changed.",
        }),
      },
    ),
    fixture.dependencies,
  );
  assertExists(response);
  assertEquals(response.status, 202);
  const accepted = await responseBody(response);
  assertEquals(accepted.data.status, "queued");
  assertEquals(fixture.jobs.jobs.has("job_api-invalidate"), true);

  const read = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/assessments/risk_assessment_alpha"),
    fixture.dependencies,
  );
  assertExists(read);
  assertEquals(read.headers.get("ETag"), '"v1"');
  const envelope = await responseBody(read);
  assertEquals(envelope.data.state, "completed");
});

Deno.test("application server exposes only the banker financial-risk route and fails closed when absent", async () => {
  const fixture = financialRiskRoutes();
  const configured = createApiServer({
    waveJ: { financialRisk: fixture.dependencies },
  });
  const unsupported = await configured.handle(
    request("/api/v1/financial-risk/predict"),
  );
  assertEquals(unsupported.status, 404);

  const unavailable = await createApiServer().handle(
    request("/api/v1/financial-risk/assessments/risk_assessment_alpha", {
      headers: { "X-Correlation-Id": "cor_unconfigured" },
    }),
  );
  assertEquals(unavailable.status, 503);
  const unavailableBody = await responseBody(unavailable);
  assertEquals(unavailableBody.error?.code, "DEPENDENCY_UNAVAILABLE");
  assertEquals(unavailableBody.error?.correlationId, "cor_unconfigured");
});

class FakeFinancialRiskRequestContext
  implements FinancialRiskRequestContextPort {
  constructor(
    private readonly authenticated: FinancialRiskAuthenticatedContext,
  ) {}

  contextFor(): FinancialRiskAuthenticatedContext {
    return this.authenticated;
  }
}

interface FinancialRiskRouteFixture {
  readonly dependencies: FinancialRiskV1RouteDependencies;
  readonly authorization: FakeFinancialRiskAuthorization;
  readonly application: FinancialRiskApplication;
  readonly jobs: RecordingFinancialRiskJobPort;
}

function financialRiskRoutes(): FinancialRiskRouteFixture {
  const context = financialRiskContext();
  const actor = financialRiskActor();
  const authorization = new FakeFinancialRiskAuthorization();
  const jobs = new RecordingFinancialRiskJobPort();
  const application = new FinancialRiskApplication(
    authorization,
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    new InMemoryFinancialRiskRepository(),
    undefined,
    jobs,
  );
  return {
    authorization,
    application,
    jobs,
    dependencies: {
      context: new FakeFinancialRiskRequestContext({ context, actor }),
      application,
      inputLoader: new RecordingInputLoader(),
    },
  };
}

function commandHeaders(
  idempotencyKey = "idem_api-compute",
  ifMatch = '"v1"',
): HeadersInit {
  return { "Idempotency-Key": idempotencyKey, "If-Match": ifMatch };
}

function request(path: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost${path}`, init);
}

async function responseBody(
  response: Response,
): Promise<FinancialRiskResponseBody> {
  return await response.json() as FinancialRiskResponseBody;
}

interface FinancialRiskResponseBody {
  readonly data: {
    readonly status?: string;
    readonly jobId?: string;
    readonly state?: string;
    readonly outputs?: { readonly industry4Score: number };
  };
  readonly meta: { readonly freshness?: string };
  readonly error?: {
    readonly code: string;
    readonly correlationId?: string;
  };
}
