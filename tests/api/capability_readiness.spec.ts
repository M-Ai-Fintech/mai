import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import {
  capabilityReadinessSnapshot,
  type ExecutableCapabilityDependencies,
} from "../../src/api/capability_readiness.ts";
import {
  capabilityFamilies,
  capabilityStates,
} from "../../src/api/contracts/capability_readiness.ts";
import { createApiServer } from "../../src/api/server.ts";

const unavailableDependencies: ExecutableCapabilityDependencies = {
  workspaceShell: false,
  demoReadiness: false,
  dealManagement: false,
  workManagement: false,
  notifications: false,
  evidenceKnowledge: false,
  documents: false,
  valuation: false,
  matching: false,
  negotiation: false,
  closing: false,
  deliverables: false,
  governance: false,
};

Deno.test("capability readiness enumerates every approved family exactly once", () => {
  const snapshot = capabilityReadinessSnapshot({
    dependencies: unavailableDependencies,
    acceptingTraffic: true,
  });

  assertEquals(snapshot.capabilities.length, 25);
  assertEquals(
    new Set(snapshot.capabilities.map(({ family }) => family)),
    new Set(capabilityFamilies),
  );
  for (const readiness of snapshot.capabilities) {
    assertEquals(capabilityStates.includes(readiness.state), true);
    assertMatch(readiness.name, /\S/);
    assertMatch(readiness.action, /\S/);
  }
});

Deno.test("enabled requires a published end-to-end contract", () => {
  const dependencies = {
    ...unavailableDependencies,
    workspaceShell: true,
    dealManagement: true,
  };
  const enabled = capabilityReadinessSnapshot({
    dependencies,
    acceptingTraffic: true,
  });
  const degraded = capabilityReadinessSnapshot({
    dependencies,
    acceptingTraffic: false,
  });

  assertEquals(stateFor(enabled, "application-shell"), "enabled");
  assertEquals(stateFor(enabled, "deal-overview"), "deferred");
  assertEquals(stateFor(enabled, "command-center"), "deferred");
  assertEquals(stateFor(degraded, "application-shell"), "degraded");
});

Deno.test("explicit demo composition publishes only its executable screens", () => {
  const snapshot = capabilityReadinessSnapshot({
    dependencies: { ...unavailableDependencies, demoReadiness: true },
    acceptingTraffic: true,
  });

  assertEquals(stateFor(snapshot, "command-center"), "enabled");
  assertEquals(stateFor(snapshot, "negotiation-room"), "enabled");
  assertEquals(stateFor(snapshot, "new-deal-setup"), "deferred");
});

Deno.test("composition failure stays distinct from deferred capability", () => {
  const snapshot = capabilityReadinessSnapshot({
    dependencies: unavailableDependencies,
    acceptingTraffic: true,
    failedFamilies: { "negotiation-room": true },
  });

  assertEquals(stateFor(snapshot, "negotiation-room"), "failed");
  assertEquals(stateFor(snapshot, "closing-control-room"), "deferred");
});

Deno.test("capability probe remains available while the API is degraded", async () => {
  const response = await createApiServer({
    capabilityFailures: { "negotiation-room": true },
  }).handle(
    new Request("http://localhost/api/v1/capabilities", {
      headers: { "X-Correlation-Id": "cor_capability-probe" },
    }),
  );
  const payload = await response.json();
  const serialized = JSON.stringify(payload.data);

  assertEquals(response.status, 200);
  assertEquals(payload.data.schemaVersion, 1);
  assertEquals(payload.data.capabilities.length, 25);
  assertEquals(
    payload.data.capabilities.find(
      ({ family }: { family: string }) => family === "negotiation-room",
    ).state,
    "failed",
  );
  assertNotMatch(serialized, /cor_[a-z0-9_-]+/i);
  assertNotMatch(serialized, /\b[0-9a-f]{24,}\b/i);
});

function stateFor(
  snapshot: ReturnType<typeof capabilityReadinessSnapshot>,
  family: (typeof capabilityFamilies)[number],
): string | undefined {
  return snapshot.capabilities.find((item) => item.family === family)?.state;
}
