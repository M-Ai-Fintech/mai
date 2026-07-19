export type DashboardRouteNotice = "deal-archived" | "phase-transitioned";

export interface DashboardRouteState {
  createDeal: boolean;
  notice: DashboardRouteNotice | null;
}

export function parseDashboardRouteState(search: string): DashboardRouteState {
  const parameters = new URLSearchParams(search);
  const notice = parameters.get("notice");

  return {
    createDeal: parameters.get("create") === "deal",
    notice: notice === "deal-archived" || notice === "phase-transitioned"
      ? notice
      : null,
  };
}
