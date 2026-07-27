"use client";

import Link from "next/link";
import { Accordion } from "@/components/Accordion/Accordion";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Divider } from "@/components/Divider/Divider";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Icon } from "@/components/Icon/Icon";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import {
  dashboardInitials,
  formatMoneyRange,
  PHASE_LABELS,
} from "@/components/screens/dashboard/dashboard-model";
import type { DealDetail } from "@/lib/api-client";
import { formatDealDetailDate } from "./deal-detail-model";

export function DetailLoading() {
  return (
    <div className="space-y-8 p-8" aria-label="Loading deal detail">
      <DetailLoadingHeader />
      <DetailLoadingBody />
    </div>
  );
}

function DetailLoadingHeader() {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="w-full max-w-xl">
        <Skeleton width="30%" />
        <Skeleton width="75%" height={36} />
      </div>
      <Skeleton variant="rectangular" width={520} height={44} />
    </div>
  );
}

function DetailLoadingBody() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <Skeleton className="xl:col-span-8" variant="rectangular" height={620} />
      <div className="space-y-6 xl:col-span-4">
        <Skeleton variant="rectangular" height={220} />
        <Skeleton variant="rectangular" height={220} />
      </div>
    </div>
  );
}

export function DealLoadError(
  { loadError, onRetry }: { loadError: string | null; onRetry: () => void },
) {
  return (
    <div className="p-8">
      <Card
        variant="raised"
        className="flex min-h-[360px] flex-col items-center justify-center text-center"
      >
        <Icon name="alert" size="xl" className="text-signal-orange" />
        <h1 className="mt-4 text-xl font-semibold">Deal could not be loaded</h1>
        <p className="mt-2 max-w-lg text-sm text-slate-gray">{loadError}</p>
        <DealLoadErrorActions onRetry={onRetry} />
      </Card>
    </div>
  );
}

function DealLoadErrorActions({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-6 flex gap-3">
      <Button onClick={onRetry}>Retry</Button>
      <Link href="/deals">
        <Button variant="secondary">Return to deals</Button>
      </Link>
    </div>
  );
}

export function DealDetailHeader(props: {
  deal: DealDetail;
  onArchive: () => void;
  onEdit: () => void;
  onPhase: () => void;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <DealHeaderTitle deal={props.deal} />
      <DealHeaderActions {...props} />
    </header>
  );
}

function DealHeaderTitle({ deal }: { deal: DealDetail }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
        {deal.code} · {deal.target.legalName}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-black">
          {deal.title}
        </h1>
        <Badge variant="orange">{PHASE_LABELS[deal.currentPhase]}</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-gray">
        Version {deal.version} · Updated {formatDealDetailDate(deal.updatedAt)}
      </p>
    </div>
  );
}

function DealHeaderActions(props: {
  deal: DealDetail;
  onArchive: () => void;
  onEdit: () => void;
  onPhase: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={props.onEdit}>Edit deal</Button>
      <Button variant="secondary" onClick={props.onArchive}>Archive</Button>
      <ChangePhaseButton deal={props.deal} onPhase={props.onPhase} />
      <Link href={`/deals/${props.deal.id}/chat`}>
        <Button variant="secondary">Open Agent Chat</Button>
      </Link>
    </div>
  );
}

function ChangePhaseButton(
  { deal, onPhase }: { deal: DealDetail; onPhase: () => void },
) {
  return (
    <Button
      variant="primary"
      onClick={onPhase}
      disabled={deal.currentPhase === "closing"}
    >
      Change phase
    </Button>
  );
}

export function DealDetailBody(
  { deal, phaseItems }: {
    deal: DealDetail;
    phaseItems: Parameters<typeof Accordion>[0]["items"];
  },
) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <main className="space-y-6 xl:col-span-8">
        <DealFundamentalsCard deal={deal} phaseItems={phaseItems} />
      </main>
      <DealSidebar deal={deal} />
    </div>
  );
}

function DealFundamentalsCard(
  { deal, phaseItems }: {
    deal: DealDetail;
    phaseItems: Parameters<typeof Accordion>[0]["items"];
  },
) {
  return (
    <Card variant="raised" padding="lg">
      <DealFundamentalsHeading />
      <Divider spacing="lg" />
      <TargetValuation deal={deal} />
      <Divider spacing="lg" />
      <FinancialStructure deal={deal} />
      <Divider spacing="lg" />
      <PhaseHistory phaseItems={phaseItems} />
    </Card>
  );
}

function DealFundamentalsHeading() {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-wider text-signal-orange">
        Deal fundamentals
      </p>
      <h2 className="mt-2 text-xl font-semibold text-ink-black">
        Target and valuation
      </h2>
    </>
  );
}

function TargetValuation({ deal }: { deal: DealDetail }) {
  return (
    <dl className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <DetailFact
        label="Target"
        primary={deal.target.legalName}
        secondary={`${deal.target.sector} · ${deal.target.countryCode}`}
      />
      <DetailFact
        label="Valuation range"
        primary={formatMoneyRange(deal)}
        secondary={deal.dealType === "buy_side" ? "Buy-side" : "Sell-side"}
      />
    </dl>
  );
}

function DetailFact(
  props: { label: string; primary: string; secondary: string },
) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-gray">
        {props.label}
      </dt>
      <dd className="mt-2 text-base font-semibold">{props.primary}</dd>
      <dd className="mt-1 text-sm text-slate-gray">{props.secondary}</dd>
    </div>
  );
}

