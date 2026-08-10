export type APIErrorKind =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "conflict"
  | "stale"
  | "idempotency_conflict"
  | "dependency_unavailable"
  | "invalid_transition"
  | "retention"
  | "rate_limited"
  | "async_failed"
  | "not_found"
  | "timeout"
  | "aborted"
  | "server"
  | "network"
  | "contract";

export class APIError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly kind: APIErrorKind;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryable?: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      kind?: APIErrorKind;
      fieldErrors?: Record<string, string[]>;
      retryable?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "APIError";
    this.status = options.status;
    this.code = options.code;
    this.kind = options.kind ?? kindForError(options.status, options.code);
    this.fieldErrors = options.fieldErrors;
    this.retryable = options.retryable;
  }
}

function kindForError(status?: number, code?: string): APIErrorKind {
  const codeKind = kindForCode(code);
  if (codeKind !== undefined) return codeKind;
  return kindForStatus(status);
}

function kindForCode(code?: string): APIErrorKind | undefined {
  if (code === "UNAUTHENTICATED") return "unauthenticated";
  if (code === "ACTION_FORBIDDEN") return "forbidden";
  if (code === "PROTECTED_NOT_FOUND") return "not_found";
  if (code === "STALE_VERSION") return "stale";
  if (code === "IDEMPOTENCY_CONFLICT") return "idempotency_conflict";
  if (code === "DEPENDENCY_UNAVAILABLE") return "dependency_unavailable";
  if (code === "INVALID_TRANSITION") return "invalid_transition";
  if (code === "RETENTION_OR_LEGAL_HOLD") return "retention";
  if (code === "RATE_LIMITED") return "rate_limited";
  if (code === "ASYNC_OPERATION_FAILED") return "async_failed";
  return undefined;
}

function kindForStatus(status?: number): APIErrorKind {
  if (status === 400 || status === 422) return "validation";
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 423) return "retention";
  if (status === 429) return "rate_limited";
  if (status === 408) return "timeout";
  if (status !== undefined && status >= 500) return "server";
  return "network";
}

export function sanitizeErrorMessage(message: string): string {
  return message.replace(
    /\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*\/mai\//g,
    "[INTERNAL_PATH]/",
  );
}
