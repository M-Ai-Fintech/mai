"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Icon } from "@/components/Icon/Icon";
import { Input } from "@/components/Input/Input";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import {
  Table,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
} from "@/components/Table/Table";
import { Tabs } from "@/components/Tabs/Tabs";
import {
  DASHBOARD_PHASE_OPTIONS,
  DASHBOARD_PHASES,
  DASHBOARD_STATUS_OPTIONS,
  type DashboardPhase,
  type DashboardView,
  formatDashboardDate,
  formatMoneyRange,
  groupDealsByPhase,
  PHASE_LABELS,
} from "@/components/screens/dashboard/dashboard-model";
import type { DealSummary } from "@/lib/api-client";
import { type DealStatus } from "../deals/deal-list-model";
import { useDealList } from "../deals/use-deal-list";
import { DashboardSidebar, DealCard } from "./dashboard-cards";
export { DashboardHeader } from "./dashboard-header";

export function DashboardFilters(
  { list, view, onViewChange }: {
    list: ReturnType<typeof useDealList>;
    view: DashboardView;
    onViewChange: (view: DashboardView) => void;
  },
) {
  const router = useRouter();
  const onTable = () => router.push("/deals");
  return (
    <DashboardFiltersCard
      list={list}
      view={view}
      onTable={onTable}
      onViewChange={onViewChange}
    />
  );
}

interface DashboardFiltersCardProps {
  list: ReturnType<typeof useDealList>;
  view: DashboardView;
  onTable: () => void;
  onViewChange: (view: DashboardView) => void;
}

function DashboardFiltersCard(props: DashboardFiltersCardProps) {
  return (
    <Card
      variant="default"
      padding="sm"
      className="flex flex-wrap items-center justify-between gap-4 overflow-visible"
    >
      <DashboardFiltersContent
        list={props.list}
        view={props.view}
        onTable={props.onTable}
        onViewChange={props.onViewChange}
      />
    </Card>
  );
}

function DashboardFiltersContent(props: {
  list: ReturnType<typeof useDealList>;
  view: DashboardView;
  onTable: () => void;
  onViewChange: (view: DashboardView) => void;
}) {
  return (
    <>
      <DashboardViewTabs
        total={props.list.total}
        view={props.view}
        onTable={props.onTable}
        onViewChange={props.onViewChange}
      />
      <DashboardFilterGrid list={props.list} />
    </>
  );
}

function DashboardViewTabs(props: {
  total: number;
  view: DashboardView;
  onTable: () => void;
  onViewChange: (view: DashboardView) => void;
}) {
  return (
    <Tabs
      tabs={[{ id: "kanban", label: "Board", count: props.total }, {
        id: "table",
        label: "Table",
      }]}
      activeTab={props.view}
      onChange={(next) =>
        next === "table"
          ? props.onTable()
          : props.onViewChange(next as DashboardView)}
    />
  );
}

function DashboardFilterGrid(
  { list }: { list: ReturnType<typeof useDealList> },
) {
  return (
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 md:grid-cols-2 xl:max-w-[1180px] xl:grid-cols-4">
      <DashboardSearchFilter list={list} />
      <DashboardPhaseFilter list={list} />
      <DashboardStatusFilter list={list} />
      <DashboardAdvisorFilter list={list} />
    </div>
  );
}

function DashboardSearchFilter(
  { list }: { list: ReturnType<typeof useDealList> },
) {
  return (
    <Input
      variant="pill"
      icon={<Icon name="search" size="sm" />}
      value={list.searchDraft}
      onChange={(event) => list.setSearchDraft(event.target.value)}
      placeholder="Search deals or targets"
      aria-label="Search deals or targets"
      disabled={list.loading}
    />
  );
}

function DashboardPhaseFilter(
  { list }: { list: ReturnType<typeof useDealList> },
) {
  return (
    <Dropdown
      value={list.phase}
      placeholder="All stages"
      options={DASHBOARD_PHASE_OPTIONS}
      onChange={(value) => setDashboardPhase(list, singleValue(value))}
      disabled={list.loading}
    />
  );
}

