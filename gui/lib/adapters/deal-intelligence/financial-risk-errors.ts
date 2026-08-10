import { APIError } from "@/lib/api-client/errors";
import type { FinancialRiskReadFailure } from "./financial-risk";

export function failureFor(error: unknown): FinancialRiskReadFailure {
  if (error instanceof APIError) return failureForApiError(error);
  return unavailableResult(
    "FINANCIAL_RISK_CLIENT_FAILURE",
    "Financial risk is unavailable.",
  );
}

function failureForApiError(error: APIError): FinancialRiskReadFailure {
  const restricted = restrictedFailureFor(error);
  if (restricted !== undefined) return restricted;
  const unavailable = unavailableFailureFor(error);
  if (unavailable !== undefined) return unavailable;
  if (error.code === "STALE_VERSION" || error.kind === "stale") {
    return staleResult(error);
  }
  return failedResult(error);
}

function restrictedFailureFor(
  error: APIError,
): FinancialRiskReadFailure | undefined {
  if (isProtectedNotFound(error)) {
    return restrictedFailure(
      error.code ?? "PROTECTED_NOT_FOUND",
      "protected-not-found",
      "This assessment is not available in the current context.",
    );
  }
  if (error.kind === "forbidden") {
    return restrictedFailure(
      error.code ?? "ACTION_FORBIDDEN",
      "forbidden",
      "This action is not permitted in the current context.",
    );
  }
  return undefined;
}

function unavailableFailureFor(
  error: APIError,
): FinancialRiskReadFailure | undefined {
  if (isUnavailableError(error)) {
    return unavailableResult(error.code ?? error.kind, error.message);
  }
  if (error.kind === "contract") {
    return unavailableResult(
      "CONTRACT_MISMATCH",
      "Financial risk is unavailable.",
    );
  }
  return undefined;
}

export function unavailableResult(
  code: string,
  message: string,
): FinancialRiskReadFailure {
  return {
    source: "v1",
    state: "unavailable",
    failure: { code, message, retryable: true },
  };
}

export function previousAdapterMissing(): FinancialRiskReadFailure {
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

function isProtectedNotFound(error: APIError): boolean {
  return error.code === "PROTECTED_NOT_FOUND" || error.kind === "not_found";
}

function isUnavailableError(error: APIError): boolean {
  return error.code === "DEPENDENCY_UNAVAILABLE" ||
    error.kind === "dependency_unavailable" || error.kind === "network" ||
    error.kind === "timeout" || error.kind === "server";
}

function restrictedFailure(
  code: string,
  access: "protected-not-found" | "forbidden",
  message: string,
): FinancialRiskReadFailure {
  return {
    source: "v1",
    state: "restricted",
    failure: { code, message, retryable: false, access },
  };
}

function staleResult(error: APIError): FinancialRiskReadFailure {
  return {
    source: "v1",
    state: "stale",
    failure: {
      code: error.code ?? "STALE_VERSION",
      message: error.message,
      retryable: true,
    },
  };
}

function failedResult(error: APIError): FinancialRiskReadFailure {
  return {
    source: "v1",
    state: "failed",
    failure: {
      code: error.code ?? error.kind,
      message: error.message,
      retryable: error.retryable ?? false,
    },
  };
}
