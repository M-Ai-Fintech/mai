import { assert, assertEquals, assertThrows } from "@std/assert";
import { PapermarkTransport } from "../../../src/integrations/papermark/transport.ts";
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
  createPapermarkSyntheticTestBundle,
} from "../../../src/integrations/papermark/synthetic_test_bundle.ts";

const scope = parseIntegrationScope({
  tenantId: "tenant_acme",
  workspaceId: "workspace_horizon",
  dealId: "deal_horizon",
});
const secret = "synthetic-secret-never-log-this" as RuntimeSecret;

class FetchFake {
  readonly calls: { url: string; init: RequestInit }[] = [];
  responses: Response[] = [];
  failures: unknown[] = [];
}

Deno.test("Papermark transport converts timeout into a bounded failure", async () => {
  const fake = new FetchFake();
  fake.failures.push(new DOMException("aborted", "AbortError"));
  const { instance, bundle } = transport(
    fake,
    configuration({ retry: { maxAttempts: 1, maxDelayMs: 250 } }),
  );
  const pending = instance.getDocumentsPage(undefined);
  bundle.controls.timer.fire();
  const error = await captureError(() => pending);
  assertEquals(error.code, "TIMEOUT");
  assertEquals(bundle.controls.timer.delays, [1_000]);
});

Deno.test("Papermark transport times out a stalled secret resolver", async () => {
  const fake = new FetchFake();
  const config = configuration({
    retry: { maxAttempts: 1, maxDelayMs: 250 },
  });
  const { instance, bundle } = transport(fake, config, { mode: "stalled" });
  const pending = instance.getDocumentsPage(undefined);
  bundle.controls.timer.fire();
  const error = await captureError(() => pending);
  assertEquals(error.code, "TIMEOUT");
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark transport rejects a resolver that completes after timeout", async () => {
  const fake = new FetchFake();
  const config = configuration({ retry: { maxAttempts: 1, maxDelayMs: 250 } });
  const { instance, bundle } = transport(fake, config, { mode: "delayed" });
  const pending = instance.getDocumentsPage(undefined);
  bundle.controls.timer.fire();
  bundle.controls.secret.release();
  const error = await captureError(() => pending);
  assertEquals(error.code, "TIMEOUT");
  assertEquals(fake.calls.length, 0);
  assertEquals(bundle.controls.secret.calls[0].signal?.aborted, true);
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
  const { instance, bundle } = transport(
    fake,
    configuration({ retry: { maxAttempts: 1, maxDelayMs: 250 } }),
  );
  const pending = instance.getDocumentsPage(undefined);
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
  bundle.controls.timer.fire();
  const error = await captureError(() => pending);
  await Promise.resolve();
  assertEquals(error.code, "TIMEOUT");
  assertEquals(cancelled, true);
  assert(fake.calls[0].init.signal instanceof AbortSignal);
  assertEquals((fake.calls[0].init.signal as AbortSignal).aborted, true);
});

Deno.test("synthetic Papermark bundles reject caller-owned functions", () => {
  const config = configuration();
  assertThrows(
    () =>
      createPapermarkSyntheticTestBundle(config, {
        secret: (() => "caller-secret") as never,
      }),
    Error,
    "never a function",
  );
  assertThrows(
    () =>
      createPapermarkSyntheticTestBundle(config, {
        responses: [(() => new Response("{}")) as never],
      }),
    Error,
    "Response or Error",
  );
  assertThrows(
    () =>
      createPapermarkSyntheticTestBundle(config, {
        fetch: (() => Promise.resolve(new Response("{}"))) as never,
      } as never),
    Error,
    "unsupported field",
  );
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
        providerVersion: "papermark-v1.0.0",
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
  secretScript: { readonly mode: "immediate" | "stalled" | "delayed" } = {
    mode: "immediate",
  },
) {
  const queue = [
    ...fake.failures.map((failure) => failure as Error),
    ...fake.responses,
  ];
  const bundle = createPapermarkSyntheticTestBundle(config, {
    secret: { ...secretScript, value: secret },
    responses: queue,
  });
  Object.defineProperty(fake, "calls", {
    configurable: true,
    get: () => bundle.controls.fetch.calls,
  });
  return {
    instance: new PapermarkTransport(config, bundle.dependencies),
    bundle,
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
