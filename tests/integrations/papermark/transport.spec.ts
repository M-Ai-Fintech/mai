import { assert, assertEquals } from "@std/assert";
import {
  type PapermarkFetch,
  type PapermarkTimer,
  PapermarkTransport,
} from "../../../src/integrations/papermark/transport.ts";
import {
  type PapermarkAdapterConfig,
  parsePapermarkAdapterConfig,
} from "../../../src/integrations/papermark/config.ts";
import {
  parseProviderConfiguration,
  parseSecretReference,
} from "../../../src/integrations/configuration.ts";
import {
  parseIntegrationScope,
  type RuntimeSecret,
} from "../../../src/integrations/contracts.ts";
import {
  createSyntheticPapermarkCallAuthorizationForTests,
  markPapermarkSyntheticFakeForTests,
} from "../../../src/integrations/papermark/authorization.ts";

const scope = parseIntegrationScope({
  tenantId: "tenant_acme",
  workspaceId: "workspace_horizon",
  dealId: "deal_horizon",
});

const secret = "synthetic-secret-never-log-this" as RuntimeSecret;

type TransportFailure = Error & {
  readonly code: string;
  readonly status?: number;
  readonly providerRequestId?: string;
};

class SecretResolverFake {
  calls = 0;

  resolve(): Promise<RuntimeSecret> {
    this.calls += 1;
    return Promise.resolve(secret);
  }
}

class FetchFake {
  readonly calls: { url: string; init: RequestInit }[] = [];
  responses: Response[] = [];
  failures: unknown[] = [];

  fetch: PapermarkFetch = (url, init) => {
    this.calls.push({ url, init });
    const failure = this.failures.shift();
    if (failure !== undefined) return Promise.reject(failure);
    const response = this.responses.shift();
    if (response === undefined) {
      return Promise.reject(new Error("fetch fake has no response"));
    }
    return Promise.resolve(response);
  };
}

class TimerFake implements PapermarkTimer {
  readonly delays: number[] = [];
  private nextHandle = 1;
  private readonly callbacks = new Map<number, () => void>();

  setTimeout(callback: () => void, delayMs: number): number {
    this.delays.push(delayMs);
    const handle = this.nextHandle++;
    this.callbacks.set(handle, callback);
    return handle;
  }

  clearTimeout(handle: unknown): void {
    this.callbacks.delete(handle as number);
  }

  fire(): void {
    const next = this.callbacks.values().next();
    if (!next.done) next.value();
  }
}