function DashboardStatusFilter(
  { list }: { list: ReturnType<typeof useDealList> },
) {
  return (
    <Dropdown
      value={list.status}
      placeholder="All statuses"
      options={DASHBOARD_STATUS_OPTIONS}
      onChange={(value) => setDashboardStatus(list, singleValue(value))}
      disabled={list.loading}
    />
  );
}

function DashboardAdvisorFilter(
  { list }: { list: ReturnType<typeof useDealList> },
) {
  return (
    <Dropdown
      value={list.assigneeId}
      placeholder="All assignees"
      options={[
        { value: "all", label: "All Assignees" },
        ...list.advisors.map((advisor) => ({
          value: advisor.id,
          label: advisor.displayName,
        })),
      ]}
      onChange={(value) => setDashboardAssignee(list, singleValue(value))}
      disabled={list.loading}
    />
  );
}

function setDashboardPhase(
  list: ReturnType<typeof useDealList>,
  value: string,
) {
  list.setPhase(value as "all" | DashboardPhase);
  list.setPage(1);
}

function setDashboardStatus(
  list: ReturnType<typeof useDealList>,
  value: string,
) {
  list.setStatus(value as "all" | DealStatus);
  list.setPage(1);
}

function setDashboardAssignee(
  list: ReturnType<typeof useDealList>,
  value: string,
) {
  list.setAssigneeId(value);
  list.setPage(1);
}

function singleValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function DashboardContent(
  { list, view, onCreate }: {
    list: ReturnType<typeof useDealList>;
    view: DashboardView;
    onCreate: () => void;
  },
) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <main className="min-w-0 xl:col-span-9">
        <DashboardMain list={list} view={view} onCreate={onCreate} />
      </main>
      <DashboardSidebar list={list} />
    </div>
  );
}

function DashboardMain(props: {
  list: ReturnType<typeof useDealList>;
  view: DashboardView;
  onCreate: () => void;
}) {
  if (props.list.loading) return <LoadingBoard view={props.view} />;
  if (props.list.error) return <DashboardError list={props.list} />;
  if (props.list.deals.length === 0) return <DashboardEmpty {...props} />;
  if (props.view === "table") return <DashboardTable list={props.list} />;
  return <DashboardKanban deals={props.list.deals} />;
}

