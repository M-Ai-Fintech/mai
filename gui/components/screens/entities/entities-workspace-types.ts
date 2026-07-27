import type { RefObject } from "react";

import type { CountryCode } from "@/components/CountrySelector/CountrySelector";
import type { EntitySummary, TeamMember } from "@/lib/api-client";

import type {
  EntityFormErrors,
  EntityFormState,
  EntityRole,
} from "./entity-state";
import type { WorkspaceToastState } from "./entities-workspace-controller";
import type {
  WorkspaceContentProps,
  WorkspaceFiltersProps,
  WorkspaceHeaderProps,
  WorkspaceRoleTabsProps,
} from "./EntitiesWorkspaceViews";
import type {
  WorkspaceArchiveModalProps,
  WorkspaceConflictModalProps,
  WorkspaceEntityFormModalProps,
} from "./EntitiesWorkspaceModals";

export interface EntitiesWorkspaceModel {
  archiveModalProps: WorkspaceArchiveModalProps;
  conflictModalProps: WorkspaceConflictModalProps;
  contentProps: WorkspaceContentProps;
  filtersProps: WorkspaceFiltersProps;
  formModalProps: WorkspaceEntityFormModalProps;
  headerProps: WorkspaceHeaderProps;
  roleTabsProps: WorkspaceRoleTabsProps;
  toast: WorkspaceToastState | null;
  closeToast: () => void;
}

export interface EntitiesWorkspaceProps {
  initialRole?: EntityRole;
  initialSearch?: string;
  initialSector?: string;
  initialCountryCode?: CountryCode;
}

export interface WorkspaceRowsState {
  entities: EntitySummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  setEntities: (entities: EntitySummary[]) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotal: (total: number) => void;
  setTotalPages: (totalPages: number) => void;
}

export interface WorkspaceLoadState {
  teamMembers: TeamMember[];
  loading: boolean;
  loadError: string | null;
  reloadKey: number;
  setTeamMembers: (members: TeamMember[]) => void;
  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  setReloadKey: (updater: (key: number) => number) => void;
}

export interface WorkspaceFiltersState {
  search: string;
  role: EntityRole;
  countryCode: CountryCode;
  sector: string;
  setSearch: (search: string) => void;
  setRole: (role: EntityRole) => void;
  setCountryCode: (countryCode: CountryCode) => void;
  setSector: (sector: string) => void;
}

export interface WorkspaceFormState {
  modalMode: "create" | "edit" | null;
  editingEntity: EntitySummary | null;
  form: EntityFormState;
  formErrors: EntityFormErrors;
  setModalMode: (mode: "create" | "edit" | null) => void;
  setEditingEntity: (entity: EntitySummary | null) => void;
  setForm: (form: EntityFormState) => void;
  setFormErrors: (errors: EntityFormErrors) => void;
}

export interface WorkspaceStatusState {
  saving: boolean;
  archiveTarget: EntitySummary | null;
  archiveBlocked: string | null;
  versionConflictOpen: boolean;
  toast: WorkspaceToastState | null;
  setSaving: (saving: boolean) => void;
  setArchiveTarget: (entity: EntitySummary | null) => void;
  setArchiveBlocked: (message: string | null) => void;
  setVersionConflictOpen: (open: boolean) => void;
  setToast: (toast: WorkspaceToastState | null) => void;
}

export interface WorkspaceArchiveStatus {
  archiveTarget: EntitySummary | null;
  archiveBlocked: string | null;
  setArchiveTarget: (entity: EntitySummary | null) => void;
  setArchiveBlocked: (message: string | null) => void;
}

export interface WorkspaceRuntime {
  rows: WorkspaceRowsState;
  load: WorkspaceLoadState;
  filters: WorkspaceFiltersState;
  formState: WorkspaceFormState;
  status: WorkspaceStatusState;
  focusFirstInvalidField: (errors: EntityFormErrors) => void;
  formRootRef: RefObject<HTMLDivElement | null>;
}

export interface WorkspaceActions {
  closeForm: () => void;
  openCreate: () => void;
  saveEntity: () => void;
  archiveEntity: () => void;
  reloadConflictedEntity: () => void;
  selectRole: (nextRole: string) => void;
  setSectorFilter: (value: string | string[]) => void;
  setEditingState: (entity: EntitySummary) => void;
}
