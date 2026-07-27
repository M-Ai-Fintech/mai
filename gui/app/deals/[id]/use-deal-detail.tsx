"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type DashboardPhase,
  type DashboardToast,
  PHASE_LABELS,
} from "@/components/screens/dashboard/dashboard-model";
import { ApiClient, APIError, type DealDetail } from "@/lib/api-client";
import { formatDealDetailDate, nextSequentialPhase } from "./deal-detail-model";
import { DealPhaseHistoryContent } from "./deal-phase-history-content";
import { useDealEditFlow } from "./use-deal-edit-flow";

type RoutePush = ReturnType<typeof useRouter>["push"];
type SetToast = (toast: DashboardToast | null) => void;
type SetConflictOpen = (open: boolean) => void;

interface DealDetailUiState {
  conflictOpen: boolean;
  setConflictOpen: SetConflictOpen;
  setToast: SetToast;
  toast: DashboardToast | null;
}

export function useDealDetail(dealId: string) {
  const router = useRouter();
  const record = useDealRecord(dealId);
  const ui = useDealDetailUiState();
  const edit = useDealEditFlow(
    record.deal,
    record.setDeal,
    ui.setToast,
    ui.setConflictOpen,
  );
  const archive = useDealArchiveFlow(record.deal, router.push, ui.setToast);
  const phase = useDealPhaseFlow(
    record.deal,
    router.push,
    ui.setToast,
    ui.setConflictOpen,
  );
  const phaseItems = useDealPhaseItems(record.deal);
  return dealDetailState(record, edit, archive, phase, phaseItems, ui);
}

function useDealDetailUiState(): DealDetailUiState {
  const [conflictOpen, setConflictOpen] = useState(false);
  const [toast, setToast] = useState<DashboardToast | null>(null);
  return { conflictOpen, setConflictOpen, setToast, toast };
}

function dealDetailState(
  record: ReturnType<typeof useDealRecord>,
  edit: ReturnType<typeof useDealEditFlow>,
  archive: ReturnType<typeof useDealArchiveFlow>,
  phase: ReturnType<typeof useDealPhaseFlow>,
  phaseItems: ReturnType<typeof useDealPhaseItems>,
  ui: DealDetailUiState,
) {
  return {
    ...publicDealRecord(record),
    ...edit,
    ...archive,
    ...phase,
    conflictOpen: ui.conflictOpen,
    phaseItems,
    setConflictOpen: ui.setConflictOpen,
    setToast: ui.setToast,
    toast: ui.toast,
  };
}

function useDealRecord(dealId: string) {
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadDeal = useLoadDealAction(dealId, setDeal, setLoadError, setLoading);
  useInitialDealLoad(loadDeal);
  return useMemo(() => ({
    deal,
    loadDeal,
    loadError,
    loading,
    setDeal,
  }), [deal, loadDeal, loadError, loading]);
}

function useLoadDealAction(
  dealId: string,
  setDeal: (deal: DealDetail | null) => void,
  setLoadError: (error: string | null) => void,
  setLoading: (loading: boolean) => void,
) {
  return useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    await loadDealById(dealId, setDeal, setLoadError);
    setLoading(false);
  }, [dealId, setDeal, setLoadError, setLoading]);
}

async function loadDealById(
  dealId: string,
  setDeal: (deal: DealDetail | null) => void,
  setLoadError: (error: string | null) => void,
) {
  try {
    setDeal(await ApiClient.getDealDetail(dealId));
  } catch (cause) {
    setDeal(null);
    setLoadError(
      cause instanceof Error ? cause.message : "The deal could not be loaded.",
    );
  }
}

