import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import type { CountryCode } from "@/components/CountrySelector/CountrySelector";
import type { EntitySummary, TeamMember } from "@/lib/api-client";

import {
  EMPTY_ENTITY_FORM,
  type EntityFormErrors,
  type EntityFormState,
  type EntityRole,
} from "./entity-state";
import {
  ensureCountryQuery,
  errorMessage,
  loadTeamMemberOptions,
  loadWorkspaceEntities,
  openRequestedEntityEdit,
  showArchiveNotice,
  updatePageSize,
  type WorkspaceToastState,
} from "./entities-workspace-controller";
import {
  buildWorkspaceActions,
  clearWorkspaceFilters,
  closeArchiveModal,
  openArchiveTarget,
  showUnavailableEdit,
  workspaceCountryHandler,
  workspaceSearchHandler,
} from "./entities-workspace-actions";
import {
  hasWorkspaceFilters,
  modalRoleLabel,
} from "./entities-workspace-derived";
import type {
  EntitiesWorkspaceModel,
  EntitiesWorkspaceProps,
  WorkspaceActions,
  WorkspaceArchiveStatus,
  WorkspaceFiltersState,
  WorkspaceFormState,
  WorkspaceLoadState,
  WorkspaceRowsState,
  WorkspaceRuntime,
  WorkspaceStatusState,
} from "./entities-workspace-types";
import type {
  WorkspaceContentProps,
  WorkspaceFiltersProps,
  WorkspaceRoleTabsProps,
} from "./EntitiesWorkspaceViews";
import type {
  WorkspaceArchiveModalProps,
  WorkspaceConflictModalProps,
  WorkspaceEntityFormModalProps,
} from "./EntitiesWorkspaceModals";
import { useEntityInvalidFieldFocus } from "./useEntityInvalidFieldFocus";

export function useEntitiesWorkspaceModel(
  props: EntitiesWorkspaceProps,
): EntitiesWorkspaceModel {
  const runtime = useWorkspaceRuntime(props);
  const actions = buildWorkspaceActions(runtime);
  useWorkspaceEffects(runtime, actions);
  return buildWorkspaceModel(runtime, actions);
}

function useWorkspaceRuntime(props: EntitiesWorkspaceProps): WorkspaceRuntime {
  const formRootRef = useRef<HTMLDivElement>(null);
  const runtime = useRuntimeState(props, formRootRef);
  const focusFirstInvalidField = useEntityInvalidFieldFocus(formRootRef);
  return { ...runtime, focusFirstInvalidField };
}

function useRuntimeState(
  props: EntitiesWorkspaceProps,
  formRootRef: RefObject<HTMLDivElement | null>,
): WorkspaceRuntime {
  return {
    rows: useWorkspaceRowsState(),
    load: useWorkspaceLoadState(),
    filters: useWorkspaceFiltersState(props),
    formState: useWorkspaceFormState(),
    status: useWorkspaceStatusState(),
    focusFirstInvalidField: () => {},
    formRootRef,
  };
}

function useWorkspaceRowsState(): WorkspaceRowsState {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  return {
    entities,
    page,
    pageSize,
    total,
    totalPages,
    setEntities,
    setPage,
    setPageSize,
    setTotal,
    setTotalPages,
  };
}

function useWorkspaceLoadState(): WorkspaceLoadState {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  return {
    teamMembers,
    loading,
    loadError,
    reloadKey,
    setTeamMembers,
    setLoading,
    setLoadError,
    setReloadKey,
  };
}

function useWorkspaceFiltersState(
  props: EntitiesWorkspaceProps,
): WorkspaceFiltersState {
  const [search, setSearch] = useState(props.initialSearch ?? "");
  const [role, setRole] = useState<EntityRole>(props.initialRole ?? "buyer");
  const [sector, setSector] = useState(props.initialSector ?? "");
  const [countryCode, setCountryCode] = useState<CountryCode>(
    props.initialCountryCode ?? "BR",
  );
  return {
    search,
    role,
    countryCode,
    sector,
    setSearch,
    setRole,
    setCountryCode,
    setSector,
  };
}

