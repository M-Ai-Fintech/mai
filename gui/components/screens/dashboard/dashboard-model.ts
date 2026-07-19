import type { DealCreate, DealSummary } from "@/lib/api-client";

export const DASHBOARD_PHASES = [
  "sourcing",
  "due_diligence",
  "negotiation",
  "closing",
] as const;

export type DashboardPhase = (typeof DASHBOARD_PHASES)[number];
export type DashboardView = "kanban" | "table" | "timeline";

export const PHASE_LABELS: Record<DashboardPhase, string> = {
  sourcing: "Sourcing",
  due_diligence: "Due Diligence",
  negotiation: "Negotiation",
  closing: "Closing",
};

export interface DealDraft {
  title: string;
  dealType: "buy_side" | "sell_side";
  phase: "sourcing";
  targetId: string;
  currency: "BRL" | "USD" | "EUR";
  valuationMin: string;
  valuationMax: string;
  leadAdvisorId: string;
  internalNote: string;
}

export const EMPTY_DEAL_DRAFT: DealDraft = {
  title: "",
  dealType: "buy_side",
  phase: "sourcing",
  targetId: "",
  currency: "BRL",
  valuationMin: "",
  valuationMax: "",
  leadAdvisorId: "",
  internalNote: "",
};

export type DealDraftErrors = Partial<Record<keyof DealDraft, string>>;

export function groupDealsByPhase(deals: DealSummary[]) {
  return DASHBOARD_PHASES.reduce<Record<DashboardPhase, DealSummary[]>>(
    (groups, phase) => {
      groups[phase] = deals.filter((deal) => deal.currentPhase === phase);
      return groups;
    },
    { sourcing: [], due_diligence: [], negotiation: [], closing: [] },
  );
}

export function validateDealDraft(draft: DealDraft): DealDraftErrors {
  const errors: DealDraftErrors = {};
  const minimum = Number(draft.valuationMin);
  const maximum = Number(draft.valuationMax);

  if (!draft.title.trim()) errors.title = "Enter a deal title.";
  if (!draft.targetId) errors.targetId = "Select a target entity.";
  if (!draft.valuationMin || !Number.isFinite(minimum) || minimum <= 0) {
    errors.valuationMin = "Enter a valuation greater than zero.";
  }
  if (!draft.valuationMax || !Number.isFinite(maximum) || maximum <= 0) {
    errors.valuationMax = "Enter a valuation greater than zero.";
  } else if (Number.isFinite(minimum) && maximum < minimum) {
    errors.valuationMax = "Maximum valuation must be at least the minimum.";
  }

  return errors;
}

export function toDealCreate(draft: DealDraft, code: string): DealCreate {
  return {
    code,
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
  };
}

export function formatMoneyRange(deal: DealSummary, locale = "en-US") {
  const currency = deal.valuationRange.min.currency;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return `${formatter.format(Number(deal.valuationRange.min.amountMinor) / 100)} – ${formatter.format(
    Number(deal.valuationRange.max.amountMinor) / 100,
  )}`;
}
