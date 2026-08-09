import { assertEquals, assertThrows } from "@std/assert";
import {
  parseProviderConfiguration,
  parseSecretReference,
} from "../../src/integrations/configuration.ts";

Deno.test("Papermark local configuration retains only a secret reference", () => {
  const configuration = parseProviderConfiguration({
    provider: "papermark",
    lifecycle: "enabled",
    environment: "local-development",
    endpoint: "http://localhost:3000/api",
    secretRef: {
      manager: "environment",
      name: "PAPER_MARK_SECRET",
      version: "current",
    },
    activation: activation(),
  });

  assertEquals(configuration, {
    provider: "papermark",
    lifecycle: "enabled",
    environment: "local-development",
    endpoint: "http://localhost:3000/api",
    secretRef: {
      manager: "environment",
      name: "PAPER_MARK_SECRET",
      version: "current",
    },
    activation: activation(),
  });
  assertEquals(JSON.stringify(configuration).includes("secret-value"), false);
  assertEquals(Object.isFrozen(configuration), true);
  assertEquals(Object.isFrozen(configuration.secretRef), true);
});

Deno.test("Papermark rejects production or fixture activation in this slice", () => {
  for (
    const environment of [
      "interface-only",
      "fixture",
      "production-candidate",
      "production-verified",
    ]
  ) {
    assertThrows(
      () =>
        parseProviderConfiguration({
          provider: "papermark",
          lifecycle: "enabled",
          environment,
          endpoint: "https://papermark.example",
          secretRef: { manager: "vault", name: "papermark/token" },
        }),
      Error,
      "Papermark",
    );
  }
});

Deno.test("deferred iDeals and Intralinks cannot be configured as real adapters", () => {
  for (const provider of ["ideals", "intralinks"] as const) {
    const configuration = parseProviderConfiguration({
      provider,
      lifecycle: "deferred",
      environment: "interface-only",
    });
    assertEquals(configuration, {
      provider,
      lifecycle: "deferred",
      environment: "interface-only",
    });

    assertThrows(
      () =>
        parseProviderConfiguration({
          provider,
          lifecycle: "enabled",
          environment: "local-development",
          endpoint: "https://provider.example",
          secretRef: { manager: "vault", name: "provider/token" },
          activation: activation(),
        }),
      Error,
      "deferred",
    );
  }
});

Deno.test("disabled Papermark configuration has no endpoint or credential material", () => {
  const configuration = parseProviderConfiguration({
    provider: "papermark",
    lifecycle: "disabled",
    environment: "interface-only",
  });

  assertEquals(configuration.lifecycle, "disabled");
  assertEquals("endpoint" in configuration, false);
  assertEquals("secretRef" in configuration, false);
});

Deno.test("disabled and deferred configurations reject activation metadata", () => {
  assertThrows(
    () =>
      parseProviderConfiguration({
        provider: "papermark",
        lifecycle: "disabled",
        environment: "interface-only",
        activation: activation(),
      }),
    Error,
    "endpoint or credential metadata",
  );
  assertThrows(
    () =>
      parseProviderConfiguration({
        provider: "ideals",
        lifecycle: "deferred",
        environment: "interface-only",
        activation: activation(),
      }),
    Error,
    "endpoint or credential metadata",
  );
});

Deno.test("configuration rejects inline credential keys without echoing their values", () => {
  const secret = "do-not-echo-this-secret";
  assertThrows(
    () =>
      parseProviderConfiguration({
        provider: "papermark",
        lifecycle: "enabled",
        environment: "local-development",
        endpoint: "http://localhost:3000/api",
        apiKey: secret,
        secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
        activation: activation(),
      }),
    Error,
    "secret reference",
  );
  try {
    parseProviderConfiguration({
      provider: "papermark",
      lifecycle: "enabled",
      environment: "local-development",
      endpoint: "http://localhost:3000/api",
      token: secret,
      secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
      activation: activation(),
    });
  } catch (error) {
    assertEquals(String(error).includes(secret), false);
  }
});

Deno.test("credential-bearing endpoint URL forms are rejected", () => {
  for (
    const endpoint of [
      "https://user:password@provider.example",
      "https://provider.example?token=secret",
      "https://provider.example/#credential",
    ]
  ) {
    assertThrows(
      () =>
        parseProviderConfiguration({
          provider: "papermark",
          lifecycle: "enabled",
          environment: "sandbox-certification",
          endpoint,
          secretRef: { manager: "vault", name: "papermark/token" },
          activation: activation(),
        }),
      Error,
      "endpoint",
    );
  }
});

Deno.test("secret references reject values and preserve locator metadata only", () => {
  const reference = parseSecretReference({
    manager: "local-secret-store",
    name: "papermark/token",
  });

  assertEquals(reference, {
    manager: "local-secret-store",
    name: "papermark/token",
  });
  assertThrows(
    () =>
      parseSecretReference({
        manager: "environment",
        name: "PAPER_MARK_SECRET",
        value: "secret-value",
      }),
    Error,
    "secret reference",
  );
});

Deno.test("secret references enforce manager-specific locator shapes", () => {
  assertThrows(
    () =>
      parseSecretReference({
        manager: "environment",
        name: "papermark_token",
      }),
    Error,
    "uppercase environment-variable",
  );
  assertThrows(
    () =>
      parseSecretReference({
        manager: "vault",
        name: "raw-secret-value",
      }),
    Error,
    "bounded path locator",
  );
  assertEquals(
    parseSecretReference({
      manager: "local-secret-store",
      name: "papermark/token",
    }),
    { manager: "local-secret-store", name: "papermark/token" },
  );
});

