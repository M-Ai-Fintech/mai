"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Icon } from "@/components/Icon/Icon";
import { Input } from "@/components/Input/Input";
import { Tabs } from "@/components/Tabs/Tabs";
import { Toast } from "@/components/Toast/Toast";
import type {
  DashboardPhase,
  DashboardToast,
} from "@/components/screens/dashboard/dashboard-model";
import { parseDashboardRouteState } from "@/components/screens/dashboard/dashboard-route-state";
import { ApiClient, type DealSummary } from "@/lib/api-client";
import {
  DEAL_PHASE_OPTIONS,
  DEAL_STATUS_OPTIONS,
  type DealStatus,
} from "./deal-list-model";
import {
  ArchiveDealModal,
  DealsLoadError,
  DealsLoadingTable,
  DealsTable,
} from "./deals-table";
import { useDealList } from "./use-deal-list";

export function DealsPageClient() {
  const router = useRouter();
  const list = useDealList({
    defaultStatus: "all",
    initialPageSize: 10,
    loadErrorMessage: "Deals could not be loaded.",
  });
  const [toast, setToast] = useState<DashboardToast | null>(null);
  const archive = useDealArchiveAction(list.loadDeals, setToast);
  useDealsRouteNotice(router.replace, setToast);
  return (
    <DealsPageContent
      archive={archive}
      list={list}
      routerPush={router.push}
      toast={toast}
      setToast={setToast}
    />
  );
}

interface DealsPageContentProps {
  archive: ReturnType<typeof useDealArchiveAction>;
  list: ReturnType<typeof useDealList>;
  routerPush: ReturnType<typeof useRouter>["push"];
  toast: DashboardToast | null;
  setToast: (toast: DashboardToast | null) => void;
}

function DealsPageContent(props: DealsPageContentProps) {
  const createDeal = () => props.routerPush("/?create=deal");
  return (
    <div className="space-y-8 p-8">
      <DealsHeader />
      <DealsFilters
        list={props.list}
        routerPush={(path) => props.routerPush(path)}
      />
      <DealsMain
        list={props.list}
        onArchive={props.archive.openArchive}
        onCreate={createDeal}
      />
      <DealsPageOverlays {...props} />
    </div>
  );
}

function DealsPageOverlays(props: {
  archive: ReturnType<typeof useDealArchiveAction>;
  toast: DashboardToast | null;
  setToast: (toast: DashboardToast | null) => void;
}) {
  return (
    <>
      <DealsArchiveModal archive={props.archive} />
      <DealsToast toast={props.toast} onClose={() => props.setToast(null)} />
    </>
  );
}

function useDealArchiveAction(
  loadDeals: () => Promise<void>,
  setToast: (toast: DashboardToast | null) => void,
) {
  const state = useDealArchiveState();
  const openArchive = useOpenArchiveAction(
    state.setArchiveError,
    state.setArchiveTarget,
  );
  const confirmArchive = useConfirmListArchiveAction({
    archiveTarget: state.archiveTarget,
    loadDeals,
    setArchiveError: state.setArchiveError,
    setArchiveTarget: state.setArchiveTarget,
    setArchiving: state.setArchiving,
    setToast,
  });
  return dealArchiveController(state, openArchive, confirmArchive);
}

function dealArchiveController(
  state: ReturnType<typeof useDealArchiveState>,
  openArchive: (deal: DealSummary) => void,
  confirmArchive: () => Promise<void>,
) {
  return {
    archiveError: state.archiveError,
    archiveTarget: state.archiveTarget,
    archiving: state.archiving,
    closeArchive: () => state.setArchiveTarget(null),
    confirmArchive,
    openArchive,
  };
}

function useDealArchiveState() {
  const [archiveTarget, setArchiveTarget] = useState<DealSummary | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  return {
    archiveError,
    archiveTarget,
    archiving,
    setArchiveError,
    setArchiveTarget,
    setArchiving,
  };
}

function useOpenArchiveAction(
  setArchiveError: (error: string | null) => void,
  setArchiveTarget: (deal: DealSummary | null) => void,
) {
  return (deal: DealSummary) => {
    setArchiveError(null);
    setArchiveTarget(deal);
  };
}

