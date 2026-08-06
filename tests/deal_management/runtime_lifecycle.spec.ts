import { assertEquals, assertRejects } from "@std/assert";
import pg from "pg";
import { createApiServer } from "../../src/api/server.ts";
import {
  createOperatorRuntime,
  type OperatorRuntimeDependencies,
} from "../../scripts/deal_reconciliation_runtime.ts";
import {
  createDealManagementComposition,
  loadDealManagementEnvironment,
} from "../../src/deal_management/composition.ts";
import { createPool } from "../../src/deal_management/composition_support.ts";
import {
  actorId,
  FakeAuthenticationPort,
  tenantId,
  userIdentityId,
  workspaceId,
} from "../../src/identity_access/v1.ts";
import type { DealAuthorizationPort } from "../../src/deal_management/contracts.ts";
import type { ReconciliationRuntimeModule } from "../../scripts/deal_reconciliation.ts";

class NamedPoolFake {
  endCalls = 0;

  end(): Promise<void> {
    this.endCalls += 1;
    return Promise.resolve();
  }
}

class FailingOperatorAuthentication {
  authenticate(): Promise<never> {
    return Promise.reject(new Error("operator authentication failed"));
  }
}

class RecordingOperatorAuthorization {
  calls = 0;

  assertOperatorScope(): Promise<void> {
    this.calls += 1;
    return Promise.resolve();
  }
}

const authorization: DealAuthorizationPort = {
  authorize: () => ({
    outcome: "deny",
    reasonCode: "NO_MATCHING_GRANT",
    allowedActions: [],
    approvedScope: undefined as never,
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
  }),
};

function runtimePrincipal() {
  return {
    actor: {
      id: actorId("actor_runtime"),
      kind: "human" as const,
      state: "active" as const,
    },
    sessionId: "session_runtime" as never,
    identityId: userIdentityId("identity_runtime"),
    tenantId: tenantId("tenant_runtime"),
    workspaceId: workspaceId("workspace_runtime"),
  };
}

function compositionConfig(
  pool: NamedPoolFake,
  ownership?: "owned" | "borrowed",
) {
  return {
    pool: pool as unknown as pg.Pool,
    ...(ownership === undefined ? {} : { poolOwnership: ownership }),
    authentication: new FakeAuthenticationPort(runtimePrincipal()),
    authorization,
  };
}

function runtimeInput(): Parameters<
  ReconciliationRuntimeModule["createRuntime"]
>[0] {
  return {
    scope: {
      tenantId: tenantId("tenant_runtime"),
      workspaceId: workspaceId("workspace_runtime"),
    },
    actorId: actorId("actor_runtime"),
    correlationId: "cor_runtime" as never,
    now: "2026-08-03T12:00:00.000Z",
  };
}

function runtimeDependencies(
  authentication: OperatorRuntimeDependencies["authentication"],
): OperatorRuntimeDependencies {
  return {
    authentication,
    authorization: new RecordingOperatorAuthorization(),
  };
}

Deno.test("runtime reads only approved explicit environment values", () => {
  const result = loadDealManagementEnvironment({
    environment: {
      DATABASE_URL: "postgresql://user:secret@localhost/mai",
      POSTGRES_INTEGRATION_TEST_DATABASE_URL:
        "postgresql://other:secret@localhost/mai_test_postgres_integration",
      UNAPPROVED_SECRET: "must-not-be-read",
    },
    authentication: new FakeAuthenticationPort(runtimePrincipal()),
    authorization,
  });
  assertEquals(result.kind, "configured");
});

