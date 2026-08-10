import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { APIError } from "@/lib/api-client/errors";
import {
  computeFinancialRiskAssessmentAdapter,
  pollFinancialRiskJob,
  presentFinancialRiskAssessment,
  presentFinancialRiskJob,
  readFinancialRiskAssessmentAdapter,
} from "./financial-risk";
import { financialRiskCanaryFor } from "./financial-risk-config";
import type { FinancialRiskJobStatus } from "@/lib/api-client/financial-risk-schemas";

const scope = {
  tenantId: "tenant_demo",
  workspaceId: "workspace_horizon",
  dealId: "deal_horizon",
  initiatingActorId: "actor_banker",
} as const;

const outputs = {
  insolvencyRisk: 0.2,
  churnProbability: 0.3,
  dcfVolatility: 20,
  industry4Score: 75,
  zScore: "Safe",
};

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
      outputs,
      provenance: { kind: "model-inference", readiness: "reference-only" },
    };
  }
  if (state === "fallback") {
    return {
      ...common,
      state,
      reasonCode: "CONFIGURED_FALLBACK",
      outputs,
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

function readResponse(state: string, freshness = "current") {
  return Response.json({
    data: assessment(state),
    meta: { correlationId: "cor_risk", freshness },
  });
}

function jobStatus(
  state: FinancialRiskJobStatus["state"],
  progress = 0,
): FinancialRiskJobStatus {
  return {
    schemaVersion: 1,
    jobId: "job_risk",
    operationId: "op_risk",
    state,
    progress,
    attemptCount: 1,
    cancellationRequested: state === "cancelled",
    createdAt: "2026-08-10T12:00:00.000Z",
  };
}

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_FINANCIAL_RISK_ROUTE_READINESS", "registered");
});
afterEach(() => vi.unstubAllEnvs());

