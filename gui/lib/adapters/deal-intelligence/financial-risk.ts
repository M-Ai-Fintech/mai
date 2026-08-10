import type { AdapterMode } from "../feature-flags";
import {
  failureFor,
  freshnessFailureFor,
  previousAdapterMissing,
  unavailableResult,
} from "./financial-risk-errors";
import {
  acceptedJobPresentation,
  presentFinancialRiskAssessment,
  presentFinancialRiskJob,
} from "./financial-risk-presentation";
import { financialRiskCanaryFor } from "./financial-risk-config";
import {
  captureFinancialRiskPollScope,
  enqueueFinancialRiskCompute,
  enqueueFinancialRiskInvalidation,
  type FinancialRiskAcceptedCompute,
  type FinancialRiskComputeCommand,
  type FinancialRiskInvalidationCommand,
  type FinancialRiskJobPoller,
  type FinancialRiskPollScope,
  readFinancialRiskAssessment,
} from "@/lib/api-client/financial-risk-client";
import type {
  FinancialRiskAssessment,
  FinancialRiskJobStatus,
  FinancialRiskOutputs,
} from "@/lib/api-client/financial-risk-schemas";
import type { V1Meta, V1RequestOptions, V1Response } from "@/lib/api-client/v1";

export { presentFinancialRiskAssessment, presentFinancialRiskJob };

export type FinancialRiskAssessmentState = FinancialRiskAssessment["state"];

export interface FinancialRiskAssessmentPresentation {
  readonly state: FinancialRiskAssessmentState;
  readonly title: string;
  readonly detail: string;
  readonly resultKind: "model-backed" | "configured-fallback" | "unavailable";
  readonly current: boolean;
  readonly authoritative: boolean;
  readonly outputs?: FinancialRiskOutputs;
}

export interface FinancialRiskReadData {
  readonly assessment: FinancialRiskAssessment;
  readonly presentation: FinancialRiskAssessmentPresentation;
}

export interface FinancialRiskReadSuccess {
  readonly source: "v1";
  readonly state: FinancialRiskAssessmentState;
  readonly data: FinancialRiskReadData;
  readonly meta: V1Meta;
  readonly etag?: string;
}

export type FinancialRiskReadFailureState =
  | "restricted"
  | "unavailable"
  | "failed"
  | "stale"
  | "previous";

export interface FinancialRiskReadFailure {
  readonly source: "v1" | "previous";
  readonly state: FinancialRiskReadFailureState;
  readonly failure: {
    readonly code: string;
    readonly message: string;
    readonly retryable: boolean;
    readonly access?: "protected-not-found" | "forbidden";
  };
}

export type FinancialRiskReadResult =
  | FinancialRiskReadSuccess
  | FinancialRiskReadFailure;

export interface FinancialRiskPendingData {
  readonly accepted: FinancialRiskAcceptedCompute;
  readonly presentation: FinancialRiskJobPresentation;
}

export interface FinancialRiskComputeSuccess {
  readonly source: "v1";
  readonly state: "pending";
  readonly data: FinancialRiskPendingData;
}

export interface FinancialRiskJobPollSuccess {
  readonly source: "v1";
  readonly state: FinancialRiskJobPresentation["state"];
  readonly data: {
    readonly status: FinancialRiskJobStatus;
    readonly presentation: FinancialRiskJobPresentation;
  };
}

export type FinancialRiskJobPollResult =
  | FinancialRiskJobPollSuccess
  | FinancialRiskReadFailure;

export type FinancialRiskComputeResult =
  | FinancialRiskComputeSuccess
  | FinancialRiskReadFailure;

export type FinancialRiskJobPresentation =
  | {
    readonly state: "pending";
    readonly title: "Queued" | "In progress";
    readonly detail: string;
    readonly jobState: FinancialRiskJobStatus["state"];
    readonly progress: number;
  }
  | {
    readonly state: "succeeded" | "failed" | "cancelled";
    readonly title:
      | "Calculation complete"
      | "Calculation failed"
      | "Calculation cancelled";
    readonly detail: string;
    readonly jobState: FinancialRiskJobStatus["state"];
    readonly progress: number;
  };

export interface FinancialRiskReadOptions
  extends Omit<V1RequestOptions, "method"> {
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly previousAdapter?: () => Promise<FinancialRiskReadResult>;
}

export interface FinancialRiskComputeOptions {
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly previousAdapter?: () => Promise<FinancialRiskComputeResult>;
}

/** Reads the banker-facing assessment through its scoped readiness canary. */
export async function readFinancialRiskAssessmentAdapter(
  assessmentId: string,
  scope: FinancialRiskPollScope,
  options: FinancialRiskReadOptions = {},
): Promise<FinancialRiskReadResult> {
  const canary = readCanaryResult(options);
  if (canary !== undefined) return canary;
  return readAssessmentFromV1(assessmentId, scope, options);
}

