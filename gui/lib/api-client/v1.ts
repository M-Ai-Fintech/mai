import { z } from "zod";

import { fetchWithRetry, parseResponse, withQuery } from "./transport";

export const v1MetaSchema = z.object({
  correlationId: z.string().min(1),
  nextCursor: z.string().min(1).optional(),
  projectionAsOf: z.string().min(1).optional(),
  freshness: z.enum(["current", "stale", "unknown"]).optional(),
  warnings: z.array(z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  })).readonly().optional(),
});

export const acceptedJobDataSchema = z.object({
  operationId: z.string().min(1),
  jobId: z.string().min(1),
  status: z.enum(["queued", "accepted"]),
  statusUrl: z.string().min(1),
});

export const acceptedJobEnvelopeSchema = z.object({
  data: acceptedJobDataSchema,
  meta: v1MetaSchema.pick({ correlationId: true }),
});

export type V1Query = Readonly<
  Record<string, string | number | boolean | undefined>
>;

export const createV1EnvelopeSchema = <T extends z.ZodType>(schema: T) =>
  z.object({ data: schema, meta: v1MetaSchema });

export type V1Meta = z.infer<typeof v1MetaSchema>;
export type V1Response<T> = {
  readonly data: T;
  readonly meta: V1Meta;
  readonly etag?: string;
};

export type V1AcceptedResponse = {
  readonly data: z.infer<typeof acceptedJobDataSchema>;
  readonly meta: Pick<V1Meta, "correlationId">;
  readonly status: number;
};

export interface V1RequestOptions extends RequestInit {
  readonly ifMatch?: string;
  readonly idempotencyKey?: string;
  readonly correlationId?: string;
  readonly query?: V1Query;
}

export async function requestV1<T>(
  path: string,
  schema: z.ZodType<T>,
  options: V1RequestOptions = {},
): Promise<V1Response<T>> {
  const response = await fetchV1(path, options);
  const envelope = await parseResponse(
    response,
    createV1EnvelopeSchema(schema),
  );
  return {
    data: envelope.data,
    meta: envelope.meta,
    etag: response.headers.get("ETag") ?? undefined,
  };
}

export async function requestV1Accepted(
  path: string,
  options: V1RequestOptions = {},
): Promise<V1AcceptedResponse> {
  const response = await fetchV1(path, options);
  const envelope = await parseResponse(response, acceptedJobEnvelopeSchema);
  return { ...envelope, status: response.status };
}

async function fetchV1(
  path: string,
  options: V1RequestOptions,
): Promise<Response> {
  const {
    ifMatch,
    idempotencyKey,
    correlationId,
    query,
    ...requestInit
  } = options;
  const headers = requestHeaders(requestInit.headers, {
    ifMatch,
    idempotencyKey,
    correlationId,
  });
  return fetchWithRetry(requestUrl(path, query), {
    ...requestInit,
    headers,
  });
}

function requestUrl(path: string, query: V1Query | undefined): string {
  const resolved = serverAwareUrl(path);
  if (typeof window === "undefined" || !resolved.startsWith("/")) {
    return withQuery(resolved, query);
  }
  const url = new URL(resolved, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function serverAwareUrl(path: string): string {
  if (typeof window !== "undefined" || !path.startsWith("/")) return path;
  const base = process.env.MAI_API_BASE_URL ?? "http://127.0.0.1:8000";
  return new URL(path, base).toString();
}

function requestHeaders(
  initial: HeadersInit | undefined,
  values: {
    readonly ifMatch?: string;
    readonly idempotencyKey?: string;
    readonly correlationId?: string;
  },
): Headers {
  const headers = new Headers(initial);
  headers.set("Accept", "application/json");
  setHeader(headers, "If-Match", values.ifMatch);
  setHeader(headers, "Idempotency-Key", values.idempotencyKey);
  setHeader(headers, "X-Correlation-Id", values.correlationId);
  return headers;
}

function setHeader(headers: Headers, name: string, value?: string): void {
  if (value !== undefined) headers.set(name, value);
}