Deno.test("secret-boundary validation never echoes invalid manager or locator values", () => {
  const secret = "sk_live_secret-shaped-invalid-locator_123456789";
  const cases: unknown[] = [
    { manager: secret, name: "PAPER_MARK_SECRET" },
    { manager: "environment", name: secret },
    { manager: "environment", name: "PAPER_MARK_SECRET", version: secret },
    { manager: "environment", name: "PAPER_MARK_SECRET", version: "v999" },
  ];
  for (const input of cases) {
    try {
      parseSecretReference(input);
      throw new Error("Expected secret reference input to be rejected.");
    } catch (error) {
      assertEquals(String(error).includes(secret), false);
      assertEquals(String(error).includes("invalid"), true);
    }
  }
  try {
    parseProviderConfiguration({
      provider: "papermark",
      lifecycle: "enabled",
      environment: "local-development",
      endpoint: "http://localhost:3000/api",
      secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
      activation: { ...activation(), providerVersion: secret },
    });
    throw new Error("Expected activation input to be rejected.");
  } catch (error) {
    assertEquals(String(error).includes(secret), false);
    assertEquals(String(error).includes("activation"), true);
  }
});

Deno.test("nested credential values are rejected before canonical configuration output", () => {
  const secret = "nested-secret-must-not-be-retained";
  for (
    const configuration of [
      {
        provider: "papermark",
        lifecycle: "enabled",
        environment: "local-development",
        endpoint: "http://localhost:3000/api",
        secretRef: {
          manager: "environment",
          name: "PAPER_MARK_SECRET",
          value: secret,
        },
        activation: activation(),
      },
      {
        provider: "papermark",
        lifecycle: "enabled",
        environment: "local-development",
        endpoint: "http://localhost:3000/api",
        secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
        activation: { ...activation(), credentials: { value: secret } },
      },
    ]
  ) {
    try {
      parseProviderConfiguration(configuration);
      throw new Error("Expected nested credential input to be rejected.");
    } catch (error) {
      assertEquals(String(error).includes(secret), false);
      assertEquals(String(error).includes("inline credential"), true);
    }
  }
});

Deno.test("enabled Papermark requires every owner-approved activation field", () => {
  for (const field of Object.keys(activation())) {
    const incomplete = { ...activation() } as Record<string, string>;
    delete incomplete[field];
    assertThrows(
      () =>
        parseProviderConfiguration({
          provider: "papermark",
          lifecycle: "enabled",
          environment: "local-development",
          endpoint: "http://localhost:3000/api",
          secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
          activation: incomplete,
        }),
      Error,
      "activation",
    );
  }
});

Deno.test("activation metadata rejects credentials and project issue IDs", () => {
  assertThrows(
    () =>
      parseProviderConfiguration({
        provider: "papermark",
        lifecycle: "enabled",
        environment: "local-development",
        endpoint: "http://localhost:3000/api",
        secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
        activation: { ...activation(), token: "credential" },
      }),
    Error,
    "inline credential",
  );
  assertThrows(
    () =>
      parseProviderConfiguration({
        provider: "papermark",
        lifecycle: "enabled",
        environment: "local-development",
        endpoint: "http://localhost:3000/api",
        secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
        activation: { ...activation(), approvalReference: "MAI-61" },
      }),
    Error,
    "activation",
  );
});

Deno.test("Papermark endpoint environment mismatches are rejected without echoing URLs", () => {
  const credentialEndpoint =
    "https://user:raw-endpoint-secret@api.papermark.com";
  try {
    parseProviderConfiguration({
      provider: "papermark",
      lifecycle: "enabled",
      environment: "local-development",
      endpoint: credentialEndpoint,
      secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
      activation: activation(),
    });
  } catch (error) {
    assertEquals(String(error).includes(credentialEndpoint), false);
    assertEquals(String(error).includes("raw-endpoint-secret"), false);
  }
  assertThrows(
    () =>
      parseProviderConfiguration({
        provider: "papermark",
        lifecycle: "enabled",
        environment: "local-development",
        endpoint: "https://api.papermark.com",
        secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
        activation: activation(),
      }),
    Error,
    "localhost",
  );
  assertThrows(
    () =>
      parseProviderConfiguration({
        provider: "papermark",
        lifecycle: "enabled",
        environment: "sandbox-certification",
        endpoint: "http://localhost:3000/api",
        secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
        activation: activation(),
      }),
    Error,
    "official hosted",
  );
  assertThrows(
    () =>
      parseProviderConfiguration({
        provider: "papermark",
        lifecycle: "enabled",
        environment: "local-development",
        endpoint: "http://localhost:3000",
        secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
        activation: activation(),
      }),
    Error,
    "localhost",
  );
});

function activation() {
  return {
    approvalReference: "approval_papermark_local",
    providerVersion: "papermark-v1.0.0",
    license: "AGPLv3",
    deploymentModel: "self-hosted",
    region: "local",
    storageTopology: "postgres-object-store",
    rollbackOperator: "platform-on-call",
  } as const;
}
