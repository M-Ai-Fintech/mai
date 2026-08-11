import { APIError } from "@/lib/api-client/errors";
import type { AdapterFailure, AdapterResult, AdapterState } from "./contracts";

export function stateForApiError(
  error: APIError,
): Exclude<AdapterState, "ready" | "previous"> {
  if (
    error.code === "PROTECTED_NOT_FOUND" || error.kind === "forbidden" ||
    error.kind === "unauthenticated"
  ) return "restricted";
  if (error.code === "STALE_VERSION" || error.kind === "stale") return "stale";
  if (
    error.code === "DEPENDENCY_UNAVAILABLE" ||
    error.kind === "dependency_unavailable" || error.kind === "async_failed" ||
    error.kind === "rate_limited" || error.kind === "timeout" ||
    error.kind === "network" || error.kind === "server"
  ) return "unavailable";
  return "partial-failure";
}

export function failureForApiError(error: APIError): AdapterFailure {
  return {
    code: error.code ?? error.kind,
    message: error.message,
    retryable: error.retryable ??
      ["dependency_unavailable", "network", "server", "timeout", "rate_limited"]
        .includes(error.kind),
  };
}

export function failedAdapterResult<T>(error: APIError): AdapterResult<T> {
  return {
    source: "v1",
    state: stateForApiError(error),
    failure: failureForApiError(error),
  };
}

export function unavailableAdapterResult<T>(
  code: string,
  message: string,
): AdapterResult<T> {
  return {
    source: "v1",
    state: "unavailable",
    failure: { code, message, retryable: true },
  };
}

export function previousAdapterMissingResult<T>(): AdapterResult<T> {
  return {
    source: "previous",
    state: "previous",
    failure: {
      code: "PREVIOUS_ADAPTER_NOT_PROVIDED",
      message: "Rollback selected but no previous adapter was provided.",
      retryable: false,
    },
  };
}
