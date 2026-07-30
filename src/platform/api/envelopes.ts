import {
  type CorrelationId,
  type JobId,
  type OperationId,
  parseCorrelationId,
  parseOperationId,
} from "../../shared/contracts/identifiers.ts";
import {
  type AggregateVersion,
  parseAggregateVersion,
} from "../../shared/contracts/aggregate_version.ts";
import type { ValidationIssue } from "../../shared/contracts/validation.ts";

export const API_V1_BASE_PATH = "/api/v1";
const cursorBrand: unique symbol = Symbol("opaque-cursor");

export type OpaqueCursor = string & {
  readonly [cursorBrand]: "OpaqueCursor";
};

export type Freshness = "current" | "stale" | "unknown";
export type JobAcceptanceStatus = "queued" | "accepted";

export interface ApiWarning {
  readonly code: string;
  readonly message: string;
}

export interface SuccessMeta {
  readonly correlationId: CorrelationId;
  readonly nextCursor?: OpaqueCursor;
  readonly projectionAsOf?: string;
  readonly freshness?: Freshness;
  readonly warnings?: readonly ApiWarning[];
}

export interface SuccessEnvelope<T> {
  readonly data: T;
  readonly meta: SuccessMeta;
}

export interface AcceptedJobEnvelope {
  readonly data: {
    readonly operationId: OperationId;
    readonly jobId: JobId;
    readonly status: JobAcceptanceStatus;
    readonly statusUrl: string;
  };
  readonly meta: Pick<SuccessMeta, "correlationId">;
}

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "PROTECTED_NOT_FOUND"
  | "ACTION_FORBIDDEN"
  | "VERSION_CONFLICT"
  | "STALE_VERSION"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_TRANSITION"
  | "RETENTION_OR_LEGAL_HOLD"
  | "RATE_LIMITED"
  | "DEPENDENCY_UNAVAILABLE"
  | "ASYNC_OPERATION_FAILED";

export interface ErrorCatalogEntry {
  readonly httpStatus: number;
  readonly asynchronousTerminal?: true;
}

export const API_ERROR_CATALOG: Readonly<
  Record<ApiErrorCode, ErrorCatalogEntry>
> = {
  VALIDATION_FAILED: { httpStatus: 422 },
  UNAUTHENTICATED: { httpStatus: 401 },
  PROTECTED_NOT_FOUND: { httpStatus: 404 },
  ACTION_FORBIDDEN: { httpStatus: 403 },
  VERSION_CONFLICT: { httpStatus: 409 },
  STALE_VERSION: { httpStatus: 409 },
  IDEMPOTENCY_CONFLICT: { httpStatus: 409 },
  INVALID_TRANSITION: { httpStatus: 409 },
  RETENTION_OR_LEGAL_HOLD: { httpStatus: 423 },
  RATE_LIMITED: { httpStatus: 429 },
  DEPENDENCY_UNAVAILABLE: { httpStatus: 503 },
  ASYNC_OPERATION_FAILED: { httpStatus: 200, asynchronousTerminal: true },
};

export type FieldErrors = Readonly<
  Record<string, readonly ValidationIssue[]>
>;

export interface ApiError {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly correlationId: CorrelationId;
  readonly retryable: boolean;
  readonly fieldErrors?: FieldErrors;
  readonly expectedVersion?: AggregateVersion;
  readonly currentVersion?: AggregateVersion;
  readonly operationId?: OperationId;
  readonly safeComparisonUrl?: string;
}

export interface ErrorEnvelope {
  readonly error: ApiError;
}

export type ApiEnvelope = SuccessEnvelope<unknown> | ErrorEnvelope;
export type EnvelopeIssueCode =
  | "AMBIGUOUS_ENVELOPE"
  | "INVALID_ENVELOPE"
  | "INVALID_ERROR_CODE"
  | "INVALID_ERROR_FIELD"
  | "FORBIDDEN_ERROR_FIELD";

export type EnvelopeParseResult =
  | { readonly ok: true; readonly value: ApiEnvelope }
  | {
    readonly ok: false;
    readonly issue: { readonly code: EnvelopeIssueCode };
  };

