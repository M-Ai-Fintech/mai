"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { Icon } from "@/components/Icon/Icon";
import { Modal } from "@/components/Modal/Modal";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import {
  Table,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
} from "@/components/Table/Table";
import {
  dashboardInitials,
  formatDashboardDate,
  formatMoneyRange,
  PHASE_LABELS,
} from "@/components/screens/dashboard/dashboard-model";
import type { DealSummary } from "@/lib/api-client";
import { phaseBadgeVariant } from "./deal-list-model";

export function DealsLoadingTable() {
  return (
    <Card variant="default" padding="none" aria-label="Loading deals">
      <div className="space-y-3 p-6">
        <Skeleton variant="rectangular" height={44} />
        {Array.from(
          { length: 8 },
          (_, index) => <DealsLoadingRow key={index} />,
        )}
      </div>
    </Card>
  );
}

function DealsLoadingRow() {
  return (
    <div className="grid grid-cols-12 items-center gap-4 border-b border-dust-taupe/40 py-3">
      <Skeleton variant="rectangular" width={20} height={20} />
      <Skeleton className="col-span-2" />
      <Skeleton className="col-span-2" />
      <Skeleton />
      <Skeleton />
      <Skeleton className="col-span-2" />
      <Skeleton variant="circular" width={44} height={44} />
      <Skeleton />
    </div>
  );
}

interface DealsTableProps {
  allVisibleSelected: boolean;
  deals: DealSummary[];
  page: number;
  pageSize: number;
  selectedIds: string[];
  total: number;
  totalPages: number;
  onArchive: (deal: DealSummary) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelectionChange: (ids: string[]) => void;
}

export function DealsTable(props: DealsTableProps) {
  return (
    <Card variant="default" padding="none">
      <Table aria-label="Deals">
        <DealsTableHead props={props} />
        <tbody>
          {props.deals.map((deal) => (
            <DealRow key={deal.id} deal={deal} {...props} />
          ))}
        </tbody>
      </Table>
      <DealsTablePagination {...props} />
    </Card>
  );
}

function DealsTablePagination(props: DealsTableProps) {
  return (
    <TablePagination
      currentPage={props.page}
      totalPages={props.totalPages}
      totalItems={props.total}
      pageSize={props.pageSize}
      onPageChange={props.onPageChange}
      onPageSizeChange={props.onPageSizeChange}
    />
  );
}

function DealsTableHead({ props }: { props: DealsTableProps }) {
  return (
    <TableHead>
      <TableRow isHeader>
        <TableCell isHeader maxWidthClassName="max-w-[60px]">
          <SelectVisibleDealsCheckbox props={props} />
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
  );
}

function SelectVisibleDealsCheckbox({ props }: { props: DealsTableProps }) {
  return (
    <Checkbox
      aria-label="Select all visible deals"
      checked={props.allVisibleSelected}
      onChange={(event) =>
        props.onSelectionChange(
          event.target.checked ? props.deals.map((deal) => deal.id) : [],
        )}
    />
  );
}

function DealRow(props: DealsTableProps & { deal: DealSummary }) {
  return (
    <TableRow>
      <DealSelectionCell props={props} />
      <DealIdentityCells deal={props.deal} />
      <TableCell>{formatMoneyRange(props.deal)}</TableCell>
      <DealAdvisorCell deal={props.deal} />
      <TableCell>{formatDashboardDate(props.deal.updatedAt)}</TableCell>
      <TableCell>
        <DealRowActions deal={props.deal} onArchive={props.onArchive} />
      </TableCell>
    </TableRow>
  );
}

function DealSelectionCell(props: {
  props: DealsTableProps & { deal: DealSummary };
}) {
  const selected = props.props.selectedIds.includes(props.props.deal.id);
  return (
    <TableCell maxWidthClassName="max-w-[60px]">
      <Checkbox
        aria-label={`Select ${props.props.deal.title}`}
        checked={selected}
        onChange={(event) =>
          updateDealSelection(props.props, event.target.checked)}
      />
    </TableCell>
  );
}

function updateDealSelection(
  props: DealsTableProps & { deal: DealSummary },
  checked: boolean,
) {
  const selectedIds = checked
    ? [...props.selectedIds, props.deal.id]
    : props.selectedIds.filter((id) => id !== props.deal.id);
  props.onSelectionChange(selectedIds);
}

function DealIdentityCells({ deal }: { deal: DealSummary }) {
  return (
    <>
      <DealTitleCell deal={deal} />
      <TableCell title={deal.target.legalName}>
        {deal.target.legalName}
      </TableCell>
      <DealTypeCell deal={deal} />
      <DealPhaseCell deal={deal} />
    </>
  );
}

