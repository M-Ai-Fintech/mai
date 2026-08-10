import { APIError } from "./errors";
import {
  type FinancialRiskAcceptedJobData,
  financialRiskAcceptedJobDataSchema,
  type FinancialRiskAssessment,
  financialRiskAssessmentSchema,
  financialRiskComputeRequestSchema,
  financialRiskInvalidationRequestSchema,
  type FinancialRiskJobStatus,
  financialRiskJobStatusSchema,
  type FinancialRiskReferences,
  type FinancialRiskScope,
  financialRiskScopeSchema,
} from "./financial-risk-schemas";
import {
  requestV1,
  requestV1Accepted,
  type V1AcceptedResponse,
  type V1RequestOptions,
  type V1Response,
} from "./v1";
import { pathSegment } from "./transport";

const FINANCIAL_RISK_BASE = "/api/v1/financial-risk";

type ParsedFinancialRiskComputeRequest = {
  readonly resultId: string;
  readonly operationId: string;
  readonly jobId: string;
  readonly references: FinancialRiskReferences;
};

export interface FinancialRiskPollScope extends FinancialRiskScope {
  readonly initiatingActorId: string;
}

export interface FinancialRiskComputeCommand {
  readonly assessmentId: string;
  readonly scope: FinancialRiskPollScope;
  readonly resultId: string;
  readonly operationId: string;
  readonly jobId: string;
  readonly references: FinancialRiskReferences;
  readonly idempotencyKey: string;
  readonly ifMatch: string;
  readonly signal?: AbortSignal;
  readonly correlationId?: string;
}

export interface FinancialRiskInvalidationCommand {
  readonly assessmentId: string;
  readonly scope: FinancialRiskPollScope;
  readonly resultId: string;
  readonly invalidationId: string;
  readonly operationId: string;
  readonly jobId: string;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly ifMatch: string;
  readonly signal?: AbortSignal;
  readonly correlationId?: string;
}

export interface FinancialRiskJobPoller {
  readonly jobId: string;
  readonly statusUrl: string;
  readonly scope: FinancialRiskPollScope;
  poll(signal?: AbortSignal): Promise<V1Response<FinancialRiskJobStatus>>;
}

export interface FinancialRiskAcceptedCompute {
  readonly data: FinancialRiskAcceptedJobData;
  readonly status: 202;
  readonly scope: FinancialRiskPollScope;
  readonly poller: FinancialRiskJobPoller;
  readonly meta: { readonly correlationId: string };
}

export function readFinancialRiskAssessment(
  assessmentId: string,
  scope: FinancialRiskPollScope,
  options: Omit<V1RequestOptions, "method"> = {},
): Promise<V1Response<FinancialRiskAssessment>> {
  captureFinancialRiskPollScope(scope);
  assertAssessmentId(assessmentId);
  return requestV1(
    assessmentPath(assessmentId),
    financialRiskAssessmentSchema,
    { ...options, method: "GET" },
  );
}

export async function enqueueFinancialRiskCompute(
  command: FinancialRiskComputeCommand,
): Promise<FinancialRiskAcceptedCompute> {
  const capturedScope = captureFinancialRiskPollScope(command.scope);
  assertAssessmentId(command.assessmentId);
  const body = parseComputeCommand(command, capturedScope);
  return enqueueAcceptedFinancialRiskCommand(
    `${assessmentPath(command.assessmentId)}/compute`,
    body,
    command,
    capturedScope,
  );
}

export async function enqueueFinancialRiskInvalidation(
  command: FinancialRiskInvalidationCommand,
): Promise<FinancialRiskAcceptedCompute> {
  const capturedScope = captureFinancialRiskPollScope(command.scope);
  assertAssessmentId(command.assessmentId);
  const body = parseInvalidationCommand(command);
  assertCommandHeaders(command);
  return enqueueAcceptedFinancialRiskCommand(
    `${assessmentPath(command.assessmentId)}/invalidate`,
    body,
    command,
    capturedScope,
  );
}

export function createFinancialRiskJobPoller(
  accepted: FinancialRiskAcceptedJobData,
  scope: FinancialRiskPollScope,
): FinancialRiskJobPoller {
  const parsed = parseAcceptedJobData(accepted);
  const capturedScope = captureFinancialRiskPollScope(scope);
  assertExactStatusUrl(parsed.statusUrl, parsed.jobId);
  return createJobPoller(parsed, capturedScope);
}