async function readAssessmentFromV1(
  assessmentId: string,
  scope: FinancialRiskPollScope,
  options: FinancialRiskReadOptions,
): Promise<FinancialRiskReadResult> {
  try {
    const response = await readFinancialRiskAssessment(
      assessmentId,
      captureFinancialRiskPollScope(scope),
      requestOptionsFor(options),
    );
    return assessmentSuccess(response);
  } catch (error) {
    return failureFor(error);
  }
}

/** Enqueues a durable calculation; failures never become fixture success. */
export async function computeFinancialRiskAssessmentAdapter(
  command: FinancialRiskComputeCommand,
  options: FinancialRiskComputeOptions = {},
): Promise<FinancialRiskComputeResult> {
  const canary = computeCanaryResult(options);
  if (canary !== undefined) return canary;
  return enqueueFinancialRiskCommand(() =>
    enqueueFinancialRiskCompute(command)
  );
}

export async function invalidateFinancialRiskAssessmentAdapter(
  command: FinancialRiskInvalidationCommand,
  options: FinancialRiskComputeOptions = {},
): Promise<FinancialRiskComputeResult> {
  const canary = computeCanaryResult(options);
  if (canary !== undefined) return canary;
  return enqueueFinancialRiskCommand(() =>
    enqueueFinancialRiskInvalidation(command)
  );
}

export async function pollFinancialRiskJob(
  poller: FinancialRiskJobPoller,
  signal?: AbortSignal,
): Promise<FinancialRiskJobPollResult> {
  try {
    const response = await poller.poll(signal);
    const presentation = presentFinancialRiskJob(response.data);
    return {
      source: "v1",
      state: presentation.state,
      data: { status: response.data, presentation },
    };
  } catch (error) {
    return failureFor(error);
  }
}

export function financialRiskPollerFor(
  accepted: FinancialRiskAcceptedCompute,
): FinancialRiskJobPoller {
  return accepted.poller;
}

function assessmentSuccess(
  response: V1Response<FinancialRiskAssessment>,
): FinancialRiskReadResult {
  const freshnessFailure = readyAssessmentFreshnessFailure(response);
  if (freshnessFailure !== undefined) return freshnessFailure;
  return {
    source: "v1",
    state: response.data.state,
    data: {
      assessment: response.data,
      presentation: presentFinancialRiskAssessment(response.data),
    },
    meta: response.meta,
    etag: response.etag,
  };
}

function readyAssessmentFreshnessFailure(
  response: V1Response<FinancialRiskAssessment>,
): FinancialRiskReadFailure | undefined {
  if (
    response.data.state !== "completed" && response.data.state !== "fallback"
  ) {
    return undefined;
  }
  return freshnessFailureFor(response.meta.freshness);
}

function readCanaryResult(
  options: FinancialRiskReadOptions,
): Promise<FinancialRiskReadResult> | undefined {
  const mode = financialRiskCanaryMode(options.environment);
  if (mode === "previous") {
    return options.previousAdapter?.() ??
      Promise.resolve(previousAdapterMissing());
  }
  if (mode === "off") {
    return Promise.resolve(unavailableResult(
      "ADAPTER_DISABLED",
      "Financial risk is unavailable while this adapter is disabled.",
    ));
  }
  return undefined;
}

function computeCanaryResult(
  options: FinancialRiskComputeOptions,
): Promise<FinancialRiskComputeResult> | undefined {
  const mode = financialRiskCanaryMode(options.environment);
  if (mode === "previous") {
    return options.previousAdapter?.() ??
      Promise.resolve(previousAdapterMissing());
  }
  if (mode === "off") {
    return Promise.resolve(unavailableResult(
      "ADAPTER_DISABLED",
      "Financial risk is unavailable while this adapter is disabled.",
    ));
  }
  return undefined;
}

async function enqueueFinancialRiskCommand(
  enqueue: () => Promise<FinancialRiskAcceptedCompute>,
): Promise<FinancialRiskComputeResult> {
  try {
    return pendingComputeResult(await enqueue());
  } catch (error) {
    return failureFor(error);
  }
}

function pendingComputeResult(
  accepted: FinancialRiskAcceptedCompute,
): FinancialRiskComputeSuccess {
  return {
    source: "v1",
    state: "pending",
    data: {
      accepted,
      presentation: acceptedJobPresentation(accepted.data.status),
    },
  };
}

function financialRiskCanaryMode(
  environment?: Readonly<Record<string, string | undefined>>,
): AdapterMode {
  return financialRiskCanaryFor(environment).activation;
}

function requestOptionsFor(
  options: FinancialRiskReadOptions,
): Omit<V1RequestOptions, "method"> {
  return {
    signal: options.signal,
    headers: options.headers,
    credentials: options.credentials,
    ifMatch: options.ifMatch,
    idempotencyKey: options.idempotencyKey,
    correlationId: options.correlationId,
    query: options.query,
  };
}
