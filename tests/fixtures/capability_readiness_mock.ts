import {
  capabilityDefinitions,
  type CapabilityState,
} from "../../src/api/contracts/capability_readiness.ts";

const states: readonly CapabilityState[] = [
  "enabled",
  "forbidden",
  "protected-not-found",
  "degraded",
  "deferred",
  "failed",
];
const port = Number(Deno.env.get("CAPABILITY_MOCK_PORT") ?? "18186");
let currentState: CapabilityState = "enabled";

Deno.serve({ hostname: "127.0.0.1", port }, async (request) => {
  const url = new URL(request.url);
  if (request.method === "POST" && url.pathname === "/__state") {
    const value = url.searchParams.get("value");
    if (!states.includes(value as CapabilityState)) {
      return Response.json({ error: "invalid state" }, { status: 400 });
    }
    currentState = value as CapabilityState;
    return Response.json({ state: currentState });
  }
  if (url.pathname === "/api/v1/capabilities") {
    return capabilityResponse(currentState);
  }
  if (url.pathname.endsWith("/shell")) return shellResponse();
  if (url.pathname.endsWith("/screens/command-center")) {
    return screenResponse();
  }
  return new Response("Not Found", { status: 404 });
});

function capabilityResponse(state: CapabilityState): Response {
  return envelope({
    schemaVersion: 1,
    capabilities: capabilityDefinitions.map((
      { family, name, ownerAction },
    ) => ({
      family,
      name,
      state: family === "command-center" ? state : "deferred",
      detail: detailFor(state, name),
      action: family === "command-center" ? actionFor(state) : ownerAction,
    })),
  });
}

function detailFor(state: CapabilityState, name: string): string {
  if (state === "enabled") {
    return `${name} has an executable v1 dependency chain.`;
  }
  if (state === "forbidden") {
    return "You do not have permission to use this capability.";
  }
  if (state === "protected-not-found") {
    return "The protected capability was not found or is not visible.";
  }
  if (state === "degraded") return "The capability is temporarily degraded.";
  if (state === "deferred") {
    return "No executable capability contract is published yet.";
  }
  return "The capability failed to load safely.";
}

function actionFor(state: CapabilityState): string {
  if (state === "enabled") return "Open the capability.";
  if (state === "forbidden") return "Request the required permission.";
  if (state === "protected-not-found") {
    return "Return to an authorized workspace.";
  }
  if (state === "degraded") return "Retry when the service recovers.";
  if (state === "deferred") return "Compose the live work queue API.";
  return "Restore the capability contract and retry.";
}

function shellResponse(): Response {
  return envelope({
    organization: {
      id: "workspace_demo",
      name: "Capability evidence workspace",
    },
    deal: {
      id: "deal_demo",
      name: "Capability evidence transaction",
      phase: "review",
    },
    permissions: ["workspace", "deal"],
    counts: { tasks: 2, approvals: 1, notifications: 0 },
  });
}

function screenResponse(): Response {
  return envelope({
    family: "command-center",
    items: [{
      id: "priority_review",
      title: "Review readiness evidence",
      summary: "Executable screen data loaded through the v1 adapter.",
      status: "ready",
    }],
  });
}

function envelope(data: unknown): Response {
  return Response.json({
    data,
    meta: { correlationId: "cor_not_rendered", freshness: "current" },
  });
}