function FinancialStructure({ deal }: { deal: DealDetail }) {
  if (
    !deal.financialStructure ||
    Object.keys(deal.financialStructure).length === 0
  ) return <NoFinancialStructure />;
  return (
    <div>
      <h3 className="text-sm font-semibold">Financial structure</h3>
      <dl className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {Object.entries(deal.financialStructure).map(([key, value]) => (
          <FinancialStructureEntry key={key} label={key} value={value} />
        ))}
      </dl>
    </div>
  );
}

function NoFinancialStructure() {
  return (
    <div>
      <h3 className="text-sm font-semibold">Financial structure</h3>
      <p className="mt-2 text-sm text-slate-gray">
        No financial structure has been recorded.
      </p>
    </div>
  );
}

function FinancialStructureEntry(props: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-gray">
        {props.label.replace(/([A-Z])/g, " $1")}
      </dt>
      <dd className="mt-1 text-sm text-ink-black">
        {formatFinancialStructureValue(props.value)}
      </dd>
    </div>
  );
}

function formatFinancialStructureValue(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : JSON.stringify(value);
}

function PhaseHistory(
  { phaseItems }: { phaseItems: Parameters<typeof Accordion>[0]["items"] },
) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold">Phase history</h3>
      {phaseItems.length > 0
        ? <PhaseHistoryAccordion phaseItems={phaseItems} />
        : <PhaseHistoryEmpty />}
    </div>
  );
}

function PhaseHistoryAccordion(
  { phaseItems }: { phaseItems: Parameters<typeof Accordion>[0]["items"] },
) {
  return (
    <Accordion
      items={phaseItems}
      variant="bordered"
      defaultOpenIds={[phaseItems[phaseItems.length - 1].id]}
    />
  );
}

function PhaseHistoryEmpty() {
  return (
    <EmptyState
      title="No phase history"
      description="Phase transitions will appear here after they are recorded."
    />
  );
}

function DealSidebar({ deal }: { deal: DealDetail }) {
  return (
    <aside className="space-y-6 xl:col-span-4">
      <LeadAdvisorCard deal={deal} />
      <DealTeamCard deal={deal} />
      <Card variant="dark">
        <p className="text-xs font-bold uppercase tracking-wider text-canvas-cream/60">
          Deal status
        </p>
        <div className="mt-3">
          <Badge variant="orange">{deal.status}</Badge>
        </div>
        <p className="mt-4 text-sm text-canvas-cream/75">
          Current workflow phase: {PHASE_LABELS[deal.currentPhase]}.
        </p>
      </Card>
    </aside>
  );
}

function LeadAdvisorCard({ deal }: { deal: DealDetail }) {
  return (
    <Card variant="default">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
        Lead advisor
      </p>
      {deal.leadAdvisor
        ? <LeadAdvisorProfile deal={deal} />
        : <NoLeadAdvisor />}
    </Card>
  );
}

function LeadAdvisorProfile({ deal }: { deal: DealDetail }) {
  if (!deal.leadAdvisor) return null;
  return (
    <div className="mt-4 flex items-center gap-3">
      <Avatar
        src={deal.leadAdvisor.avatarUrl ?? undefined}
        fallback={dashboardInitials(deal.leadAdvisor.displayName)}
        size="lg"
      />
      <div>
        <p className="font-semibold">{deal.leadAdvisor.displayName}</p>
        <p className="text-xs text-slate-gray">Mandate lead</p>
      </div>
    </div>
  );
}

function NoLeadAdvisor() {
  return (
    <p className="mt-3 text-sm text-slate-gray">No lead advisor assigned.</p>
  );
}

function DealTeamCard({ deal }: { deal: DealDetail }) {
  return (
    <Card variant="default">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
        Deal team
      </p>
      <DealTeamList deal={deal} />
      <Divider />
      <Button variant="secondary" size="sm" disabled>Manage assignments</Button>
      <p className="mt-2 text-xs text-slate-gray">
        Available after team synchronization.
      </p>
    </Card>
  );
}

function DealTeamList({ deal }: { deal: DealDetail }) {
  return (
    <div className="mt-4 space-y-3">
      {deal.teamAssignments.length > 0
        ? deal.teamAssignments.map((assignment) => (
          <TeamAssignmentRow key={assignment.id} assignment={assignment} />
        ))
        : <NoTeamAssignments />}
    </div>
  );
}

function NoTeamAssignments() {
  return (
    <p className="text-sm text-slate-gray">No synchronized team assignments.</p>
  );
}

function TeamAssignmentRow(
  { assignment }: { assignment: DealDetail["teamAssignments"][number] },
) {
  return (
    <div className="flex items-center gap-3">
      <Avatar
        src={assignment.teamMember.avatarUrl ?? undefined}
        fallback={dashboardInitials(assignment.teamMember.displayName)}
        size="md"
      />
      <div>
        <TeamAssignmentText assignment={assignment} />
      </div>
      {assignment.isLead && (
        <Badge variant="outline" className="ml-auto">Lead</Badge>
      )}
    </div>
  );
}

function TeamAssignmentText(
  { assignment }: { assignment: DealDetail["teamAssignments"][number] },
) {
  return (
    <>
      <p className="text-sm font-semibold">
        {assignment.teamMember.displayName}
      </p>
      <p className="text-xs text-slate-gray">{assignment.assignmentRole}</p>
    </>
  );
}
