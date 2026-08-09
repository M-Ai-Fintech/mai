import {
  INTEGRATION_PROVIDERS,
  type IntegrationFailureCode,
  type IntegrationProvider,
  type NormalizedIntegrationFailure,
} from "./contracts.ts";

const RETRYABLE_CODES = new Set<IntegrationFailureCode>([
  "TIMEOUT",
  "RATE_LIMITED",
  "UNAVAILABLE",
  "RETRY_EXHAUSTED",
]);

const SAFE_MESSAGES: Record<IntegrationFailureCode, string> = {
  AUTHENTICATION_FAILED: "The provider rejected the configured credentials.",
  AUTHORIZATION_DENIED: "The provider denied the requested operation.",
  NOT_CONFIGURED: "The provider is not configured.",
  DISABLED: "The provider adapter is disabled.",
  DEFERRED: "The provider adapter is deferred.",
  INVALID_REQUEST: "The provider rejected the request shape.",
  MALFORMED_RESPONSE: "The provider returned a malformed response.",
  NOT_FOUND: "The provider resource was not found.",
  TIMEOUT: "The provider operation timed out.",
  RATE_LIMITED: "The provider rate limited the operation.",
  UNAVAILABLE: "The provider is unavailable.",
  RETRY_EXHAUSTED: "Provider operation retries were exhausted.",
  UNKNOWN: "The provider operation failed.",
};

/**
 * Returns the redacted message for a normalized integration failure code.
 *
 * @example integrationFailureMessage("TIMEOUT")
 */
export function integrationFailureMessage(
  code: IntegrationFailureCode,
): string {
  return SAFE_MESSAGES[code];
}

export interface NormalizeIntegrationFailureInput {
  readonly provider: IntegrationProvider;
  readonly operation: string;
  readonly error: unknown;
  readonly occurredAt?: Date;
}

export interface NormalizedIntegrationFailureInput {
  readonly provider: IntegrationProvider;
  readonly operation: string;
  readonly code: IntegrationFailureCode;
  readonly occurredAt?: Date;
  readonly providerRequestId?: string;
  readonly providerStatus?: number;
}

/**
 * Creates a frozen provider failure from safe, caller-selected metadata.
 *
 * @example createNormalizedIntegrationFailure({ provider: "papermark", operation: "list_documents", code: "NOT_CONFIGURED" })
 */
export function createNormalizedIntegrationFailure(
  input: NormalizedIntegrationFailureInput,
): NormalizedIntegrationFailure {
  assertProvider(input.provider);
  assertOperation(input.operation);
  assertDate(input.occurredAt);
  assertProviderStatus(input.providerStatus);
  const code = assertFailureCode(input.code);
  const occurredAtEpoch = (input.occurredAt ?? new Date()).getTime();
  const result: NormalizedIntegrationFailure = {
    code,
    provider: input.provider,
    operation: input.operation,
    message: integrationFailureMessage(code),
    retryable: RETRYABLE_CODES.has(code),
    get occurredAt(): Date {
      return new Date(occurredAtEpoch);
    },
    ...(input.providerRequestId === undefined ? {} : {
      providerRequestId: assertProviderRequestId(input.providerRequestId),
    }),
    ...(input.providerStatus === undefined
      ? {}
      : { providerStatus: input.providerStatus }),
  };
  return Object.freeze(result);
}

/**
 * Classifies an arbitrary provider error without retaining its raw message or body.
 *
 * @example normalizeIntegrationFailure({ provider: "papermark", operation: "download_document", error: new Error("request timed out") })
 */
export function normalizeIntegrationFailure(
  input: NormalizeIntegrationFailureInput,
): NormalizedIntegrationFailure {
  const providerStatus = readProviderStatus(input.error);
  const providerRequestId = readProviderRequestId(input.error);
  return createNormalizedIntegrationFailure({
    provider: input.provider,
    operation: input.operation,
    code: classifyFailure(input.error, providerStatus),
    occurredAt: input.occurredAt,
    providerRequestId,
    providerStatus,
  });
}

