import {
  type IntegrationFailureCode,
  type RuntimeSecret,
  type SecretReference,
  type SecretResolver,
} from "../contracts.ts";
import type { PapermarkAdapterConfig } from "./config.ts";

const RETRYABLE_CODES = new Set<IntegrationFailureCode>([
  "TIMEOUT",
  "RATE_LIMITED",
  "UNAVAILABLE",
]);

export type PapermarkFetch = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export interface PapermarkTimer {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface PapermarkTransportDependencies {
  readonly fetch: PapermarkFetch;
  readonly sleep: (delayMs: number) => Promise<void>;
  readonly now: () => Date;
  readonly timer?: PapermarkTimer;
}

export class PapermarkTransportFailure extends Error {
  readonly code: IntegrationFailureCode;
  readonly status?: number;
  readonly providerRequestId?: string;
  readonly retryAfterMs?: number;

  constructor(input: {
    readonly code: IntegrationFailureCode;
    readonly status?: number;
    readonly providerRequestId?: string;
    readonly retryAfterMs?: number;
  }) {
    super(safeMessage(input.code));
    this.name = "PapermarkTransportFailure";
    this.code = input.code;
    this.status = input.status;
    this.providerRequestId = safeRequestId(input.providerRequestId);
    this.retryAfterMs = safeRetryAfter(input.retryAfterMs);
  }
}

/**
 * Performs one scoped Papermark v1 document-page request with secret isolation.
 *
 * @example transport.getDocumentsPage("opaque-next-cursor")
 */
export class PapermarkTransport {
  private readonly timer: PapermarkTimer;

  constructor(
    private readonly config: PapermarkAdapterConfig,
    private readonly secretResolver: SecretResolver,
    private readonly dependencies: PapermarkTransportDependencies,
  ) {
    this.timer = dependencies.timer ?? systemTimer();
  }

  /**
   * Fetches one official Papermark document page using the bound folder.
   *
   * @example await transport.getDocumentsPage(undefined)
   */
  async getDocumentsPage(cursor: string | undefined): Promise<unknown> {
    let attempt = 0;
    while (true) {
      attempt += 1;
      try {
        return await this.requestPage(cursor);
      } catch (error) {
        const failure = this.asTransportFailure(error);
        if (!RETRYABLE_CODES.has(failure.code)) throw failure;
        if (attempt >= this.config.retry.maxAttempts) {
          if (attempt === 1) throw failure;
          throw retryExhausted(failure);
        }
        await this.dependencies.sleep(this.retryDelay(attempt, failure));
      }
    }
  }

  private async resolveSecret(): Promise<RuntimeSecret> {
    const reference = this.config.configuration.secretRef as SecretReference;
    try {
      const secret = await this.secretResolver.resolve(reference);
      if (typeof secret === "string" && secret.trim()) return secret;
    } catch {
      // Secret resolver failures must not cross the adapter seam.
    }
    throw new PapermarkTransportFailure({ code: "NOT_CONFIGURED" });
  }

  private requestPage(cursor: string | undefined): Promise<unknown> {
    const controller = new AbortController();
    let response: Response | undefined;
    return this.withTimeout(
      async () => {
        const token = await this.resolveSecret();
        response = await this.fetchPage(token, cursor, controller.signal);
        if (!response.ok) throw responseFailure(response);
        return await this.parseJson(response, controller.signal);
      },
      controller,
      () => abortResponseBody(response),
    );
  }

  private fetchPage(
    token: RuntimeSecret,
    cursor: string | undefined,
    signal: AbortSignal,
  ): Promise<Response> {
    const url = new URL(
      `${trimTrailingSlash(this.config.configuration.endpoint!)}/v1/documents`,
    );
    url.searchParams.set("folderId", this.config.binding.folderId);
    url.searchParams.set("limit", String(this.config.pageSize));
    if (cursor !== undefined) url.searchParams.set("cursor", cursor);
    const headers = new Headers({
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    });
    return this.dependencies.fetch(url.toString(), {
      method: "GET",
      headers,
      signal,
    });
  }

  private withTimeout<TResult>(
    operation: () => Promise<TResult>,
    controller: AbortController,
    onTimeout: () => void,
  ): Promise<TResult> {
    let handle: unknown;
    const response = operation();
    const timeout = new Promise<never>((_resolve, reject) => {
      handle = this.timer.setTimeout(() => {
        controller.abort();
        onTimeout();
        reject(new PapermarkTransportFailure({ code: "TIMEOUT" }));
      }, this.config.timeoutMs);
    });
    return Promise.race([response, timeout]).finally(() => {
      if (handle !== undefined) this.timer.clearTimeout(handle);
    });
  }

  private async parseJson(
    response: Response,
    signal: AbortSignal,
  ): Promise<unknown> {
    try {
      return await response.json();
    } catch (error) {
      if (signal.aborted) {
        throw new PapermarkTransportFailure({ code: "TIMEOUT" });
      }
      if (isAbortError(error)) throw error;
      throw new PapermarkTransportFailure({
        code: "MALFORMED_RESPONSE",
        status: response.status,
        providerRequestId: response.headers.get("x-request-id") ?? undefined,
      });
    }
  }

  private asTransportFailure(error: unknown): PapermarkTransportFailure {
    if (error instanceof PapermarkTransportFailure) return error;
    if (isAbortError(error)) {
      return new PapermarkTransportFailure({ code: "TIMEOUT" });
    }
    return new PapermarkTransportFailure({ code: "UNAVAILABLE" });
  }

  private retryDelay(
    attempt: number,
    failure: PapermarkTransportFailure,
  ): number {
    const retryAfter = failure.retryAfterMs;
    if (retryAfter !== undefined) {
      return Math.min(retryAfter, this.config.retry.maxDelayMs);
    }
    const exponential = 100 * 2 ** (attempt - 1);
    return Math.min(exponential, this.config.retry.maxDelayMs);
  }
}

function responseFailure(response: Response): PapermarkTransportFailure {
  const code = failureCodeForStatus(response.status);
  return new PapermarkTransportFailure({
    code,
    status: response.status,
    providerRequestId: response.headers.get("x-request-id") ?? undefined,
    retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
  });
}

function retryExhausted(
  failure: PapermarkTransportFailure,
): PapermarkTransportFailure {
  return new PapermarkTransportFailure({
    code: "RETRY_EXHAUSTED",
    status: failure.status,
    providerRequestId: failure.providerRequestId,
  });
}

function failureCodeForStatus(status: number): IntegrationFailureCode {
  if (status === 401) return "AUTHENTICATION_FAILED";
  if (status === 403) return "AUTHORIZATION_DENIED";
  if (status === 404) return "NOT_FOUND";
  if (status === 408) return "TIMEOUT";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "UNAVAILABLE";
  if (status === 400 || status === 422) return "INVALID_REQUEST";
  return "UNKNOWN";
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null || !/^\d+(?:\.\d+)?$/.test(value)) return undefined;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;
  return Math.ceil(seconds * 1_000);
}

function safeRequestId(value: string | undefined): string | undefined {
  if (value !== undefined && /^[A-Za-z0-9._-]{1,128}$/.test(value)) {
    return value;
  }
  return undefined;
}

function safeRetryAfter(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isSafeInteger(value) || value < 0) {
    return undefined;
  }
  return value;
}

function safeMessage(code: IntegrationFailureCode): string {
  const messages: Record<IntegrationFailureCode, string> = {
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
  return messages[code];
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function abortResponseBody(response: Response | undefined): void {
  const body = response?.body;
  if (body === null || body === undefined) return;
  try {
    void body.cancel().catch(() => undefined);
  } catch {
    // A body cancellation failure must not mask the timeout result.
  }
}

function trimTrailingSlash(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

function systemTimer(): PapermarkTimer {
  return {
    setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clearTimeout: (handle) => globalThis.clearTimeout(handle as number),
  };
}
