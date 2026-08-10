import type { AdapterReadModel, AdapterResult } from "@/lib/adapters/contracts";
import type { Permission } from "@/lib/shell/route-registry";

export type ScreenState =
  | "default"
  | "loading"
  | "empty"
  | "partial-failure"
  | "restricted"
  | "unavailable"
  | "stale"
  | "sensitive"
  | "long-content";
export type ScreenDataSource = "fixture" | "v1";

export function screenStateForAdapter(
  adapter: AdapterResult<AdapterReadModel> | undefined,
): ScreenState {
  if (adapter?.state === "ready") return "default";
  if (adapter?.state === "stale") return "stale";
  if (adapter === undefined || adapter.state === "previous") {
    return "unavailable";
  }
  return adapter.state;
}
export type ScreenFamily =
  | "command-center"
  | "deals-portfolio"
  | "new-deal-setup"
  | "tasks-approvals"
  | "notification-center"
  | "global-search"
  | "organizations"
  | "organization-detail"
  | "team-workspace"
  | "settings"
  | "external-participant";

export interface ScreenFixture {
  readonly disclosure:
    "Local demonstration data only — not connected to production systems.";
  readonly state: ScreenState;
  readonly family: ScreenFamily;
  readonly requiredPermission: Permission;
}

export const stateCoverage: Readonly<
  Record<ScreenFamily, readonly ScreenState[]>
> = {
  "command-center": ["default", "empty", "unavailable"],
  "deals-portfolio": [
    "default",
    "loading",
    "empty",
    "restricted",
    "long-content",
  ],
  "new-deal-setup": ["default", "sensitive"],
  "tasks-approvals": ["default", "restricted", "unavailable"],
  "notification-center": ["default", "empty", "partial-failure"],
  "global-search": [
    "default",
    "loading",
    "empty",
    "partial-failure",
    "restricted",
  ],
  organizations: ["default", "empty", "restricted"],
  "organization-detail": ["default", "restricted", "long-content"],
  "team-workspace": ["default", "sensitive", "unavailable"],
  settings: ["default", "restricted", "sensitive"],
  "external-participant": [
    "default",
    "restricted",
    "unavailable",
    "partial-failure",
    "sensitive",
  ],
};
