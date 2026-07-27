import { useCallback, useMemo, useState } from "react";
import type { DashboardToast } from "@/components/screens/dashboard/dashboard-model";
import {
  ApiClient,
  APIError,
  type DealDetail,
  type EntitySummary,
  type TeamMember,
} from "@/lib/api-client";
import {
  draftFromDeal,
  type EditDraft,
  editDraftToUpdate,
  type EditErrors,
  fieldErrorsToEditErrors,
  validateEditDraft,
} from "./deal-detail-model";

type SetToast = (toast: DashboardToast | null) => void;
type SetConflictOpen = (open: boolean) => void;

export function useDealEditFlow(
  deal: DealDetail | null,
  setDeal: (deal: DealDetail | null) => void,
  setToast: SetToast,
  setConflictOpen: SetConflictOpen,
) {
  const modal = useEditModalState();
  const options = useEditOptionsState();
  const submitEdit = useSubmitEditAction({
    deal,
    modal,
    setConflictOpen,
    setDeal,
    setToast,
  });
  return useDealEditController(modal, options, deal, submitEdit);
}

function useDealEditController(
  modal: ReturnType<typeof useEditModalState>,
  options: ReturnType<typeof useEditOptionsState>,
  deal: DealDetail | null,
  submitEdit: () => Promise<void>,
) {
  return {
    ...publicEditModalState(modal),
    ...publicEditOptionsState(options),
    openEdit: useOpenEditAction(deal, modal, options),
    submitEdit,
  };
}

function useEditModalState() {
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [editErrors, setEditErrors] = useState<EditErrors>({});
  const [saving, setSaving] = useState(false);
  return useMemo(() => ({
    draft,
    editErrors,
    editOpen,
    saving,
    setDraft,
    setEditErrors,
    setEditOpen,
    setSaving,
  }), [draft, editErrors, editOpen, saving]);
}

function useEditOptionsState() {
  const [targets, setTargets] = useState<EntitySummary[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  return useMemo(() => ({
    optionsError,
    optionsLoading,
    setOptionsError,
    setOptionsLoading,
    setTargets,
    setTeamMembers,
    targets,
    teamMembers,
  }), [optionsError, optionsLoading, targets, teamMembers]);
}

function useOpenEditAction(
  deal: DealDetail | null,
  modal: ReturnType<typeof useEditModalState>,
  options: ReturnType<typeof useEditOptionsState>,
) {
  return useCallback(async () => {
    if (!deal) return;
    prepareEditModal(deal, modal);
    options.setOptionsError(null);
    await loadEditOptions(options);
  }, [deal, modal, options]);
}

function prepareEditModal(
  deal: DealDetail,
  modal: ReturnType<typeof useEditModalState>,
) {
  modal.setDraft(draftFromDeal(deal));
  modal.setEditErrors({});
  modal.setEditOpen(true);
}

interface SubmitEditContext {
  deal: DealDetail | null;
  modal: ReturnType<typeof useEditModalState>;
  setConflictOpen: SetConflictOpen;
  setDeal: (deal: DealDetail | null) => void;
  setToast: SetToast;
}

function useSubmitEditAction(context: SubmitEditContext) {
  return async () => {
    if (!context.deal || !context.modal.draft) return;
    const errors = validateEditDraft(context.modal.draft);
    context.modal.setEditErrors(errors);
    if (Object.keys(errors).length > 0) {
      return showEditValidationToast(context.setToast);
    }
    await saveDealEdit({
      deal: context.deal,
      draft: context.modal.draft,
      modal: context.modal,
      setConflictOpen: context.setConflictOpen,
      setDeal: context.setDeal,
      setToast: context.setToast,
    });
  };
}

function showEditValidationToast(setToast: SetToast) {
  setToast({
    title: "Review required fields",
    message: "Correct the highlighted deal fields.",
    variant: "error",
  });
}

interface SaveDealEditContext {
  deal: DealDetail;
  draft: EditDraft;
  modal: ReturnType<typeof useEditModalState>;
  setConflictOpen: SetConflictOpen;
  setDeal: (deal: DealDetail | null) => void;
  setToast: SetToast;
}

async function saveDealEdit(context: SaveDealEditContext) {
  context.modal.setSaving(true);
  try {
    applySavedDealEdit(await persistDealEdit(context), context);
  } catch (cause) {
    applyEditErrorForContext(cause, context);
  } finally {
    context.modal.setSaving(false);
  }
}

function persistDealEdit(context: SaveDealEditContext) {
  return ApiClient.updateDeal(
    context.deal.id,
    editDraftToUpdate(context.draft, context.deal.version),
  );
}

function applySavedDealEdit(
  updated: DealDetail,
  context: SaveDealEditContext,
) {
  acceptSavedDealEdit(
    updated,
    context.modal,
    context.setDeal,
    context.setToast,
  );
}

function applyEditErrorForContext(
  cause: unknown,
  context: SaveDealEditContext,
) {
  applyEditError(
    cause,
    context.modal.setEditErrors,
    context.setToast,
    context.setConflictOpen,
  );
}

function acceptSavedDealEdit(
  updated: DealDetail,
  modal: ReturnType<typeof useEditModalState>,
  setDeal: (deal: DealDetail | null) => void,
  setToast: SetToast,
) {
  setDeal(updated);
  modal.setEditOpen(false);
  setToast({
    title: "Deal updated",
    message: `${updated.title} now reflects the saved changes.`,
    variant: "success",
  });
}

function applyEditError(
  cause: unknown,
  setEditErrors: (errors: EditErrors) => void,
  setToast: SetToast,
  setConflictOpen: SetConflictOpen,
) {
  if (cause instanceof APIError && cause.kind === "conflict") {
    return setConflictOpen(true);
  }
  if (cause instanceof APIError && cause.fieldErrors) {
    setEditErrors(fieldErrorsToEditErrors(cause.fieldErrors));
    return;
  }
  setToast({
    title: "Deal not updated",
    message: cause instanceof Error ? cause.message : "Try again.",
    variant: "error",
  });
}

function publicEditModalState(modal: ReturnType<typeof useEditModalState>) {
  return {
    draft: modal.draft,
    editErrors: modal.editErrors,
    editOpen: modal.editOpen,
    saving: modal.saving,
    setDraft: modal.setDraft,
    setEditOpen: modal.setEditOpen,
  };
}

function publicEditOptionsState(
  options: ReturnType<typeof useEditOptionsState>,
) {
  return {
    optionsError: options.optionsError,
    optionsLoading: options.optionsLoading,
    targets: options.targets,
    teamMembers: options.teamMembers,
  };
}

async function loadEditOptions(
  options: ReturnType<typeof useEditOptionsState>,
) {
  options.setOptionsLoading(true);
  try {
    const [entityPage, teamPage] = await fetchEditOptionPages();
    options.setTargets(entityPage.data);
    options.setTeamMembers(teamPage.data.filter((member) => member.active));
  } catch (cause) {
    options.setOptionsError(editOptionsErrorMessage(cause));
  } finally {
    options.setOptionsLoading(false);
  }
}

function fetchEditOptionPages() {
  return Promise.all([
    ApiClient.listEntities({ page: 1, pageSize: 100, role: "target" }),
    ApiClient.listTeamMembers({ page: 1, pageSize: 100 }),
  ]);
}

function editOptionsErrorMessage(cause: unknown) {
  return cause instanceof Error
    ? cause.message
    : "Deal form options could not be loaded.";
}
