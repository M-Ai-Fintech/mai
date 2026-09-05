export const capabilityFamilies = [
  "application-shell",
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
  "deal-overview",
  "target-dossier",
  "documents-vdr",
  "diligence-decision-room",
  "valuation-lab",
  "matching-universe",
  "negotiation-room",
  "closing-control-room",
  "agentic-workspace",
  "deal-activity-audit",
  "deal-team-access",
  "deliverables-exports",
  "deal-settings-archive",
] as const;

export const capabilityStates = [
  "enabled",
  "forbidden",
  "protected-not-found",
  "degraded",
  "deferred",
  "failed",
] as const;

export type CapabilityFamily = (typeof capabilityFamilies)[number];
export type CapabilityState = (typeof capabilityStates)[number];

export interface CapabilityDefinition {
  readonly family: CapabilityFamily;
  readonly name: string;
  readonly ownerAction: string;
}

export interface CapabilityReadiness {
  readonly family: CapabilityFamily;
  readonly name: string;
  readonly state: CapabilityState;
  readonly detail: string;
  readonly action: string;
}

export interface CapabilityReadinessSnapshot {
  readonly schemaVersion: 1;
  readonly capabilities: readonly CapabilityReadiness[];
}

export const capabilityDefinitions: readonly CapabilityDefinition[] = [
  define(
    "application-shell",
    "Workspace shell",
    "Start the authenticated workspace API.",
  ),
  define(
    "command-center",
    "Command Center",
    "Compose the live work queue API.",
  ),
  define(
    "deals-portfolio",
    "Deals Portfolio",
    "Start the Deal Management API.",
  ),
  define("new-deal-setup", "New Deal Setup", "Start the Deal Management API."),
  define(
    "tasks-approvals",
    "Tasks and Approvals",
    "Compose Work Management in the executable API.",
  ),
  define(
    "notification-center",
    "Notification Center",
    "Compose Notifications in the executable API.",
  ),
  define(
    "global-search",
    "Global Search",
    "Compose protected cross-context search.",
  ),
  define(
    "organizations",
    "Organizations",
    "Compose Organization Registry in the executable API.",
  ),
  define(
    "organization-detail",
    "Organization Detail",
    "Compose Organization Registry in the executable API.",
  ),
  define(
    "team-workspace",
    "Team Workspace",
    "Compose Identity Access in the executable API.",
  ),
  define(
    "settings-family",
    "Administration Settings",
    "Compose policy and integration settings.",
  ),
  define(
    "external-participant",
    "External Participant Portal",
    "Compose restricted external access.",
  ),
  define("deal-overview", "Deal Overview", "Start the Deal Management API."),
  define(
    "target-dossier",
    "Target Dossier",
    "Compose Evidence Knowledge in the executable API.",
  ),
  define(
    "documents-vdr",
    "Documents and VDR",
    "Compose Documents in the executable API.",
  ),
  define(
    "diligence-decision-room",
    "Diligence Decision Room",
    "Compose the diligence decision API.",
  ),
  define(
    "valuation-lab",
    "Valuation Lab",
    "Compose Valuation in the executable API.",
  ),
  define(
    "matching-universe",
    "Matching Universe",
    "Compose Matching in the executable API.",
  ),
  define(
    "negotiation-room",
    "Negotiation Room",
    "Restore the Negotiation composition and retry.",
  ),
  define(
    "closing-control-room",
    "Closing Control Room",
    "Compose Closing in the executable API.",
  ),
  define(
    "agentic-workspace",
    "Agentic Workspace",
    "Compose governed Agent Runtime in the executable API.",
  ),
  define(
    "deal-activity-audit",
    "Deal Activity and Audit",
    "Compose the scoped audit read model.",
  ),
  define(
    "deal-team-access",
    "Deal Team Access",
    "Compose Deal Team access administration.",
  ),
  define(
    "deliverables-exports",
    "Deliverables and Exports",
    "Compose Deliverables in the executable API.",
  ),
  define(
    "deal-settings-archive",
    "Deal Settings",
    "Compose Deal Governance in the executable API.",
  ),
];

function define(
  family: CapabilityFamily,
  name: string,
  ownerAction: string,
): CapabilityDefinition {
  return { family, name, ownerAction };
}
