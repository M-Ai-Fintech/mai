"use client";

import { Toast } from "@/components/Toast/Toast";
import {
  ArchiveDetailModal,
  ConflictModal,
  EditDealModal,
  PhaseTransitionModal,
} from "./deal-detail-modals";
import {
  DealDetailBody,
  DealDetailHeader,
  DealLoadError,
  DetailLoading,
} from "./deal-detail-panels";
import { useDealDetail } from "./use-deal-detail";

export function DealPageClient({ dealId }: { dealId: string }) {
  const state = useDealDetail(dealId);
  if (state.loading) return <DetailLoading />;
  if (!state.deal) return <DealPageLoadError state={state} />;
  return <DealPageContent state={state} />;
}

function DealPageLoadError(
  { state }: { state: ReturnType<typeof useDealDetail> },
) {
  return (
    <DealLoadError
      loadError={state.loadError}
      onRetry={() => void state.loadDeal()}
    />
  );
}

function DealPageContent(
  { state }: { state: ReturnType<typeof useDealDetail> },
) {
  if (!state.deal) return null;
  return (
    <div className="space-y-8 p-8">
      <DealDetailHeader deal={state.deal} {...dealHeaderActions(state)} />
      <DealDetailBody deal={state.deal} phaseItems={state.phaseItems} />
      <DealPageModals state={state} />
      <DealPageToast state={state} />
    </div>
  );
}

function dealHeaderActions(state: ReturnType<typeof useDealDetail>) {
  return {
    onArchive: () => {
      state.setArchiveError(null);
      state.setArchiveOpen(true);
    },
    onEdit: () => void state.openEdit(),
    onPhase: state.openPhase,
  };
}

function DealPageModals(
  { state }: { state: ReturnType<typeof useDealDetail> },
) {
  if (!state.deal) return null;
  return (
    <>
      <DealEditModal state={state} />
      <DealArchiveModal state={state} />
      <DealPhaseModal state={state} />
      <DealConflictModal state={state} />
    </>
  );
}

function DealEditModal({ state }: { state: ReturnType<typeof useDealDetail> }) {
  if (!state.deal) return null;
  return (
    <EditDealModal
      deal={state.deal}
      draft={state.draft}
      editErrors={state.editErrors}
      editOpen={state.editOpen}
      optionsError={state.optionsError}
      optionsLoading={state.optionsLoading}
      saving={state.saving}
      targets={state.targets}
      teamMembers={state.teamMembers}
      onClose={() => state.setEditOpen(false)}
      onDraftChange={state.setDraft}
      onRetryOptions={() => void state.openEdit()}
      onSubmit={() => void state.submitEdit()}
    />
  );
}

function DealArchiveModal(
  { state }: { state: ReturnType<typeof useDealDetail> },
) {
  if (!state.deal) return null;
  return (
    <ArchiveDetailModal
      archiveError={state.archiveError}
      archiveOpen={state.archiveOpen}
      archiving={state.archiving}
      deal={state.deal}
      onClose={() => state.setArchiveOpen(false)}
      onConfirm={() => void state.confirmArchive()}
    />
  );
}

function DealPhaseModal(
  { state }: { state: ReturnType<typeof useDealDetail> },
) {
  if (!state.deal) return null;
  return (
    <PhaseTransitionModal
      deal={state.deal}
      moving={state.moving}
      phaseComment={state.phaseComment}
      phaseError={state.phaseError}
      phaseOpen={state.phaseOpen}
      targetPhase={state.targetPhase}
      onClose={() => state.setPhaseOpen(false)}
      onCommentChange={state.setPhaseComment}
      onSubmit={() => void state.submitPhase()}
      onTargetPhaseChange={state.setTargetPhase}
    />
  );
}

function DealConflictModal(
  { state }: { state: ReturnType<typeof useDealDetail> },
) {
  if (!state.deal) return null;
  return (
    <ConflictModal
      conflictOpen={state.conflictOpen}
      deal={state.deal}
      onClose={() => state.setConflictOpen(false)}
      onReload={() => reloadConflictedDeal(state)}
    />
  );
}

function reloadConflictedDeal(state: ReturnType<typeof useDealDetail>) {
  state.setConflictOpen(false);
  state.setEditOpen(false);
  state.setPhaseOpen(false);
  void state.loadDeal();
}

function DealPageToast({ state }: { state: ReturnType<typeof useDealDetail> }) {
  if (!state.toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <Toast {...state.toast} onClose={() => state.setToast(null)} />
    </div>
  );
}
