"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Accordion } from "@/components/Accordion/Accordion";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Divider } from "@/components/Divider/Divider";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { FormField } from "@/components/FormField/FormField";
import { Icon } from "@/components/Icon/Icon";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { Textarea } from "@/components/Textarea/Textarea";
import { Toast } from "@/components/Toast/Toast";
import {
  DASHBOARD_PHASES,
  type DashboardPhase,
  formatMoneyRange,
  PHASE_LABELS,
} from "@/components/screens/dashboard/dashboard-model";
import {
  ApiClient,
  APIError,
  type DealDetail,
  type EntitySummary,
  type TeamMember,
} from "@/lib/api-client";

interface EditDraft {
  title: string;
  dealType: "buy_side" | "sell_side";
  targetId: string;
  currency: "BRL" | "USD" | "EUR";
  valuationMin: string;
  valuationMax: string;
  leadAdvisorId: string;
  internalNote: string;
}

type EditErrors = Partial<Record<keyof EditDraft, string>>;
type ToastState = {
  title: string;
  message: string;
  variant: "success" | "error";
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function internalNote(deal: DealDetail) {
  const structure = deal.financialStructure;
  return structure && typeof structure.internalNote === "string"
    ? structure.internalNote
    : "";
}

function draftFromDeal(deal: DealDetail): EditDraft {
  return {
    title: deal.title,
    dealType: deal.dealType,
    targetId: deal.target.id,
    currency: deal.valuationRange.min.currency,
    valuationMin: String(Number(deal.valuationRange.min.amountMinor) / 100),
    valuationMax: String(Number(deal.valuationRange.max.amountMinor) / 100),
    leadAdvisorId: deal.leadAdvisor?.id ?? "",
    internalNote: internalNote(deal),
  };
}

function validateEdit(draft: EditDraft): EditErrors {
  const errors: EditErrors = {};
  const minimum = Number(draft.valuationMin);
  const maximum = Number(draft.valuationMax);
  if (!draft.title.trim()) errors.title = "Enter a project title.";
  if (!draft.targetId) errors.targetId = "Select a target.";
  if (!draft.valuationMin || !Number.isFinite(minimum) || minimum <= 0) {
    errors.valuationMin = "Enter a valuation greater than zero.";
  }
  if (!draft.valuationMax || !Number.isFinite(maximum) || maximum <= 0) {
    errors.valuationMax = "Enter a valuation greater than zero.";
  } else if (maximum < minimum) {
    errors.valuationMax = "Maximum valuation must be at least the minimum.";
  }
  return errors;
}

function DetailLoading() {
  return (
    <div
      className="space-y-8 p-8"
      aria-label="Loading deal detail"
    >
      <div className="flex items-center justify-between gap-6">
        <div className="w-full max-w-xl">
          <Skeleton width="30%" />
          <Skeleton width="75%" height={36} />
        </div>
        <Skeleton variant="rectangular" width={520} height={44} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Skeleton
          className="xl:col-span-8"
          variant="rectangular"
          height={620}
        />
        <div className="space-y-6 xl:col-span-4">
          <Skeleton variant="rectangular" height={220} />
          <Skeleton variant="rectangular" height={220} />
        </div>
      </div>
    </div>
  );
}

export default function DealPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = use(params);
  const router = useRouter();
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [phaseOpen, setPhaseOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [editErrors, setEditErrors] = useState<EditErrors>({});
  const [targets, setTargets] = useState<EntitySummary[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [targetPhase, setTargetPhase] = useState<DashboardPhase>("negotiation");
  const [phaseComment, setPhaseComment] = useState("");
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadDeal = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setDeal(await ApiClient.getDealDetail(id));
    } catch (cause) {
      setDeal(null);
      setLoadError(
        cause instanceof Error
          ? cause.message
          : "The deal could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDeal(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDeal]);

  const openEdit = async () => {
    if (!deal) return;
    setDraft(draftFromDeal(deal));
    setEditErrors({});
    setOptionsError(null);
    setEditOpen(true);
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
  };

  const submitEdit = async () => {
    if (!deal || !draft) return;
    const errors = validateEdit(draft);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) {
      setToast({
        title: "Review required fields",
        message: "Correct the highlighted deal fields.",
        variant: "error",
      });
      return;
    }
    setSaving(true);
    try {
      const updated = await ApiClient.updateDeal(deal.id, {
        title: draft.title.trim(),
        dealType: draft.dealType,
        targetId: draft.targetId,
        valuationRange: {
          min: {
            amountMinor: String(Math.round(Number(draft.valuationMin) * 100)),
            currency: draft.currency,
          },
          max: {
            amountMinor: String(Math.round(Number(draft.valuationMax) * 100)),
            currency: draft.currency,
          },
        },
        leadAdvisorId: draft.leadAdvisorId || null,
        financialStructure: draft.internalNote.trim()
          ? { internalNote: draft.internalNote.trim() }
          : null,
        version: deal.version,
      });
      setDeal(updated);
      setEditOpen(false);
      setToast({
        title: "Deal updated",
        message: `${updated.title} now reflects the saved changes.`,
        variant: "success",
      });
    } catch (cause) {
      if (cause instanceof APIError && cause.kind === "conflict") {
        setConflictOpen(true);
      } else if (cause instanceof APIError && cause.fieldErrors) {
        setEditErrors(
          Object.fromEntries(
            Object.entries(cause.fieldErrors).map((
              [field, messages],
            ) => [field, messages[0]]),
          ) as EditErrors,
        );
      } else {
        setToast({
          title: "Deal not updated",
          message: cause instanceof Error ? cause.message : "Try again.",
          variant: "error",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!deal) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      await ApiClient.archiveDeal(deal.id, deal.version);
      router.push("/deals?notice=deal-archived");
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

  const openPhase = () => {
    if (!deal) return;
    const currentIndex = DASHBOARD_PHASES.indexOf(deal.currentPhase);
    setTargetPhase(
      DASHBOARD_PHASES[Math.min(currentIndex + 1, DASHBOARD_PHASES.length - 1)],
    );
    setPhaseComment("");
    setPhaseError(null);
    setPhaseOpen(true);
  };

  const submitPhase = async () => {
    if (!deal) return;
    if (!phaseComment.trim()) {
      setPhaseError("Add the required transition comment.");
      setToast({
        title: "Transition not submitted",
        message: "A transition comment is required.",
        variant: "error",
      });
      return;
    }
    setMoving(true);
    setPhaseError(null);
    try {
      await ApiClient.transitionDealPhase(deal.id, {
        toPhase: targetPhase,
        comment: phaseComment.trim(),
        version: deal.version,
      });
      setPhaseOpen(false);
      router.push("/?notice=phase-transitioned");
    } catch (cause) {
      if (cause instanceof APIError && cause.kind === "conflict") {
        setConflictOpen(true);
      } else {
        const message = cause instanceof Error
          ? cause.message
          : "The phase could not be changed.";
        setPhaseError(message);
        setToast({ title: "Transition failed", message, variant: "error" });
      }
    } finally {
      setMoving(false);
    }
  };

  const phaseItems = useMemo(() =>
    deal?.phaseHistory.map((entry) => ({
      id: entry.id,
      title: PHASE_LABELS[entry.toPhase],
      subtitle: formatDate(entry.changedAt),
      badge: entry.toPhase === deal.currentPhase ? "Current" : undefined,
      content: (
        <div className="space-y-2">
          <p>{entry.comment ?? "No transition comment."}</p>
          <p className="text-slate-gray">
            Changed by {entry.changedBy?.displayName ?? "System"}
          </p>
        </div>
      ),
    })) ?? [], [deal]);

  if (loading) return <DetailLoading />;

  if (!deal) {
    return (
      <div className="p-8">
        <Card
          variant="raised"
          className="flex min-h-[360px] flex-col items-center justify-center text-center"
        >
          <Icon name="alert" size="xl" className="text-signal-orange" />
          <h1 className="mt-4 text-xl font-semibold">
            Deal could not be loaded
          </h1>
          <p className="mt-2 max-w-lg text-sm text-slate-gray">{loadError}</p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => void loadDeal()}>Retry</Button>
            <Link href="/deals">
              <Button variant="secondary">Return to deals</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
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
            Version {deal.version} · Updated {formatDate(deal.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void openEdit()}>
            Edit deal
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setArchiveError(null);
              setArchiveOpen(true);
            }}
          >
            Archive
          </Button>
          <Button
            variant="primary"
            onClick={openPhase}
            disabled={deal.currentPhase === "closing"}
          >
            Change phase
          </Button>
          <Link href={`/deals/${deal.id}/chat`}>
            <Button variant="secondary">Open Agent Chat</Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <main className="space-y-6 xl:col-span-8">
          <Card variant="raised" padding="lg">
            <p className="text-xs font-bold uppercase tracking-wider text-signal-orange">
              Deal fundamentals
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink-black">
              Target and valuation
            </h2>
            <Divider spacing="lg" />
            <dl className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-gray">
                  Target
                </dt>
                <dd className="mt-2 text-base font-semibold">
                  {deal.target.legalName}
                </dd>
                <dd className="mt-1 text-sm text-slate-gray">
                  {deal.target.sector} · {deal.target.countryCode}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-gray">
                  Valuation range
                </dt>
                <dd className="mt-2 text-base font-semibold">
                  {formatMoneyRange(deal)}
                </dd>
                <dd className="mt-1 text-sm text-slate-gray">
                  {deal.dealType === "buy_side" ? "Buy-side" : "Sell-side"}
                </dd>
              </div>
            </dl>
            <Divider spacing="lg" />
            <div>
              <h3 className="text-sm font-semibold">Financial structure</h3>
              {deal.financialStructure &&
                  Object.keys(deal.financialStructure).length > 0
                ? (
                  <dl className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {Object.entries(deal.financialStructure).map((
                      [key, value],
                    ) => (
                      <div key={key}>
                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-gray">
                          {key.replace(/([A-Z])/g, " $1")}
                        </dt>
                        <dd className="mt-1 text-sm text-ink-black">
                          {typeof value === "string" ||
                              typeof value === "number"
                            ? String(value)
                            : JSON.stringify(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )
                : (
                  <p className="mt-2 text-sm text-slate-gray">
                    No financial structure has been recorded.
                  </p>
                )}
            </div>
            <Divider spacing="lg" />
            <div>
              <h3 className="mb-4 text-sm font-semibold">Phase history</h3>
              {phaseItems.length > 0
                ? (
                  <Accordion
                    items={phaseItems}
                    variant="bordered"
                    defaultOpenIds={[phaseItems[phaseItems.length - 1].id]}
                  />
                )
                : (
                  <EmptyState
                    title="No phase history"
                    description="Phase transitions will appear here after they are recorded."
                  />
                )}
            </div>
          </Card>
        </main>

        <aside className="space-y-6 xl:col-span-4">
          <Card variant="default">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
              Lead advisor
            </p>
            {deal.leadAdvisor
              ? (
                <div className="mt-4 flex items-center gap-3">
                  <Avatar
                    src={deal.leadAdvisor.avatarUrl ?? undefined}
                    fallback={initials(deal.leadAdvisor.displayName)}
                    size="lg"
                  />
                  <div>
                    <p className="font-semibold">
                      {deal.leadAdvisor.displayName}
                    </p>
                    <p className="text-xs text-slate-gray">Mandate lead</p>
                  </div>
                </div>
              )
              : (
                <p className="mt-3 text-sm text-slate-gray">
                  No lead advisor assigned.
                </p>
              )}
          </Card>
          <Card variant="default">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
              Deal team
            </p>
            <div className="mt-4 space-y-3">
              {deal.teamAssignments.length > 0
                ? deal.teamAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center gap-3">
                    <Avatar
                      src={assignment.teamMember.avatarUrl ?? undefined}
                      fallback={initials(assignment.teamMember.displayName)}
                      size="md"
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        {assignment.teamMember.displayName}
                      </p>
                      <p className="text-xs text-slate-gray">
                        {assignment.assignmentRole}
                      </p>
                    </div>
                    {assignment.isLead && (
                      <Badge variant="outline" className="ml-auto">Lead</Badge>
                    )}
                  </div>
                ))
                : (
                  <p className="text-sm text-slate-gray">
                    No synchronized team assignments.
                  </p>
                )}
            </div>
            <Divider />
            <Button variant="secondary" size="sm" disabled>
              Manage assignments
            </Button>
            <p className="mt-2 text-xs text-slate-gray">
              Available after team synchronization.
            </p>
          </Card>
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
      </div>

      <Modal
        isOpen={editOpen}
        onClose={() => {
          if (!saving) setEditOpen(false);
        }}
        title="Edit deal"
        subtitle={`Editing version ${deal.version}`}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={saving || optionsLoading || Boolean(optionsError)}
              onClick={() => void submitEdit()}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        {optionsLoading
          ? (
            <div className="space-y-5" aria-label="Loading edit form">
              <Skeleton />
              <Skeleton variant="rectangular" height={44} />
              <Skeleton />
              <Skeleton variant="rectangular" height={44} />
              <Skeleton variant="rectangular" height={100} />
            </div>
          )
          : optionsError
          ? (
            <Card variant="raised">
              <Icon name="alert" className="text-signal-orange" />
              <h3 className="mt-3 font-semibold">Form options unavailable</h3>
              <p className="mt-1 text-xs text-slate-gray">{optionsError}</p>
              <Button
                className="mt-4"
                variant="secondary"
                size="sm"
                onClick={() => void openEdit()}
              >
                Retry
              </Button>
            </Card>
          )
          : draft && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                label="Project title"
                required
                error={editErrors.title}
                className="md:col-span-2"
              >
                <Input
                  autoFocus
                  value={draft.title}
                  hasError={Boolean(editErrors.title)}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })}
                />
              </FormField>
              <FormField label="Deal type" required>
                <Dropdown
                  value={draft.dealType}
                  options={[{ value: "buy_side", label: "Buy-side" }, {
                    value: "sell_side",
                    label: "Sell-side",
                  }]}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      dealType: value as EditDraft["dealType"],
                    })}
                />
              </FormField>
              <FormField label="Target" required error={editErrors.targetId}>
                <Dropdown
                  searchable
                  value={draft.targetId}
                  error={editErrors.targetId}
                  options={targets.map((target) => ({
                    value: target.id,
                    label: target.legalName,
                  }))}
                  onChange={(value) =>
                    setDraft({ ...draft, targetId: value as string })}
                />
              </FormField>
              <FormField
                label="Valuation minimum"
                required
                error={editErrors.valuationMin}
              >
                <Input
                  type="number"
                  min="0"
                  value={draft.valuationMin}
                  hasError={Boolean(editErrors.valuationMin)}
                  onChange={(event) =>
                    setDraft({ ...draft, valuationMin: event.target.value })}
                />
              </FormField>
              <FormField
                label="Valuation maximum"
                required
                error={editErrors.valuationMax}
              >
                <Input
                  type="number"
                  min="0"
                  value={draft.valuationMax}
                  hasError={Boolean(editErrors.valuationMax)}
                  onChange={(event) =>
                    setDraft({ ...draft, valuationMax: event.target.value })}
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
                    setDraft({
                      ...draft,
                      currency: value as EditDraft["currency"],
                    })}
                />
              </FormField>
              <FormField label="Lead advisor">
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
                    setDraft({ ...draft, leadAdvisorId: value as string })}
                />
              </FormField>
              <FormField label="Internal note" className="md:col-span-2">
                <Textarea
                  value={draft.internalNote}
                  onChange={(event) =>
                    setDraft({ ...draft, internalNote: event.target.value })}
                />
              </FormField>
            </div>
          )}
      </Modal>

      <Modal
        isOpen={archiveOpen}
        onClose={() => {
          if (!archiving) setArchiveOpen(false);
        }}
        title={`Archive ${deal.title}?`}
        subtitle="This reversible action removes the deal from the active pipeline."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={archiving}
              onClick={() => setArchiveOpen(false)}
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
          The deal and its history remain available as an archived record.
        </p>
        {archiveError && (
          <p className="mt-4 text-xs font-semibold text-red-600">
            {archiveError}
          </p>
        )}
      </Modal>

      <Modal
        isOpen={phaseOpen}
        onClose={() => {
          if (!moving) setPhaseOpen(false);
        }}
        title={`Move ${deal.title} to ${PHASE_LABELS[targetPhase]}`}
        subtitle="Sequential workflow transition"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={moving}
              onClick={() => setPhaseOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={moving}
              onClick={() => void submitPhase()}
            >
              {moving ? "Moving…" : "Move deal"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <FormField label="Destination phase" required>
            <Dropdown
              value={targetPhase}
              options={DASHBOARD_PHASES.filter((phase) =>
                phase !== deal.currentPhase
              ).map((phase) => ({ value: phase, label: PHASE_LABELS[phase] }))}
              onChange={(value) => setTargetPhase(value as DashboardPhase)}
            />
          </FormField>
          <FormField
            label="Transition comment"
            required
            error={phaseError ?? undefined}
          >
            <Textarea
              value={phaseComment}
              hasError={Boolean(phaseError)}
              onChange={(event) => setPhaseComment(event.target.value)}
              placeholder="Explain why this deal is ready to move."
            />
          </FormField>
          <p className="font-public-sans text-xs text-slate-gray">
            Submitting against current deal version {deal.version}.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={conflictOpen}
        onClose={() => setConflictOpen(false)}
        title={`${deal.title} was updated elsewhere`}
        subtitle="Your entered values have been preserved."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConflictOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConflictOpen(false);
                setEditOpen(false);
                setPhaseOpen(false);
                void loadDeal();
              }}
            >
              Reload current deal
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-gray">
          Reload the current deal before deciding whether to reapply these
          changes. Nothing was overwritten.
        </p>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