Deno.test("missing and malformed database configuration fail safely", () => {
  const missing = loadDealManagementEnvironment({ environment: {} });
  assertEquals(missing, {
    kind: "unavailable",
    reason: "missing_configuration",
    message:
      "Deal Management database configuration is missing; expected DATABASE_URL.",
  });
  const testOnly = loadDealManagementEnvironment({
    environment: {
      POSTGRES_INTEGRATION_TEST_DATABASE_URL:
        "postgresql://user:secret@localhost/mai_test_postgres_integration",
    },
  });
  assertEquals(testOnly, {
    kind: "unavailable",
    reason: "missing_configuration",
    message:
      "Deal Management database configuration is missing; expected DATABASE_URL.",
  });
  const secret = "postgresql://user:super-secret@localhost";
  const malformed = loadDealManagementEnvironment({
    environment: { DATABASE_URL: secret },
    authentication: new FakeAuthenticationPort(runtimePrincipal()),
    authorization,
  });
  assertEquals(malformed.kind, "unavailable");
  if (malformed.kind === "unavailable") {
    assertEquals(malformed.reason, "invalid_configuration");
    assertEquals(malformed.message.includes("super-secret"), false);
    assertEquals(malformed.message.includes("user"), false);
  }
  const injected = new NamedPoolFake();
  const poolResult = createPool(compositionConfig(injected));
  assertEquals(poolResult.kind, "configured");
  if (poolResult.kind === "configured") {
    assertEquals(poolResult.ownership, "borrowed");
  }
});

Deno.test("borrowed pools survive repeated composition cleanup", async () => {
  const pool = new NamedPoolFake();
  const result = createDealManagementComposition(compositionConfig(pool));
  if (result.kind !== "configured") {
    throw new Error("expected configured composition");
  }
  await result.composition.close();
  await result.composition.close();
  assertEquals(pool.endCalls, 0);
});

Deno.test("owned pools close exactly once", async () => {
  const pool = new NamedPoolFake();
  const result = createDealManagementComposition(
    compositionConfig(pool, "owned"),
  );
  if (result.kind !== "configured") {
    throw new Error("expected configured composition");
  }
  await result.composition.close();
  await result.composition.close();
  assertEquals(pool.endCalls, 1);
});

Deno.test("operator authentication failure closes an owned pool exactly once", async () => {
  const pool = new NamedPoolFake();
  const result = createDealManagementComposition(
    compositionConfig(pool, "owned"),
  );
  if (result.kind !== "configured") {
    throw new Error("expected configured composition");
  }
  await assertRejects(
    () =>
      createOperatorRuntime(
        runtimeInput(),
        result.composition,
        "operator-proof",
        runtimeDependencies(new FailingOperatorAuthentication()),
      ),
    Error,
    "operator authentication failed",
  );
  assertEquals(pool.endCalls, 1);
});

Deno.test("successful operator cleanup closes owned resources once", async () => {
  const pool = new NamedPoolFake();
  const result = createDealManagementComposition(
    compositionConfig(pool, "owned"),
  );
  if (result.kind !== "configured") {
    throw new Error("expected configured composition");
  }
  const runtime = await createOperatorRuntime(
    runtimeInput(),
    result.composition,
    "operator-proof",
    runtimeDependencies(new FakeAuthenticationPort(runtimePrincipal())),
  );
  assertEquals(runtime.commandContext.request.sessionId, "session_runtime");
  assertEquals(runtime.commandContext.request.identityId, "identity_runtime");
  await runtime.close();
  await runtime.close();
  assertEquals(pool.endCalls, 1);
});

Deno.test("server and operator runtime use the same explicit composition pool", async () => {
  const pool = new NamedPoolFake();
  const result = createDealManagementComposition(compositionConfig(pool));
  if (result.kind !== "configured") {
    throw new Error("expected configured composition");
  }
  const router = createApiServer({ dealManagement: result.composition });
  const repositoryPool =
    (router.repository as unknown as { pool: pg.Pool }).pool;
  assertEquals(repositoryPool, pool as unknown as pg.Pool);
  const runtime = await createOperatorRuntime(
    runtimeInput(),
    result.composition,
    "operator-proof",
    runtimeDependencies(new FakeAuthenticationPort(runtimePrincipal())),
  );
  await runtime.close();
  assertEquals(pool.endCalls, 0);
});
