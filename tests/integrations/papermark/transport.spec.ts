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
  type SecretReference,
} from "../../../src/integrations/contracts.ts";

const scope = parseIntegrationScope({
  tenantId: "tenant_acme",
  workspaceId: "workspace_horizon",
  dealId: "deal_horizon",
});

const secret = "synthetic-secret-never-log-this" as RuntimeSecret;

class SecretResolverFake {
  calls = 0;

  resolve(): Promise<RuntimeSecret> {
    this.calls += 1;
    return Promise.resolve(secret);
  }
}

class StalledSecretResolverFake {
  resolve(
    _reference: SecretReference,
    _signal?: AbortSignal,
  ): Promise<RuntimeSecret> {
    return new Promise<RuntimeSecret>(() => undefined);
  }
}

class DelayedSecretResolverFake {
  signal?: AbortSignal;
  private releaseSecret?: (secret: RuntimeSecret) => void;

  resolve(
    _reference: SecretReference,
    signal?: AbortSignal,
  ): Promise<RuntimeSecret> {
    this.signal = signal;
    return new Promise<RuntimeSecret>((resolve) => {
      this.releaseSecret = resolve;
    });
  }

  release(): void {
    this.releaseSecret?.(secret);
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
  const resolver = new SecretResolverFake();
  const sleeps: number[] = [];
  const instance = new PapermarkTransport(config, resolver, {
    fetch: fake.fetch,
    sleep: (delayMs) => {
      sleeps.push(delayMs);
      return Promise.resolve();
    },
    now: () => new Date("2026-08-08T12:00:00.000Z"),
    timer,
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

Deno.test("Papermark transport retries transient responses within the configured bound", async () => {
  const fake = new FetchFake();
  fake.responses.push(
    jsonResponse({ error: { code: "rate_limit_exceeded" } }, 429, {
      "retry-after": "2",
    }),
    jsonResponse({ data: [], next_cursor: null }),
  );
  const { instance, sleeps } = transport(fake);
  await instance.getDocumentsPage(undefined);
  assertEquals(fake.calls.length, 2);
  assertEquals(sleeps, [250]);
});

Deno.test("Papermark transport does not retry malformed responses", async () => {
  const fake = new FetchFake();
  fake.responses.push(new Response("not-json", { status: 200 }));
  const { instance } = transport(fake);
  const error = await captureError(() => instance.getDocumentsPage(undefined));
  assertEquals(error.code, "MALFORMED_RESPONSE");
  assertEquals(fake.calls.length, 1);
});

Deno.test("Papermark transport converts timeout into a bounded failure", async () => {
  const fake = new FetchFake();
  fake.failures.push(new DOMException("aborted", "AbortError"));
  const timer = new TimerFake();
  const { instance } = transport(
    fake,
    configuration({ retry: { maxAttempts: 1, maxDelayMs: 250 } }),
    timer,
  );
  const pending = instance.getDocumentsPage(undefined);
  timer.fire();
  const error = await captureError(() => pending);
  assertEquals(error.code, "TIMEOUT");
  assertEquals(timer.delays, [1_000]);
});

Deno.test("Papermark transport times out a stalled secret resolver", async () => {
  const fake = new FetchFake();
  const timer = new TimerFake();
  const config = configuration({
    retry: { maxAttempts: 1, maxDelayMs: 250 },
  });
  const instance = new PapermarkTransport(
    config,
    new StalledSecretResolverFake(),
    {
      fetch: fake.fetch,
      sleep: () => Promise.resolve(),
      now: () => new Date("2026-08-08T12:00:00.000Z"),
      timer,
    },
  );

  const pending = instance.getDocumentsPage(undefined);
  timer.fire();
  const error = await captureError(() => pending);
  assertEquals(error.code, "TIMEOUT");
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark transport rejects a resolver that completes after timeout before fetch", async () => {
  const fake = new FetchFake();
  const timer = new TimerFake();
  const resolver = new DelayedSecretResolverFake();
  const instance = new PapermarkTransport(configWithSingleAttempt(), resolver, {
    fetch: fake.fetch,
    sleep: () => Promise.resolve(),
    now: () => new Date("2026-08-08T12:00:00.000Z"),
    timer,
  });

  const pending = instance.getDocumentsPage(undefined);
  timer.fire();
  resolver.release();
  const error = await captureError(() => pending);
  assertEquals(error.code, "TIMEOUT");
  assertEquals(fake.calls.length, 0);
  assertEquals(resolver.signal?.aborted, true);
});

Deno.test("Papermark transport aborts a stalled response body", async () => {
  const fake = new FetchFake();
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    cancel: () => {
      cancelled = true;
    },
  });
  const response = new Response(body, {
    headers: { "content-type": "application/json" },
  });
  Object.defineProperty(response, "json", {
    value: () => new Promise<unknown>(() => undefined),
  });
  fake.responses.push(response);
  const timer = new TimerFake();
  const { instance } = transport(
    fake,
    configuration({ retry: { maxAttempts: 1, maxDelayMs: 250 } }),
    timer,
  );

  const pending = instance.getDocumentsPage(undefined);
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
  timer.fire();
  const error = await captureError(() => pending);
  await Promise.resolve();
  assertEquals(error.code, "TIMEOUT");
  assertEquals(cancelled, true);
  assertEquals(fake.calls[0].init.signal instanceof AbortSignal, true);
  assertEquals((fake.calls[0].init.signal as AbortSignal).aborted, true);
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

function configWithSingleAttempt(): PapermarkAdapterConfig {
  return configuration({ retry: { maxAttempts: 1, maxDelayMs: 250 } });
}

async function captureError(
  operation: () => Promise<unknown>,
): Promise<
  Error & {
    readonly code: string;
    readonly status?: number;
    readonly providerRequestId?: string;
  }
> {
  try {
    await operation();
  } catch (error) {
    return error as Error & {
      readonly code: string;
      readonly status?: number;
      readonly providerRequestId?: string;
    };
  }
  throw new Error("Expected the operation to fail.");
}