function useConfirmListArchiveAction(props: {
  archiveTarget: DealSummary | null;
  loadDeals: () => Promise<void>;
  setArchiveError: (error: string | null) => void;
  setArchiveTarget: (deal: DealSummary | null) => void;
  setArchiving: (archiving: boolean) => void;
  setToast: (toast: DashboardToast | null) => void;
}) {
  return async () => {
    if (!props.archiveTarget) return;
    const archived = await archiveDeal(props.archiveTarget, props);
    if (archived) props.setArchiveTarget(null);
  };
}

function useDealsRouteNotice(
  replaceRoute: ReturnType<typeof useRouter>["replace"],
  setToast: (toast: DashboardToast | null) => void,
) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const routeState = parseDashboardRouteState(window.location.search);
      if (routeState.notice !== "deal-archived") return;
      setToast(dealArchivedToast("The deal"));
      replaceRoute("/deals", { scroll: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [replaceRoute, setToast]);
}

type ListArchiveActions = Omit<
  Parameters<typeof useConfirmListArchiveAction>[0],
  "archiveTarget"
>;

async function archiveDeal(deal: DealSummary, actions: ListArchiveActions) {
  actions.setArchiving(true);
  actions.setArchiveError(null);
  try {
    await ApiClient.archiveDeal(deal.id, deal.version);
    actions.setToast(dealArchivedToast(deal.title));
    await actions.loadDeals();
    return true;
  } catch (cause) {
    setDealArchiveError(cause, actions.setArchiveError, actions.setToast);
    return false;
  } finally {
    actions.setArchiving(false);
  }
}

function dealArchivedToast(subject: string): DashboardToast {
  return {
    title: "Deal archived",
    message: `${subject} was archived reversibly.`,
    variant: "success",
  };
}

function setDealArchiveError(
  cause: unknown,
  setArchiveError: (error: string | null) => void,
  setToast: (toast: DashboardToast | null) => void,
) {
  const message = cause instanceof Error
    ? cause.message
    : "The deal could not be archived.";
  setArchiveError(message);
  setToast({ title: "Deal not archived", message, variant: "error" });
}

function DealsArchiveModal(
  { archive }: { archive: ReturnType<typeof useDealArchiveAction> },
) {
  return (
    <ArchiveDealModal
      archiveError={archive.archiveError}
      archiveTarget={archive.archiveTarget}
      archiving={archive.archiving}
      onClose={archive.closeArchive}
      onConfirm={() => void archive.confirmArchive()}
    />
  );
}

function DealsToast(
  { toast, onClose }: { toast: DashboardToast | null; onClose: () => void },
) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <Toast {...toast} onClose={onClose} />
    </div>
  );
}

function DealsHeader() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-signal-orange">
          Executive pipeline
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-black">
          M&amp;A Pipeline
        </h1>
        <p className="mt-1 text-sm text-slate-gray">
          Review every mandate in one high-density financial table.
        </p>
      </div>
      <Link href="/?create=deal">
        <Button variant="primary">Create deal</Button>
      </Link>
    </header>
  );
}

function DealsFilters(
  { list, routerPush }: {
    list: ReturnType<typeof useDealList>;
    routerPush: (path: string) => void;
  },
) {
  return (
    <Card variant="default" padding="sm" className="overflow-visible">
      <div className="flex flex-wrap items-center gap-6">
        <DealsViewTabs total={list.total} routerPush={routerPush} />
        <DealsFilterGrid list={list} />
        <DealsResetFilters list={list} />
      </div>
    </Card>
  );
}

function DealsViewTabs(
  { total, routerPush }: { total: number; routerPush: (path: string) => void },
) {
  return (
    <Tabs
      activeTab="table"
      tabs={[{ id: "board", label: "Board" }, {
        id: "table",
        label: "Table",
        count: total,
      }]}
      onChange={(next) => next === "board" && routerPush("/")}
    />
  );
}

function DealsFilterGrid({ list }: { list: ReturnType<typeof useDealList> }) {
  return (
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <DealsSearchFilter list={list} />
      <DealsPhaseFilter list={list} />
      <DealsStatusFilter list={list} />
      <DealsAdvisorFilter list={list} />
    </div>
  );
}

function DealsSearchFilter({ list }: { list: ReturnType<typeof useDealList> }) {
  return (
    <Input
      variant="pill"
      icon={<Icon name="search" size="sm" />}
      value={list.searchDraft}
      onChange={(event) => list.setSearchDraft(event.target.value)}
      placeholder="Search deals"
      aria-label="Search deals"
      disabled={list.loading}
    />
  );
}

