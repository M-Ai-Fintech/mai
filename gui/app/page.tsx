"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { FormField } from "@/components/FormField/FormField";
import { Icon } from "@/components/Icon/Icon";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import {
  Table,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
} from "@/components/Table/Table";
import { Tabs } from "@/components/Tabs/Tabs";
import { Toast } from "@/components/Toast/Toast";
import { Textarea } from "@/components/Textarea/Textarea";
import {
  DASHBOARD_PHASES,
  type DashboardPhase,
  type DashboardView,
  type DealDraft,
  type DealDraftErrors,
  EMPTY_DEAL_DRAFT,
  formatMoneyRange,
  groupDealsByPhase,
  PHASE_LABELS,
  toDealCreate,
  validateDealDraft,
} from "@/components/screens/dashboard/dashboard-model";
import { parseDashboardRouteState } from "@/components/screens/dashboard/dashboard-route-state";
import {
  ApiClient,
  APIError,
  type DealListQuery,
  type DealSummary,
  type EntitySummary,
  type TeamMember,
} from "@/lib/api-client";

interface DashboardToast {
  title: string;
  message: string;
  variant: "success" | "error";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function LoadingBoard({ view }: { view: DashboardView }) {
  if (view === "table") {
    return (
      <Card variant="default" padding="none" aria-label="Loading deals">
        <div className="space-y-3 p-5">
          {Array.from(
            { length: 6 },
            (_, index) => (
              <div
                key={index}
                className="grid grid-cols-6 gap-4 border-b border-dust-taupe/40 py-3"
              >
                <Skeleton className="col-span-2" />
                <Skeleton />
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </div>
            ),
          )}
        </div>
      </Card>
    );
  }

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

function DealCard({ deal }: { deal: DealSummary }) {
  return (
    <Link
      href={`/deals/${deal.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-black"
    >
      <Card variant="default" padding="sm" className="min-h-[156px]">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="orange">{PHASE_LABELS[deal.currentPhase]}</Badge>
          <Avatar
            src={deal.leadAdvisor?.avatarUrl ?? undefined}
            fallback={initials(deal.leadAdvisor?.displayName ?? "Unassigned")}
            alt={deal.leadAdvisor?.displayName ?? "Unassigned advisor"}
            size="sm"
          />
        </div>
        <p className="mt-4 font-label text-[10px] font-bold uppercase tracking-wider text-slate-gray">
          {deal.code}
        </p>
        <h3 className="mt-1 text-base font-semibold text-ink-black">
          {deal.title}
        </h3>
        <p className="mt-1 text-xs text-slate-gray">{deal.target.legalName}</p>
        <p className="mt-3 text-sm font-semibold text-ink-black">
          {formatMoneyRange(deal)}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-gray">
          <span>{deal.leadAdvisor?.displayName ?? "Unassigned"}</span>
          <span>
            {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
              new Date(deal.updatedAt),
            )}
          </span>
        </div>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("kanban");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState<"all" | DashboardPhase>("all");
  const [status, setStatus] = useState<
    "all" | "active" | "completed" | "archived"
  >("active");
  const [assigneeId, setAssigneeId] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draft, setDraft] = useState<DealDraft>(EMPTY_DEAL_DRAFT);
  const [draftErrors, setDraftErrors] = useState<DealDraftErrors>({});
  const [targets, setTargets] = useState<EntitySummary[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<DashboardToast | null>(null);
  const handledRouteState = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchDraft]);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query: DealListQuery = {
      page,
      pageSize,
      search: search || undefined,
      phase: phase === "all" ? undefined : phase,
      assigneeId: assigneeId === "all" ? undefined : assigneeId,
      status: status === "all" ? undefined : status,
      sort: "-updatedAt",
    };

    try {
      const response = await ApiClient.listDeals(query);
      setDeals(response.data);
      setTotal(response.meta.total);
      setTotalPages(response.meta.totalPages);
    } catch (cause) {
      setDeals([]);
      setError(
        cause instanceof Error
          ? cause.message
          : "The deal pipeline could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [assigneeId, page, pageSize, phase, search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadDeals(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadDeals]);

  const groupedDeals = useMemo(() => groupDealsByPhase(deals), [deals]);
  const advisors = useMemo(() => {
    const unique = new Map<string, DealSummary["leadAdvisor"]>();
    deals.forEach((deal) => {
      if (deal.leadAdvisor) unique.set(deal.leadAdvisor.id, deal.leadAdvisor);
    });
    return Array.from(unique.values()).filter((advisor) => advisor !== null);
  }, [deals]);
  const filtersActive = Boolean(
    search || phase !== "all" || status !== "active" || assigneeId !== "all",
  );

  const resetFilters = () => {
    setSearchDraft("");
    setSearch("");
    setPhase("all");
    setStatus("active");
    setAssigneeId("all");
    setPage(1);
  };

  const openCreate = useCallback(async () => {
    setIsCreateOpen(true);
    setDraft(EMPTY_DEAL_DRAFT);
    setDraftErrors({});
    setOptionsError(null);
    setOptionsLoading(true);
    try {
      const [entityPage, teamPage] = await Promise.all([
        ApiClient.listEntities({ page: 1, pageSize: 100, role: "target" }),
        ApiClient.listTeamMembers({ page: 1, pageSize: 100 }),
      ]);
      setTargets(entityPage.data);
      setTeamMembers(teamPage.data.filter((member) => member.active));
    } catch (cause) {
      setOptionsError(
        cause instanceof Error
          ? cause.message
          : "Deal form options could not be loaded.",
      );
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (handledRouteState.current) return;
    handledRouteState.current = true;
    const timer = window.setTimeout(() => {
      const routeState = parseDashboardRouteState(window.location.search);

      if (routeState.notice === "phase-transitioned") {
        setToast({
          title: "Deal moved",
          message: "The deal phase transition was saved.",
          variant: "success",
        });
      }
      if (routeState.createDeal) void openCreate();
      if (routeState.createDeal || routeState.notice) {
        router.replace("/", { scroll: false });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [openCreate, router]);

  const submitCreate = async () => {
    const clientErrors = validateDealDraft(draft);
    setDraftErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setToast({
        title: "Review required fields",
        message: "Correct the highlighted deal fields and submit again.",
        variant: "error",
      });
      return;
    }

    setCreating(true);
    try {
      const code = `DEAL-${Date.now().toString(36).toUpperCase()}`;
      await ApiClient.createDeal(toDealCreate(draft, code));
      setIsCreateOpen(false);
      setToast({
        title: "Deal created",
        message: `${draft.title.trim()} was added to Sourcing.`,
        variant: "success",
      });
      await loadDeals();
    } catch (cause) {
      if (cause instanceof APIError && cause.fieldErrors) {
        const serverErrors = Object.fromEntries(
          Object.entries(cause.fieldErrors).map((
            [field, messages],
          ) => [field, messages[0]]),
        ) as DealDraftErrors;
        setDraftErrors(serverErrors);
      } else {
        setToast({
          title: "Deal not created",
          message: cause instanceof Error ? cause.message : "Try again.",
          variant: "error",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8 p-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-signal-orange">
            Executive pipeline
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-black">
            M&amp;A Pipeline
          </h1>
          <p className="mt-1 text-sm text-slate-gray">
            Monitor active mandates from sourcing through closing.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => void openCreate()}
          disabled={loading}
        >
          Create Deal
        </Button>
      </section>

      <Card
        variant="default"
        padding="sm"
        className="flex flex-wrap items-center justify-between gap-4 overflow-visible"
      >
        <Tabs
          tabs={[
            { id: "kanban", label: "Board", count: total },
            { id: "table", label: "Table" },
          ]}
          activeTab={view}
          onChange={(nextView) =>
            nextView === "table"
              ? router.push("/deals")
              : setView(nextView as DashboardView)}
        />
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 md:grid-cols-2 xl:max-w-[1180px] xl:grid-cols-4">
          <Input
            variant="pill"
            icon={<Icon name="search" size="sm" />}
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search deals or targets"
            aria-label="Search deals or targets"
            disabled={loading}
          />
          <Dropdown
            value={phase}
            placeholder="All stages"
            options={[
              { value: "all", label: "All Stages" },
              ...DASHBOARD_PHASES.map((item) => ({
                value: item,
                label: PHASE_LABELS[item],
              })),
            ]}
            onChange={(value) => {
              setPhase(value as "all" | DashboardPhase);
              setPage(1);
            }}
            disabled={loading}
          />
          <Dropdown
            value={status}
            placeholder="All statuses"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "active", label: "Active" },
              { value: "completed", label: "Completed" },
              { value: "archived", label: "Archived" },
            ]}
            onChange={(value) => {
              setStatus(value as typeof status);
              setPage(1);
            }}
            disabled={loading}
          />
          <Dropdown
            value={assigneeId}
            placeholder="All assignees"
            options={[
              { value: "all", label: "All Assignees" },
              ...advisors.map((advisor) => ({
                value: advisor.id,
                label: advisor.displayName,
              })),
            ]}
            onChange={(value) => {
              setAssigneeId(value as string);
              setPage(1);
            }}
            disabled={loading}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <main className="min-w-0 xl:col-span-9">
          {loading ? <LoadingBoard view={view} /> : error
            ? (
              <Card
                variant="raised"
                className="flex min-h-[300px] flex-col items-center justify-center text-center"
              >
                <Icon name="alert" size="xl" className="text-signal-orange" />
                <h2 className="mt-4 text-lg font-semibold text-ink-black">
                  Pipeline unavailable
                </h2>
                <p className="mt-1 max-w-md text-sm text-slate-gray">{error}</p>
                <Button
                  className="mt-5"
                  variant="primary"
                  onClick={() => void loadDeals()}
                >
                  Retry
                </Button>
                <Button
                  className="mt-3"
                  variant="secondary"
                  onClick={() => router.push("/")}
                >
                  Return to dashboard
                </Button>
              </Card>
            )
            : deals.length === 0
            ? (
              <EmptyState
                title="No deals found"
                description={filtersActive
                  ? "No active deals match the current search and filters."
                  : "Create the first mandate to start building the pipeline."}
                actionLabel={filtersActive ? "Reset Filters" : "Create Deal"}
                onAction={filtersActive
                  ? resetFilters
                  : () => void openCreate()}
                icon={
                  <Icon
                    name={filtersActive ? "filter" : "fileText"}
                    size="lg"
                  />
                }
              />
            )
            : view === "table"
            ? (
              <Card variant="default" padding="none">
                <Table aria-label="Active deals">
                  <TableHead>
                    <TableRow isHeader>
                      <TableCell isHeader>Deal / Target</TableCell>
                      <TableCell isHeader>Stage</TableCell>
                      <TableCell isHeader>Valuation</TableCell>
                      <TableCell isHeader>Lead Advisor</TableCell>
                      <TableCell isHeader>Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <tbody>
                    {deals.map((deal) => (
                      <TableRow key={deal.id}>
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
                        <TableCell>
                          <Badge variant="orange">
                            {PHASE_LABELS[deal.currentPhase]}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatMoneyRange(deal)}</TableCell>
                        <TableCell>
                          {deal.leadAdvisor?.displayName ?? "Unassigned"}
                        </TableCell>
                        <TableCell>
                          {new Intl.DateTimeFormat("en-US", {
                            dateStyle: "medium",
                          }).format(new Date(deal.updatedAt))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
                <TablePagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(nextSize) => {
                    setPageSize(nextSize);
                    setPage(1);
                  }}
                />
              </Card>
            )
            : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
                {DASHBOARD_PHASES.map((columnPhase) => (
                  <Card
                    key={columnPhase}
                    variant="raised"
                    padding="sm"
                    className="overflow-visible"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold text-ink-black">
                        {PHASE_LABELS[columnPhase]}
                      </h2>
                      <Badge variant="dark">
                        {groupedDeals[columnPhase].length}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {groupedDeals[columnPhase].length > 0
                        ? (
                          groupedDeals[columnPhase].map((deal) => (
                            <DealCard key={deal.id} deal={deal} />
                          ))
                        )
                        : (
                          <div className="rounded-lg border border-dashed border-dust-taupe p-5 text-center text-xs text-slate-gray">
                            No deals in this stage
                          </div>
                        )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
        </main>

        <aside className="space-y-6 xl:col-span-3">
          <Card variant="dark">
            <Badge variant="orange">BrokerOrchestrator</Badge>
            <h2 className="mt-4 text-lg font-semibold">Deal intelligence</h2>
            <p className="mt-2 text-sm text-canvas-cream/75">
              Review the selected mandate with the orchestrator and its
              specialist agents.
            </p>
            {deals[0]
              ? (
                <Button
                  className="mt-5"
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/deals/${deals[0].id}/chat`)}
                >
                  Open Agent Chat
                </Button>
              )
              : (
                <Button className="mt-5" variant="secondary" size="sm" disabled>
                  Open Agent Chat
                </Button>
              )}
          </Card>
          <Card variant="default">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
              Current result
            </p>
            <p className="mt-3 text-3xl font-semibold text-ink-black">
              {total}
            </p>
            <p className="mt-1 text-sm text-slate-gray">
              active deals across the filtered pipeline
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {phase !== "all" && (
                <Badge variant="outline">{PHASE_LABELS[phase]}</Badge>
              )}
              {search && <Badge variant="default">Search active</Badge>}
              {!filtersActive && (
                <Badge variant="default">All active deals</Badge>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => !creating && setIsCreateOpen(false)}
        title="Create Deal"
        subtitle="Add a new mandate to the sourcing pipeline."
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void submitCreate()}
              disabled={creating || optionsLoading || Boolean(optionsError)}
            >
              {creating ? "Creating…" : "Create Deal"}
            </Button>
          </>
        }
      >
        {optionsLoading
          ? (
            <div className="space-y-5" aria-label="Loading deal form">
              <Skeleton />
              <Skeleton variant="rectangular" height={44} />
              <Skeleton />
              <Skeleton variant="rectangular" height={44} />
              <Skeleton variant="rectangular" height={96} />
            </div>
          )
          : optionsError
          ? (
            <Card variant="raised">
              <div className="flex items-start gap-3">
                <Icon name="alert" className="mt-0.5 text-signal-orange" />
                <div>
                  <h3 className="font-semibold">Form options unavailable</h3>
                  <p className="mt-1 text-xs text-slate-gray">{optionsError}</p>
                  <Button
                    className="mt-4"
                    variant="secondary"
                    size="sm"
                    onClick={() => void openCreate()}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </Card>
          )
          : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                label="Deal Title"
                required
                error={draftErrors.title}
                className="md:col-span-2"
              >
                <Input
                  autoFocus
                  value={draft.title}
                  hasError={Boolean(draftErrors.title)}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))}
                  placeholder="Project Horizon"
                />
              </FormField>
              <FormField
                label="Deal Type"
                required
                error={draftErrors.dealType}
              >
                <Dropdown
                  value={draft.dealType}
                  options={[
                    { value: "buy_side", label: "Buy-side" },
                    { value: "sell_side", label: "Sell-side" },
                  ]}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      dealType: value as DealDraft["dealType"],
                    }))}
                />
              </FormField>
              <FormField
                label="Target Entity"
                required
                error={draftErrors.targetId}
                hint={targets.length === 0
                  ? "Create a target entity before creating a deal."
                  : undefined}
              >
                <Dropdown
                  searchable
                  value={draft.targetId}
                  placeholder="Select target"
                  error={draftErrors.targetId}
                  options={targets.map((target) => ({
                    value: target.id,
                    label: target.legalName,
                  }))}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      targetId: value as string,
                    }))}
                  disabled={targets.length === 0}
                />
              </FormField>
              <FormField
                label="Phase"
                required
                hint="New mandates enter the sequential workflow in Sourcing."
              >
                <Dropdown
                  value={draft.phase}
                  options={[{ value: "sourcing", label: "Sourcing" }]}
                  onChange={() => undefined}
                  disabled
                />
              </FormField>
              <FormField label="Currency" required>
                <Dropdown
                  value={draft.currency}
                  options={["BRL", "USD", "EUR"].map((currency) => ({
                    value: currency,
                    label: currency,
                  }))}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      currency: value as DealDraft["currency"],
                    }))}
                />
              </FormField>
              <FormField label="Lead Advisor" hint="Optional">
                <Dropdown
                  searchable
                  value={draft.leadAdvisorId}
                  placeholder="Unassigned"
                  options={[
                    { value: "", label: "Unassigned" },
                    ...teamMembers.map((member) => ({
                      value: member.id,
                      label: member.displayName,
                    })),
                  ]}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      leadAdvisorId: value as string,
                    }))}
                />
              </FormField>
              <FormField
                label="Valuation Minimum"
                required
                error={draftErrors.valuationMin}
              >
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.valuationMin}
                  hasError={Boolean(draftErrors.valuationMin)}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      valuationMin: event.target.value,
                    }))}
                />
              </FormField>
              <FormField
                label="Valuation Maximum"
                required
                error={draftErrors.valuationMax}
              >
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.valuationMax}
                  hasError={Boolean(draftErrors.valuationMax)}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      valuationMax: event.target.value,
                    }))}
                />
              </FormField>
              <FormField
                label="Internal Note"
                hint="Optional; visible only to the deal team."
                className="md:col-span-2"
              >
                <Textarea
                  value={draft.internalNote}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      internalNote: event.target.value,
                    }))}
                  placeholder="Add sourcing context or initial constraints."
                />
              </FormField>
            </div>
          )}
      </Modal>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <Toast
            title={toast.title}
            message={toast.message}
            variant={toast.variant}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
