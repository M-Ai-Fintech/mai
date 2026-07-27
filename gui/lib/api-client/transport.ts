import { z } from "zod";

import { errorEnvelopeSchema, paginationMetaSchema } from "./common-schemas";
import { APIError, sanitizeErrorMessage } from "./errors";

const BASE_URL = process.env.NEXT_PUBLIC_CORE_API_URL ||
  "http://localhost:8000";

interface ComposedSignal {
  signal: AbortSignal;
  cleanup: () => void;
}

interface AttemptFailure {
  error: unknown;
  timedOut: boolean;
}

export function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

export function withQuery(path: string, query: object = {}): string {
  const url = new URL(path, BASE_URL);
  appendQueryParams(url, query);
  return url.toString();
}

function appendQueryParams(url: URL, query: object): void {
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
}

export function requestSignal(
  external: AbortSignal | undefined,
  timeoutMs: number,
): ComposedSignal {
  const controller = new AbortController();
  const abortFromExternal = () => controller.abort(external?.reason);
  if (external?.aborted) abortFromExternal();
  else external?.addEventListener("abort", abortFromExternal, { once: true });
  const timeoutId = setTimeout(() => abortForTimeout(controller), timeoutMs);
  return createComposedSignal(
    controller,
    external,
    abortFromExternal,
    timeoutId,
  );
}

function abortForTimeout(controller: AbortController): void {
  controller.abort(new DOMException("Request timed out", "TimeoutError"));
}

function createComposedSignal(
  controller: AbortController,
  external: AbortSignal | undefined,
  abortFromExternal: () => void,
  timeoutId: ReturnType<typeof setTimeout>,
): ComposedSignal {
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      external?.removeEventListener("abort", abortFromExternal);
    },
  };
}

export async function apiErrorFromResponse(
  response: Response,
): Promise<APIError> {
  const raw = await response.text().catch(() => "");
  const parsed = parseRawErrorPayload(raw);
  const envelope = errorEnvelopeSchema.safeParse(parsed);
  if (envelope.success) return envelopeError(response, envelope.data);
  return legacyError(response, parsed, raw);
}

function parseRawErrorPayload(raw: string): unknown {
  try {
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function envelopeError(
  response: Response,
  envelope: z.infer<typeof errorEnvelopeSchema>,
): APIError {
  return new APIError(sanitizeErrorMessage(envelope.error.message), {
    status: response.status,
    code: envelope.error.code,
    fieldErrors: envelope.error.fieldErrors,
  });
}

function legacyError(
  response: Response,
  parsed: unknown,
  raw: string,
): APIError {
  return new APIError(
    sanitizeErrorMessage(legacyMessage(response, parsed, raw)),
    {
      status: response.status,
    },
  );
}

function legacyMessage(
  response: Response,
  parsed: unknown,
  raw: string,
): string {
  if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
    if (typeof parsed.error === "string") return parsed.error;
  }
  return raw || response.statusText || "Request failed";
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = options.method === undefined || options.method === "GET" ? 3 : 1,
  backoffMs = 500,
  timeoutMs = 10_000,
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const failure = await fetchAttempt(url, options, timeoutMs);
    if (failure instanceof Response) return failure;
    if (options.signal?.aborted) throw abortedError(failure.error);
    if (attempt >= retries) throw finalAttemptError(failure, timeoutMs);
    await waitForRetry(backoffMs, attempt);
  }
  throw new APIError("Max retries reached", { kind: "network" });
}

async function fetchAttempt(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response | AttemptFailure> {
  const composed = requestSignal(options.signal ?? undefined, timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: composed.signal });
    if (!response.ok) throw await apiErrorFromResponse(response);
    return response;
  } catch (error) {
    if (error instanceof APIError) throw error;
    return { error, timedOut: composed.signal.aborted };
  } finally {
    composed.cleanup();
  }
}

function abortedError(cause: unknown): APIError {
  return new APIError("Request aborted", { kind: "aborted", cause });
}

function finalAttemptError(
  failure: AttemptFailure,
  timeoutMs: number,
): APIError {
  if (failure.timedOut) {
    return new APIError(`Timeout exceeded (${timeoutMs}ms)`, {
      status: 408,
      kind: "timeout",
      cause: failure.error,
    });
  }
  return networkError(failure.error);
}

function networkError(error: unknown): APIError {
  const message = error instanceof Error
    ? error.message
    : "Network request failed";
  return new APIError(sanitizeErrorMessage(message), {
    kind: "network",
    cause: error,
  });
}

function waitForRetry(backoffMs: number, attempt: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, backoffMs * 2 ** (attempt - 1))
  );
}

export async function parseResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<T> {
  const payload = await responsePayload(response);
  const parsed = schema.safeParse(payload);
  if (parsed.success) return parsed.data;
  throw new APIError(
    `API response contract mismatch: ${z.prettifyError(parsed.error)}`,
    { kind: "contract", cause: parsed.error },
  );
}

async function responsePayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new APIError("API returned invalid JSON", {
      kind: "contract",
      cause,
    });
  }
}

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetchWithRetry(withQuery(path), options);
  return parseResponse(response, schema);
}

export function jsonOptions(
  method: string,
  body: unknown,
  signal?: AbortSignal,
): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  };
}

export const createEnvelopeSchema = <T extends z.ZodType>(schema: T) =>
  z.object({ data: schema });

export const createPageSchema = <T extends z.ZodType>(schema: T) =>
  z.object({ data: z.array(schema), meta: paginationMetaSchema });
