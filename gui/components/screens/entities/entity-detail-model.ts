"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePageBreadcrumbs } from "@/components/Navigation/AppShell";
import {
  ApiClient,
  APIError,
  type DealSummary,
  type EntityDetail as EntityDetailData,
  type TeamMember,
} from "@/lib/api-client";

import {
  type EntityFormErrors,
  type EntityFormState,
  entityToForm,
  firstFieldError,
  toEntityWrite,
  validateEntityForm,
} from "./entity-state";
import type {
  DetailActions,
  DetailArchiveState,
  DetailCollectionsState,
  DetailEditState,
  DetailEntityState,
  DetailRuntime,
  DetailToastState,
  EntityDetailModel,
  LoadedDetailState,
} from "./entity-detail-types";
import type {
  EntityArchiveModalProps,
  EntityArchiveToastProps,
  EntityConflictModalProps,
  EntityDetailGridProps,
  EntityDetailHeaderProps,
  EntityEditModalProps,
} from "./EntityDetailViews";
import {
  archiveReturnQuery,
  buildBreadcrumbs,
} from "./entity-detail-route-model";
import { useEntityInvalidFieldFocus } from "./useEntityInvalidFieldFocus";

export function useEntityDetailModel(entityId: string): EntityDetailModel {
  const runtime = useDetailRuntime(entityId);
  const actions = useDetailActions(runtime);
  useDetailBreadcrumbs(runtime.entity.entity);
  useDetailLoadEffect(runtime, actions.reload);
  return buildEntityDetailModel(runtime, actions);
}

function useDetailRuntime(entityId: string): DetailRuntime {
  const router = useRouter();
  const editFormRef = useRef<HTMLDivElement>(null);
  const focusFirstInvalid = useEntityInvalidFieldFocus(editFormRef);
  return {
    entity: useDetailEntityState(),
    collections: useDetailCollectionsState(),
    edit: useDetailEditState(),
    archive: useDetailArchiveState(),
    editFormRef,
    focusFirstInvalid,
    pushRoute: router.push,
    entityId,
  };
}

function useDetailEntityState(): DetailEntityState {
  const [entity, setEntity] = useState<EntityDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [advisor, setAdvisor] = useState<TeamMember | null>(null);
  return {
    entity,
    loading,
    error,
    advisor,
    setEntity,
    setLoading,
    setError,
    setAdvisor,
  };
}

function useDetailCollectionsState(): DetailCollectionsState {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [relatedDeals, setRelatedDeals] = useState<DealSummary[]>([]);
  return { teamMembers, relatedDeals, setTeamMembers, setRelatedDeals };
}

function useDetailEditState(): DetailEditState {
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EntityFormState | null>(null);
  const [editErrors, setEditErrors] = useState<EntityFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [versionConflictOpen, setVersionConflictOpen] = useState(false);
  return {
    editOpen,
    editForm,
    editErrors,
    saving,
    versionConflictOpen,
    setEditOpen,
    setEditForm,
    setEditErrors,
    setSaving,
    setVersionConflictOpen,
  };
}

function useDetailArchiveState(): DetailArchiveState {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveToastOpen, setArchiveToastOpen] = useState(false);
  const [toast, setToast] = useState<DetailToastState | null>(null);
  return {
    archiveOpen,
    archiving,
    archiveError,
    archiveToastOpen,
    toast,
    setArchiveOpen,
    setArchiving,
    setArchiveError,
    setArchiveToastOpen,
    setToast,
  };
}

function useDetailActions(runtime: DetailRuntime): DetailActions {
  return {
    archive: () => void archiveEntity(runtime),
    openEdit: () => openEditForm(runtime),
    // Runtime setters are stable; entity identity controls the reload callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    reload: useCallback(() => void reloadEntityDetail(runtime), [
      runtime.entityId,
    ]),
    reloadConflictedEntity: () => void reloadConflictedEntity(runtime),
    saveEdit: () => void saveEditForm(runtime),
  };
}

function useDetailBreadcrumbs(entity: EntityDetailData | null) {
  const breadcrumbs = useMemo(() => buildBreadcrumbs(entity), [entity]);
  usePageBreadcrumbs(breadcrumbs);
}

function useDetailLoadEffect(
  runtime: DetailRuntime,
  reload: () => void,
) {
  useEffect(() => {
    const timer = window.setTimeout(reload, 0);
    return () => window.clearTimeout(timer);
  }, [runtime.entityId, reload]);
}

