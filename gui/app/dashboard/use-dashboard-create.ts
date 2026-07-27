"use client";

import { useCallback, useState } from "react";
import {
  type DashboardToast,
  type DealDraft,
  type DealDraftErrors,
  EMPTY_DEAL_DRAFT,
  fieldErrorsToDealDraftErrors,
  toDealCreate,
  validateDealDraft,
} from "@/components/screens/dashboard/dashboard-model";
import {
  ApiClient,
  APIError,
  type EntitySummary,
  type TeamMember,
} from "@/lib/api-client";

export function useDashboardCreate(onCreated: () => Promise<void>) {
  const form = useDashboardCreateFormState();
  const options = useDashboardCreateOptionsState();
  const openCreate = useOpenCreateAction(form, options);
  const submitCreate = useSubmitCreateAction(form, onCreated);

  return {
    ...publicCreateFormState(form),
    ...publicCreateOptionsState(options),
    openCreate,
    submitCreate,
  };
}

function useDashboardCreateFormState() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draft, setDraft] = useState<DealDraft>(EMPTY_DEAL_DRAFT);
  const [draftErrors, setDraftErrors] = useState<DealDraftErrors>({});
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<DashboardToast | null>(null);
  return {
    creating,
    draft,
    draftErrors,
    isCreateOpen,
    setCreating,
    setDraft,
    setDraftErrors,
    setIsCreateOpen,
    setToast,
    toast,
  };
}

function useDashboardCreateOptionsState() {
  const [targets, setTargets] = useState<EntitySummary[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  return {
    optionsError,
    optionsLoading,
    setOptionsError,
    setOptionsLoading,
    setTargets,
    setTeamMembers,
    targets,
    teamMembers,
  };
}

function useOpenCreateAction(
  form: ReturnType<typeof useDashboardCreateFormState>,
  options: ReturnType<typeof useDashboardCreateOptionsState>,
) {
  return useCallback(async () => {
    resetCreateForm(form);
    options.setOptionsError(null);
    options.setOptionsLoading(true);
    await loadCreateOptions(options);
  }, [form, options]);
}

function useSubmitCreateAction(
  form: ReturnType<typeof useDashboardCreateFormState>,
  onCreated: () => Promise<void>,
) {
  return async () => {
    const { draft } = form;
    const clientErrors = validateDealDraft(draft);
    form.setDraftErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      form.setToast({
        title: "Review required fields",
        message: "Correct the highlighted deal fields and submit again.",
        variant: "error",
      });
      return;
    }
    await createValidDeal(onCreated, form);
  };
}

function publicCreateFormState(
  form: ReturnType<typeof useDashboardCreateFormState>,
) {
  return {
    creating: form.creating,
    draft: form.draft,
    draftErrors: form.draftErrors,
    isCreateOpen: form.isCreateOpen,
    setDraft: form.setDraft,
    setIsCreateOpen: form.setIsCreateOpen,
    setToast: form.setToast,
    toast: form.toast,
  };
}

function publicCreateOptionsState(
  options: ReturnType<typeof useDashboardCreateOptionsState>,
) {
  return {
    optionsError: options.optionsError,
    optionsLoading: options.optionsLoading,
    targets: options.targets,
    teamMembers: options.teamMembers,
  };
}

function resetCreateForm(form: ReturnType<typeof useDashboardCreateFormState>) {
  form.setIsCreateOpen(true);
  form.setDraft(EMPTY_DEAL_DRAFT);
  form.setDraftErrors({});
}

async function loadCreateOptions(
  options: ReturnType<typeof useDashboardCreateOptionsState>,
) {
  try {
    const [entityPage, teamPage] = await fetchCreateOptionPages();
    options.setTargets(entityPage.data);
    options.setTeamMembers(teamPage.data.filter((member) => member.active));
  } catch (cause) {
    options.setOptionsError(createOptionsErrorMessage(cause));
  } finally {
    options.setOptionsLoading(false);
  }
}

function fetchCreateOptionPages() {
  return Promise.all([
    ApiClient.listEntities({ page: 1, pageSize: 100, role: "target" }),
    ApiClient.listTeamMembers({ page: 1, pageSize: 100 }),
  ]);
}

function createOptionsErrorMessage(cause: unknown) {
  return cause instanceof Error
    ? cause.message
    : "Deal form options could not be loaded.";
}

async function createValidDeal(
  onCreated: () => Promise<void>,
  form: ReturnType<typeof useDashboardCreateFormState>,
) {
  form.setCreating(true);
  try {
    const code = `DEAL-${Date.now().toString(36).toUpperCase()}`;
    await ApiClient.createDeal(toDealCreate(form.draft, code));
    applyCreatedDeal(form);
    await onCreated();
  } catch (cause) {
    applyCreateError(cause, form.setDraftErrors, form.setToast);
  } finally {
    form.setCreating(false);
  }
}

function applyCreatedDeal(
  form: ReturnType<typeof useDashboardCreateFormState>,
) {
  form.setIsCreateOpen(false);
  form.setToast({
    title: "Deal created",
    message: `${form.draft.title.trim()} was added to Sourcing.`,
    variant: "success",
  });
}

function applyCreateError(
  cause: unknown,
  setDraftErrors: (errors: DealDraftErrors) => void,
  setToast: (toast: DashboardToast | null) => void,
) {
  if (cause instanceof APIError && cause.fieldErrors) {
    setDraftErrors(fieldErrorsToDealDraftErrors(cause.fieldErrors));
    return;
  }
  setToast({
    title: "Deal not created",
    message: cause instanceof Error ? cause.message : "Try again.",
    variant: "error",
  });
}
