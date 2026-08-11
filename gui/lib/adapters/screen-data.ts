import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import {
  isDealExecutionFamily,
  readDealExecutionFamily,
} from "./deal-execution/adapter";
import {
  isDealIntelligenceFamily,
  readDealIntelligenceFamily,
} from "./deal-intelligence/adapter";
import { type GlobalFamily, readGlobalFamily } from "./global/adapter";
import { type AdapterFamily } from "./catalog";
import type { AdapterReadModel, AdapterResult } from "./contracts";
import { unavailableAdapterResult } from "./states";

export type ScreenPreviousAdapter = () => Promise<
  AdapterResult<AdapterReadModel>
>;
export type ScreenPreviousAdapters = Partial<
  Record<AdapterFamily, ScreenPreviousAdapter>
>;

export interface ScreenAdapterOptions {
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly previousAdapters?: ScreenPreviousAdapters;
  readonly routeParameters?: Readonly<Record<string, string>>;
  readonly headers?: HeadersInit;
}

export async function readScreenAdapter(
  resolution: ReadyRouteResolution,
  options: ScreenAdapterOptions = {},
): Promise<AdapterResult<AdapterReadModel>> {
  const family = adapterFamilyForRoute(resolution.route.id);
  if (family === undefined) {
    return unavailableAdapterResult(
      "SCREEN_ADAPTER_UNAVAILABLE",
      `No v1 adapter is mapped for route ${resolution.route.id}.`,
    );
  }
  const readOptions = {
    environment: options.environment,
    routeParameters: {
      ...resolution.routeParameters,
      ...options.routeParameters,
    },
    headers: options.headers,
  };
  const previousAdapter = options.previousAdapters?.[family];
  if (isGlobalFamily(family)) {
    return readGlobalFamily(family, readOptions, previousAdapter);
  }
  if (isDealIntelligenceFamily(family)) {
    return readDealIntelligenceFamily(family, readOptions, previousAdapter);
  }
  if (isDealExecutionFamily(family)) {
    return readDealExecutionFamily(family, readOptions, previousAdapter);
  }
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
  const familyByRoute: Readonly<Record<string, GlobalFamily>> = {
    home: "command-center",
    deals: "deals-portfolio",
    "new-deal": "new-deal-setup",
    tasks: "tasks-approvals",
    approvals: "tasks-approvals",
    notifications: "notification-center",
    search: "global-search",
    organizations: "organizations",
    "organization-detail": "organization-detail",
    team: "team-workspace",
  };
  const family = familyByRoute[suffix];
  return family !== undefined && isGlobalFamily(family) ? family : undefined;
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