function DealTitleCell({ deal }: { deal: DealSummary }) {
  return (
    <TableCell>
      <span className="block text-xs text-slate-gray">{deal.code}</span>
      <span className="font-semibold text-ink-black">{deal.title}</span>
    </TableCell>
  );
}

function DealTypeCell({ deal }: { deal: DealSummary }) {
  return (
    <TableCell>
      <Badge variant="outline">
        {deal.dealType === "buy_side" ? "Buy-side" : "Sell-side"}
      </Badge>
    </TableCell>
  );
}

function DealPhaseCell({ deal }: { deal: DealSummary }) {
  return (
    <TableCell>
      <Badge variant={phaseBadgeVariant(deal.currentPhase)}>
        {PHASE_LABELS[deal.currentPhase]}
      </Badge>
    </TableCell>
  );
}

function DealAdvisorCell({ deal }: { deal: DealSummary }) {
  return (
    <TableCell>
      <LeadAdvisor deal={deal} />
    </TableCell>
  );
}

function LeadAdvisor({ deal }: { deal: DealSummary }) {
  const label = deal.leadAdvisor?.displayName ?? "Unassigned";
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar
        src={deal.leadAdvisor?.avatarUrl ?? undefined}
        fallback={dashboardInitials(label)}
        size="md"
      />
      <span>{label}</span>
    </span>
  );
}

function DealRowActions(
  { deal, onArchive }: {
    deal: DealSummary;
    onArchive: (deal: DealSummary) => void;
  },
) {
  return (
    <span className="inline-flex items-center gap-2">
      <OpenDealButton deal={deal} />
      <ArchiveDealButton deal={deal} onArchive={onArchive} />
    </span>
  );
}

function OpenDealButton({ deal }: { deal: DealSummary }) {
  return (
    <Link href={`/deals/${deal.id}`}>
      <Button variant="secondary" size="sm">Open</Button>
    </Link>
  );
}

function ArchiveDealButton(
  { deal, onArchive }: {
    deal: DealSummary;
    onArchive: (deal: DealSummary) => void;
  },
) {
  if (deal.status === "archived") return null;
  return (
    <Button variant="secondary" size="sm" onClick={() => onArchive(deal)}>
      Archive
    </Button>
  );
}

interface ArchiveDealModalProps {
  archiveError: string | null;
  archiveTarget: DealSummary | null;
  archiving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ArchiveDealModal(props: ArchiveDealModalProps) {
  return (
    <Modal
      isOpen={props.archiveTarget !== null}
      onClose={() => !props.archiving && props.onClose()}
      title={`Archive ${props.archiveTarget?.title ?? "deal"}?`}
      subtitle="Archiving is reversible and removes this deal from the active pipeline."
      size="sm"
      footer={<ArchiveDealFooter {...props} />}
    >
      <ArchiveDealBody archiveError={props.archiveError} />
    </Modal>
  );
}

function ArchiveDealBody({ archiveError }: { archiveError: string | null }) {
  return (
    <>
      <p className="text-sm text-slate-gray">
        The deal remains available through archived records and can be restored
        by an authorized workflow.
      </p>
      {archiveError && (
        <p className="mt-4 text-xs font-semibold text-red-600">
          {archiveError}
        </p>
      )}
    </>
  );
}

function ArchiveDealFooter(props: ArchiveDealModalProps) {
  return (
    <>
      <Button
        variant="secondary"
        disabled={props.archiving}
        onClick={props.onClose}
      >
        Cancel
      </Button>
      <Button
        variant="consent"
        disabled={props.archiving || Boolean(props.archiveError)}
        onClick={props.onConfirm}
      >
        {props.archiving ? "Archiving…" : "Archive deal"}
      </Button>
    </>
  );
}

export function DealsLoadError(
  { error, onRetry }: { error: string; onRetry: () => void },
) {
  return (
    <Card
      variant="raised"
      className="flex min-h-[320px] flex-col items-center justify-center text-center"
    >
      <Icon name="alert" size="xl" className="text-signal-orange" />
      <h2 className="mt-4 text-lg font-semibold text-ink-black">
        Deals could not be loaded
      </h2>
      <p className="mt-1 max-w-lg text-sm text-slate-gray">{error}</p>
      <DealsLoadErrorActions onRetry={onRetry} />
    </Card>
  );
}

function DealsLoadErrorActions({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-6 flex gap-3">
      <Button variant="primary" onClick={onRetry}>Retry</Button>
      <Link href="/">
        <Button variant="secondary">Return to dashboard</Button>
      </Link>
    </div>
  );
}