function useWorkspaceFormState(): WorkspaceFormState {
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingEntity, setEditingEntity] = useState<EntitySummary | null>(
    null,
  );
  const [form, setForm] = useState<EntityFormState>(EMPTY_ENTITY_FORM);
  const [formErrors, setFormErrors] = useState<EntityFormErrors>({});
  return {
    modalMode,
    editingEntity,
    form,
    formErrors,
    setModalMode,
    setEditingEntity,
    setForm,
    setFormErrors,
  };
}

function useWorkspaceStatusState(): WorkspaceStatusState {
  const archive = useWorkspaceArchiveStatus();
  const [saving, setSaving] = useState(false);
  const [versionConflictOpen, setVersionConflictOpen] = useState(false);
  const [toast, setToast] = useState<WorkspaceToastState | null>(null);
  return {
    ...archive,
    saving,
    versionConflictOpen,
    toast,
    setSaving,
    setVersionConflictOpen,
    setToast,
  };
}

function useWorkspaceArchiveStatus(): WorkspaceArchiveStatus {
  const [archiveTarget, setArchiveTarget] = useState<EntitySummary | null>(
    null,
  );
  const [archiveBlocked, setArchiveBlocked] = useState<string | null>(null);
  return {
    archiveTarget,
    archiveBlocked,
    setArchiveTarget,
    setArchiveBlocked,
  };
}

function useWorkspaceEffects(
  runtime: WorkspaceRuntime,
  actions: WorkspaceActions,
) {
  const setEditingState = actions.setEditingState;
  const setTeamMembers = runtime.load.setTeamMembers;
  const setToast = runtime.status.setToast;
  useEffect(() => ensureCountryQuery(runtime.filters.countryCode), [
    runtime.filters.countryCode,
  ]);
  useEffect(() => showArchiveNotice(setToast), [setToast]);
  useWorkspaceLoadEffect(runtime);
  useEffect(() => loadTeamMemberOptions(setTeamMembers), [setTeamMembers]);
  useEffect(() => {
    openRequestedEntityEdit(
      setEditingState,
      () => showUnavailableEdit(setToast),
    );
  }, [setEditingState, setToast]);
}

function useWorkspaceLoadEffect(runtime: WorkspaceRuntime) {
  // Runtime setters are stable; these scalar fields define the reload boundary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => scheduleWorkspaceLoad(runtime), [
    runtime.filters.countryCode,
    runtime.filters.role,
    runtime.filters.search,
    runtime.filters.sector,
    runtime.rows.page,
    runtime.rows.pageSize,
    runtime.load.reloadKey,
  ]);
}

function scheduleWorkspaceLoad(runtime: WorkspaceRuntime) {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => void runWorkspaceLoad(runtime, controller.signal),
    250,
  );
  return () => {
    window.clearTimeout(timer);
    controller.abort();
  };
}

async function runWorkspaceLoad(
  runtime: WorkspaceRuntime,
  signal: AbortSignal,
) {
  runtime.load.setLoading(true);
  runtime.load.setLoadError(null);
  try {
    await loadWorkspaceEntities(loadEntitiesProps(runtime, signal));
  } catch (error) {
    if (!signal.aborted) {
      runtime.load.setLoadError(
        errorMessage(error, "Unable to load entities."),
      );
    }
  } finally {
    if (!signal.aborted) runtime.load.setLoading(false);
  }
}

function loadEntitiesProps(
  runtime: WorkspaceRuntime,
  signal: AbortSignal,
) {
  return { ...runtime.rows, ...runtime.filters, signal };
}

