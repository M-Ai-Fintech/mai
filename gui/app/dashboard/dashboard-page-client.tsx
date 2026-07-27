"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast/Toast";
import { type DashboardView } from "@/components/screens/dashboard/dashboard-model";
import { parseDashboardRouteState } from "@/components/screens/dashboard/dashboard-route-state";
import { useDealList } from "../deals/use-deal-list";
import { DashboardCreateModal } from "./dashboard-create-modal";
import {
  DashboardContent,
  DashboardFilters,
  DashboardHeader,
} from "./dashboard-pipeline-view";
import { useDashboardCreate } from "./use-dashboard-create";

export function DashboardPageClient() {
  const router = useRouter();
  const [view, setView] = useState<DashboardView>("kanban");
  const list = useDashboardDealList();
  const create = useDashboardCreate(list.loadDeals);
  useDashboardRouteEffect(router.replace, create.openCreate, create.setToast);
  const openCreate = () => void create.openCreate();
  return (
    <DashboardPageLayout
      create={create}
      list={list}
      openCreate={openCreate}
      setView={setView}
      view={view}
    />
  );
}

function useDashboardDealList() {
  return useDealList({
    defaultStatus: "active",
    initialPageSize: 25,
    loadErrorMessage: "The deal pipeline could not be loaded.",
  });
}

interface DashboardPageLayoutProps {
  create: ReturnType<typeof useDashboardCreate>;
  list: ReturnType<typeof useDealList>;
  openCreate: () => void;
  setView: (view: DashboardView) => void;
  view: DashboardView;
}

function DashboardPageLayout(props: DashboardPageLayoutProps) {
  return (
    <div className="space-y-8 p-8">
      <DashboardHeader
        loading={props.list.loading}
        onCreate={props.openCreate}
      />
      <DashboardPageMain props={props} />
      <DashboardCreateDialog create={props.create} />
      <DashboardToast create={props.create} />
    </div>
  );
}

function DashboardPageMain({ props }: { props: DashboardPageLayoutProps }) {
  return (
    <>
      <DashboardFilters
        list={props.list}
        view={props.view}
        onViewChange={props.setView}
      />
      <DashboardContent
        list={props.list}
        view={props.view}
        onCreate={props.openCreate}
      />
    </>
  );
}

function useDashboardRouteEffect(
  replaceRoute: ReturnType<typeof useRouter>["replace"],
  openCreate: () => Promise<void>,
  setToast: ReturnType<typeof useDashboardCreate>["setToast"],
) {
  const handledRouteState = useRef(false);
  useEffect(() => {
    if (handledRouteState.current) return;
    handledRouteState.current = true;
    const timer = window.setTimeout(() => {
      const routeState = parseDashboardRouteState(window.location.search);
      applyDashboardRouteState(routeState, replaceRoute, openCreate, setToast);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [openCreate, replaceRoute, setToast]);
}

function applyDashboardRouteState(
  routeState: ReturnType<typeof parseDashboardRouteState>,
  replaceRoute: ReturnType<typeof useRouter>["replace"],
  openCreate: () => Promise<void>,
  setToast: ReturnType<typeof useDashboardCreate>["setToast"],
) {
  if (routeState.notice === "phase-transitioned") setToast(dealMovedToast());
  if (routeState.createDeal) void openCreate();
  if (routeState.createDeal || routeState.notice) {
    replaceRoute("/", { scroll: false });
  }
}

function dealMovedToast() {
  return {
    title: "Deal moved",
    message: "The deal phase transition was saved.",
    variant: "success" as const,
  };
}

function DashboardCreateDialog(
  { create }: { create: ReturnType<typeof useDashboardCreate> },
) {
  return (
    <DashboardCreateModal
      creating={create.creating}
      draft={create.draft}
      draftErrors={create.draftErrors}
      isCreateOpen={create.isCreateOpen}
      optionsError={create.optionsError}
      optionsLoading={create.optionsLoading}
      targets={create.targets}
      teamMembers={create.teamMembers}
      onClose={() => create.setIsCreateOpen(false)}
      onDraftChange={create.setDraft}
      onRetryOptions={create.openCreate}
      onSubmit={create.submitCreate}
    />
  );
}

function DashboardToast(
  { create }: { create: ReturnType<typeof useDashboardCreate> },
) {
  if (!create.toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <Toast {...create.toast} onClose={() => create.setToast(null)} />
    </div>
  );
}
