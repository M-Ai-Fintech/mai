import { assertEquals, assertThrows } from "@std/assert";
import {
  createCapabilitySnapshot,
  createHealthSnapshot,
  parseIntegrationScope,
} from "../../src/integrations/contracts.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";

Deno.test("integration scope parses the complete tenant workspace deal scope", () => {
  const scope = parseIntegrationScope({
    tenantId: "tenant_northstar",
    workspaceId: "workspace_primary",
    dealId: "deal_solar-2026",
  });

  assertEquals(scope, {
    tenantId: requiredId("tenant_northstar", parseTenantId),
    workspaceId: requiredId("workspace_primary", parseWorkspaceId),
    dealId: requiredId("deal_solar-2026", parseDealId),
  });
});

Deno.test("integration scope rejects missing or malformed nested identifiers", () => {
  assertThrows(
    () =>
      parseIntegrationScope({
        tenantId: "tenant_northstar",
        workspaceId: "workspace_primary",
      }),
    Error,
    "deal ID",
  );
  assertThrows(
    () =>
      parseIntegrationScope({
        tenantId: "tenant_northstar",
        workspaceId: "workspace primary",
        dealId: "deal_solar-2026",
      }),
    Error,
    "workspace ID",
  );
});

Deno.test("capability snapshots preserve explicit supported denied and unavailable states", () => {
  const snapshot = createCapabilitySnapshot({
    provider: "papermark",
    environment: "local-development",
    lifecycle: "enabled",
    configured: true,
    source: "provider",
    scope: integrationScope(),
    requested: ["list_documents", "download_document", "permissions"],
    observations: [
      { capability: "list_documents", status: "supported" },
      {
        capability: "download_document",
        status: "unavailable",
        reasonCode: "TIMEOUT",
      },
      {
        capability: "permissions",
        status: "denied",
        reasonCode: "AUTHORIZATION_DENIED",
      },
    ],
    observedAt: timestamp(),
  });

  assertEquals(snapshot.observations.map(({ status }) => status), [
    "supported",
    "unavailable",
    "denied",
  ]);
  assertEquals(Object.isFrozen(snapshot), true);
  assertEquals(Object.isFrozen(snapshot.observations), true);
  assertEquals(Object.isFrozen(snapshot.observations[0]), true);
});

Deno.test("capability snapshots reject unknown credential-shaped fields at every input level", () => {
  const cases = [
    {
      input: { ...capabilityInput(), token: "snapshot-secret" },
      message: "credential",
    },
    {
      input: {
        ...capabilityInput(),
        scope: { ...integrationScope(), password: "scope-secret" },
      },
      message: "credential",
    },
    {
      input: {
        ...capabilityInput(),
        observations: [{
          capability: "list_documents",
          status: "supported",
          token: "observation-secret",
        }],
      },
      message: "credential",
    },
    {
      input: { ...capabilityInput(), metadata: "unknown" },
      message: "not recognized",
    },
  ];

  for (const { input, message } of cases) {
    try {
      createCapabilitySnapshot(input as never);
      throw new Error("Expected strict capability input to be rejected.");
    } catch (error) {
      assertEquals(String(error).includes("snapshot-secret"), false);
      assertEquals(String(error).includes("scope-secret"), false);
      assertEquals(String(error).includes("observation-secret"), false);
      assertEquals(String(error).includes(message), true);
    }
  }
});

Deno.test("capability observations and timestamps resist caller mutation", () => {
  const snapshot = createCapabilitySnapshot({
    ...capabilityInput(),
    observations: [{
      capability: "list_documents",
      status: "denied",
      reasonCode: "AUTHORIZATION_DENIED",
    }],
  });

  const observedAt = snapshot.observedAt;
  observedAt.setFullYear(2099);
  try {
    (snapshot.observations[0] as { status: string }).status = "supported";
  } catch {
    // Frozen records may reject mutation in strict mode; either way status stays denied.
  }

  assertEquals(snapshot.observedAt.toISOString(), "2026-08-08T12:00:00.000Z");
  assertEquals(snapshot.observations[0].status, "denied");
});

Deno.test("disabled or unconfigured capability snapshots cannot claim support", () => {
  assertThrows(
    () =>
      createCapabilitySnapshot({
        provider: "papermark",
        environment: "local-development",
        lifecycle: "disabled",
        configured: false,
        source: "provider",
        scope: integrationScope(),
        requested: ["list_documents"],
        observations: [{ capability: "list_documents", status: "supported" }],
        observedAt: timestamp(),
      }),
    Error,
    "must not claim supported",
  );
});

Deno.test("capability snapshots reject observations outside the requested set", () => {
  assertThrows(
    () =>
      createCapabilitySnapshot({
        provider: "papermark",
        environment: "local-development",
        lifecycle: "enabled",
        configured: true,
        source: "implementation",
        scope: integrationScope(),
        requested: ["list_documents"],
        observations: [
          { capability: "list_documents", status: "supported" },
          {
            capability: "download_document",
            status: "supported",
          },
        ],
        observedAt: timestamp(),
      }),
    Error,
    "not requested",
  );
});