function buildWorkspaceModel(
  runtime: WorkspaceRuntime,
  actions: WorkspaceActions,
): EntitiesWorkspaceModel {
  return {
    archiveModalProps: workspaceArchiveProps(runtime, actions),
    conflictModalProps: workspaceConflictProps(runtime, actions),
    contentProps: workspaceContentProps(runtime, actions),
    filtersProps: workspaceFiltersProps(runtime, actions),
    formModalProps: workspaceFormProps(runtime, actions),
    headerProps: {
      loading: runtime.load.loading,
      onCreate: actions.openCreate,
    },
    roleTabsProps: workspaceRoleTabsProps(runtime, actions),
    toast: runtime.status.toast,
    closeToast: () => runtime.status.setToast(null),
  };
}

function workspaceRoleTabsProps(
  runtime: WorkspaceRuntime,
  actions: WorkspaceActions,
): WorkspaceRoleTabsProps {
  return {
    role: runtime.filters.role,
    loading: runtime.load.loading,
    onChange: actions.selectRole,
  };
}

function workspaceFiltersProps(
  runtime: WorkspaceRuntime,
  actions: WorkspaceActions,
): WorkspaceFiltersProps {
  return {
    loading: runtime.load.loading,
    search: runtime.filters.search,
    sector: runtime.filters.sector,
    countryCode: runtime.filters.countryCode,
    onSearchChange: workspaceSearchHandler(runtime),
    onSectorChange: actions.setSectorFilter,
    onCountryChange: workspaceCountryHandler(runtime),
  };
}

function workspaceContentProps(
  runtime: WorkspaceRuntime,
  actions: WorkspaceActions,
): WorkspaceContentProps {
  return {
    ...workspaceContentData(runtime),
    ...workspaceContentHandlers(runtime, actions),
  };
}

function workspaceContentData(
  runtime: WorkspaceRuntime,
) {
  return {
    ...runtime.rows,
    loading: runtime.load.loading,
    loadError: runtime.load.loadError,
    advisors: new Map(
      runtime.load.teamMembers.map((member) => [member.id, member]),
    ),
    role: runtime.filters.role,
    hasOptionalFilters: hasWorkspaceFilters(runtime),
  };
}

function workspaceContentHandlers(
  runtime: WorkspaceRuntime,
  actions: WorkspaceActions,
) {
  return {
    onRetry: () => runtime.load.setReloadKey((key) => key + 1),
    onClearFilters: () => clearWorkspaceFilters(runtime),
    onCreate: actions.openCreate,
    onEdit: actions.setEditingState,
    onArchive: (entity: EntitySummary) => openArchiveTarget(runtime, entity),
    onPageChange: runtime.rows.setPage,
    onPageSizeChange: (size: number) =>
      updatePageSize(size, runtime.rows.setPageSize, runtime.rows.setPage),
  };
}

function workspaceFormProps(
  runtime: WorkspaceRuntime,
  actions: WorkspaceActions,
): WorkspaceEntityFormModalProps {
  const label = modalRoleLabel(runtime);
  return {
    ...runtime.formState,
    modalRoleLabel: label,
    saving: runtime.status.saving,
    teamMembers: runtime.load.teamMembers,
    formRootRef: runtime.formRootRef,
    onClose: actions.closeForm,
    onSave: actions.saveEntity,
    onFormChange: runtime.formState.setForm,
  };
}

function workspaceConflictProps(
  runtime: WorkspaceRuntime,
  actions: WorkspaceActions,
): WorkspaceConflictModalProps {
  return {
    isOpen: runtime.status.versionConflictOpen,
    onClose: () => runtime.status.setVersionConflictOpen(false),
    onReload: actions.reloadConflictedEntity,
  };
}

function workspaceArchiveProps(
  runtime: WorkspaceRuntime,
  actions: WorkspaceActions,
): WorkspaceArchiveModalProps {
  return {
    archiveTarget: runtime.status.archiveTarget,
    archiveBlocked: runtime.status.archiveBlocked,
    saving: runtime.status.saving,
    onClose: () => closeArchiveModal(runtime),
    onArchive: actions.archiveEntity,
  };
}
