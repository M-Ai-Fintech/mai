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
    endpoint: "http://localhost:3000",
    secretRef: {
      manager: "environment",
      name: "PAPER_MARK_SECRET",
      version: "current",
    },
  });

  assertEquals(configuration, {
    provider: "papermark",
    lifecycle: "enabled",
    environment: "local-development",
    endpoint: "http://localhost:3000",
    secretRef: {
      manager: "environment",
      name: "PAPER_MARK_SECRET",
      version: "current",
    },
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

Deno.test("configuration rejects inline credential keys without echoing their values", () => {
  const secret = "do-not-echo-this-secret";
  assertThrows(
    () =>
      parseProviderConfiguration({
        provider: "papermark",
        lifecycle: "enabled",
        environment: "local-development",
        endpoint: "http://localhost:3000",
        apiKey: secret,
        secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
      }),
    Error,
    "secret reference",
  );
  try {
    parseProviderConfiguration({
      provider: "papermark",
      lifecycle: "enabled",
      environment: "local-development",
      endpoint: "http://localhost:3000",
      token: secret,
      secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
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