export function parseOpaqueCursor(value: unknown): CursorParseResult {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,512}$/.test(value)) {
    return { ok: false, issue: { code: "INVALID_CURSOR" } };
  }
  return { ok: true, value: value as OpaqueCursor };
}

export function serializeOpaqueCursor(value: OpaqueCursor): string {
  return value;
}

export type CursorParseResult =
  | { readonly ok: true; readonly value: OpaqueCursor }
  | { readonly ok: false; readonly issue: { readonly code: "INVALID_CURSOR" } };

export function createSuccessEnvelope<T>(
  data: T,
  meta: SuccessMeta,
): SuccessEnvelope<T> {
  return { data, meta };
}

export function createAcceptedJobEnvelope(input: {
  readonly operationId: OperationId;
  readonly jobId: JobId;
  readonly status: JobAcceptanceStatus;
  readonly correlationId: CorrelationId;
}): AcceptedJobEnvelope {
  return {
    data: {
      operationId: input.operationId,
      jobId: input.jobId,
      status: input.status,
      statusUrl: `${API_V1_BASE_PATH}/jobs/${input.jobId}`,
    },
    meta: { correlationId: input.correlationId },
  };
}

export function createProtectedNotFoundError(
  correlationId: CorrelationId,
): ErrorEnvelope {
  return {
    error: {
      code: "PROTECTED_NOT_FOUND",
      message: "The protected resource was not found.",
      correlationId,
      retryable: false,
    },
  };
}

type ErrorBase<Code extends ApiErrorCode> = {
  readonly code: Code;
  readonly message: string;
  readonly correlationId: CorrelationId;
  readonly retryable: boolean;
};

export type ApiErrorInput =
  | ErrorBase<
    Exclude<
      ApiErrorCode,
      | "PROTECTED_NOT_FOUND"
      | "VALIDATION_FAILED"
      | "VERSION_CONFLICT"
      | "DEPENDENCY_UNAVAILABLE"
      | "ASYNC_OPERATION_FAILED"
    >
  >
  | (ErrorBase<"VALIDATION_FAILED"> & { readonly fieldErrors: FieldErrors })
  | (ErrorBase<"VERSION_CONFLICT"> & {
    readonly expectedVersion: AggregateVersion;
    readonly currentVersion: AggregateVersion;
    readonly safeComparisonUrl?: string;
  })
  | (ErrorBase<"DEPENDENCY_UNAVAILABLE" | "ASYNC_OPERATION_FAILED"> & {
    readonly operationId?: OperationId;
  });

export function createApiError(error: ApiErrorInput): ErrorEnvelope {
  return { error };
}

export function parseApiEnvelope(value: unknown): EnvelopeParseResult {
  if (!isRecord(value)) return envelopeFailure("INVALID_ENVELOPE");
  if (!hasOnlyFields(value, ["data", "meta", "error"])) {
    return envelopeFailure("INVALID_ENVELOPE");
  }
  if ("data" in value && "error" in value) {
    return envelopeFailure("AMBIGUOUS_ENVELOPE");
  }
  if ("error" in value) {
    return Object.keys(value).length === 1
      ? parseErrorEnvelope(value.error)
      : envelopeFailure("INVALID_ENVELOPE");
  }
  if ("data" in value) return parseSuccessEnvelope(value);
  return envelopeFailure("INVALID_ENVELOPE");
}