function createJobPoller(
  accepted: FinancialRiskAcceptedJobData,
  scope: FinancialRiskPollScope,
): FinancialRiskJobPoller {
  const statusUrl = jobStatusPath(accepted.jobId);
  return Object.freeze({
    jobId: accepted.jobId,
    statusUrl,
    scope,
    poll: (signal?: AbortSignal) =>
      readFinancialRiskJobStatus(accepted.jobId, scope, signal),
  });
}

async function readFinancialRiskJobStatus(
  jobId: string,
  scope: FinancialRiskPollScope,
  signal?: AbortSignal,
): Promise<V1Response<FinancialRiskJobStatus>> {
  captureFinancialRiskPollScope(scope);
  assertJobId(jobId);
  return requestV1(
    jobStatusPath(jobId),
    financialRiskJobStatusSchema,
    { method: "GET", signal },
  );
}

export function captureFinancialRiskPollScope(
  scope: FinancialRiskPollScope,
): FinancialRiskPollScope {
  const parsed = parseFinancialRiskScope(scope);
  assertScopedIdentifier(
    scope.initiatingActorId,
    "initiatingActorId",
    "actor_",
    64,
  );
  return freezeFinancialRiskPollScope(parsed, scope.initiatingActorId);
}

function parseFinancialRiskScope(
  scope: FinancialRiskPollScope,
): FinancialRiskScope {
  const parsed = financialRiskScopeSchema.safeParse(scope);
  if (parsed.success) return parsed.data;
  throw contractError(
    `Financial-risk polling scope is invalid: ${parsed.error.message}`,
  );
}

function freezeFinancialRiskPollScope(
  scope: FinancialRiskScope,
  initiatingActorId: string,
): FinancialRiskPollScope {
  return Object.freeze({
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    initiatingActorId,
  });
}

export function financialRiskAssessmentPath(assessmentId: string): string {
  assertAssessmentId(assessmentId);
  return `${FINANCIAL_RISK_BASE}/assessments/${pathSegment(assessmentId)}`;
}

function parseComputeCommand(
  command: FinancialRiskComputeCommand,
  scope: FinancialRiskPollScope,
): ParsedFinancialRiskComputeRequest {
  const parsed = parseComputeRequest(command);
  assertReferenceScope(parsed.references.evidenceBasis.scope, scope);
  assertCommandHeaders(command);
  return parsed;
}

