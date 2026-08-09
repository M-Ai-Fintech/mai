import {
  type IntegrationFailureCode,
  type RuntimeSecret,
  type SecretReference,
  type SecretResolver,
} from "../contracts.ts";
import { integrationFailureMessage } from "../failures.ts";
import {
  assertPapermarkCallAuthorization,
  type PapermarkCallAuthorization,
} from "./authorization.ts";
import type { PapermarkAdapterConfig } from "./config.ts";

const RETRYABLE_CODES = new Set<IntegrationFailureCode>([
  "TIMEOUT",
  "RATE_LIMITED",
  "UNAVAILABLE",
]);

export type PapermarkRateLimitDelayState = "valid" | "missing" | "invalid";

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
  readonly authorization: PapermarkCallAuthorization;
}

export class PapermarkTransportFailure extends Error {
  readonly code: IntegrationFailureCode;
  readonly status?: number;
  readonly providerRequestId?: string;
  readonly retryAfterMs?: number;
  readonly rateLimitDelayState?: PapermarkRateLimitDelayState;

  constructor(input: {
    readonly code: IntegrationFailureCode;
    readonly status?: number;
    readonly providerRequestId?: string;
    readonly retryAfterMs?: number;
    readonly rateLimitDelayState?: PapermarkRateLimitDelayState;
  }) {
    super(integrationFailureMessage(input.code));
    this.name = "PapermarkTransportFailure";
    this.code = input.code;
    this.status = input.status;
    this.providerRequestId = safeRequestId(input.providerRequestId);
    this.retryAfterMs = safeRetryAfter(input.retryAfterMs);
    this.rateLimitDelayState = input.rateLimitDelayState;
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
    assertPapermarkCallAuthorization(
      dependencies.authorization,
      config,
      secretResolver,
      dependencies.fetch,
    );
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
        const delay = this.retryDelay(attempt, failure);
        if (delay === undefined) throw failure;
        await this.dependencies.sleep(delay);
      }
    }
  }

  private async resolveSecret(signal: AbortSignal): Promise<RuntimeSecret> {
    const reference = this.config.configuration.secretRef as SecretReference;
    if (signal.aborted) throw timeoutFailure();
    assertPapermarkCallAuthorization(
      this.dependencies.authorization,
      this.config,
      this.secretResolver,
      this.dependencies.fetch,
    );
    try {
      const secret = await this.secretResolver.resolve(reference, signal);
      if (signal.aborted) throw timeoutFailure();
      if (typeof secret === "string" && secret.trim()) return secret;
    } catch {
      if (signal.aborted) throw timeoutFailure();
      // Secret resolver failures must not cross the adapter seam.
    }
    throw notConfiguredFailure();
  }

  private requestPage(cursor: string | undefined): Promise<unknown> {
    const controller = new AbortController();
    let response: Response | undefined;
    return this.withTimeout(
      async () => {
        const token = await this.resolveSecret(controller.signal);
        response = await this.fetchPage(token, cursor, controller.signal);
        if (!response.ok) {
          throw responseFailure(response, this.dependencies.now());
        }
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
    if (signal.aborted) throw timeoutFailure();
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
    if (signal.aborted) throw timeoutFailure();
    assertPapermarkCallAuthorization(
      this.dependencies.authorization,
      this.config,
      this.secretResolver,
      this.dependencies.fetch,
    );
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
  ): number | undefined {
    if (this.config.retry.maxDelayMs <= 0) return undefined;
    if (failure.code === "RATE_LIMITED") {
      if (failure.rateLimitDelayState !== "valid") return undefined;
      if (
        failure.retryAfterMs === undefined ||
        failure.retryAfterMs > this.config.retry.maxDelayMs
      ) return undefined;
      return failure.retryAfterMs;
    }
    const exponential = 100 * 2 ** (attempt - 1);
    return Math.min(exponential, this.config.retry.maxDelayMs);
  }
}

function responseFailure(
  response: Response,
  now: Date,
): PapermarkTransportFailure {
  const code = failureCodeForStatus(response.status);
  const rateLimitDelay = code === "RATE_LIMITED"
    ? parseRateLimitDelay(response.headers, now)
    : undefined;
  return new PapermarkTransportFailure({
    code,
    status: response.status,
    providerRequestId: response.headers.get("x-request-id") ?? undefined,
    retryAfterMs: rateLimitDelay?.delayMs,
    rateLimitDelayState: rateLimitDelay?.state,
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

function parseRateLimitDelay(
  headers: Headers,
  now: Date,
): { readonly state: PapermarkRateLimitDelayState; readonly delayMs?: number } {
  const retryAfter = parseRetryAfter(headers.get("retry-after"), now);
  const reset = parseRateLimitReset(headers.get("x-ratelimit-reset"), now);
  if (retryAfter.state === "invalid" || reset.state === "invalid") {
    return { state: "invalid" };
  }
  const delays = [retryAfter.delayMs, reset.delayMs].filter(
    (delay): delay is number => delay !== undefined,
  );
  if (delays.length === 0) return { state: "missing" };
  return { state: "valid", delayMs: Math.max(...delays) };
}

function parseRetryAfter(
  value: string | null,
  now: Date,
): { readonly state: PapermarkRateLimitDelayState; readonly delayMs?: number } {
  if (value === null) return { state: "missing" };
  const normalized = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return delayFromSeconds(normalized);
  }
  if (!/^[A-Za-z]{3},\s/.test(normalized)) return { state: "invalid" };
  return delayFromTimestamp(normalized, now);
}

function parseRateLimitReset(
  value: string | null,
  now: Date,
): { readonly state: PapermarkRateLimitDelayState; readonly delayMs?: number } {
  if (value === null) return { state: "missing" };
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return { state: "invalid" };
  const seconds = Number(normalized);
  if (!Number.isSafeInteger(seconds)) return { state: "invalid" };
  return delayFromMilliseconds(seconds * 1_000 - now.getTime());
}

function delayFromSeconds(
  value: string,
): { readonly state: PapermarkRateLimitDelayState; readonly delayMs?: number } {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return { state: "invalid" };
  return delayFromMilliseconds(seconds * 1_000);
}

function delayFromTimestamp(
  value: string,
  now: Date,
): { readonly state: PapermarkRateLimitDelayState; readonly delayMs?: number } {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return { state: "invalid" };
  return delayFromMilliseconds(timestamp - now.getTime());
}

function delayFromMilliseconds(
  value: number,
): { readonly state: PapermarkRateLimitDelayState; readonly delayMs?: number } {
  if (!Number.isFinite(value) || !Number.isSafeInteger(Math.ceil(value))) {
    return { state: "invalid" };
  }
  return { state: "valid", delayMs: Math.max(0, Math.ceil(value)) };
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

function timeoutFailure(): PapermarkTransportFailure {
  return new PapermarkTransportFailure({ code: "TIMEOUT" });
}

function notConfiguredFailure(): PapermarkTransportFailure {
  return new PapermarkTransportFailure({ code: "NOT_CONFIGURED" });
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