function useInitialDealLoad(loadDeal: () => Promise<void>) {
  useEffect(() => {
    const timer = window.setTimeout(() => void loadDeal(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDeal]);
}

function publicDealRecord(record: ReturnType<typeof useDealRecord>) {
  return {
    deal: record.deal,
    loadDeal: record.loadDeal,
    loadError: record.loadError,
    loading: record.loading,
  };
}

function useDealArchiveFlow(
  deal: DealDetail | null,
  push: RoutePush,
  setToast: SetToast,
) {
  const state = useDealArchiveState();
  const confirmArchive = useConfirmArchiveAction(
    deal,
    push,
    state.setArchiveError,
    state.setArchiving,
    setToast,
  );
  return { ...state, confirmArchive };
}

function useDealArchiveState() {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  return {
    archiveError,
    archiveOpen,
    archiving,
    setArchiveError,
    setArchiveOpen,
    setArchiving,
  };
}

function useConfirmArchiveAction(
  deal: DealDetail | null,
  push: RoutePush,
  setArchiveError: (error: string | null) => void,
  setArchiving: (archiving: boolean) => void,
  setToast: SetToast,
) {
  return async () => {
    if (!deal) return;
    setArchiving(true);
    setArchiveError(null);
    await archiveCurrentDeal(deal, push, setArchiveError, setToast);
    setArchiving(false);
  };
}

async function archiveCurrentDeal(
  deal: DealDetail,
  push: RoutePush,
  setArchiveError: (error: string | null) => void,
  setToast: SetToast,
) {
  try {
    await ApiClient.archiveDeal(deal.id, deal.version);
    push("/deals?notice=deal-archived");
  } catch (cause) {
    const message = cause instanceof Error
      ? cause.message
      : "The deal could not be archived.";
    setArchiveError(message);
    setToast({ title: "Deal not archived", message, variant: "error" });
  }
}

function useDealPhaseFlow(
  deal: DealDetail | null,
  push: RoutePush,
  setToast: SetToast,
  setConflictOpen: SetConflictOpen,
) {
  const state = usePhaseModalState();
  const openPhase = useOpenPhaseAction(deal, state);
  const submitPhase = useSubmitPhaseAction(
    deal,
    push,
    state,
    setToast,
    setConflictOpen,
  );
  return { ...state, openPhase, submitPhase };
}

function usePhaseModalState() {
  const [phaseOpen, setPhaseOpen] = useState(false);
  const [targetPhase, setTargetPhase] = useState<DashboardPhase>("negotiation");
  const [phaseComment, setPhaseComment] = useState("");
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  return useMemo(() => ({
    moving,
    phaseComment,
    phaseError,
    phaseOpen,
    setMoving,
    setPhaseComment,
    setPhaseError,
    setPhaseOpen,
    setTargetPhase,
    targetPhase,
  }), [moving, phaseComment, phaseError, phaseOpen, targetPhase]);
}

function useOpenPhaseAction(
  deal: DealDetail | null,
  state: ReturnType<typeof usePhaseModalState>,
) {
  return useCallback(() => {
    if (!deal) return;
    state.setTargetPhase(nextSequentialPhase(deal.currentPhase));
    state.setPhaseComment("");
    state.setPhaseError(null);
    state.setPhaseOpen(true);
  }, [deal, state]);
}

function useSubmitPhaseAction(
  deal: DealDetail | null,
  push: RoutePush,
  state: ReturnType<typeof usePhaseModalState>,
  setToast: SetToast,
  setConflictOpen: SetConflictOpen,
) {
  return async () => {
    if (!deal || !state.phaseComment.trim()) {
      showPhaseValidationError(state.setPhaseError, setToast);
      return;
    }
    await moveDealPhase(deal, push, state, setToast, setConflictOpen);
  };
}

function showPhaseValidationError(
  setPhaseError: (error: string | null) => void,
  setToast: SetToast,
) {
  setPhaseError("Add the required transition comment.");
  setToast({
    title: "Transition not submitted",
    message: "A transition comment is required.",
    variant: "error",
  });
}

async function moveDealPhase(
  deal: DealDetail,
  push: RoutePush,
  state: ReturnType<typeof usePhaseModalState>,
  setToast: SetToast,
  setConflictOpen: SetConflictOpen,
) {
  state.setMoving(true);
  state.setPhaseError(null);
  try {
    await transitionCurrentDealPhase(deal, state);
    state.setPhaseOpen(false);
    push("/?notice=phase-transitioned");
  } catch (cause) {
    applyPhaseError(cause, state.setPhaseError, setToast, setConflictOpen);
  } finally {
    state.setMoving(false);
  }
}

function transitionCurrentDealPhase(
  deal: DealDetail,
  state: ReturnType<typeof usePhaseModalState>,
) {
  return ApiClient.transitionDealPhase(deal.id, {
    toPhase: state.targetPhase,
    comment: state.phaseComment.trim(),
    version: deal.version,
  });
}

function applyPhaseError(
  cause: unknown,
  setPhaseError: (error: string | null) => void,
  setToast: SetToast,
  setConflictOpen: SetConflictOpen,
) {
  if (cause instanceof APIError && cause.kind === "conflict") {
    return setConflictOpen(true);
  }
  const message = cause instanceof Error
    ? cause.message
    : "The phase could not be changed.";
  setPhaseError(message);
  setToast({ title: "Transition failed", message, variant: "error" });
}

function useDealPhaseItems(deal: DealDetail | null) {
  return useMemo(() =>
    deal?.phaseHistory.map((entry) => ({
      id: entry.id,
      title: PHASE_LABELS[entry.toPhase],
      subtitle: formatDealDetailDate(entry.changedAt),
      badge: entry.toPhase === deal.currentPhase ? "Current" : undefined,
      content: <DealPhaseHistoryContent entry={entry} />,
    })) ?? [], [deal]);
}
