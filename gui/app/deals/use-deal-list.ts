"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiClient, type DealSummary } from "@/lib/api-client";
import {
  buildDealListQuery,
  collectVisibleAdvisors,
  type DealListFilters,
  type DealStatus,
  hasActiveDealFilters,
  keepLoadedSelection,
} from "./deal-list-model";

interface UseDealListOptions {
  defaultStatus: "all" | DealStatus;
  initialPageSize: number;
  loadErrorMessage: string;
}

export function useDealList(options: UseDealListOptions) {
  const parts = useDealListParts(options);
  useAutoLoadDeals(parts.loaded.loadDeals);
  const resetFilters = useResetDealFilters(
    parts.search,
    parts.filters,
    parts.pages,
    options,
  );
  return dealListReturn(options, parts, resetFilters);
}

function useDealListParts(options: UseDealListOptions) {
  const search = useDealSearchState();
  const filters = useDealFilterState(options.defaultStatus);
  const pages = useDealPaginationState(options.initialPageSize);
  const selection = useDealSelectionState();
  useDebouncedDealSearch(search, pages);
  const queryFilters = useDealListFilters(search.search, filters);
  const loaded = useLoadedDeals(
    queryFilters,
    pages,
    selection,
    options.loadErrorMessage,
  );
  return { filters, loaded, pages, queryFilters, search, selection };
}

function useAutoLoadDeals(loadDeals: () => Promise<void>) {
  useEffect(() => {
    const timer = window.setTimeout(() => void loadDeals(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDeals]);
}

function dealListReturn(
  options: UseDealListOptions,
  parts: ReturnType<typeof useDealListParts>,
  resetFilters: () => void,
) {
  const publicState = dealListPublicState(parts);
  return {
    ...publicState,
    advisors: collectVisibleAdvisors(parts.loaded.deals),
    filtersActive: hasActiveDealFilters(
      parts.queryFilters,
      options.defaultStatus,
    ),
    resetFilters,
  };
}

function dealListPublicState(parts: ReturnType<typeof useDealListParts>) {
  return {
    ...publicLoadedDeals(parts.loaded),
    ...publicDealFilters(parts.filters),
    ...publicDealPagination(parts.pages),
    ...publicDealSearch(parts.search),
    ...publicDealSelection(parts.selection, parts.loaded.deals),
  };
}

function useDealSearchState() {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  return useMemo(() => ({
    search,
    searchDraft,
    setSearch,
    setSearchDraft,
  }), [search, searchDraft]);
}

function useDealFilterState(defaultStatus: "all" | DealStatus) {
  const [phase, setPhase] = useState<DealListFilters["phase"]>("all");
  const [status, setStatus] = useState<DealListFilters["status"]>(
    defaultStatus,
  );
  const [assigneeId, setAssigneeId] = useState("all");
  return useMemo(() => ({
    assigneeId,
    phase,
    setAssigneeId,
    setPhase,
    setStatus,
    status,
  }), [assigneeId, phase, status]);
}

function useDealPaginationState(initialPageSize: number) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  return useMemo(() => ({
    page,
    pageSize,
    setPage,
    setPageSize,
  }), [page, pageSize]);
}

function useDealSelectionState() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  return useMemo(() => ({ selectedIds, setSelectedIds }), [selectedIds]);
}

function useDebouncedDealSearch(
  search: ReturnType<typeof useDealSearchState>,
  pages: ReturnType<typeof useDealPaginationState>,
) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      search.setSearch(search.searchDraft.trim());
      pages.setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pages, search]);
}

function useDealListFilters(
  search: string,
  filters: ReturnType<typeof useDealFilterState>,
) {
  return useMemo<DealListFilters>(() => ({
    search,
    phase: filters.phase,
    status: filters.status,
    assigneeId: filters.assigneeId,
  }), [filters.assigneeId, filters.phase, filters.status, search]);
}

function useLoadedDeals(
  filters: DealListFilters,
  pages: ReturnType<typeof useDealPaginationState>,
  selection: ReturnType<typeof useDealSelectionState>,
  loadErrorMessage: string,
) {
  const state = useDealListLoadState();
  const loadDeals = useLoadDealsAction(
    filters,
    pages,
    selection,
    loadErrorMessage,
    state.actions,
  );
  return { ...state, loadDeals };
}

function useDealListLoadState() {
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const actions = useMemo(
    () => ({ setDeals, setError, setLoading, setTotal, setTotalPages }),
    [],
  );
  const values = useMemo(
    () => ({ deals, error, loading, total, totalPages }),
    [deals, error, loading, total, totalPages],
  );
  return { ...values, actions };
}

