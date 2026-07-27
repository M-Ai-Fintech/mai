import type { CountryCode } from "@/components/CountrySelector/CountrySelector";
import { ApiClient, APIError, type EntitySummary } from "@/lib/api-client";

import { firstDropdownValue, isEntityRole } from "./entity-options";
import { EMPTY_ENTITY_FORM, entityToForm, toEntityWrite } from "./entity-state";
import {
  clearFilters,
  closeSavedForm,
  errorMessage,
  isVersionConflict,
  persistEntityForm,
  type QuerySyncPatch,
  replaceWorkspaceQuery,
  showBackendErrors,
  showEntityUnavailable,
  updateCountryFilter,
  updateSearchFilter,
  validateCurrentForm,
  type WorkspaceToastState,
} from "./entities-workspace-controller";
import { modalRoleLabel } from "./entities-workspace-derived";
import type {
  WorkspaceActions,
  WorkspaceRuntime,
} from "./entities-workspace-types";

export function buildWorkspaceActions(
  runtime: WorkspaceRuntime,
): WorkspaceActions {
  return {
    closeForm: () => closeWorkspaceForm(runtime),
    openCreate: () => openWorkspaceCreate(runtime),
    saveEntity: () => void saveWorkspaceEntity(runtime),
    archiveEntity: () => void archiveWorkspaceEntity(runtime),
    reloadConflictedEntity: () => void reloadWorkspaceEntity(runtime),
    selectRole: (role) => selectWorkspaceRole(runtime, role),
    setSectorFilter: (sector) => setWorkspaceSector(runtime, sector),
    setEditingState: (entity) => setWorkspaceEditingState(runtime, entity),
  };
}

export function showUnavailableEdit(
  setToast: (toast: WorkspaceToastState) => void,
) {
  setToast({
    title: "Entity unavailable",
    message: "The selected entity could not be opened for editing.",
    variant: "error",
  });
}

function replaceQuery(
  runtime: WorkspaceRuntime,
  next: QuerySyncPatch,
) {
  replaceWorkspaceQuery({ ...runtime.filters, ...next });
}

function setWorkspaceEditingState(
  runtime: WorkspaceRuntime,
  entity: EntitySummary,
) {
  runtime.formState.setEditingEntity(entity);
  runtime.formState.setForm(entityToForm(entity));
  runtime.formState.setFormErrors({});
  runtime.formState.setModalMode("edit");
}

function openWorkspaceCreate(runtime: WorkspaceRuntime) {
  runtime.formState.setEditingEntity(null);
  runtime.formState.setForm({
    ...EMPTY_ENTITY_FORM,
    roles: [runtime.filters.role],
  });
  runtime.formState.setFormErrors({});
  runtime.formState.setModalMode("create");
}

function closeWorkspaceForm(runtime: WorkspaceRuntime) {
  if (runtime.status.saving) return;
  runtime.formState.setModalMode(null);
  runtime.formState.setEditingEntity(null);
  runtime.formState.setFormErrors({});
}

async function saveWorkspaceEntity(runtime: WorkspaceRuntime) {
  if (!workspaceFormIsValid(runtime)) return;
  runtime.status.setSaving(true);
  try {
    await persistWorkspaceForm(runtime);
    handleSaveSuccess(runtime, toEntityWrite(runtime.formState.form).legalName);
  } catch (error) {
    handleSaveError(runtime, error);
  } finally {
    runtime.status.setSaving(false);
  }
}

function workspaceFormIsValid(runtime: WorkspaceRuntime): boolean {
  return validateCurrentForm(
    runtime.formState.form,
    runtime.formState.setFormErrors,
    runtime.focusFirstInvalidField,
  );
}

async function persistWorkspaceForm(runtime: WorkspaceRuntime) {
  await persistEntityForm(
    runtime.formState.form,
    runtime.formState.modalMode,
    runtime.formState.editingEntity,
  );
}

function handleSaveSuccess(runtime: WorkspaceRuntime, entityName: string) {
  runtime.status.setToast({
    title: saveToastTitle(runtime),
    message: `${entityName} is now available in the entity workspace.`,
    variant: "success",
  });
  closeSavedForm(
    runtime.formState.setModalMode,
    runtime.formState.setEditingEntity,
    runtime.rows.setPage,
    runtime.load.setReloadKey,
  );
}

