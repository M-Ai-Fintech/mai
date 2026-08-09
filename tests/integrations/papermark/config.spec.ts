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

function providerConfiguration(
  endpoint = "http://localhost:3000/api",
  environment: "local-development" | "sandbox-certification" =
    "local-development",
) {
  return parseProviderConfiguration({
    provider: "papermark",
    lifecycle: "enabled",
    environment,
    endpoint,
    secretRef: parseSecretReference({
      manager: "environment",
      name: "PAPERMARK_BEARER_TOKEN",
    }),
    activation: activation(),
  });
}

function validInput(
  endpoint = "http://localhost:3000/api",
  environment: "local-development" | "sandbox-certification" =
    "local-development",
): PapermarkAdapterConfigInput {
  return {
    configuration: providerConfiguration(endpoint, environment),
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

Deno.test("Papermark configuration permits the official hosted endpoint only in sandbox", () => {
  const configuration = parsePapermarkAdapterConfig(
    validInput("https://api.papermark.com", "sandbox-certification"),
  );
  assertEquals(
    configuration.configuration.environment,
    "sandbox-certification",
  );
});

Deno.test("Papermark configuration rejects the legacy hosted endpoint", () => {
  assertThrows(
    () => parsePapermarkAdapterConfig(validInput("https://api.papermark.io")),
    Error,
    "localhost",
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

Deno.test("Papermark configuration canonicalizes nested secret and activation input", () => {
  const secret = "nested-secret-must-not-be-retained";
  const secretRefInput = {
    ...validInput(),
    configuration: {
      ...providerConfiguration(),
      secretRef: {
        manager: "environment",
        name: "PAPERMARK_BEARER_TOKEN",
        value: secret,
      },
    } as never,
  };
  const activationInput = {
    ...validInput(),
    configuration: {
      ...providerConfiguration(),
      activation: { ...activation(), credentials: { value: secret } },
    } as never,
  };
  for (const input of [secretRefInput, activationInput]) {
    try {
      parsePapermarkAdapterConfig(input);
      throw new Error("Expected nested credential input to be rejected.");
    } catch (error) {
      assertEquals(String(error).includes(secret), false);
      assertEquals(String(error).includes("inline credential"), true);
    }
  }
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
  assertThrows(
    () => parsePapermarkAdapterConfig({ ...validInput(), pageSize: 101 }),
    Error,
    "page size",
  );
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
