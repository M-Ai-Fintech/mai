import type { Dispatch, SetStateAction } from "react";
import { ApiClient, APIError, type DashboardLayout } from "@/lib/api-client";
import {
  dashboardScreenState,
  type DashboardWidget,
  type DashboardWidgetType,
  removeDashboardWidget,
} from "./custom-dashboard-model";
import type { ScreenState, ToastState } from "./custom-dashboard-types";

export function applyDashboardLayout(
  nextLayout: DashboardLayout,
  setLayout: (layout: DashboardLayout) => void,
  setDraftWidgets: (widgets: DashboardWidget[]) => void,
  setState: (state: ScreenState) => void,
) {
  setLayout(nextLayout);
  setDraftWidgets(nextLayout.widgets);
  setState(dashboardScreenState(nextLayout.widgets));
}

export async function saveDashboardLayout(
  layout: DashboardLayout,
  draftWidgets: DashboardWidget[],
) {
  return await ApiClient.saveDashboardLayout("custom", {
    version: layout.version,
    widgets: draftWidgets,
  });
}

export function handleSaveError(
  cause: unknown,
  setConflictOpen: (open: boolean) => void,
  setToast: (toast: ToastState) => void,
) {
  if (cause instanceof APIError && cause.kind === "conflict") {
    setConflictOpen(true);
    return;
  }
  setToast(layoutNotSavedToast());
}

export function selectWidgetType(
  value: string | string[],
  setSelectedType: (type: DashboardWidgetType) => void,
  setWidgetTitle: (title: string) => void,
  setWidgetError: (error: string | null) => void,
  setWidgetModalOpen: (open: boolean) => void,
) {
  setSelectedType(selectSingleValue(value) as DashboardWidgetType);
  setWidgetTitle("");
  setWidgetError(null);
  setWidgetModalOpen(true);
}

export function removeTargetWidget(
  removeTarget: DashboardWidget | null,
  setDraftWidgets: Dispatch<SetStateAction<DashboardWidget[]>>,
  setRemoveTarget: (widget: DashboardWidget | null) => void,
) {
  if (removeTarget) {
    setDraftWidgets((current) =>
      removeDashboardWidget(current, removeTarget.instanceId)
    );
  }
  setRemoveTarget(null);
}

export function layoutSavedToast(version: number): ToastState {
  return {
    title: "Layout saved",
    message: `Version ${version} is now active.`,
    variant: "success",
  };
}

export function layoutNotSavedToast(): ToastState {
  return {
    title: "Layout not saved",
    message:
      "The local draft is preserved. Retry when the service is available.",
    variant: "error",
  };
}

export function defaultLayoutRestoredToast(): ToastState {
  return {
    title: "Default layout restored",
    message: "The approved dashboard layout is active.",
    variant: "success",
  };
}

export function resetFailedToast(): ToastState {
  return {
    title: "Reset failed",
    message: "The saved layout was not changed.",
    variant: "error",
  };
}

function selectSingleValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