function LoadingBoard({ view }: { view: DashboardView }) {
  if (view === "table") return <LoadingTableCard />;
  return (
    <div
      className="grid grid-cols-1 gap-6 xl:grid-cols-4"
      aria-label="Loading deals"
    >
      {DASHBOARD_PHASES.map((phase) => (
        <Card key={phase} variant="raised" padding="sm">
          <Skeleton width="55%" />
          <div className="mt-5 space-y-3">
            <Skeleton variant="rectangular" height={150} />
            <Skeleton variant="rectangular" height={150} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function LoadingTableCard() {
  return (
    <Card variant="default" padding="none" aria-label="Loading deals">
      <div className="space-y-3 p-5">
        {Array.from(
          { length: 6 },
          (_, index) => <LoadingTableRow key={index} />,
        )}
      </div>
    </Card>
  );
}

function LoadingTableRow() {
  return (
    <div className="grid grid-cols-6 gap-4 border-b border-dust-taupe/40 py-3">
      <Skeleton className="col-span-2" />
      <Skeleton />
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>
  );
}

function DashboardError({ list }: { list: ReturnType<typeof useDealList> }) {
  const router = useRouter();
  return (
    <Card
      variant="raised"
      className="flex min-h-[300px] flex-col items-center justify-center text-center"
    >
      <Icon name="alert" size="xl" className="text-signal-orange" />
      <h2 className="mt-4 text-lg font-semibold text-ink-black">
        Pipeline unavailable
      </h2>
      <p className="mt-1 max-w-md text-sm text-slate-gray">{list.error}</p>
      <DashboardErrorActions
        onRetry={() => void list.loadDeals()}
        onReturn={() => router.push("/")}
      />
    </Card>
  );
}

function DashboardErrorActions(
  props: { onRetry: () => void; onReturn: () => void },
) {
  return (
    <>
      <Button className="mt-5" variant="primary" onClick={props.onRetry}>
        Retry
      </Button>
      <Button className="mt-3" variant="secondary" onClick={props.onReturn}>
        Return to dashboard
      </Button>
    </>
  );
}

function DashboardEmpty(props: {
  list: ReturnType<typeof useDealList>;
  onCreate: () => void;
}) {
  const filtersActive = props.list.filtersActive;
  return (
    <EmptyState
      title="No deals found"
      description={filtersActive
        ? "No active deals match the current search and filters."
        : "Create the first mandate to start building the pipeline."}
      actionLabel={filtersActive ? "Reset Filters" : "Create Deal"}
      onAction={filtersActive ? props.list.resetFilters : props.onCreate}
      icon={<Icon name={filtersActive ? "filter" : "fileText"} size="lg" />}
    />
  );
}

function DashboardTable({ list }: { list: ReturnType<typeof useDealList> }) {
  return (
    <Card variant="default" padding="none">
      <Table aria-label="Active deals">
        <DashboardTableHead />
        <tbody>
          {list.deals.map((deal) => (
            <DashboardTableRow key={deal.id} deal={deal} />
          ))}
        </tbody>
      </Table>
      <DashboardTablePagination list={list} />
    </Card>
  );
}

function DashboardTableHead() {
  return (
    <TableHead>
      <TableRow isHeader>
        <TableCell isHeader>Deal / Target</TableCell>
        <TableCell isHeader>Stage</TableCell>
        <TableCell isHeader>Valuation</TableCell>
        <TableCell isHeader>Lead Advisor</TableCell>
        <TableCell isHeader>Updated</TableCell>
      </TableRow>
    </TableHead>
  );
}

function DashboardTablePagination(
  { list }: { list: ReturnType<typeof useDealList> },
) {
  return (
    <TablePagination
      currentPage={list.page}
      totalPages={list.totalPages}
      totalItems={list.total}
      pageSize={list.pageSize}
      onPageChange={list.setPage}
      onPageSizeChange={(next) => setDashboardPageSize(list, next)}
    />
  );
}

function setDashboardPageSize(
  list: ReturnType<typeof useDealList>,
  next: number,
) {
  list.setPageSize(next);
  list.setPage(1);
}

function DashboardTableRow({ deal }: { deal: DealSummary }) {
  return (
    <TableRow>
      <DashboardDealCell deal={deal} />
      <TableCell>
        <Badge variant="orange">{PHASE_LABELS[deal.currentPhase]}</Badge>
      </TableCell>
      <TableCell>{formatMoneyRange(deal)}</TableCell>
      <TableCell>{deal.leadAdvisor?.displayName ?? "Unassigned"}</TableCell>
      <TableCell>{formatDashboardDate(deal.updatedAt)}</TableCell>
    </TableRow>
  );
}

function DashboardDealCell({ deal }: { deal: DealSummary }) {
  return (
    <TableCell>
      <Link
        href={`/deals/${deal.id}`}
        className="font-semibold text-ink-black hover:underline"
      >
        {deal.title}
      </Link>
      <span className="ml-2 text-xs text-slate-gray">
        {deal.target.legalName}
      </span>
    </TableCell>
  );
}

function DashboardKanban({ deals }: { deals: DealSummary[] }) {
  const groupedDeals = useMemo(() => groupDealsByPhase(deals), [deals]);
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
      {DASHBOARD_PHASES.map((phase) => (
        <DashboardPhaseColumn
          key={phase}
          deals={groupedDeals[phase]}
          phase={phase}
        />
      ))}
    </div>
  );
}

function DashboardPhaseColumn(
  props: { deals: DealSummary[]; phase: DashboardPhase },
) {
  return (
    <Card variant="raised" padding="sm" className="overflow-visible">
      <DashboardPhaseColumnHeader {...props} />
      <div className="mt-4 space-y-3">
        {props.deals.length > 0
          ? props.deals.map((deal) => <DealCard key={deal.id} deal={deal} />)
          : <DashboardEmptyPhase />}
      </div>
    </Card>
  );
}

function DashboardPhaseColumnHeader(props: {
  deals: DealSummary[];
  phase: DashboardPhase;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-ink-black">
        {PHASE_LABELS[props.phase]}
      </h2>
      <Badge variant="dark">{props.deals.length}</Badge>
    </div>
  );
}

function DashboardEmptyPhase() {
  return (
    <div className="rounded-lg border border-dashed border-dust-taupe p-5 text-center text-xs text-slate-gray">
      No deals in this stage
    </div>
  );
}
