import type { DropdownOption } from "@/components/Dropdown/Dropdown";
import {
  type DashboardPhase,
  PHASE_LABELS,
} from "../../components/screens/dashboard/dashboard-model";
import type { DealListQuery, DealSummary } from "@/lib/api-client";

export type DealStatus = "active" | "archived" | "completed";

export interface DealListFilters {
  search: string;
  phase: "all" | DashboardPhase;
  status: "all" | DealStatus;
  assigneeId: string;
}

export const DEAL_PHASE_OPTIONS: DropdownOption[] = [
  { value: "all", label: "All phases" },
  ...Object.entries(PHASE_LABELS).map(([value, label]) => ({ value, label })),
];

export const DEAL_STATUS_OPTIONS: DropdownOption[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function buildDealListQuery(
  filters: DealListFilters,
  page: number,
  pageSize: number,
): DealListQuery {
  return {
    page,
    pageSize,
    search: filters.search || undefined,
    phase: filters.phase === "all" ? undefined : filters.phase,
    status: filters.status === "all" ? undefined : filters.status,
    assigneeId: filters.assigneeId === "all" ? undefined : filters.assigneeId,
    sort: "-updatedAt",
  };
}

export function collectVisibleAdvisors(deals: DealSummary[]) {
  const advisors = new Map<string, NonNullable<DealSummary["leadAdvisor"]>>();
  deals.forEach((deal) => {
    if (deal.leadAdvisor) advisors.set(deal.leadAdvisor.id, deal.leadAdvisor);
  });
  return Array.from(advisors.values());
}

export function hasActiveDealFilters(
  filters: DealListFilters,
  defaultStatus: "all" | DealStatus,
) {
  return Boolean(
    filters.search ||
      filters.phase !== "all" ||
      filters.status !== defaultStatus ||
      filters.assigneeId !== "all",
  );
}

export function keepLoadedSelection(
  selectedIds: string[],
  loadedDeals: DealSummary[],
) {
  const loadedIds = new Set(loadedDeals.map((deal) => deal.id));
  return selectedIds.filter((id) => loadedIds.has(id));
}

export function phaseBadgeVariant(phase: DashboardPhase) {
  return phase === "due_diligence" || phase === "negotiation"
    ? "orange" as const
    : "default" as const;
}