function parseSuccessEnvelope(
  value: Record<string, unknown>,
): EnvelopeParseResult {
  if (!hasOnlyFields(value, ["data", "meta"]) || !("meta" in value)) {
    return envelopeFailure("INVALID_ENVELOPE");
  }
  if (!isRecord(value.meta)) return envelopeFailure("INVALID_ENVELOPE");
  if (
    !hasOnlyFields(value.meta, [
      "correlationId",
      "nextCursor",
      "projectionAsOf",
      "freshness",
      "warnings",
    ])
  ) return envelopeFailure("INVALID_ENVELOPE");
  const correlation = parseCorrelationId(value.meta.correlationId);
  if (!correlation.ok) return envelopeFailure("INVALID_ENVELOPE");
  const cursor = value.meta.nextCursor === undefined
    ? undefined
    : parseOpaqueCursor(value.meta.nextCursor);
  if (cursor !== undefined && !cursor.ok) {
    return envelopeFailure("INVALID_ENVELOPE");
  }
  if (!isProjectionTimestamp(value.meta.projectionAsOf)) {
    return envelopeFailure("INVALID_ENVELOPE");
  }
  if (!isFreshness(value.meta.freshness)) {
    return envelopeFailure("INVALID_ENVELOPE");
  }
  const warnings = parseWarnings(value.meta.warnings);
  if (!warnings.ok) return envelopeFailure("INVALID_ENVELOPE");
  return {
    ok: true,
    value: {
      data: value.data,
      meta: {
        correlationId: correlation.value,
        ...(cursor === undefined ? {} : { nextCursor: cursor.value }),
        ...(value.meta.projectionAsOf === undefined ? {} : {
          projectionAsOf: value.meta.projectionAsOf,
        }),
        ...(value.meta.freshness === undefined ? {} : {
          freshness: value.meta.freshness,
        }),
        ...(warnings.value === undefined ? {} : { warnings: warnings.value }),
      },
    },
  };
}

function parseErrorEnvelope(value: unknown): EnvelopeParseResult {
  if (!isRecord(value)) return envelopeFailure("INVALID_ENVELOPE");
  if (!isApiErrorCode(value.code)) return envelopeFailure("INVALID_ERROR_CODE");
  if (!hasOnlyFields(value, allowedErrorFields(value.code))) {
    return envelopeFailure("FORBIDDEN_ERROR_FIELD");
  }
  if (!isSafeError(value)) return envelopeFailure("INVALID_ERROR_FIELD");
  if (value.code === "PROTECTED_NOT_FOUND" && hasProtectedDetail(value)) {
    return envelopeFailure("FORBIDDEN_ERROR_FIELD");
  }
  const correlation = parseCorrelationId(value.correlationId);
  if (!correlation.ok) return envelopeFailure("INVALID_ERROR_FIELD");
  const expectedVersion = parseOptionalVersion(value.expectedVersion);
  const currentVersion = parseOptionalVersion(value.currentVersion);
  const operationId = parseOptionalOperationId(value.operationId);
  const fieldErrors = parseOptionalFieldErrors(value.fieldErrors);
  if (
    !expectedVersion.ok || !currentVersion.ok || !operationId.ok ||
    !fieldErrors.ok
  ) {
    return envelopeFailure("INVALID_ERROR_FIELD");
  }
  if (
    value.code === "VERSION_CONFLICT" &&
    (expectedVersion.value === undefined || currentVersion.value === undefined)
  ) {
    return envelopeFailure("INVALID_ERROR_FIELD");
  }
  if (
    value.code !== "VERSION_CONFLICT" &&
    (expectedVersion.value !== undefined ||
      currentVersion.value !== undefined ||
      value.safeComparisonUrl !== undefined)
  ) {
    return envelopeFailure("FORBIDDEN_ERROR_FIELD");
  }
  if (value.code !== "VALIDATION_FAILED" && fieldErrors.value !== undefined) {
    return envelopeFailure("FORBIDDEN_ERROR_FIELD");
  }
  return {
    ok: true,
    value: {
      error: {
        code: value.code,
        message: value.message,
        correlationId: correlation.value,
        retryable: value.retryable,
        ...(expectedVersion.value === undefined ? {} : {
          expectedVersion: expectedVersion.value,
        }),
        ...(currentVersion.value === undefined ? {} : {
          currentVersion: currentVersion.value,
        }),
        ...(operationId.value === undefined ? {} : {
          operationId: operationId.value,
        }),
        ...(fieldErrors.value === undefined ? {} : {
          fieldErrors: fieldErrors.value,
        }),
        ...(value.safeComparisonUrl === undefined ? {} : {
          safeComparisonUrl: value.safeComparisonUrl,
        }),
      },
    },
  };
}

function isSafeError(value: Record<string, unknown>): value is {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly correlationId: unknown;
  readonly retryable: boolean;
  readonly expectedVersion?: unknown;
  readonly currentVersion?: unknown;
  readonly safeComparisonUrl?: string;
  readonly fieldErrors?: unknown;
  readonly operationId?: unknown;
} {
  if (typeof value.message !== "string" || value.message.trim().length === 0) {
    return false;
  }
  if (typeof value.retryable !== "boolean") return false;
  if (!parseCorrelationId(value.correlationId).ok) return false;
  return value.safeComparisonUrl === undefined ||
    isCanonicalApiPath(value.safeComparisonUrl);
}

