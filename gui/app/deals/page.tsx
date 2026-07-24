"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { EmptyState } from "@/components/EmptyState/EmptyState";
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
import {
  type DashboardPhase,
  formatMoneyRange,
  PHASE_LABELS,
} from "@/components/screens/dashboard/dashboard-model";
import { parseDashboardRouteState } from "@/components/screens/dashboard/dashboard-route-state";
import {
  ApiClient,
  type DealListQuery,
  type DealSummary,
} from "@/lib/api-client";

type DealStatus = "active" | "archived" | "completed";

const phaseOptions = [
  { value: "all", label: "All phases" },
  ...Object.entries(PHASE_LABELS).map(([value, label]) => ({ value, label })),
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function phaseVariant(phase: DashboardPhase) {
  return phase === "due_diligence" || phase === "negotiation"
    ? "orange" as const
    : "default" as const;
}

function LoadingTable() {
  return (
    <Card variant="default" padding="none" aria-label="Loading deals">
      <div className="space-y-3 p-6">
        <Skeleton variant="rectangular" height={44} />
        {Array.from(
          { length: 8 },
          (_, index) => (
            <div
              key={index}
              className="grid grid-cols-12 items-center gap-4 border-b border-dust-taupe/40 py-3"
            >
              <Skeleton variant="rectangular" width={20} height={20} />
              <Skeleton className="col-span-2" />
              <Skeleton className="col-span-2" />
              <Skeleton />
              <Skeleton />
              <Skeleton className="col-span-2" />
              <Skeleton variant="circular" width={44} height={44} />
              <Skeleton />
            </div>
          ),
        )}
      </div>
    </Card>
  );
}

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState<"all" | DashboardPhase>("all");
  const [status, setStatus] = useState<"all" | DealStatus>("all");
  const [assigneeId, setAssigneeId] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [archiveTarget, setArchiveTarget] = useState<DealSummary | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [toast, setToast] = useState<
    { title: string; message: string; variant: "success" | "error" } | null
  >(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const routeState = parseDashboardRouteState(window.location.search);
      if (routeState.notice !== "deal-archived") return;
      setToast({
        title: "Deal archived",
        message: "The deal was archived reversibly.",
        variant: "success",
      });
      router.replace("/deals", { scroll: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query: DealListQuery = {
      page,
      pageSize,
      search: search || undefined,
      phase: phase === "all" ? undefined : phase,
      status: status === "all" ? undefined : status,
      assigneeId: assigneeId === "all" ? undefined : assigneeId,
      sort: "-updatedAt",
    };
    try {
      const response = await ApiClient.listDeals(query);
      setDeals(response.data);
      setTotal(response.meta.total);
      setTotalPages(response.meta.totalPages);
      setSelectedIds((current) =>
        current.filter((id) => response.data.some((deal) => deal.id === id))
      );
    } catch (cause) {
      setDeals([]);
      setError(
        cause instanceof Error ? cause.message : "Deals could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [assigneeId, page, pageSize, phase, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDeals(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDeals]);

  const advisors = useMemo(() => {
    const unique = new Map<string, NonNullable<DealSummary["leadAdvisor"]>>();
    deals.forEach((deal) => {
      if (deal.leadAdvisor) unique.set(deal.leadAdvisor.id, deal.leadAdvisor);
    });
    return Array.from(unique.values());
  }, [deals]);

  const filtersActive = Boolean(
    search || phase !== "all" || status !== "all" || assigneeId !== "all",
  );
  const allVisibleSelected = deals.length > 0 &&
    deals.every((deal) => selectedIds.includes(deal.id));

  const resetFilters = () => {
    setSearchDraft("");
    setSearch("");
    setPhase("all");
    setStatus("all");
    setAssigneeId("all");
    setPage(1);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      await ApiClient.archiveDeal(archiveTarget.id, archiveTarget.version);
      setArchiveTarget(null);
      setToast({
        title: "Deal archived",
        message: `${archiveTarget.title} was archived reversibly.`,
        variant: "success",
      });
      await loadDeals();
    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : "The deal could not be archived.";
      setArchiveError(message);
      setToast({ title: "Deal not archived", message, variant: "error" });
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-8 p-8">
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

      <Card variant="default" padding="sm" className="overflow-visible">
        <div className="flex flex-wrap items-center gap-6">
          <Tabs
            activeTab="table"
            tabs={[{ id: "board", label: "Board" }, {
              id: "table",
              label: "Table",
              count: total,
            }]}
            onChange={(next) => {
              if (next === "board") router.push("/");
            }}
          />
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Input
              variant="pill"
              icon={<Icon name="search" size="sm" />}
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search deals"
              aria-label="Search deals"
              disabled={loading}
            />
            <Dropdown
              value={phase}
              options={phaseOptions}
              onChange={(value) => {
                setPhase(value as "all" | DashboardPhase);
                setPage(1);
              }}
              disabled={loading}
            />
            <Dropdown
              value={status}
              options={statusOptions}
              onChange={(value) => {
                setStatus(value as "all" | DealStatus);
                setPage(1);
              }}
              disabled={loading}
            />
            <Dropdown
              searchable
              value={assigneeId}
              options={[
                { value: "all", label: "All assignees" },
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
          {filtersActive && (
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          )}
        </div>
      </Card>

      {loading ? <LoadingTable /> : error
        ? (
          <Card
            variant="raised"
            className="flex min-h-[320px] flex-col items-center justify-center text-center"
          >
            <Icon name="alert" size="xl" className="text-signal-orange" />
            <h2 className="mt-4 text-lg font-semibold text-ink-black">
              Deals could not be loaded
            </h2>
            <p className="mt-1 max-w-lg text-sm text-slate-gray">{error}</p>
            <div className="mt-6 flex gap-3">
              <Button variant="primary" onClick={() => void loadDeals()}>
                Retry
              </Button>
              <Link href="/">
                <Button variant="secondary">Return to dashboard</Button>
              </Link>
            </div>
          </Card>
        )
        : deals.length === 0
        ? (
          <EmptyState
            title={filtersActive ? "No matching deals" : "No deals yet"}
            description={filtersActive
              ? "No deals match the selected filters."
              : "Create the first deal to start the M&A pipeline."}
            actionLabel={filtersActive ? "Reset filters" : "Create deal"}
            onAction={filtersActive
              ? resetFilters
              : () => router.push("/?create=deal")}
            icon={
              <Icon name={filtersActive ? "filter" : "fileText"} size="lg" />
            }
          />
        )
        : (
          <Card variant="default" padding="none">
            <Table aria-label="Deals">
              <TableHead>
                <TableRow isHeader>
                  <TableCell isHeader maxWidthClassName="max-w-[60px]">
                    <Checkbox
                      aria-label="Select all visible deals"
                      checked={allVisibleSelected}
                      onChange={(event) =>
                        setSelectedIds(
                          event.target.checked
                            ? deals.map((deal) => deal.id)
                            : [],
                        )}
                    />
                  </TableCell>
                  <TableCell isHeader>Code / Deal</TableCell>
                  <TableCell isHeader>Target</TableCell>
                  <TableCell isHeader>Deal Type</TableCell>
                  <TableCell isHeader>Phase</TableCell>
                  <TableCell isHeader>Valuation Range</TableCell>
                  <TableCell isHeader>Lead Advisor</TableCell>
                  <TableCell isHeader>Updated</TableCell>
                  <TableCell isHeader>Actions</TableCell>
                </TableRow>
              </TableHead>
              <tbody>
                {deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell maxWidthClassName="max-w-[60px]">
                      <Checkbox
                        aria-label={`Select ${deal.title}`}
                        checked={selectedIds.includes(deal.id)}
                        onChange={(event) =>
                          setSelectedIds((current) =>
                            event.target.checked
                              ? [...current, deal.id]
                              : current.filter((id) => id !== deal.id)
                          )}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="block text-xs text-slate-gray">
                        {deal.code}
                      </span>
                      <span className="font-semibold text-ink-black">
                        {deal.title}
                      </span>
                    </TableCell>
                    <TableCell title={deal.target.legalName}>
                      {deal.target.legalName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {deal.dealType === "buy_side"
                          ? "Buy-side"
                          : "Sell-side"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={phaseVariant(deal.currentPhase)}>
                        {PHASE_LABELS[deal.currentPhase]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatMoneyRange(deal)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <Avatar
                          src={deal.leadAdvisor?.avatarUrl ?? undefined}
                          fallback={initials(
                            deal.leadAdvisor?.displayName ?? "Unassigned",
                          )}
                          size="md"
                        />
                        <span>
                          {deal.leadAdvisor?.displayName ?? "Unassigned"}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(deal.updatedAt)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <Link href={`/deals/${deal.id}`}>
                          <Button variant="secondary" size="sm">Open</Button>
                        </Link>
                        {deal.status !== "archived" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setArchiveError(null);
                              setArchiveTarget(deal);
                            }}
                          >
                            Archive
                          </Button>
                        )}
                      </span>
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
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
            />
          </Card>
        )}

      <Modal
        isOpen={archiveTarget !== null}
        onClose={() => {
          if (!archiving) setArchiveTarget(null);
        }}
        title={`Archive ${archiveTarget?.title ?? "deal"}?`}
        subtitle="Archiving is reversible and removes this deal from the active pipeline."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={archiving}
              onClick={() => setArchiveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="consent"
              disabled={archiving || Boolean(archiveError)}
              onClick={() => void confirmArchive()}
            >
              {archiving ? "Archiving…" : "Archive deal"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-gray">
          The deal remains available through archived records and can be
          restored by an authorized workflow.
        </p>
        {archiveError && (
          <p className="mt-4 text-xs font-semibold text-red-600">
            {archiveError}
          </p>
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