Deno.test("capability and health snapshots validate runtime enum and primitive shapes", () => {
  assertThrows(
    () =>
      createCapabilitySnapshot({
        provider: "papermark",
        environment: "local-development",
        lifecycle: "enabled" as never,
        configured: "true" as never,
        source: "implementation",
        scope: integrationScope(),
        requested: ["list_documents"],
        observations: [{ capability: "list_documents", status: "supported" }],
        observedAt: timestamp(),
      }),
    Error,
    "configured",
  );
  assertThrows(
    () =>
      createCapabilitySnapshot({
        provider: "papermark",
        environment: "local-development",
        lifecycle: "enabled",
        configured: true,
        source: "implementation",
        scope: integrationScope(),
        requested: ["list_documents"],
        observations: [{
          capability: "list_documents",
          status: "supported",
          reasonCode: "NOT_A_FAILURE" as never,
        }],
        observedAt: timestamp(),
      }),
    Error,
    "failure reason",
  );
  assertThrows(
    () =>
      createHealthSnapshot({
        provider: "papermark",
        environment: "local-development",
        lifecycle: "enabled",
        configured: true,
        scope: integrationScope(),
        checks: [{ name: "endpoint", state: "unknown" as never }],
        observedAt: timestamp(),
      }),
    Error,
    "health check state",
  );
});

Deno.test("health snapshots derive fail-closed states from lifecycle and checks", () => {
  const disabled = createHealthSnapshot({
    provider: "ideals",
    environment: "interface-only",
    lifecycle: "disabled",
    configured: false,
    scope: integrationScope(),
    checks: [{ name: "configuration", state: "skipped" }],
    observedAt: timestamp(),
  });
  const healthy = createHealthSnapshot({
    provider: "papermark",
    environment: "local-development",
    lifecycle: "enabled",
    configured: true,
    scope: integrationScope(),
    checks: [
      { name: "configuration", state: "passed" },
      { name: "credential", state: "passed" },
      { name: "endpoint", state: "passed" },
    ],
    observedAt: timestamp(),
  });
  const unconfigured = createHealthSnapshot({
    provider: "papermark",
    environment: "local-development",
    lifecycle: "enabled",
    configured: false,
    scope: integrationScope(),
    checks: [{ name: "configuration", state: "unavailable" }],
    observedAt: timestamp(),
  });

  assertEquals(disabled.state, "disabled");
  assertEquals(healthy.state, "healthy");
  assertEquals(unconfigured.state, "unavailable");
  assertEquals(Object.isFrozen(healthy.checks[0]), true);
});

Deno.test("health snapshots reject unknown credential-shaped fields at every input level", () => {
  const cases = [
    {
      input: { ...healthInput(), password: "health-secret" },
      message: "credential",
    },
    {
      input: {
        ...healthInput(),
        scope: { ...integrationScope(), token: "scope-secret" },
      },
      message: "credential",
    },
    {
      input: {
        ...healthInput(),
        checks: [{ name: "endpoint", state: "passed", token: "check-secret" }],
      },
      message: "credential",
    },
    {
      input: { ...healthInput(), metadata: "unknown" },
      message: "not recognized",
    },
  ];

  for (const { input, message } of cases) {
    try {
      createHealthSnapshot(input as never);
      throw new Error("Expected strict health input to be rejected.");
    } catch (error) {
      assertEquals(String(error).includes("health-secret"), false);
      assertEquals(String(error).includes("scope-secret"), false);
      assertEquals(String(error).includes("check-secret"), false);
      assertEquals(String(error).includes(message), true);
    }
  }
});

Deno.test("health snapshot timestamps resist caller mutation", () => {
  const snapshot = createHealthSnapshot(healthInput());
  snapshot.observedAt.setTime(Date.parse("2099-01-01T00:00:00.000Z"));

  assertEquals(snapshot.observedAt.toISOString(), "2026-08-08T12:00:00.000Z");
  assertEquals(Object.isFrozen(snapshot.checks[0]), true);
});

Deno.test("deferred provider health cannot become healthy", () => {
  const health = createHealthSnapshot({
    provider: "intralinks",
    environment: "interface-only",
    lifecycle: "deferred",
    configured: false,
    scope: integrationScope(),
    checks: [{ name: "configuration", state: "skipped" }],
    observedAt: timestamp(),
  });

  assertEquals(health.state, "deferred");
});

function integrationScope() {
  return parseIntegrationScope({
    tenantId: "tenant_northstar",
    workspaceId: "workspace_primary",
    dealId: "deal_solar-2026",
  });
}

function capabilityInput() {
  return {
    provider: "papermark" as const,
    environment: "local-development" as const,
    lifecycle: "enabled" as const,
    configured: true,
    source: "provider" as const,
    scope: integrationScope(),
    requested: ["list_documents" as const],
    observations: [{
      capability: "list_documents" as const,
      status: "supported" as const,
    }],
    observedAt: timestamp(),
  };
}

function healthInput() {
  return {
    provider: "papermark" as const,
    environment: "local-development" as const,
    lifecycle: "enabled" as const,
    configured: true,
    scope: integrationScope(),
    checks: [{ name: "endpoint", state: "passed" as const }],
    observedAt: timestamp(),
  };
}

function timestamp(): Date {
  return new Date("2026-08-08T12:00:00.000Z");
}

function requiredId<T>(
  value: string,
  parse: (value: unknown) =>
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false },
): T {
  const result = parse(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