function handleSaveError(runtime: WorkspaceRuntime, error: unknown) {
  if (error instanceof APIError && error.fieldErrors) {
    showBackendErrors(
      error,
      runtime.formState.setFormErrors,
      runtime.focusFirstInvalidField,
    );
  }
  if (isVersionConflict(error)) runtime.status.setVersionConflictOpen(true);
  runtime.status.setToast({
    title: `${modalRoleLabel(runtime)} was not saved`,
    message: errorMessage(error),
    variant: "error",
  });
}

async function archiveWorkspaceEntity(runtime: WorkspaceRuntime) {
  if (!runtime.status.archiveTarget) return;
  runtime.status.setSaving(true);
  try {
    await archiveTargetEntity(runtime.status.archiveTarget);
    handleArchiveSuccess(runtime, runtime.status.archiveTarget);
  } catch (error) {
    handleArchiveError(runtime, error);
  } finally {
    runtime.status.setSaving(false);
  }
}

async function archiveTargetEntity(entity: EntitySummary) {
  await ApiClient.archiveEntity(entity.id, entity.version);
}

function handleArchiveSuccess(
  runtime: WorkspaceRuntime,
  entity: EntitySummary,
) {
  runtime.status.setToast({
    title: "Entity archived",
    message: `${entity.legalName} was removed from active results.`,
    variant: "success",
  });
  runtime.status.setArchiveTarget(null);
  runtime.status.setArchiveBlocked(null);
  runtime.load.setReloadKey((key) => key + 1);
}

function handleArchiveError(runtime: WorkspaceRuntime, error: unknown) {
  runtime.status.setArchiveBlocked(errorMessage(error, activeDealsMessage()));
  runtime.status.setToast({
    title: "Entity was not archived",
    message: error instanceof Error ? error.message : "Try again.",
    variant: "error",
  });
}

async function reloadWorkspaceEntity(runtime: WorkspaceRuntime) {
  if (!runtime.formState.editingEntity) return;
  try {
    const current = await ApiClient.getEntityById(
      runtime.formState.editingEntity.id,
    );
    setWorkspaceEditingState(runtime, current);
    runtime.status.setVersionConflictOpen(false);
  } catch (cause) {
    showEntityUnavailable(cause, runtime.status.setToast);
  }
}

function setWorkspaceSector(
  runtime: WorkspaceRuntime,
  value: string | string[],
) {
  const nextSector = firstDropdownValue(value);
  runtime.filters.setSector(nextSector);
  runtime.rows.setPage(1);
  replaceQuery(runtime, { sector: nextSector });
}

function selectWorkspaceRole(runtime: WorkspaceRuntime, nextRole: string) {
  if (!isEntityRole(nextRole)) return;
  runtime.filters.setRole(nextRole);
  runtime.rows.setPage(1);
  replaceQuery(runtime, { role: nextRole });
}

function updateWorkspaceSearch(runtime: WorkspaceRuntime, value: string) {
  updateSearchFilter(
    value,
    runtime.filters.setSearch,
    runtime.rows.setPage,
    (next) => replaceQuery(runtime, next),
  );
}

function updateWorkspaceCountry(runtime: WorkspaceRuntime, value: CountryCode) {
  updateCountryFilter(
    value,
    runtime.filters.setCountryCode,
    runtime.rows.setPage,
    (next) => replaceQuery(runtime, next),
  );
}

export function workspaceSearchHandler(runtime: WorkspaceRuntime) {
  return (value: string) => updateWorkspaceSearch(runtime, value);
}

export function workspaceCountryHandler(runtime: WorkspaceRuntime) {
  return (value: CountryCode) => updateWorkspaceCountry(runtime, value);
}

export function clearWorkspaceFilters(runtime: WorkspaceRuntime) {
  clearFilters(
    runtime.filters.setSearch,
    runtime.filters.setSector,
    runtime.filters.setCountryCode,
    runtime.rows.setPage,
    (next) => replaceQuery(runtime, next),
  );
}

export function openArchiveTarget(
  runtime: WorkspaceRuntime,
  entity: EntitySummary,
) {
  runtime.status.setArchiveBlocked(null);
  runtime.status.setArchiveTarget(entity);
}

export function closeArchiveModal(runtime: WorkspaceRuntime) {
  if (!runtime.status.saving) runtime.status.setArchiveTarget(null);
}

function saveToastTitle(runtime: WorkspaceRuntime): string {
  const action = runtime.formState.modalMode === "edit" ? "updated" : "created";
  return `${modalRoleLabel(runtime)} ${action}`;
}

function activeDealsMessage(): string {
  return "This entity cannot be archived while it has active deals.";
}