describe("financial-risk banker-facing adapter", () => {
  it("keeps the financial-risk route off until readiness is explicit", async () => {
    expect(financialRiskCanaryFor({})).toMatchObject({
      mode: "v1",
      activation: "off",
      routeReadiness: "not-registered",
    });
    expect(financialRiskCanaryFor({
      NEXT_PUBLIC_FINANCIAL_RISK_ROUTE_READINESS: "registered",
    })).toMatchObject({ activation: "v1" });

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
      { environment: {} },
    );
    expect(result).toMatchObject({
      state: "unavailable",
      failure: { code: "ADAPTER_DISABLED" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(
    [
      ["completed", "model-backed", true, true],
      ["fallback", "configured-fallback", true, false],
      ["unavailable", "unavailable", false, false],
      ["failed", "unavailable", false, false],
      ["cancelled", "unavailable", false, false],
      ["stale", "unavailable", false, false],
      ["superseded", "unavailable", false, false],
    ] as const,
  )(
    "truthfully presents %s without changing its result kind",
    (state, resultKind, current, authoritative) => {
      const presentation = presentFinancialRiskAssessment(
        assessment(state) as never,
      );
      expect(presentation).toMatchObject({
        state,
        resultKind,
        current,
        authoritative,
      });
      if (state === "fallback") {
        expect(presentation.detail).toContain("not a model-backed result");
      }
      if (state === "stale" || state === "superseded") {
        expect(presentation.current).toBe(false);
      }
    },
  );

  it("reads a completed real inference with ETag and no fixture path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(
      {
        data: assessment("completed"),
        meta: { correlationId: "cor_risk", freshness: "current" },
      },
      { headers: { ETag: '"v4"' } },
    ));
    vi.stubGlobal("fetch", fetchMock);
    const result = await readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
    );

    expect(result).toMatchObject({
      source: "v1",
      state: "completed",
      data: {
        presentation: { resultKind: "model-backed", authoritative: true },
      },
      etag: '"v4"',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requires current freshness for a completed assessment", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({
        data: assessment("completed"),
        meta: { correlationId: "cor_risk" },
      })),
    );
    await expect(readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
    )).resolves.toMatchObject({
      state: "unavailable",
      failure: { code: "FRESHNESS_UNKNOWN" },
    });
  });

  it("keeps a stale completed projection out of the current state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({
        data: assessment("completed"),
        meta: { correlationId: "cor_risk", freshness: "stale" },
      })),
    );
    await expect(readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
    )).resolves.toMatchObject({
      state: "stale",
      failure: { code: "STALE_VERSION" },
    });
  });

  it("keeps a field-filtered completed result truthful when outputs are withheld", async () => {
    const filtered = assessment("completed");
    Reflect.deleteProperty(filtered, "outputs");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      data: filtered,
      meta: { correlationId: "cor_risk", freshness: "current" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
    );

    expect(result).toMatchObject({
      state: "completed",
      data: {
        presentation: {
          state: "completed",
          resultKind: "model-backed",
          authoritative: true,
        },
      },
    });
    if ("data" in result) {
      expect(result.data.presentation.outputs).toBeUndefined();
    }
  });

  it("keeps fallback explicit and never relabels it as model-backed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(readResponse("fallback")));
    const result = await readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
    );
    expect(result).toMatchObject({
      state: "fallback",
      data: {
        assessment: { reasonCode: "CONFIGURED_FALLBACK" },
        presentation: {
          resultKind: "configured-fallback",
          authoritative: false,
        },
      },
    });
  });

  it.each(
    ["unavailable", "failed", "cancelled", "stale", "superseded"] as const,
  )(
    "preserves %s as an unavailable/non-current result where appropriate",
    async (state) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          readResponse(
            state,
            state === "stale" || state === "superseded" ? "stale" : "current",
          ),
        ),
      );
      const result = await readFinancialRiskAssessmentAdapter(
        "risk_assessment_horizon",
        scope,
      );
      expect(result).toMatchObject({
        source: "v1",
        state,
        data: { presentation: { state, current: false } },
      });
    },
  );

  it("keeps protected-not-found and forbidden distinct from unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(
        {
          error: {
            code: "PROTECTED_NOT_FOUND",
            message: "Not found",
            retryable: false,
          },
        },
        { status: 404 },
      )),
    );
    await expect(readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
    )).resolves.toMatchObject({
      state: "restricted",
      failure: { code: "PROTECTED_NOT_FOUND", access: "protected-not-found" },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(
        {
          error: {
            code: "ACTION_FORBIDDEN",
            message: "Forbidden",
            retryable: false,
          },
        },
        { status: 403 },
      )),
    );
    await expect(readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
    )).resolves.toMatchObject({
      state: "restricted",
      failure: { code: "ACTION_FORBIDDEN", access: "forbidden" },
    });
  });

  it("does not treat a bare 404 as protected-not-found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(
        { error: { message: "Not found", retryable: false } },
        { status: 404 },
      )),
    );
    await expect(readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
    )).resolves.toMatchObject({
      state: "failed",
      failure: { code: "not_found" },
    });
  });

  it("fails closed on runtime unavailable and never uses a fixture success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(
      {
        error: {
          code: "DEPENDENCY_UNAVAILABLE",
          message: "Financial-risk calculation is temporarily unavailable.",
          retryable: true,
        },
      },
      { status: 503 },
    ));
    vi.stubGlobal("fetch", fetchMock);
    const result = await readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
    );
    expect(result).toMatchObject({ state: "unavailable" });
    expect("data" in result).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses an explicit financial-risk canary without adding a family", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const previous = {
      source: "previous" as const,
      state: "previous" as const,
      failure: {
        code: "PREVIOUS_SELECTED",
        message: "Previous adapter selected.",
        retryable: false,
      },
    };
    await expect(readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
      {
        environment: {
          NEXT_PUBLIC_FINANCIAL_RISK_ADAPTER_MODE: "previous",
        },
        previousAdapter: async () => previous,
      },
    )).resolves.toEqual(previous);
    await expect(readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
      {
        environment: {
          NEXT_PUBLIC_FINANCIAL_RISK_ADAPTER_MODE: "off",
        },
      },
    )).resolves.toMatchObject({
      state: "unavailable",
      failure: { code: "ADAPTER_DISABLED" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not substitute a fixture when previous rollback lacks injection", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(readFinancialRiskAssessmentAdapter(
      "risk_assessment_horizon",
      scope,
      {
        environment: {
          NEXT_PUBLIC_FINANCIAL_RISK_ADAPTER_MODE: "previous",
        },
      },
    )).resolves.toMatchObject({
      source: "previous",
      state: "previous",
      failure: { code: "PREVIOUS_ADAPTER_NOT_PROVIDED" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps durable queued, accepted, running, retry, success, failure, and cancellation states", () => {
    expect(presentFinancialRiskJob(jobStatus("queued")).state).toBe("pending");
    expect(presentFinancialRiskJob(jobStatus("running", 40)).title).toBe(
      "In progress",
    );
    expect(presentFinancialRiskJob(jobStatus("retry_scheduled", 40)).state)
      .toBe("pending");
    expect(presentFinancialRiskJob(jobStatus("succeeded", 100)).state).toBe(
      "succeeded",
    );
    expect(presentFinancialRiskJob(jobStatus("failed")).state).toBe("failed");
    expect(presentFinancialRiskJob(jobStatus("timed_out")).state).toBe(
      "failed",
    );
    expect(presentFinancialRiskJob(jobStatus("dead_lettered")).state).toBe(
      "failed",
    );
    expect(presentFinancialRiskJob(jobStatus("cancelled")).state).toBe(
      "cancelled",
    );
  });

  it("polls only through a scoped accepted-job poller and preserves protected errors", async () => {
    const poller = {
      jobId: "job_risk",
      statusUrl: "/api/v1/financial-risk/jobs/job_risk",
      scope,
      poll: vi.fn().mockResolvedValue({
        data: jobStatus("succeeded", 100),
        meta: { correlationId: "cor_risk" },
      }),
    };
    await expect(pollFinancialRiskJob(poller)).resolves.toMatchObject({
      source: "v1",
      state: "succeeded",
      data: { presentation: { title: "Calculation complete" } },
    });
    expect(poller.poll).toHaveBeenCalledTimes(1);

    const protectedPoller = {
      ...poller,
      poll: vi.fn().mockRejectedValue(
        new APIError("protected-not-found", {
          code: "PROTECTED_NOT_FOUND",
          status: 404,
        }),
      ),
    };
    await expect(pollFinancialRiskJob(protectedPoller)).resolves.toMatchObject({
      state: "restricted",
      failure: { access: "protected-not-found" },
    });
  });

  it("returns a durable pending result for 202 compute acceptance", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(
      {
        data: {
          operationId: "op_risk",
          jobId: "job_risk",
          status: "accepted",
          statusUrl: "/api/v1/financial-risk/jobs/job_risk",
        },
        meta: { correlationId: "cor_risk" },
      },
      { status: 202 },
    ));
    vi.stubGlobal("fetch", fetchMock);
    const result = await computeFinancialRiskAssessmentAdapter({
      assessmentId: "risk_assessment_horizon",
      scope,
      resultId: "risk_result_horizon",
      operationId: "op_risk",
      jobId: "job_risk",
      references: {
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
      },
      idempotencyKey: "idem_risk",
      ifMatch: '"v1"',
    });
    expect(result).toMatchObject({
      source: "v1",
      state: "pending",
      data: { presentation: { state: "pending", title: "Queued" } },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
