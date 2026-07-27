"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import {
  dashboardInitials,
  formatDashboardDate,
  formatMoneyRange,
  PHASE_LABELS,
} from "@/components/screens/dashboard/dashboard-model";
import type { DealSummary } from "@/lib/api-client";
import type { useDealList } from "../deals/use-deal-list";

export function DealCard({ deal }: { deal: DealSummary }) {
  const advisorName = deal.leadAdvisor?.displayName ?? "Unassigned";
  return (
    <Link
      href={`/deals/${deal.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-black"
    >
      <Card variant="default" padding="sm" className="min-h-[156px]">
        <DealCardHeader advisorName={advisorName} deal={deal} />
        <DealCardBody deal={deal} />
        <DealCardFooter advisorName={advisorName} deal={deal} />
      </Card>
    </Link>
  );
}

function DealCardHeader(
  { advisorName, deal }: { advisorName: string; deal: DealSummary },
) {
  return (
    <div className="flex items-start justify-between gap-3">
      <Badge variant="orange">{PHASE_LABELS[deal.currentPhase]}</Badge>
      <Avatar
        src={deal.leadAdvisor?.avatarUrl ?? undefined}
        fallback={dashboardInitials(advisorName)}
        alt={advisorName}
        size="sm"
      />
    </div>
  );
}

function DealCardBody({ deal }: { deal: DealSummary }) {
  return (
    <>
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
    </>
  );
}

function DealCardFooter(
  { advisorName, deal }: { advisorName: string; deal: DealSummary },
) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-gray">
      <span>{advisorName}</span>
      <span>{formatDashboardDate(deal.updatedAt)}</span>
    </div>
  );
}

export function DashboardSidebar(
  { list }: { list: ReturnType<typeof useDealList> },
) {
  const router = useRouter();
  return (
    <aside className="space-y-6 xl:col-span-3">
      <DealIntelligenceCard
        deal={list.deals[0]}
        onOpen={(deal) => router.push(`/deals/${deal.id}/chat`)}
      />
      <CurrentResultCard list={list} />
    </aside>
  );
}

function DealIntelligenceCard(props: {
  deal: DealSummary | undefined;
  onOpen: (deal: DealSummary) => void;
}) {
  return (
    <Card variant="dark">
      <Badge variant="orange">BrokerOrchestrator</Badge>
      <h2 className="mt-4 text-lg font-semibold">Deal intelligence</h2>
      <p className="mt-2 text-sm text-canvas-cream/75">
        Review the selected mandate with the orchestrator and its specialist
        agents.
      </p>
      <OpenAgentChatButton deal={props.deal} onOpen={props.onOpen} />
    </Card>
  );
}

function OpenAgentChatButton(props: {
  deal: DealSummary | undefined;
  onOpen: (deal: DealSummary) => void;
}) {
  return (
    <Button
      className="mt-5"
      variant="secondary"
      size="sm"
      disabled={!props.deal}
      onClick={() => props.deal && props.onOpen(props.deal)}
    >
      Open Agent Chat
    </Button>
  );
}

function CurrentResultCard(
  { list }: { list: ReturnType<typeof useDealList> },
) {
  return (
    <Card variant="default">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
        Current result
      </p>
      <p className="mt-3 text-3xl font-semibold text-ink-black">{list.total}</p>
      <p className="mt-1 text-sm text-slate-gray">
        active deals across the filtered pipeline
      </p>
      <CurrentResultBadges list={list} />
    </Card>
  );
}

function CurrentResultBadges(
  { list }: { list: ReturnType<typeof useDealList> },
) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {list.phase !== "all" && (
        <Badge variant="outline">{PHASE_LABELS[list.phase]}</Badge>
      )}
      {list.search && <Badge variant="default">Search active</Badge>}
      {!list.filtersActive && <Badge variant="default">All active deals</Badge>}
    </div>
  );
}