function hasProtectedDetail(value: Record<string, unknown>): boolean {
  return value.fieldErrors !== undefined ||
    value.expectedVersion !== undefined ||
    value.currentVersion !== undefined ||
    value.safeComparisonUrl !== undefined ||
    value.operationId !== undefined;
}

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && value in API_ERROR_CATALOG;
}

function parseOptionalVersion(
  value: unknown,
): OptionalParseResult<AggregateVersion> {
  if (value === undefined) return { ok: true, value: undefined };
  const parsed = parseAggregateVersion(value);
  return parsed.ok ? { ok: true, value: parsed.value } : { ok: false };
}

function parseOptionalOperationId(
  value: unknown,
): OptionalParseResult<OperationId> {
  if (value === undefined) return { ok: true, value: undefined };
  const parsed = parseOperationId(value);
  return parsed.ok ? { ok: true, value: parsed.value } : { ok: false };
}

function parseOptionalFieldErrors(
  value: unknown,
): OptionalParseResult<FieldErrors> {
  if (value === undefined) return { ok: true, value: undefined };
  if (!isRecord(value)) return { ok: false };
  const entries = Object.entries(value).map(([field, issues]) => {
    return [field, parseFieldIssues(field, issues)] as const;
  });
  if (entries.some(([, issues]) => issues === undefined)) return { ok: false };
  return { ok: true, value: Object.fromEntries(entries) as FieldErrors };
}

function parseFieldIssues(
  field: string,
  value: unknown,
): readonly ValidationIssue[] | undefined {
  if (field.trim().length === 0 || !Array.isArray(value)) return undefined;
  const issues = value.filter(isValidationIssue);
  return issues.length === value.length &&
      issues.every((issue) => issue.field === field)
    ? issues
    : undefined;
}

function isValidationIssue(value: unknown): value is ValidationIssue {
  if (!isRecord(value)) return false;
  return (value.code === "REQUIRED" || value.code === "INVALID_TYPE" ||
    value.code === "TOO_LONG") &&
    typeof value.message === "string" &&
    value.message.trim().length > 0 && typeof value.field === "string";
}

function allowedErrorFields(code: ApiErrorCode): readonly string[] {
  const basic = ["code", "message", "correlationId", "retryable"];
  if (code === "VALIDATION_FAILED") return [...basic, "fieldErrors"];
  if (code === "VERSION_CONFLICT") {
    return [...basic, "expectedVersion", "currentVersion", "safeComparisonUrl"];
  }
  if (code === "DEPENDENCY_UNAVAILABLE" || code === "ASYNC_OPERATION_FAILED") {
    return [...basic, "operationId"];
  }
  return basic;
}

function hasOnlyFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isProjectionTimestamp(value: unknown): value is string | undefined {
  if (value === undefined) return true;
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value));
}

function isFreshness(value: unknown): value is Freshness | undefined {
  return value === undefined || value === "current" || value === "stale" ||
    value === "unknown";
}

function parseWarnings(
  value: unknown,
): OptionalParseResult<readonly ApiWarning[]> {
  if (value === undefined) return { ok: true, value: undefined };
  if (!Array.isArray(value) || !value.every(isApiWarning)) return { ok: false };
  return { ok: true, value };
}

function isApiWarning(value: unknown): value is ApiWarning {
  if (!isRecord(value) || !hasOnlyFields(value, ["code", "message"])) {
    return false;
  }
  return typeof value.code === "string" &&
    /^[A-Z][A-Z0-9_]{0,63}$/.test(value.code) &&
    typeof value.message === "string" && value.message.trim().length > 0;
}

function isCanonicalApiPath(value: unknown): value is string {
  return typeof value === "string" &&
    /^\/api\/v1(?:\/[A-Za-z0-9_-]+)*$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function envelopeFailure(code: EnvelopeIssueCode): EnvelopeParseResult {
  return { ok: false, issue: { code } };
}

type OptionalParseResult<T> =
  | { readonly ok: true; readonly value: T | undefined }
  | { readonly ok: false };
