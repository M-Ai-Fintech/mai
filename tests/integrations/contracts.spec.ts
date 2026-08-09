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