function parseComputeRequest(
  command: FinancialRiskComputeCommand,
): ParsedFinancialRiskComputeRequest {
  const parsed = financialRiskComputeRequestSchema.safeParse({
    resultId: command.resultId,
    operationId: command.operationId,
    jobId: command.jobId,
    references: command.references,
  });
  if (!parsed.success) {
    throw contractError(
      `Financial-risk compute command is invalid: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

function assertReferenceScope(
  referencesScope: FinancialRiskScope,
  capturedScope: FinancialRiskPollScope,
): void {
  if (sameScope(referencesScope, capturedScope)) return;
  throw new APIError(
    "Financial-risk references do not match the captured tenant, workspace, and deal scope.",
    { code: "SCOPE_MISMATCH", kind: "validation", retryable: false },
  );
}

function parseInvalidationCommand(
  command: FinancialRiskInvalidationCommand,
): Readonly<Record<string, unknown>> {
  const parsed = financialRiskInvalidationRequestSchema.safeParse({
    resultId: command.resultId,
    invalidationId: command.invalidationId,
    operationId: command.operationId,
    jobId: command.jobId,
    reason: command.reason,
  });
  if (parsed.success) return parsed.data;
  throw contractError(
    `Financial-risk invalidation command is invalid: ${parsed.error.message}`,
  );
}

function parseAcceptedJobData(
  accepted: FinancialRiskAcceptedJobData,
): FinancialRiskAcceptedJobData {
  const parsed = financialRiskAcceptedJobDataSchema.safeParse(accepted);
  if (parsed.success) return parsed.data;
  throw contractError(
    `Financial-risk accepted job is invalid: ${parsed.error.message}`,
  );
}

function assertCommandHeaders(command: {
  readonly idempotencyKey: string;
  readonly ifMatch: string;
}): void {
  assertScopedIdentifier(command.idempotencyKey, "idempotencyKey", "idem_", 64);
  if (/^"v[1-9][0-9]*"$/.test(command.ifMatch)) return;
  throw new APIError(
    `Financial-risk If-Match value "${command.ifMatch}" is invalid; expected a strong ETag such as "v1".`,
    { code: "STALE_VERSION", kind: "stale", retryable: true },
  );
}

async function enqueueAcceptedFinancialRiskCommand(
  path: string,
  body: Readonly<Record<string, unknown>>,
  command: {
    readonly idempotencyKey: string;
    readonly ifMatch: string;
    readonly correlationId?: string;
    readonly signal?: AbortSignal;
  },
  scope: FinancialRiskPollScope,
): Promise<FinancialRiskAcceptedCompute> {
  const response = await requestV1Accepted(
    path,
    acceptedCommandOptions(command, body),
  );
  return acceptedCommandResult(response, scope);
}

function acceptedCommandOptions(
  command: {
    readonly idempotencyKey: string;
    readonly ifMatch: string;
    readonly correlationId?: string;
    readonly signal?: AbortSignal;
  },
  body: Readonly<Record<string, unknown>>,
): V1RequestOptions {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    idempotencyKey: command.idempotencyKey,
    ifMatch: command.ifMatch,
    correlationId: command.correlationId,
    signal: command.signal,
  };
}

function acceptedCommandResult(
  response: V1AcceptedResponse,
  scope: FinancialRiskPollScope,
): FinancialRiskAcceptedCompute {
  if (response.status !== 202) {
    throw contractError(
      `Financial-risk command returned HTTP ${response.status}; expected 202 Accepted.`,
    );
  }
  const data = parseAcceptedJobData(response.data);
  return {
    data,
    status: 202,
    scope,
    poller: createFinancialRiskJobPoller(data, scope),
    meta: response.meta,
  };
}

function sameScope(
  left: FinancialRiskScope,
  right: FinancialRiskScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function assertAssessmentId(value: string): void {
  assertScopedIdentifier(value, "assessmentId", "risk_assessment_", 96);
}

function assertJobId(value: string): void {
  assertScopedIdentifier(value, "jobId", "job_", 64);
}

function assertScopedIdentifier(
  value: string,
  label: string,
  prefix: string,
  maximum = 96,
): void {
  if (
    typeof value === "string" && value.length <= maximum &&
    new RegExp(`^${prefix}[a-z0-9]+(?:-[a-z0-9]+)*$`).test(value)
  ) return;
  throw new APIError(
    `Financial-risk ${label} "${
      String(value)
    }" is invalid; expected a scoped ${prefix} identifier.`,
    { code: "VALIDATION_FAILED", kind: "validation", retryable: false },
  );
}

function assertExactStatusUrl(statusUrl: string, jobId: string): void {
  const expected = jobStatusPath(jobId);
  assertRelativeStatusUrl(statusUrl, expected);
  const parsed = parseStatusUrl(statusUrl, expected);
  if (isExactStatusUrl(parsed, expected)) return;
  throw contractError(
    `Financial-risk statusUrl "${statusUrl}" does not match the exact job route ${expected}.`,
  );
}

function assertRelativeStatusUrl(statusUrl: string, expected: string): void {
  if (statusUrl === statusUrl.trim() && statusUrl.startsWith("/")) return;
  throw contractError(
    `Financial-risk statusUrl "${statusUrl}" is invalid; expected ${expected}.`,
  );
}

function parseStatusUrl(statusUrl: string, expected: string): URL {
  try {
    return new URL(statusUrl, "http://financial-risk.invalid");
  } catch {
    throw contractError(
      `Financial-risk statusUrl "${statusUrl}" is invalid; expected ${expected}.`,
    );
  }
}

function isExactStatusUrl(parsed: URL, expected: string): boolean {
  return parsed.origin === "http://financial-risk.invalid" &&
    parsed.pathname === expected && parsed.search === "" && parsed.hash === "";
}

function assessmentPath(assessmentId: string): string {
  return `${FINANCIAL_RISK_BASE}/assessments/${pathSegment(assessmentId)}`;
}

function jobStatusPath(jobId: string): string {
  return `${FINANCIAL_RISK_BASE}/jobs/${pathSegment(jobId)}`;
}

function contractError(message: string): APIError {
  return new APIError(message, { kind: "contract", code: "CONTRACT_MISMATCH" });
}
