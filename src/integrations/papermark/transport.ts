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

  constructor(input: {
    readonly code: IntegrationFailureCode;
    readonly status?: number;
    readonly providerRequestId?: string;
  }) {
    super(safeMessage(input.code));
    this.name = "PapermarkTransportFailure";
    this.code = input.code;
    this.status = input.status;
    this.providerRequestId = safeRequestId(input.providerRequestId);
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
    const token = await this.resolveSecret();
    let attempt = 0;
    while (attempt < this.config.retry.maxAttempts) {
      attempt += 1;
      try {
        const response = await this.requestPage(token, cursor);
        if (response.ok) return await this.parseJson(response);
        const failure = responseFailure(response);
        if (!this.shouldRetry(failure.code, attempt)) throw failure;
        await this.dependencies.sleep(this.retryDelay(attempt, response));
      } catch (error) {
        const failure = this.asTransportFailure(error);
        if (!this.shouldRetry(failure.code, attempt)) throw failure;
        await this.dependencies.sleep(this.retryDelay(attempt));
      }
    }
    throw new PapermarkTransportFailure({ code: "RETRY_EXHAUSTED" });
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

  private requestPage(
    token: RuntimeSecret,
    cursor: string | undefined,
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
    return this.requestWithTimeout(url.toString(), {
      method: "GET",
      headers,
    });
  }

  private requestWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    let handle: unknown;
    const response = this.dependencies.fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const timeout = new Promise<never>((_resolve, reject) => {
      handle = this.timer.setTimeout(() => {
        controller.abort();
        reject(new PapermarkTransportFailure({ code: "TIMEOUT" }));
      }, this.config.timeoutMs);
    });
    return Promise.race([response, timeout]).finally(() => {
      if (handle !== undefined) this.timer.clearTimeout(handle);
    });
  }

  private async parseJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
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

  private shouldRetry(code: IntegrationFailureCode, attempt: number): boolean {
    return attempt < this.config.retry.maxAttempts && RETRYABLE_CODES.has(code);
  }

  private retryDelay(attempt: number, response?: Response): number {
    const retryAfter = response === undefined
      ? undefined
      : parseRetryAfter(response.headers.get("retry-after"));
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

function trimTrailingSlash(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

function systemTimer(): PapermarkTimer {
  return {
    setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clearTimeout: (handle) => globalThis.clearTimeout(handle as number),
  };
}
