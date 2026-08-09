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

class SecretResolverFake {
  resolve(): Promise<RuntimeSecret> {
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
  private releaseSecret?: (value: RuntimeSecret) => void;

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
  const resolver = markPapermarkSyntheticFakeForTests(
    new StalledSecretResolverFake(),
    "secret-resolver",
    "StalledSecretResolverFake",
  );
  const fetch = markPapermarkSyntheticFakeForTests(
    fake.fetch,
    "fetch",
    "FetchFake",
  );
  const instance = new PapermarkTransport(config, resolver, {
    fetch,
    sleep: () => Promise.resolve(),
    now: () => new Date("2026-08-08T12:00:00.000Z"),
    timer,
    authorization: createSyntheticPapermarkCallAuthorizationForTests(config, {
      secretResolver: resolver,
      fetch,
    }),
  });
  const pending = instance.getDocumentsPage(undefined);
  timer.fire();
  const error = await captureError(() => pending);
  assertEquals(error.code, "TIMEOUT");
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark transport rejects a resolver that completes after timeout", async () => {
  const fake = new FetchFake();
  const timer = new TimerFake();
  const resolver = markPapermarkSyntheticFakeForTests(
    new DelayedSecretResolverFake(),
    "secret-resolver",
    "DelayedSecretResolverFake",
  );
  const fetch = markPapermarkSyntheticFakeForTests(
    fake.fetch,
    "fetch",
    "FetchFake",
  );
  const config = configuration({ retry: { maxAttempts: 1, maxDelayMs: 250 } });
  const instance = new PapermarkTransport(config, resolver, {
    fetch,
    sleep: () => Promise.resolve(),
    now: () => new Date("2026-08-08T12:00:00.000Z"),
    timer,
    authorization: createSyntheticPapermarkCallAuthorizationForTests(config, {
      secretResolver: resolver,
      fetch,
    }),
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
  assert(fake.calls[0].init.signal instanceof AbortSignal);
  assertEquals((fake.calls[0].init.signal as AbortSignal).aborted, true);
});

function configuration(
  overrides: Partial<PapermarkAdapterConfig> = {},
): PapermarkAdapterConfig {
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
      activation: {
        approvalReference: "approval_papermark_local",
        providerVersion: "papermark-1.0.0",
        license: "AGPLv3",
        deploymentModel: "self-hosted",
        region: "local",
        storageTopology: "postgres-object-store",
        rollbackOperator: "platform-on-call",
      },
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
  return {
    instance: new PapermarkTransport(config, resolver, {
      fetch,
      sleep: () => Promise.resolve(),
      now: () => new Date("2026-08-08T12:00:00.000Z"),
      timer,
      authorization: createSyntheticPapermarkCallAuthorizationForTests(config, {
        secretResolver: resolver,
        fetch,
      }),
    }),
  };
}

interface TransportFailure extends Error {
  readonly code: string;
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
