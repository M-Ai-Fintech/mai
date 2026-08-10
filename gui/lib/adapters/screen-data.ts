import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import {
  readDealExecutionFamily,
  isDealExecutionFamily,
} from "./deal-execution/adapter";
import {
  isDealIntelligenceFamily,
  readDealIntelligenceFamily,
} from "./deal-intelligence/adapter";
import { readGlobalFamily, type GlobalFamily } from "./global/adapter";
import { type AdapterFamily } from "./catalog";
import type { AdapterReadModel, AdapterResult } from "./contracts";
import { unavailableAdapterResult } from "./states";

export async function readScreenAdapter(
  resolution: ReadyRouteResolution,
): Promise<AdapterResult<AdapterReadModel>> {
  const family = adapterFamilyForRoute(resolution.route.id);
  if (family === undefined) {
    return unavailableAdapterResult(
      "SCREEN_ADAPTER_UNAVAILABLE",
      `No v1 adapter is mapped for route ${resolution.route.id}.`,
    );
  }
  const options = { routeParameters: resolution.routeParameters };
  if (isGlobalFamily(family)) return readGlobalFamily(family, options);
  if (isDealIntelligenceFamily(family)) {
    return readDealIntelligenceFamily(family, options);
  }
  if (isDealExecutionFamily(family)) return readDealExecutionFamily(family, options);
  return unavailableAdapterResult(
    "SCREEN_ADAPTER_UNAVAILABLE",
    `The adapter family ${family} has no screen integration.`,
  );
}

function adapterFamilyForRoute(routeId: string): AdapterFamily | undefined {
  if (routeId.startsWith("administration.")) return "settings-family";
  if (routeId.startsWith("external.")) return "external-participant";
  if (routeId.startsWith("global.")) {
    return globalFamilyForRoute(routeId);
  }
  if (!routeId.startsWith("deal.")) return undefined;
  const suffix = routeId.slice("deal.".length);
  const dealFamilies: Readonly<Record<string, AdapterFamily>> = {
    overview: "deal-overview",
    dossier: "target-dossier",
    documents: "documents-vdr",
    diligence: "diligence-decision-room",
    valuation: "valuation-lab",
    matching: "matching-universe",
    negotiation: "negotiation-room",
    closing: "closing-control-room",
    workspace: "agentic-workspace",
    activity: "deal-activity-audit",
    team: "deal-team-access",
    deliverables: "deliverables-exports",
    settings: "deal-settings-archive",
  };
  return dealFamilies[suffix];
}

function globalFamilyForRoute(routeId: string): GlobalFamily | undefined {
  const suffix = routeId.slice("global.".length);
  const family = suffix === "home" ? "command-center" : suffix;
  return isGlobalFamily(family) ? family : undefined;
}

function isGlobalFamily(value: string): value is GlobalFamily {
  return [
    "command-center",
    "deals-portfolio",
    "new-deal-setup",
    "tasks-approvals",
    "notification-center",
    "global-search",
    "organizations",
    "organization-detail",
    "team-workspace",
    "settings-family",
    "external-participant",
  ].includes(value);
}
