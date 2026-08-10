import { afterEach, describe, expect, it, vi } from "vitest";

import {
  captureFinancialRiskPollScope,
  createFinancialRiskJobPoller,
  enqueueFinancialRiskCompute,
  enqueueFinancialRiskInvalidation,
  financialRiskAssessmentPath,
  readFinancialRiskAssessment,
} from "./financial-risk-client";

const scope = {
  tenantId: "tenant_demo",
  workspaceId: "workspace_horizon",
  dealId: "deal_horizon",
  initiatingActorId: "actor_banker",
} as const;

const references = {
  financialData: [{
    kind: "financial_data",
    sourceId: "source_financials",
    version: 2,
    checksum: "a".repeat(64),
  }],
  evidenceBasis: {
    scope: {
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      dealId: scope.dealId,
    },
    references: [{ kind: "evidence", evidenceId: "evidence_debt" }],
    basisDigest: "b".repeat(64),
    capturedAt: "2026-08-10T12:00:00.000Z",
  },
  calculations: [{
    kind: "calculation",
    calculationId: "calc_risk",
    version: 3,
    algorithmVersion: "risk-v1",
  }],
} as const;

function acceptedResponse(statusUrl = "/api/v1/financial-risk/jobs/job_risk") {
  return Response.json(
    {
      data: {
        operationId: "op_risk",
        jobId: "job_risk",
        status: "queued",
        statusUrl,
      },
      meta: { correlationId: "cor_risk" },
    },
    { status: 202 },
  );
}

function jobResponse(state: string, progress = 0) {
  return Response.json({
    data: {
      schemaVersion: 1,
      jobId: "job_risk",
      operationId: "op_risk",
      state,
      progress,
      attemptCount: 1,
      cancellationRequested: state === "cancelled",
      createdAt: "2026-08-10T12:00:00.000Z",
      ...(state === "running" || state === "succeeded" || state === "failed" ||
          state === "cancelled"
        ? { startedAt: "2026-08-10T12:00:01.000Z" }
        : {}),
      ...(state === "succeeded" || state === "failed" || state === "cancelled"
        ? { terminalAt: "2026-08-10T12:00:02.000Z" }
        : {}),
    },
    meta: { correlationId: "cor_risk" },
  });
}

function computeCommand() {
  return {
    assessmentId: "risk_assessment_horizon",
    scope,
    resultId: "risk_result_horizon",
    operationId: "op_risk",
    jobId: "job_risk",
    references,
    idempotencyKey: "idem_risk",
    ifMatch: '"v1"',
  } as const;
}

afterEach(() => vi.unstubAllGlobals());

