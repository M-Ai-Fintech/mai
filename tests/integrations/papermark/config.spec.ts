import { assertEquals, assertThrows } from "@std/assert";
import {
  type PapermarkAdapterConfigInput,
  parsePapermarkAdapterConfig,
} from "../../../src/integrations/papermark/config.ts";
import {
  parseProviderConfiguration,
  parseSecretReference,
} from "../../../src/integrations/configuration.ts";
import { parseIntegrationScope } from "../../../src/integrations/contracts.ts";

const scope = parseIntegrationScope({
  tenantId: "tenant_acme",
  workspaceId: "workspace_horizon",
  dealId: "deal_horizon",
});

function providerConfiguration(endpoint = "https://api.papermark.com") {
  return parseProviderConfiguration({
    provider: "papermark",
    lifecycle: "enabled",
    environment: "local-development",
    endpoint,
    secretRef: parseSecretReference({
      manager: "environment",
      name: "PAPERMARK_BEARER_TOKEN",
    }),
  });
}

function validInput(
  endpoint = "https://api.papermark.com",
): PapermarkAdapterConfigInput {
  return {
    configuration: providerConfiguration(endpoint),
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
  };
}

Deno.test("Papermark configuration requires explicit scoped provider metadata", () => {
  const configuration = parsePapermarkAdapterConfig(validInput());
  assertEquals(configuration.provider, "papermark");
  assertEquals(configuration.binding.scope, scope);
  assertEquals(configuration.binding.folderId, "folder_horizon");
  assertEquals(configuration.pageSize, 50);
  assertEquals(configuration.retry.maxAttempts, 3);
});

Deno.test("Papermark configuration accepts the approved local development endpoint", () => {
  const configuration = parsePapermarkAdapterConfig(
    validInput("http://localhost:3000/api"),
  );
  assertEquals(
    configuration.configuration.endpoint,
    "http://localhost:3000/api",
  );
});

Deno.test("Papermark configuration rejects the legacy hosted endpoint", () => {
  assertThrows(
    () => parsePapermarkAdapterConfig(validInput("https://api.papermark.io")),
    Error,
    "api.papermark.io",
  );
});

Deno.test("Papermark configuration rejects connector and scope mismatches", () => {
  const input = {
    ...validInput(),
    connectorAccount: {
      id: "connector_papermark",
      provider: "papermark" as const,
      tenantId: "tenant_other" as never,
    },
  };
  assertThrows(
    () => parsePapermarkAdapterConfig(input),
    Error,
    "connector account tenant",
  );
});

Deno.test("Papermark configuration rejects inline bearer material", () => {
  const input = {
    ...validInput(),
    configuration: {
      ...providerConfiguration(),
      token: "synthetic-secret-must-not-be-accepted",
    } as never,
  };
  assertThrows(
    () => parsePapermarkAdapterConfig(input),
    Error,
    "inline credential",
  );
});

Deno.test("Papermark configuration enforces bounded request policy", () => {
  const input = { ...validInput(), timeoutMs: 0 };
  assertThrows(
    () => parsePapermarkAdapterConfig(input),
    Error,
    "timeout",
  );
  const retryInput = {
    ...validInput(),
    retry: { maxAttempts: 10, maxDelayMs: 250 },
  };
  assertThrows(
    () => parsePapermarkAdapterConfig(retryInput),
    Error,
    "max attempts",
  );
});
