import { assertEquals, assertExists } from "@std/assert";
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
  FALLBACK_RESULT,
  financialRiskActor,
  financialRiskContext,
  financialRiskReferences,
  RecordingFinancialRiskJobPort,
  RecordingInputLoader,
  RecordingReferenceVerifier,
} from "../../financial_risk/support.ts";
import { FINANCIAL_RISK_PROJECTION_FIELDS } from "../../../src/financial_risk/projection.ts";

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
  assertEquals(
    accepted.data.statusUrl,
    "/api/v1/financial-risk/jobs/job_api-compute",
  );
  assertEquals(fixture.jobs.jobs.has("job_api-compute"), true);

  const status = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/jobs/job_api-compute"),
    fixture.dependencies,
  );
  assertExists(status);
  assertEquals(status.status, 200);
  const statusBody = await responseBody(status);
  assertEquals(statusBody.data.schemaVersion, 1);
  assertEquals(statusBody.data.state, "queued");
  assertEquals(statusBody.data.progress, 0);
  assertEquals(statusBody.data.payload, undefined);

  const replay = await handleFinancialRiskV1Route(
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
  assertExists(replay);
  assertEquals((await responseBody(replay)).data.status, "accepted");

  const read = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/assessments/risk_assessment_alpha"),
    fixture.dependencies,
  );
  assertExists(read);
  assertEquals(read.status, 404);
});

Deno.test("financial-risk job status is protected-not-found before an unauthorized job load", async () => {
  const fixture = financialRiskRoutes(
    new FakeFinancialRiskAuthorization("deny"),
  );
  const response = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/jobs/job_hidden"),
    fixture.dependencies,
  );

  assertExists(response);
  assertEquals(response.status, 404);
  assertEquals(fixture.jobs.statusCalls, 0);
});

Deno.test("financial-risk job status returns protected-not-found for a missing job", async () => {
  const fixture = financialRiskRoutes();
  const response = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/jobs/job_missing"),
    fixture.dependencies,
  );

  assertExists(response);
  assertEquals(response.status, 404);
  assertEquals(fixture.jobs.statusCalls, 1);
});

Deno.test("financial-risk job status does not cross a stored deal scope", async () => {
  const fixture = financialRiskRoutes();
  const compute = await handleFinancialRiskV1Route(
    request(
      "/api/v1/financial-risk/assessments/risk_assessment_alpha/compute",
      {
        method: "POST",
        headers: commandHeaders("idem_scope-status"),
        body: JSON.stringify({
          resultId: "risk_result_scope-status",
          operationId: "op_scope-status",
          jobId: "job_scope-status",
          references: financialRiskReferences(),
        }),
      },
    ),
    fixture.dependencies,
  );
  assertExists(compute);
  const foreignContext = financialRiskContext({
    ...financialRiskReferences().evidenceBasis.scope,
    dealId: "deal_foreign" as never,
  });
  const foreignDependencies = {
    ...fixture.dependencies,
    context: new FakeFinancialRiskRequestContext({
      context: foreignContext,
      actor: financialRiskActor(),
    }),
  };

  const response = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/jobs/job_scope-status"),
    foreignDependencies,
  );

  assertExists(response);
  assertEquals(response.status, 404);
  assertEquals(fixture.jobs.statusCalls, 1);
});

Deno.test("financial-risk job status hides a same-deal foreign actor job", async () => {
  const fixture = financialRiskRoutes();
  await enqueueFinancialRiskJob(fixture, "foreign-actor");
  const job = fixture.jobs.jobs.get("job_foreign-actor");
  assertExists(job);
  fixture.jobs.jobs.set(job.jobId, {
    ...job,
    initiatingActorId: "actor_foreign" as never,
  });

  const response = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/jobs/job_foreign-actor"),
    fixture.dependencies,
  );

  assertExists(response);
  assertEquals(response.status, 404);
});

