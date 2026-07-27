export type APIErrorKind =
  | "validation"
  | "conflict"
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

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      kind?: APIErrorKind;
      fieldErrors?: Record<string, string[]>;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "APIError";
    this.status = options.status;
    this.code = options.code;
    this.kind = options.kind ?? kindForStatus(options.status);
    this.fieldErrors = options.fieldErrors;
  }
}

function kindForStatus(status?: number): APIErrorKind {
  if (status === 400 || status === 422) return "validation";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
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
