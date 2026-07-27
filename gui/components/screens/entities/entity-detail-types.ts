import type { RefObject } from "react";

import type {
  DealSummary,
  EntityDetail as EntityDetailData,
  TeamMember,
} from "@/lib/api-client";

import type { EntityFormErrors, EntityFormState } from "./entity-state";
import type {
  EntityArchiveModalProps,
  EntityArchiveToastProps,
  EntityConflictModalProps,
  EntityDetailGridProps,
  EntityDetailHeaderProps,
  EntityEditModalProps,
} from "./EntityDetailViews";

export type DetailToastState = {
  title: string;
  message: string;
  variant: "success" | "error";
};

export interface EntityDetailModel {
  archiveModalProps: EntityArchiveModalProps | null;
  archiveToastProps: EntityArchiveToastProps;
  conflictModalProps: EntityConflictModalProps | null;
  editModalProps: EntityEditModalProps | null;
  error: boolean;
  gridProps: EntityDetailGridProps | null;
  headerProps: EntityDetailHeaderProps | null;
  loading: boolean;
  reload: () => void;
  toast: DetailToastState | null;
  closeToast: () => void;
}

export interface LoadedDetailState {
  entity: EntityDetailData;
  teamMembers: TeamMember[];
  relatedDeals: DealSummary[];
}

export interface DetailEntityState {
  entity: EntityDetailData | null;
  loading: boolean;
  error: boolean;
  advisor: TeamMember | null;
  setEntity: (entity: EntityDetailData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: boolean) => void;
  setAdvisor: (advisor: TeamMember | null) => void;
}

export interface DetailCollectionsState {
  teamMembers: TeamMember[];
  relatedDeals: DealSummary[];
  setTeamMembers: (members: TeamMember[]) => void;
  setRelatedDeals: (deals: DealSummary[]) => void;
}

export interface DetailEditState {
  editOpen: boolean;
  editForm: EntityFormState | null;
  editErrors: EntityFormErrors;
  saving: boolean;
  versionConflictOpen: boolean;
  setEditOpen: (open: boolean) => void;
  setEditForm: (form: EntityFormState | null) => void;
  setEditErrors: (errors: EntityFormErrors) => void;
  setSaving: (saving: boolean) => void;
  setVersionConflictOpen: (open: boolean) => void;
}

export interface DetailArchiveState {
  archiveOpen: boolean;
  archiving: boolean;
  archiveError: string | null;
  archiveToastOpen: boolean;
  toast: DetailToastState | null;
  setArchiveOpen: (open: boolean) => void;
  setArchiving: (archiving: boolean) => void;
  setArchiveError: (error: string | null) => void;
  setArchiveToastOpen: (open: boolean) => void;
  setToast: (toast: DetailToastState | null) => void;
}

export interface DetailRuntime {
  entity: DetailEntityState;
  collections: DetailCollectionsState;
  edit: DetailEditState;
  archive: DetailArchiveState;
  editFormRef: RefObject<HTMLDivElement | null>;
  focusFirstInvalid: (errors: EntityFormErrors) => void;
  pushRoute: (href: string) => void;
  entityId: string;
}

export interface DetailActions {
  archive: () => void;
  openEdit: () => void;
  reload: () => void;
  reloadConflictedEntity: () => void;
  saveEdit: () => void;
}
