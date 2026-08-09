import { assertEquals } from "@std/assert";
import { parseProviderConfiguration } from "../../src/integrations/configuration.ts";

Deno.test(
  "configuration parser redacts credential-shaped semantic values across every boundary",
  () => {
    const secret = "sk_live_configuration_boundary_secret_123456789";
    const base = {
      provider: "papermark",
      lifecycle: "enabled",
      environment: "local-development",
      endpoint: "http://localhost:3000/api",
      secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
      activation: activation(),
    };
    const cases: unknown[] = [
      { ...base, provider: secret },
      { ...base, lifecycle: secret },
      { ...base, environment: secret },
      { ...base, endpoint: `https://user:${secret}@provider.example` },
      { ...base, secretRef: { manager: secret, name: "PAPER_MARK_SECRET" } },
      { ...base, secretRef: { manager: "environment", name: secret } },
      {
        ...base,
        secretRef: {
          manager: "environment",
          name: "PAPER_MARK_SECRET",
          version: secret,
        },
      },
      ...Object.keys(activation()).map((field) => ({
        ...base,
        activation: { ...activation(), [field]: secret },
      })),
    ];
    for (const input of cases) {
      try {
        parseProviderConfiguration(input);
        throw new Error(
          "Expected semantic configuration input to be rejected.",
        );
      } catch (error) {
        assertEquals(String(error).includes(secret), false);
        assertEquals(String(error).includes("<redacted>"), true);
      }
    }
    assertEquals(JSON.stringify(base).includes(secret), false);
  },
);

Deno.test(
  "provider activation version accepts only bounded Papermark semver or lowercase commit",
  () => {
    const accepted = [
      "papermark-v0.0.0",
      "papermark-v1.2.3",
      "papermark-v1.2.3-beta.1",
      "commit-abcdef1",
      "commit-0123456789abcdef0123456789abcdef01234567",
    ];
    for (const providerVersion of accepted) {
      const parsed = parseProviderConfiguration({
        provider: "papermark",
        lifecycle: "enabled",
        environment: "local-development",
        endpoint: "http://localhost:3000/api",
        secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
        activation: { ...activation(), providerVersion },
      });
      assertEquals(parsed.activation?.providerVersion, providerVersion);
    }
    for (
      const providerVersion of [
        "-1.2.3",
        "papermark-1.2.3",
        "commit-x",
        "COMMIT-abcdef1",
        "unrelated-9.9.9",
        "commit-abcdef",
      ]
    ) {
      try {
        parseProviderConfiguration({
          provider: "papermark",
          lifecycle: "enabled",
          environment: "local-development",
          endpoint: "http://localhost:3000/api",
          secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
          activation: { ...activation(), providerVersion },
        });
        throw new Error("Expected provider activation version to be rejected.");
      } catch (error) {
        assertEquals(String(error).includes(providerVersion), false);
        assertEquals(String(error).includes("provider version"), true);
      }
    }
  },
);

function activation() {
  return {
    approvalReference: "approval_papermark_local",
    providerVersion: "papermark-v1.0.0",
    apiScopes: ["datarooms.read"],
    license: "AGPLv3",
    deploymentModel: "self-hosted",
    region: "local",
    storageTopology: "postgres-object-store",
    rollbackOperator: "platform-on-call",
  } as const;
}
