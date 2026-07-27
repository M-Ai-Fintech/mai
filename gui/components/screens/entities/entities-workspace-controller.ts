import type { CountryCode } from "@/components/CountrySelector/CountrySelector";
import {
  ApiClient,
  APIError,
  type EntitySummary,
  type TeamMember,
} from "@/lib/api-client";

import {
  entityArchiveSuccessNotice,
  type EntityFormErrors,
  type EntityFormState,
  type EntityRole,
  firstFieldError,
  toEntityWrite,
  validateEntityForm,
} from "./entity-state";

export type WorkspaceToastState = {
  title: string;
  message: string;
  variant: "success" | "error";
};

export interface QuerySyncPatch {
  role?: EntityRole;
  search?: string;
  sector?: string;
  countryCode?: string;
}

interface QuerySyncState {
  role: EntityRole;
  search: string;
  sector: string;
  countryCode: string;
}

export function replaceWorkspaceQuery(values: QuerySyncState) {
  const url = new URL(window.location.href);
  url.searchParams.set("role", values.role);
  setOptionalQueryParam(url, "search", values.search);
  setOptionalQueryParam(url, "sector", values.sector);
  setOptionalQueryParam(url, "country", values.countryCode);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function setOptionalQueryParam(url: URL, key: string, value: string) {
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
}

export function ensureCountryQuery(countryCode: CountryCode) {
  const url = new URL(window.location.href);
  if (url.searchParams.has("country")) return;
  url.searchParams.set("country", countryCode);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

export function showArchiveNotice(
  setToast: (toast: WorkspaceToastState) => void,
) {
  const url = new URL(window.location.href);
  if (url.searchParams.get("notice") !== "archived") return;
  const notice = entityArchiveSuccessNotice(
    url.searchParams.get("entity") ?? "",
  );
  const timer = window.setTimeout(
    () => setToast({ ...notice, variant: "success" }),
    0,
  );
  url.searchParams.delete("notice");
  url.searchParams.delete("entity");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  return () => window.clearTimeout(timer);
}

export function debounceLoadEntities(
  loadEntities: (signal?: AbortSignal) => Promise<void>,
) {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => void loadEntities(controller.signal),
    250,
  );
  return () => {
    window.clearTimeout(timer);
    controller.abort();
  };
}

export function loadTeamMemberOptions(
  setTeamMembers: (members: TeamMember[]) => void,
) {
  void ApiClient.listTeamMembers({ pageSize: 100 })
    .then((result) => setTeamMembers(result.data))
    .catch(() => setTeamMembers([]));
}

export function openRequestedEntityEdit(
  onOpen: (entity: EntitySummary) => void,
  onError: () => void,
) {
  const editId = new URLSearchParams(window.location.search).get("edit");
  if (!editId) return;
  void ApiClient.getEntityById(editId).then(onOpen).catch(onError);
}

export interface LoadWorkspaceEntitiesProps {
  countryCode: CountryCode;
  page: number;
  pageSize: number;
  role: EntityRole;
  search: string;
  sector: string;
  signal?: AbortSignal;
  setEntities: (entities: EntitySummary[]) => void;
  setPage: (page: number) => void;
  setTotal: (total: number) => void;
  setTotalPages: (totalPages: number) => void;
}

export async function loadWorkspaceEntities(
  props: LoadWorkspaceEntitiesProps,
) {
  const result = await ApiClient.listEntities({
    page: props.page,
    pageSize: props.pageSize,
    search: props.search.trim() || undefined,
    role: props.role,
    sector: props.sector.trim() || undefined,
    countryCode: props.countryCode || undefined,
    sort: "-updatedAt",
  });
  if (props.signal?.aborted) return;
  applyLoadedEntities(props, result.data, result.meta);
}

interface PaginationMeta {
  total: number;
  totalPages: number;
}

function applyLoadedEntities(
  props: LoadWorkspaceEntitiesProps,
  entities: EntitySummary[],
  meta: PaginationMeta,
) {
  if (meta.totalPages > 0 && props.page > meta.totalPages) {
    props.setPage(meta.totalPages);
    return;
  }
  props.setEntities(entities);
  props.setTotal(meta.total);
  props.setTotalPages(meta.totalPages);
}

export function validateCurrentForm(
  form: EntityFormState,
  setFormErrors: (errors: EntityFormErrors) => void,
  focusFirstInvalidField: (errors: EntityFormErrors) => void,
) {
  const validationErrors = validateEntityForm(form);
  setFormErrors(validationErrors);
  if (Object.keys(validationErrors).length === 0) return true;
  focusFirstInvalidField(validationErrors);
  return false;
}

export async function persistEntityForm(
  form: EntityFormState,
  modalMode: "create" | "edit" | null,
  editingEntity: EntitySummary | null,
) {
  const payload = toEntityWrite(form);
  if (modalMode === "edit" && editingEntity) {
    await ApiClient.updateEntity(editingEntity.id, {
      ...payload,
      version: editingEntity.version,
    });
    return;
  }
  await ApiClient.createEntity(payload);
}

export function closeSavedForm(
  setModalMode: (mode: "create" | "edit" | null) => void,
  setEditingEntity: (entity: EntitySummary | null) => void,
  setPage: (page: number) => void,
  setReloadKey: (updater: (key: number) => number) => void,
) {
  setModalMode(null);
  setEditingEntity(null);
  setPage(1);
  setReloadKey((key) => key + 1);
}

export function showBackendErrors(
  error: APIError,
  setFormErrors: (errors: EntityFormErrors) => void,
  focusFirstInvalidField: (errors: EntityFormErrors) => void,
) {
  const backendErrors = firstFieldError(error.fieldErrors);
  setFormErrors(backendErrors);
  focusFirstInvalidField(backendErrors);
}

export function isVersionConflict(error: unknown) {
  return error instanceof APIError && error.kind === "conflict" &&
    !error.fieldErrors;
}

export function showEntityUnavailable(
  cause: unknown,
  setToast: (toast: WorkspaceToastState) => void,
) {
  setToast({
    title: "Entity unavailable",
    message: errorMessage(cause, "Could not reload the entity."),
    variant: "error",
  });
}

export function updateSearchFilter(
  search: string,
  setSearch: (search: string) => void,
  setPage: (page: number) => void,
  syncQuery: (next: QuerySyncPatch) => void,
) {
  setSearch(search);
  setPage(1);
  syncQuery({ search });
}

export function updateCountryFilter(
  countryCode: CountryCode,
  setCountryCode: (countryCode: CountryCode) => void,
  setPage: (page: number) => void,
  syncQuery: (next: QuerySyncPatch) => void,
) {
  setCountryCode(countryCode);
  setPage(1);
  syncQuery({ countryCode });
}

export function clearFilters(
  setSearch: (search: string) => void,
  setSector: (sector: string) => void,
  setCountryCode: (countryCode: CountryCode) => void,
  setPage: (page: number) => void,
  syncQuery: (next: QuerySyncPatch) => void,
) {
  setSearch("");
  setSector("");
  setCountryCode("BR");
  setPage(1);
  syncQuery({ search: "", sector: "", countryCode: "BR" });
}

export function updatePageSize(
  size: number,
  setPageSize: (pageSize: number) => void,
  setPage: (page: number) => void,
) {
  setPageSize(size);
  setPage(1);
}

export function errorMessage(
  error: unknown,
  fallback = "Review the form and try again.",
): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