describe("financial-risk typed client", () => {
  it("accepts only the corrected 202 job receipt and exact polling route", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(acceptedResponse())
      .mockResolvedValueOnce(jobResponse("queued"));
    vi.stubGlobal("fetch", fetchMock);

    const accepted = await enqueueFinancialRiskCompute(computeCommand());
    const queued = await accepted.poller.poll();

    expect(accepted.status).toBe(202);
    expect(accepted.data.statusUrl).toBe(
      "/api/v1/financial-risk/jobs/job_risk",
    );
    expect(queued.data.state).toBe("queued");
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/v1/financial-risk/assessments/risk_assessment_horizon/compute",
    );
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "http://localhost:8000/api/v1/financial-risk/jobs/job_risk",
    );
    expect(String(fetchMock.mock.calls[1][0])).not.toContain("/api/v1/jobs/");
  });

  it("captures the complete scope and keeps it unchanged for every poll", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(acceptedResponse())
      .mockResolvedValueOnce(jobResponse("running", 30))
      .mockResolvedValueOnce(jobResponse("succeeded", 100));
    vi.stubGlobal("fetch", fetchMock);
    const original = { ...scope };
    const accepted = await enqueueFinancialRiskCompute(computeCommand());
    const first = await accepted.poller.poll();
    const second = await accepted.poller.poll();

    expect(first.data.state).toBe("running");
    expect(second.data.state).toBe("succeeded");
    expect(accepted.scope).toEqual(original);
    expect(accepted.poller.scope).toEqual(original);
    expect(Object.isFrozen(accepted.poller.scope)).toBe(true);
  });

  it("rejects a receipt that points at a generic or wrong-scope job route", async () => {
    expect(() =>
      createFinancialRiskJobPoller(
        {
          operationId: "op_risk",
          jobId: "job_risk",
          status: "queued",
          statusUrl: "/api/v1/jobs/job_risk",
        },
        scope,
      )
    ).toThrow(/exact job route/);
    expect(() =>
      createFinancialRiskJobPoller(
        {
          operationId: "op_risk",
          jobId: "job_risk",
          status: "queued",
          statusUrl: "/api/v1/financial-risk/jobs/job_other",
        },
        scope,
      )
    ).toThrow(/exact job route/);
  });

  it("rejects compute references outside the captured deal scope before network I/O", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const wrongScope = {
      ...references,
      evidenceBasis: {
        ...references.evidenceBasis,
        scope: { ...references.evidenceBasis.scope, dealId: "deal_other" },
      },
    };

    await expect(
      enqueueFinancialRiskCompute({
        ...computeCommand(),
        references: wrongScope,
      }),
    ).rejects.toMatchObject({ code: "SCOPE_MISMATCH" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects overlong platform identifiers before network I/O", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const long = (prefix: string) =>
      `${prefix}${"a".repeat(65 - prefix.length)}`;

    expect(() =>
      captureFinancialRiskPollScope({
        ...scope,
        initiatingActorId: long("actor_"),
      })
    ).toThrow(/initiatingActorId/);
    expect(() =>
      captureFinancialRiskPollScope({
        ...scope,
        tenantId: long("tenant_"),
      })
    ).toThrow(/polling scope/);
    expect(() =>
      captureFinancialRiskPollScope({
        ...scope,
        workspaceId: long("workspace_"),
      })
    ).toThrow(/polling scope/);
    expect(() =>
      captureFinancialRiskPollScope({
        ...scope,
        dealId: long("deal_"),
      })
    ).toThrow(/polling scope/);
    expect(() =>
      createFinancialRiskJobPoller({
        operationId: "op_risk",
        jobId: long("job_"),
        status: "queued",
        statusUrl: "/api/v1/financial-risk/jobs/job_risk",
      }, scope)
    ).toThrow(/accepted job/);

    await expect(enqueueFinancialRiskCompute({
      ...computeCommand(),
      operationId: long("op_"),
    })).rejects.toMatchObject({ kind: "contract" });
    await expect(enqueueFinancialRiskCompute({
      ...computeCommand(),
      idempotencyKey: long("idem_"),
    })).rejects.toMatchObject({ kind: "validation" });
    expect(financialRiskAssessmentPath(`risk_assessment_${"a".repeat(80)}`))
      .toContain("/api/v1/financial-risk/assessments/");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retains ETag and stale freshness on assessment reads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(
        {
          data: assessment("stale"),
          meta: { correlationId: "cor_risk", freshness: "stale" },
        },
        { headers: { ETag: '"v4"' } },
      )),
    );

    const result = await readFinancialRiskAssessment(
      "risk_assessment_horizon",
      scope,
    );

    expect(result).toMatchObject({
      data: { state: "stale" },
      meta: { freshness: "stale" },
      etag: '"v4"',
    });
  });

  it("enqueues source invalidation through the exact assessment command route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(acceptedResponse());
    vi.stubGlobal("fetch", fetchMock);

    const accepted = await enqueueFinancialRiskInvalidation({
      assessmentId: "risk_assessment_horizon",
      scope,
      resultId: "risk_result_horizon",
      invalidationId: "risk_invalidation_horizon",
      operationId: "op_risk",
      jobId: "job_risk",
      reason: "A source version changed.",
      idempotencyKey: "idem_invalidate",
      ifMatch: '"v1"',
    });

    expect(accepted.status).toBe(202);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/v1/financial-risk/assessments/risk_assessment_horizon/invalidate",
    );
    expect(accepted.poller.statusUrl).toBe(
      "/api/v1/financial-risk/jobs/job_risk",
    );
  });

  it("maps protected-not-found as a protected result, not permission metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(
        {
          error: {
            code: "PROTECTED_NOT_FOUND",
            message: "The protected resource was not found.",
            retryable: false,
          },
        },
        { status: 404 },
      )),
    );

    await expect(readFinancialRiskAssessment(
      "risk_assessment_horizon",
      scope,
    )).rejects.toMatchObject({
      code: "PROTECTED_NOT_FOUND",
      kind: "not_found",
      status: 404,
    });
  });

  it("preserves structured v1 validation issues from a financial-risk 422", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "The financial-risk command is invalid.",
          retryable: false,
          fieldErrors: {
            references: [{
              field: "references",
              code: "INVALID_TYPE",
              message: "references has an invalid type.",
            }],
          },
        },
      },
      { status: 422 },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(enqueueFinancialRiskCompute(computeCommand())).rejects
      .toMatchObject({
        status: 422,
        code: "VALIDATION_FAILED",
        kind: "validation",
        retryable: false,
        fieldErrors: {
          references: [{
            field: "references",
            code: "INVALID_TYPE",
            message: "references has an invalid type.",
          }],
        },
      });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function assessment(state: string) {
  const common = {
    schemaVersion: 1,
    aggregateType: "financial_risk_result",
    assessmentId: "risk_assessment_horizon",
    resultId: "risk_result_horizon",
    version: 4,
    createdAt: "2026-08-10T12:00:00.000Z",
    updatedAt: "2026-08-10T12:00:02.000Z",
  };
  if (state === "completed") {
    return {
      ...common,
      state,
      reasonCode: "MODEL_INFERENCE",
      outputs: outputs(),
      provenance: { kind: "model-inference", readiness: "reference-only" },
    };
  }
  if (state === "fallback") {
    return {
      ...common,
      state,
      reasonCode: "CONFIGURED_FALLBACK",
      outputs: outputs(),
      provenance: {
        kind: "configured-fallback",
        readiness: "not-claimed",
        reasonCode: "CONFIGURED_FALLBACK",
      },
    };
  }
  const stateMap = {
    unavailable: ["CAPABILITY_UNAVAILABLE", "unavailable"],
    failed: ["INFERENCE_FAILED", "failed"],
    cancelled: ["CANCELLED", "cancelled"],
    stale: ["SOURCE_STALE", "stale"],
    superseded: ["RESULT_SUPERSEDED", "superseded"],
  } as const;
  const [reasonCode, kind] = stateMap[state as keyof typeof stateMap];
  return {
    ...common,
    state,
    reasonCode,
    provenance: { kind, readiness: "unavailable", reasonCode },
  };
}

function outputs() {
  return {
    insolvencyRisk: 0.2,
    churnProbability: 0.3,
    dcfVolatility: 20,
    industry4Score: 75,
    zScore: "Safe",
  };
}