type DealListLoadActions = ReturnType<typeof useDealListLoadState>["actions"];

function useLoadDealsAction(
  filters: DealListFilters,
  pages: ReturnType<typeof useDealPaginationState>,
  selection: ReturnType<typeof useDealSelectionState>,
  loadErrorMessage: string,
  actions: DealListLoadActions,
) {
  return useCallback(async () => {
    await loadDealsFromState(
      filters,
      pages,
      selection,
      loadErrorMessage,
      actions,
    );
  }, [actions, filters, loadErrorMessage, pages, selection]);
}

async function loadDealsFromState(
  filters: DealListFilters,
  pages: ReturnType<typeof useDealPaginationState>,
  selection: ReturnType<typeof useDealSelectionState>,
  loadErrorMessage: string,
  actions: DealListLoadActions,
) {
  actions.setLoading(true);
  actions.setError(null);
  await loadDealsPage(filters, pages, selection, loadErrorMessage, actions);
  actions.setLoading(false);
}

async function loadDealsPage(
  filters: DealListFilters,
  pages: ReturnType<typeof useDealPaginationState>,
  selection: ReturnType<typeof useDealSelectionState>,
  loadErrorMessage: string,
  actions: DealListLoadActions,
) {
  try {
    const response = await ApiClient.listDeals(
      buildDealListQuery(filters, pages.page, pages.pageSize),
    );
    applyDealResponse(response, selection, actions);
  } catch (cause) {
    actions.setDeals([]);
    actions.setError(cause instanceof Error ? cause.message : loadErrorMessage);
  }
}

function applyDealResponse(
  response: Awaited<ReturnType<typeof ApiClient.listDeals>>,
  selection: ReturnType<typeof useDealSelectionState>,
  actions: DealListLoadActions,
) {
  applyDealPage(
    response.data,
    response.meta.total,
    response.meta.totalPages,
    selection,
    actions,
  );
}

function applyDealPage(
  deals: DealSummary[],
  total: number,
  totalPages: number,
  selection: ReturnType<typeof useDealSelectionState>,
  actions: DealListLoadActions,
) {
  actions.setDeals(deals);
  actions.setTotal(total);
  actions.setTotalPages(totalPages);
  selection.setSelectedIds((current) => keepLoadedSelection(current, deals));
}

function useResetDealFilters(
  search: ReturnType<typeof useDealSearchState>,
  filters: ReturnType<typeof useDealFilterState>,
  pages: ReturnType<typeof useDealPaginationState>,
  options: UseDealListOptions,
) {
  return useCallback(() => {
    resetDealFilterState(search, filters, pages, options.defaultStatus);
  }, [filters, options.defaultStatus, pages, search]);
}

function resetDealFilterState(
  search: ReturnType<typeof useDealSearchState>,
  filters: ReturnType<typeof useDealFilterState>,
  pages: ReturnType<typeof useDealPaginationState>,
  defaultStatus: "all" | DealStatus,
) {
  search.setSearchDraft("");
  search.setSearch("");
  filters.setPhase("all");
  filters.setStatus(defaultStatus);
  filters.setAssigneeId("all");
  pages.setPage(1);
}

function publicLoadedDeals(loaded: ReturnType<typeof useLoadedDeals>) {
  return {
    deals: loaded.deals,
    error: loaded.error,
    loadDeals: loaded.loadDeals,
    loading: loaded.loading,
    total: loaded.total,
    totalPages: loaded.totalPages,
  };
}

function publicDealFilters(filters: ReturnType<typeof useDealFilterState>) {
  return {
    assigneeId: filters.assigneeId,
    phase: filters.phase,
    setAssigneeId: filters.setAssigneeId,
    setPhase: filters.setPhase,
    setStatus: filters.setStatus,
    status: filters.status,
  };
}

function publicDealPagination(
  pages: ReturnType<typeof useDealPaginationState>,
) {
  return {
    page: pages.page,
    pageSize: pages.pageSize,
    setPage: pages.setPage,
    setPageSize: pages.setPageSize,
  };
}

function publicDealSearch(search: ReturnType<typeof useDealSearchState>) {
  return {
    search: search.search,
    searchDraft: search.searchDraft,
    setSearchDraft: search.setSearchDraft,
  };
}

function publicDealSelection(
  selection: ReturnType<typeof useDealSelectionState>,
  deals: DealSummary[],
) {
  return {
    allVisibleSelected: deals.length > 0 &&
      deals.every((deal) => selection.selectedIds.includes(deal.id)),
    selectedIds: selection.selectedIds,
    setSelectedIds: selection.setSelectedIds,
  };
}