function configuration(overrides: Partial<PapermarkAdapterConfig> = {}) {
  const base = parsePapermarkAdapterConfig({
    configuration: parseProviderConfiguration({
      provider: "papermark",
      lifecycle: "enabled",
      environment: "local-development",
      endpoint: "http://localhost:3000/api",
      secretRef: parseSecretReference({
        manager: "environment",
        name: "PAPERMARK_BEARER_TOKEN",
      }),
      activation: activation(),
    }),
    scope,
    connectorAccount: {
      id: "connector_papermark",
      provider: "papermark",
      tenantId: scope.tenantId,
    },
    providerWorkspaceId: "papermark_workspace_horizon",
    folderId: "folder_horizon",
    pageSize: 50,
    timeoutMs: 1_000,
    retry: { maxAttempts: 3, maxDelayMs: 250 },
  });
  return { ...base, ...overrides };
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function transport(
  fake: FetchFake,
  config = configuration(),
  timer: PapermarkTimer = new TimerFake(),
) {
  const resolver = markPapermarkSyntheticFakeForTests(
    new SecretResolverFake(),
    "secret-resolver",
    "SecretResolverFake",
  );
  const fetch = markPapermarkSyntheticFakeForTests(
    fake.fetch,
    "fetch",
    "FetchFake",
  );
  const sleeps: number[] = [];
  const instance = new PapermarkTransport(config, resolver, {
    fetch,
    sleep: (delayMs) => {
      sleeps.push(delayMs);
      return Promise.resolve();
    },
    now: () => new Date("2026-08-08T12:00:00.000Z"),
    timer,
    authorization: createSyntheticPapermarkCallAuthorizationForTests(config, {
      secretResolver: resolver,
      fetch,
    }),
  });
  return { instance, resolver, sleeps };
}

Deno.test("Papermark transport requests the scoped official v1 list", async () => {
  const fake = new FetchFake();
  fake.responses.push(jsonResponse({ data: [], next_cursor: null }));
  const { instance, resolver } = transport(fake);

  await instance.getDocumentsPage(undefined);

  assertEquals(resolver.calls, 1);
  assertEquals(
    fake.calls[0].url,
    "http://localhost:3000/api/v1/documents?folderId=folder_horizon&limit=50",
  );
  const headers = new Headers(fake.calls[0].init.headers);
  assertEquals(headers.get("authorization"), `Bearer ${secret}`);
  assertEquals(headers.get("accept"), "application/json");
});

Deno.test("Papermark transport preserves opaque cursor and never leaks it in failures", async () => {
  const fake = new FetchFake();
  fake.failures.push(new Error("network opaque-cursor-secret"));
  const { instance } = transport(fake);
  const error = await captureError(() =>
    instance.getDocumentsPage("opaque-cursor-secret")
  );
  assert(fake.calls[0].url.includes("cursor=opaque-cursor-secret"));
  assert(!error.message.includes("opaque-cursor-secret"));
  assert(!error.message.includes(String(secret)));
});

Deno.test("Papermark transport normalizes authentication and authorization responses", async () => {
  for (
    const [status, code] of [[401, "AUTHENTICATION_FAILED"], [
      403,
      "AUTHORIZATION_DENIED",
    ]] as const
  ) {
    const fake = new FetchFake();
    fake.responses.push(
      jsonResponse({ error: { code: "provider_error" } }, status, {
        "x-request-id": "request_safe_1",
      }),
    );
    const { instance } = transport(fake);
    const error = await captureError(() =>
      instance.getDocumentsPage(undefined)
    );
    assertEquals(error.code, code);
    assertEquals(error.providerRequestId, "request_safe_1");
    assertEquals(error.status, status);
  }
});

Deno.test("Papermark transport honors a valid Retry-After delay", async () => {
  const fake = new FetchFake();
  fake.responses.push(
    jsonResponse({ error: { code: "rate_limit_exceeded" } }, 429, {
      "retry-after": "0.1",
    }),
    jsonResponse({ data: [], next_cursor: null }),
  );
  const { instance, sleeps } = transport(
    fake,
    configuration({ retry: { maxAttempts: 3, maxDelayMs: 10_000 } }),
  );
  await instance.getDocumentsPage(undefined);
  assertEquals(fake.calls.length, 2);
  assertEquals(sleeps, [100]);
});

Deno.test("Papermark transport honors X-RateLimit-Reset epoch seconds", async () => {
  const fake = new FetchFake();
  fake.responses.push(
    jsonResponse({ error: { code: "rate_limit_exceeded" } }, 429, {
      "x-ratelimit-reset": "1786190407",
    }),
    jsonResponse({ data: [], next_cursor: null }),
  );
  const { instance, sleeps } = transport(
    fake,
    configuration({ retry: { maxAttempts: 3, maxDelayMs: 10_000 } }),
  );
  await instance.getDocumentsPage(undefined);
  assertEquals(fake.calls.length, 2);
  assertEquals(sleeps, [7_000]);
});

Deno.test("Papermark transport honors an HTTP-date Retry-After value", async () => {
  const fake = new FetchFake();
  fake.responses.push(
    jsonResponse({ error: { code: "rate_limit_exceeded" } }, 429, {
      "retry-after": "Sat, 08 Aug 2026 12:00:05 GMT",
    }),
    jsonResponse({ data: [], next_cursor: null }),
  );
  const { instance, sleeps } = transport(
    fake,
    configuration({ retry: { maxAttempts: 3, maxDelayMs: 15_000 } }),
  );
  await instance.getDocumentsPage(undefined);
  assertEquals(fake.calls.length, 2);
  assertEquals(sleeps, [5_000]);
});

Deno.test("Papermark transport uses the greater delay when both rate-limit headers exist", async () => {
  const fake = new FetchFake();
  fake.responses.push(
    jsonResponse({ error: { code: "rate_limit_exceeded" } }, 429, {
      "retry-after": "2",
      "x-ratelimit-reset": "1786190410",
    }),
    jsonResponse({ data: [], next_cursor: null }),
  );
  const { instance, sleeps } = transport(
    fake,
    configuration({ retry: { maxAttempts: 3, maxDelayMs: 15_000 } }),
  );
  await instance.getDocumentsPage(undefined);
  assertEquals(fake.calls.length, 2);
  assertEquals(sleeps, [10_000]);
});

Deno.test("Papermark transport fails closed when a rate-limit delay is excessive", async () => {
  const fake = new FetchFake();
  fake.responses.push(
    jsonResponse({ error: { code: "rate_limit_exceeded" } }, 429, {
      "retry-after": "31",
    }),
  );
  const { instance, sleeps } = transport(fake);
  const error = await captureError(() => instance.getDocumentsPage(undefined));
  assertEquals(error.code, "RATE_LIMITED");
  assertEquals(fake.calls.length, 1);
  assertEquals(sleeps, []);
});

Deno.test("Papermark transport fails closed when a rate-limit delay header is missing", async () => {
  const fake = new FetchFake();
  fake.responses.push(
    jsonResponse({ error: { code: "rate_limit_exceeded" } }, 429),
  );
  const { instance, sleeps } = transport(fake);
  const error = await captureError(() => instance.getDocumentsPage(undefined));
  assertEquals(error.code, "RATE_LIMITED");
  assertEquals(fake.calls.length, 1);
  assertEquals(sleeps, []);
});

Deno.test("Papermark transport fails closed when a rate-limit delay header is invalid", async () => {
  const fake = new FetchFake();
  fake.responses.push(
    jsonResponse({ error: { code: "rate_limit_exceeded" } }, 429, {
      "retry-after": "later",
    }),
  );
  const { instance, sleeps } = transport(fake);
  const error = await captureError(() => instance.getDocumentsPage(undefined));
  assertEquals(error.code, "RATE_LIMITED");
  assertEquals(fake.calls.length, 1);
  assertEquals(sleeps, []);
});

Deno.test("Papermark transport does not retry a rate limit with maxDelayMs zero", async () => {
  const fake = new FetchFake();
  fake.responses.push(
    jsonResponse({ error: { code: "rate_limit_exceeded" } }, 429, {
      "retry-after": "0",
    }),
  );
  const { instance, sleeps } = transport(
    fake,
    configuration({ retry: { maxAttempts: 3, maxDelayMs: 0 } }),
  );
  const error = await captureError(() => instance.getDocumentsPage(undefined));
  assertEquals(error.code, "RATE_LIMITED");
  assertEquals(fake.calls.length, 1);
  assertEquals(sleeps, []);
});

Deno.test("Papermark transport does not retry malformed responses", async () => {
  const fake = new FetchFake();
  fake.responses.push(new Response("not-json", { status: 200 }));
  const { instance } = transport(fake);
  const error = await captureError(() => instance.getDocumentsPage(undefined));
  assertEquals(error.code, "MALFORMED_RESPONSE");
  assertEquals(fake.calls.length, 1);
});

Deno.test("Papermark transport reports safe retry exhaustion metadata", async () => {
  const fake = new FetchFake();
  fake.responses.push(
    jsonResponse({ error: "temporary" }, 503, { "x-request-id": "req_safe" }),
    jsonResponse({ error: "temporary" }, 503, { "x-request-id": "req_safe" }),
  );
  const { instance } = transport(
    fake,
    configuration({ retry: { maxAttempts: 2, maxDelayMs: 250 } }),
  );
  const error = await captureError(() => instance.getDocumentsPage(undefined));
  assertEquals(error.code, "RETRY_EXHAUSTED");
  assertEquals(error.status, 503);
  assertEquals(error.providerRequestId, "req_safe");
  assertEquals(fake.calls.length, 2);
});

function activation() {
  return {
    approvalReference: "approval_papermark_local",
    providerVersion: "papermark-1.0.0",
    license: "AGPLv3",
    deploymentModel: "self-hosted",
    region: "local",
    storageTopology: "postgres-object-store",
    rollbackOperator: "platform-on-call",
  } as const;
}

async function captureError(
  operation: () => Promise<unknown>,
): Promise<TransportFailure> {
  try {
    await operation();
  } catch (error) {
    return error as TransportFailure;
  }
  throw new Error("Expected the operation to fail.");
}