function buildEntityDetailModel(
  runtime: DetailRuntime,
  actions: DetailActions,
): EntityDetailModel {
  return {
    archiveModalProps: detailArchiveProps(runtime, actions),
    archiveToastProps: detailArchiveToastProps(runtime),
    conflictModalProps: detailConflictProps(runtime, actions),
    editModalProps: detailEditProps(runtime, actions),
    error: runtime.entity.error,
    gridProps: detailGridProps(runtime),
    headerProps: detailHeaderProps(runtime, actions),
    loading: runtime.entity.loading,
    reload: actions.reload,
    toast: runtime.archive.toast,
    closeToast: () => runtime.archive.setToast(null),
  };
}

function detailHeaderProps(
  runtime: DetailRuntime,
  actions: DetailActions,
): EntityDetailHeaderProps | null {
  if (!runtime.entity.entity) return null;
  return {
    entity: runtime.entity.entity,
    onEdit: actions.openEdit,
    onArchive: () => runtime.archive.setArchiveOpen(true),
  };
}

function detailGridProps(runtime: DetailRuntime): EntityDetailGridProps | null {
  if (!runtime.entity.entity) return null;
  return {
    entity: runtime.entity.entity,
    advisor: runtime.entity.advisor,
    relatedDeals: runtime.collections.relatedDeals,
  };
}

function detailEditProps(
  runtime: DetailRuntime,
  actions: DetailActions,
): EntityEditModalProps | null {
  if (!runtime.entity.entity) return null;
  return {
    entity: runtime.entity.entity,
    editOpen: runtime.edit.editOpen,
    editForm: runtime.edit.editForm,
    editErrors: runtime.edit.editErrors,
    saving: runtime.edit.saving,
    teamMembers: runtime.collections.teamMembers,
    editFormRef: runtime.editFormRef,
    onClose: () => closeEditForm(runtime),
    onSave: actions.saveEdit,
    onFormChange: runtime.edit.setEditForm,
  };
}

function detailConflictProps(
  runtime: DetailRuntime,
  actions: DetailActions,
): EntityConflictModalProps | null {
  if (!runtime.entity.entity) return null;
  return {
    entity: runtime.entity.entity,
    isOpen: runtime.edit.versionConflictOpen,
    onClose: () => runtime.edit.setVersionConflictOpen(false),
    onReload: actions.reloadConflictedEntity,
  };
}

function detailArchiveProps(
  runtime: DetailRuntime,
  actions: DetailActions,
): EntityArchiveModalProps | null {
  if (!runtime.entity.entity) return null;
  return {
    entity: runtime.entity.entity,
    archiveOpen: runtime.archive.archiveOpen,
    archiving: runtime.archive.archiving,
    archiveError: runtime.archive.archiveError,
    onClose: () => closeArchiveDialog(runtime),
    onArchive: actions.archive,
  };
}

function detailArchiveToastProps(
  runtime: DetailRuntime,
): EntityArchiveToastProps {
  return {
    archiveError: runtime.archive.archiveError,
    archiveToastOpen: runtime.archive.archiveToastOpen,
    onClose: () => runtime.archive.setArchiveToastOpen(false),
  };
}

async function reloadEntityDetail(runtime: DetailRuntime) {
  runtime.entity.setLoading(true);
  runtime.entity.setError(false);
  try {
    applyLoadedDetail(runtime, await loadDetailState(runtime.entityId));
  } catch {
    runtime.entity.setError(true);
  } finally {
    runtime.entity.setLoading(false);
  }
}

function applyLoadedDetail(
  runtime: DetailRuntime,
  next: LoadedDetailState,
) {
  runtime.entity.setEntity(next.entity);
  runtime.collections.setTeamMembers(next.teamMembers);
  runtime.entity.setAdvisor(
    findAdvisor(next.teamMembers, next.entity.primaryAdvisorId),
  );
  runtime.collections.setRelatedDeals(next.relatedDeals);
}

async function loadDetailState(entityId: string): Promise<LoadedDetailState> {
  const entity = await ApiClient.getEntityById(entityId);
  const [teamPage, dealPage] = await Promise.all([
    ApiClient.listTeamMembers({ pageSize: 100 }),
    ApiClient.listDeals({ search: entity.legalName, pageSize: 10 }),
  ]);
  return { entity, teamMembers: teamPage.data, relatedDeals: dealPage.data };
}

async function archiveEntity(runtime: DetailRuntime) {
  if (!runtime.entity.entity) return;
  runtime.archive.setArchiving(true);
  runtime.archive.setArchiveError(null);
  try {
    await ApiClient.archiveEntity(
      runtime.entity.entity.id,
      runtime.entity.entity.version,
    );
    runtime.pushRoute(`/entities?${archiveReturnQuery(runtime.entity.entity)}`);
  } catch (cause) {
    runtime.archive.setArchiveError(
      errorMessage(cause, "Entity could not be archived."),
    );
    runtime.archive.setArchiveToastOpen(true);
  } finally {
    runtime.archive.setArchiving(false);
  }
}