function DealsPhaseFilter({ list }: { list: ReturnType<typeof useDealList> }) {
  return (
    <Dropdown
      value={list.phase}
      options={DEAL_PHASE_OPTIONS}
      onChange={(value) => updateDealsPhase(list, singleValue(value))}
      disabled={list.loading}
    />
  );
}

function DealsStatusFilter({ list }: { list: ReturnType<typeof useDealList> }) {
  return (
    <Dropdown
      value={list.status}
      options={DEAL_STATUS_OPTIONS}
      onChange={(value) => updateDealsStatus(list, singleValue(value))}
      disabled={list.loading}
    />
  );
}

function DealsAdvisorFilter(
  { list }: { list: ReturnType<typeof useDealList> },
) {
  return (
    <Dropdown
      searchable
      value={list.assigneeId}
      options={[
        { value: "all", label: "All assignees" },
        ...list.advisors.map((advisor) => ({
          value: advisor.id,
          label: advisor.displayName,
        })),
      ]}
      onChange={(value) => updateDealsAssignee(list, singleValue(value))}
      disabled={list.loading}
    />
  );
}

function DealsResetFilters({ list }: { list: ReturnType<typeof useDealList> }) {
  if (!list.filtersActive) return null;
  return (
    <Button variant="secondary" size="sm" onClick={list.resetFilters}>
      Reset filters
    </Button>
  );
}

function singleValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function updateDealsPhase(list: ReturnType<typeof useDealList>, value: string) {
  list.setPhase(value as "all" | DashboardPhase);
  list.setPage(1);
}

function updateDealsStatus(
  list: ReturnType<typeof useDealList>,
  value: string,
) {
  list.setStatus(value as "all" | DealStatus);
  list.setPage(1);
}

function updateDealsAssignee(
  list: ReturnType<typeof useDealList>,
  value: string,
) {
  list.setAssigneeId(value);
  list.setPage(1);
}

interface DealsMainProps {
  list: ReturnType<typeof useDealList>;
  onArchive: (deal: DealSummary) => void;
  onCreate: () => void;
}

function DealsMain({ list, onArchive, onCreate }: DealsMainProps) {
  if (list.loading) return <DealsLoadingTable />;
  if (list.error) {
    return (
      <DealsLoadError
        error={list.error}
        onRetry={() => void list.loadDeals()}
      />
    );
  }
  if (list.deals.length === 0) {
    return <DealsEmpty list={list} onCreate={onCreate} />;
  }
  return <DealsTableView list={list} onArchive={onArchive} />;
}

function DealsEmpty(
  { list, onCreate }: {
    list: ReturnType<typeof useDealList>;
    onCreate: () => void;
  },
) {
  const filtersActive = list.filtersActive;
  return (
    <EmptyState
      title={filtersActive ? "No matching deals" : "No deals yet"}
      description={filtersActive
        ? "No deals match the selected filters."
        : "Create the first deal to start the M&A pipeline."}
      actionLabel={filtersActive ? "Reset filters" : "Create deal"}
      onAction={filtersActive ? list.resetFilters : onCreate}
      icon={<Icon name={filtersActive ? "filter" : "fileText"} size="lg" />}
    />
  );
}

function DealsTableView(
  { list, onArchive }: {
    list: ReturnType<typeof useDealList>;
    onArchive: (deal: DealSummary) => void;
  },
) {
  const onPageSizeChange = (next: number) => updateDealsPageSize(list, next);
  const tableProps = dealsTableProps(list, onArchive, onPageSizeChange);
  return <DealsTable {...tableProps} />;
}

function dealsTableProps(
  list: ReturnType<typeof useDealList>,
  onArchive: (deal: DealSummary) => void,
  onPageSizeChange: (next: number) => void,
) {
  return {
    allVisibleSelected: list.allVisibleSelected,
    deals: list.deals,
    page: list.page,
    pageSize: list.pageSize,
    selectedIds: list.selectedIds,
    total: list.total,
    totalPages: list.totalPages,
    onArchive,
    onPageChange: list.setPage,
    onPageSizeChange,
    onSelectionChange: list.setSelectedIds,
  };
}

function updateDealsPageSize(
  list: ReturnType<typeof useDealList>,
  next: number,
) {
  list.setPageSize(next);
  list.setPage(1);
}