function classifyFailure(
  error: unknown,
  status: number | undefined,
): IntegrationFailureCode {
  const byStatus = failureCodeForStatus(status);
  if (byStatus !== undefined) return byStatus;
  const explicit = readStringField(error, "code");
  if (explicit !== undefined && isFailureCode(explicit)) return explicit;
  return failureCodeForText(errorText(error));
}

function failureCodeForStatus(
  status: number | undefined,
): IntegrationFailureCode | undefined {
  if (status === 400 || status === 422) return "INVALID_REQUEST";
  if (status === 401) return "AUTHENTICATION_FAILED";
  if (status === 403) return "AUTHORIZATION_DENIED";
  if (status === 404) return "NOT_FOUND";
  if (status === 408) return "TIMEOUT";
  if (status === 429) return "RATE_LIMITED";
  if (status !== undefined && status >= 500) return "UNAVAILABLE";
  return undefined;
}

function failureCodeForText(text: string): IntegrationFailureCode {
  if (/timeout|timed out|deadline|abort|etimedout/i.test(text)) {
    return "TIMEOUT";
  }
  if (/rate.?limit|quota|too many requests/i.test(text)) return "RATE_LIMITED";
  if (/malformed|invalid json|schema|parse response/i.test(text)) {
    return "MALFORMED_RESPONSE";
  }
  if (/forbidden|permission|authorization denied/i.test(text)) {
    return "AUTHORIZATION_DENIED";
  }
  if (/unauthorized|credential|authentication/i.test(text)) {
    return "AUTHENTICATION_FAILED";
  }
  if (/not found|missing resource/i.test(text)) return "NOT_FOUND";
  if (/unavailable|network|econnrefused|enotfound/i.test(text)) {
    return "UNAVAILABLE";
  }
  return "UNKNOWN";
}

function errorText(error: unknown): string {
  if (!isRecord(error)) return "";
  const name = readStringField(error, "name") ?? "";
  const message = readStringField(error, "message") ?? "";
  return `${name} ${message}`;
}

function readProviderStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  const status = error.status ?? error.statusCode;
  return typeof status === "number" ? status : undefined;
}

function readProviderRequestId(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  const value = error.providerRequestId ?? error.requestId;
  return typeof value === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(value)
    ? value
    : undefined;
}

function readStringField(
  value: unknown,
  field: string,
): string | undefined {
  if (!isRecord(value)) return undefined;
  const fieldValue = value[field];
  return typeof fieldValue === "string" ? fieldValue : undefined;
}

function assertProvider(provider: IntegrationProvider): void {
  if (INTEGRATION_PROVIDERS.includes(provider)) return;
  throw new Error(
    `Integration provider "${
      String(provider)
    }" is invalid; expected a registered provider marker.`,
  );
}

function assertOperation(operation: string): void {
  if (
    typeof operation === "string" && operation.trim() && operation.length <= 128
  ) {
    return;
  }
  throw new Error(
    `Provider operation "${
      String(operation)
    }" is invalid; expected 1-128 non-whitespace characters.`,
  );
}

function assertDate(value: Date | undefined): void {
  if (
    value === undefined ||
    (value instanceof Date && !Number.isNaN(value.getTime()))
  ) return;
  throw new Error(
    `Provider failure timestamp "${
      String(value)
    }" is invalid; expected a valid Date.`,
  );
}

function assertProviderStatus(status: number | undefined): void {
  if (
    status === undefined ||
    (Number.isInteger(status) && status >= 100 && status <= 599)
  ) return;
  throw new Error(
    `Provider status "${
      String(status)
    }" is invalid; expected an integer HTTP status from 100 to 599.`,
  );
}

function assertProviderRequestId(value: string): string {
  if (/^[A-Za-z0-9._-]{1,128}$/.test(value)) return value;
  throw new Error(
    `Provider request ID "${value}" is invalid; expected 1-128 safe identifier characters.`,
  );
}

function assertFailureCode(
  value: IntegrationFailureCode,
): IntegrationFailureCode {
  if (isFailureCode(value)) return value;
  throw new Error(
    `Provider failure code "${
      String(value)
    }" is invalid; expected a normalized integration failure code.`,
  );
}

function isFailureCode(value: unknown): value is IntegrationFailureCode {
  return typeof value === "string" && Object.hasOwn(SAFE_MESSAGES, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