Deno.test("financial-risk job status hides a same-actor non-financial-risk job", async () => {
  const fixture = financialRiskRoutes();
  await enqueueFinancialRiskJob(fixture, "foreign-type");
  const job = fixture.jobs.jobs.get("job_foreign-type");
  assertExists(job);
  fixture.jobs.jobs.set(job.jobId, { ...job, jobType: "document.process" });

  const response = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/jobs/job_foreign-type"),
    fixture.dependencies,
  );

  assertExists(response);
  assertEquals(response.status, 404);
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

Deno.test("financial-risk assessment read gates restricted banker fields", async () => {
  const fixture = financialRiskRoutes();
  await fixture.application.compute(computeRequest());
  fixture.authorization.setFieldMask({
    include: [],
    omit: [],
    redact: [],
    approvedClassifications: [],
  });

  const response = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/assessments/risk_assessment_alpha"),
    fixture.dependencies,
  );
  assertExists(response);
  const body = await responseBody(response);
  const data = body.data as Record<string, unknown>;

  assertEquals(Object.keys(data).sort(), [
    "aggregateType",
    "assessmentId",
    "createdAt",
    "provenance",
    "reasonCode",
    "resultId",
    "schemaVersion",
    "state",
    "updatedAt",
    "version",
  ]);
  assertEquals(data.state, "completed");
  assertEquals(data.reasonCode, "MODEL_INFERENCE");
  assertEquals(data.outputs, undefined);
  assertEquals(data.provenance, {
    kind: "model-inference",
    readiness: "reference-only",
  });
  assertEquals(data.actor, undefined);
  assertEquals(data.correlationId, undefined);
  assertEquals(data.idempotencyKey, undefined);
  assertEquals(data.references, undefined);
  assertEquals(data.execution, undefined);

  fixture.authorization.setFieldMask({
    include: [
      FINANCIAL_RISK_PROJECTION_FIELDS.outputs,
      FINANCIAL_RISK_PROJECTION_FIELDS.provenance,
    ],
    omit: [],
    redact: [],
    approvedClassifications: [
      {
        name: FINANCIAL_RISK_PROJECTION_FIELDS.outputs,
        classification: "restricted",
      },
      {
        name: FINANCIAL_RISK_PROJECTION_FIELDS.provenance,
        classification: "internal_audit",
      },
    ],
  });
  const detailedResponse = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/assessments/risk_assessment_alpha"),
    fixture.dependencies,
  );
  assertExists(detailedResponse);
  const detailedData = (await responseBody(detailedResponse)).data;
  assertExists(detailedData.outputs);
  assertEquals(detailedData.provenance, {
    kind: "model-inference",
    modelId: "reference-risk-model",
    modelVersion: "1.0.0",
    artifactChecksum: "a".repeat(64),
    readiness: "reference-only",
  });
});

Deno.test("financial-risk assessment read preserves explicit fallback truth", async () => {
  const fixture = financialRiskRoutes(
    new FakeFinancialRiskAuthorization(),
    new FakeFinancialRiskInference(FALLBACK_RESULT),
  );
  await fixture.application.compute(computeRequest());

  const response = await handleFinancialRiskV1Route(
    request("/api/v1/financial-risk/assessments/risk_assessment_alpha"),
    fixture.dependencies,
  );
  assertExists(response);
  const body = await responseBody(response);
  const provenance = body.data.provenance as Record<string, unknown>;

  assertEquals(body.data.state, "fallback");
  assertEquals(body.data.reasonCode, "CONFIGURED_FALLBACK");
  assertEquals(provenance.kind, "configured-fallback");
  assertEquals(provenance.readiness, "not-claimed");
});

Deno.test("application server exposes only the banker financial-risk route and fails closed when absent", async () => {
  const { createApiServer } = await import("../../../src/api/server.ts");
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

  const sharedJob = await createApiServer().handle(
    request("/api/v1/jobs/non-financial-job"),
  );
  assertEquals(sharedJob.status, 404);
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

function financialRiskRoutes(
  authorization = new FakeFinancialRiskAuthorization(),
  inference = new FakeFinancialRiskInference(),
): FinancialRiskRouteFixture {
  const context = financialRiskContext();
  const actor = financialRiskActor();
  const jobs = new RecordingFinancialRiskJobPort();
  const application = new FinancialRiskApplication(
    authorization,
    new RecordingReferenceVerifier(),
    inference,
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

async function enqueueFinancialRiskJob(
  fixture: FinancialRiskRouteFixture,
  suffix: string,
): Promise<void> {
  const response = await handleFinancialRiskV1Route(
    request(
      "/api/v1/financial-risk/assessments/risk_assessment_alpha/compute",
      {
        method: "POST",
        headers: commandHeaders(`idem_${suffix}`),
        body: JSON.stringify({
          resultId: `risk_result_${suffix}`,
          operationId: `op_${suffix}`,
          jobId: `job_${suffix}`,
          references: financialRiskReferences(),
        }),
      },
    ),
    fixture.dependencies,
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
    readonly schemaVersion?: number;
    readonly status?: string;
    readonly jobId?: string;
    readonly state?: string;
    readonly reasonCode?: string;
    readonly progress?: number;
    readonly outputs?: { readonly industry4Score: number };
    readonly provenance?: Record<string, unknown>;
    readonly payload?: unknown;
    readonly statusUrl?: string;
  };
  readonly meta: { readonly freshness?: string };
  readonly error?: {
    readonly code: string;
    readonly correlationId?: string;
  };
}