function openEditForm(runtime: DetailRuntime) {
  if (!runtime.entity.entity) return;
  runtime.edit.setEditForm(entityToForm(runtime.entity.entity));
  runtime.edit.setEditErrors({});
  runtime.edit.setEditOpen(true);
}

function closeEditForm(runtime: DetailRuntime) {
  if (!runtime.edit.saving) runtime.edit.setEditOpen(false);
}

async function saveEditForm(runtime: DetailRuntime) {
  if (!runtime.entity.entity || !runtime.edit.editForm) return;
  if (!validateEditForm(runtime)) return;
  runtime.edit.setSaving(true);
  try {
    const updated = await updateEntityFromForm(
      runtime.entity.entity,
      runtime.edit.editForm,
    );
    handleEntityUpdated(runtime, updated);
  } catch (cause) {
    handleSaveFailure(runtime, cause);
  } finally {
    runtime.edit.setSaving(false);
  }
}

function validateEditForm(runtime: DetailRuntime) {
  const editForm = runtime.edit.editForm;
  if (!editForm) return false;
  const errors = validateEntityForm(editForm);
  runtime.edit.setEditErrors(errors);
  if (Object.keys(errors).length === 0) return true;
  runtime.focusFirstInvalid(errors);
  return false;
}

async function updateEntityFromForm(
  entity: EntityDetailData,
  editForm: EntityFormState,
) {
  return await ApiClient.updateEntity(entity.id, {
    ...toEntityWrite(editForm),
    version: entity.version,
  });
}

function handleEntityUpdated(
  runtime: DetailRuntime,
  updated: EntityDetailData,
) {
  runtime.entity.setEntity(updated);
  runtime.entity.setAdvisor(
    findAdvisor(runtime.collections.teamMembers, updated.primaryAdvisorId),
  );
  runtime.edit.setEditOpen(false);
  runtime.archive.setToast(entityUpdatedToast(updated));
}

function handleSaveFailure(runtime: DetailRuntime, cause: unknown) {
  if (cause instanceof APIError && cause.fieldErrors) {
    showDetailBackendErrors(runtime, cause);
  }
  if (isVersionConflict(cause)) runtime.edit.setVersionConflictOpen(true);
  if (!isVersionConflict(cause)) {
    runtime.archive.setToast(saveFailureToast(cause));
  }
}

function showDetailBackendErrors(runtime: DetailRuntime, cause: APIError) {
  const errorsFromServer = firstFieldError(cause.fieldErrors);
  runtime.edit.setEditErrors(errorsFromServer);
  runtime.focusFirstInvalid(errorsFromServer);
}

async function reloadConflictedEntity(runtime: DetailRuntime) {
  try {
    const current = await ApiClient.getEntityById(runtime.entityId);
    applyConflictedEntity(runtime, current);
  } catch (cause) {
    runtime.archive.setToast(unavailableToast(cause));
  }
}

function applyConflictedEntity(
  runtime: DetailRuntime,
  current: EntityDetailData,
) {
  runtime.entity.setEntity(current);
  runtime.edit.setEditForm(entityToForm(current));
  runtime.edit.setEditErrors({});
  runtime.entity.setAdvisor(
    findAdvisor(runtime.collections.teamMembers, current.primaryAdvisorId),
  );
  runtime.edit.setVersionConflictOpen(false);
}

function closeArchiveDialog(runtime: DetailRuntime) {
  if (!runtime.archive.archiving) runtime.archive.setArchiveOpen(false);
}

function findAdvisor(
  teamMembers: TeamMember[],
  advisorId: string | null,
): TeamMember | null {
  return teamMembers.find((member) => member.id === advisorId) ?? null;
}

function isVersionConflict(cause: unknown) {
  return cause instanceof APIError && cause.kind === "conflict" &&
    !cause.fieldErrors;
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

function entityUpdatedToast(updated: EntityDetailData): DetailToastState {
  return {
    title: "Entity updated",
    message: `${updated.legalName} now shows the saved values.`,
    variant: "success",
  };
}

function saveFailureToast(cause: unknown): DetailToastState {
  return {
    title: "Entity was not saved",
    message: errorMessage(cause, "Review the form and try again."),
    variant: "error",
  };
}

function unavailableToast(cause: unknown): DetailToastState {
  return {
    title: "Entity unavailable",
    message: errorMessage(cause, "Could not reload the entity."),
    variant: "error",
  };
}
