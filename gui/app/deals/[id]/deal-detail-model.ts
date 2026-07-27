import {
  DASHBOARD_PHASES,
  type DashboardPhase,
  PHASE_LABELS,
} from "../../../components/screens/dashboard/dashboard-model";
import type { DealDetail, DealUpdate, Money } from "@/lib/api-client";

export interface EditDraft {
  title: string;
  dealType: "buy_side" | "sell_side";
  targetId: string;
  currency: "BRL" | "USD" | "EUR";
  valuationMin: string;
  valuationMax: string;
  leadAdvisorId: string;
  internalNote: string;
}

export type EditErrors = Partial<Record<keyof EditDraft, string>>;

export function formatDealDetailDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function detailInternalNote(deal: DealDetail) {
  const structure = deal.financialStructure;
  return structure && typeof structure.internalNote === "string"
    ? structure.internalNote
    : "";
}

export function draftFromDeal(deal: DealDetail): EditDraft {
  return {
    title: deal.title,
    dealType: deal.dealType,
    targetId: deal.target.id,
    currency: deal.valuationRange.min.currency,
    valuationMin: String(Number(deal.valuationRange.min.amountMinor) / 100),
    valuationMax: String(Number(deal.valuationRange.max.amountMinor) / 100),
    leadAdvisorId: deal.leadAdvisor?.id ?? "",
    internalNote: detailInternalNote(deal),
  };
}

export function validateEditDraft(draft: EditDraft): EditErrors {
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

export function editDraftToUpdate(
  draft: EditDraft,
  version: number,
): DealUpdate {
  return {
    title: draft.title.trim(),
    dealType: draft.dealType,
    targetId: draft.targetId,
    valuationRange: editDraftValuationRange(draft),
    leadAdvisorId: draft.leadAdvisorId || null,
    financialStructure: editDraftFinancialStructure(draft),
    version,
  };
}

export function editDraftValuationRange(draft: EditDraft) {
  return {
    min: editDraftMoney(draft.valuationMin, draft.currency),
    max: editDraftMoney(draft.valuationMax, draft.currency),
  };
}

function editDraftMoney(
  amount: string,
  currency: EditDraft["currency"],
): Money {
  return {
    amountMinor: String(Math.round(Number(amount) * 100)),
    currency,
  };
}

export function editDraftFinancialStructure(draft: EditDraft) {
  const internalNote = draft.internalNote.trim();
  return internalNote ? { internalNote } : null;
}

export function nextSequentialPhase(currentPhase: DashboardPhase) {
  const currentIndex = DASHBOARD_PHASES.indexOf(currentPhase);
  return DASHBOARD_PHASES[
    Math.min(currentIndex + 1, DASHBOARD_PHASES.length - 1)
  ];
}

export function selectablePhases(currentPhase: DashboardPhase) {
  return DASHBOARD_PHASES
    .filter((phase) => phase !== currentPhase)
    .map((phase) => ({ value: phase, label: PHASE_LABELS[phase] }));
}

export function fieldErrorsToEditErrors(
  fieldErrors: Record<string, string[]>,
): EditErrors {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, messages]) => [
      field,
      messages[0],
    ]),
  ) as EditErrors;
}
