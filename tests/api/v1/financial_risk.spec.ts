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
  FakeFinancialRiskAuthorization,
  FakeFinancialRiskInference,
  financialRiskActor,
  financialRiskContext,
  financialRiskReferences,
  MODEL_OUTPUTS,
  RecordingInputLoader,
  RecordingReferenceVerifier,
} from "../../financial_risk/support.ts";

Deno.test("financial-risk API computes and reads a versioned assessment", async () => {
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

  const read = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/assessments/risk_assessment_alpha"),
    fixture.dependencies,
  );
  assertExists(read);
  assertEquals(read.status, 200);
  assertEquals(read.headers.get("ETag"), '"v1"');
  const envelope = await responseBody(read);
  assertEquals(envelope.data.state, "completed");
  assertExists(envelope.data.outputs);
  assertEquals("actor" in envelope.data, false);
  assertEquals("idempotencyKey" in envelope.data, false);
  assertEquals(
    envelope.data.outputs.industry4Score,
    MODEL_OUTPUTS.industry4Score,
  );
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
  await computeAssessment(fixture.dependencies, "idem_api-invalidate");
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

  const read = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/assessments/risk_assessment_alpha"),
    fixture.dependencies,
  );
  assertExists(read);
  assertEquals(read.headers.get("ETag"), '"v2"');
  const envelope = await responseBody(read);
  assertEquals(envelope.data.state, "stale");
  assertEquals(envelope.meta.freshness, "stale");
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
    request("/api/v1/financial-risk/assessments/risk_assessment_alpha"),
  );
  assertEquals(unavailable.status, 503);
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
}

function financialRiskRoutes(): FinancialRiskRouteFixture {
  const context = financialRiskContext();
  const actor = financialRiskActor();
  const authorization = new FakeFinancialRiskAuthorization();
  const application = new FinancialRiskApplication(
    authorization,
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    new InMemoryFinancialRiskRepository(),
  );
  return {
    authorization,
    dependencies: {
      context: new FakeFinancialRiskRequestContext({ context, actor }),
      application,
      inputLoader: new RecordingInputLoader(),
    },
  };
}

async function computeAssessment(
  dependencies: FinancialRiskV1RouteDependencies,
  idempotencyKey: string,
): Promise<void> {
  const response = await handleFinancialRiskV1Route(
    request(
      "/api/v1/financial-risk/assessments/risk_assessment_alpha/compute",
      {
        method: "POST",
        headers: commandHeaders(idempotencyKey),
        body: JSON.stringify({
          resultId: "risk_result_alpha",
          operationId: "op_api-seed",
          jobId: "job_api-seed",
          references: financialRiskReferences(),
        }),
      },
    ),
    dependencies,
  );
  assertExists(response);
  assertEquals(response.status, 202);
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
    readonly state?: string;
    readonly outputs?: { readonly industry4Score: number };
  };
  readonly meta: { readonly freshness?: string };
  readonly error?: { readonly code: string };
}
