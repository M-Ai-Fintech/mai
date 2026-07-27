import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiClient, type DashboardLayout } from "@/lib/api-client";
import {
  addDashboardWidget,
  dashboardScreenState,
  type DashboardWidget,
  dashboardWidgetConfig,
  dashboardWidgetsChanged,
  type DashboardWidgetType,
  moveDashboardWidget,
  resizeDashboardWidget,
} from "./custom-dashboard-model";
import type {
  CustomDashboardController,
  ScreenState,
  ToastState,
} from "./custom-dashboard-types";
import {
  applyDashboardLayout,
  defaultLayoutRestoredToast,
  handleSaveError,
  layoutSavedToast,
  removeTargetWidget,
  resetFailedToast,
  saveDashboardLayout,
  selectWidgetType,
} from "./custom-dashboard-actions";

export function useCustomDashboard(): CustomDashboardController {
  const groups = useDashboardStateGroups();
  const load = useDashboardLoadAction(groups.layoutState);
  useDashboardInitialLoad(load);
  const dirty = useDashboardDirty(groups.layoutState);
  const actions = useDashboardActions(
    groups.layoutState,
    groups.widgetState,
    groups.dialogState,
    dirty,
    load,
  );
  return dashboardControllerFromGroups(groups, dirty, actions);
}

function useDashboardStateGroups() {
  return {
    layoutState: useDashboardLayoutState(),
    widgetState: useDashboardWidgetState(),
    dialogState: useDashboardDialogState(),
  };
}

function useDashboardLayoutState() {
  const [state, setState] = useState<ScreenState>("loading");
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [draftWidgets, setDraftWidgets] = useState<DashboardWidget[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  return {
    state,
    setState,
    layout,
    setLayout,
    draftWidgets,
    setDraftWidgets,
    isEditing,
    setIsEditing,
    isSaving,
    setIsSaving,
  };
}

function useDashboardWidgetState() {
  const [selectedType, setSelectedType] = useState<DashboardWidgetType>("kpi");
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [widgetTitle, setWidgetTitle] = useState("");
  const [kpiMetric, setKpiMetric] = useState("pipeline_value");
  const [widgetError, setWidgetError] = useState<string | null>(null);
  return {
    selectedType,
    setSelectedType,
    widgetModalOpen,
    setWidgetModalOpen,
    widgetTitle,
    setWidgetTitle,
    kpiMetric,
    setKpiMetric,
    widgetError,
    setWidgetError,
  };
}

function useDashboardDialogState() {
  const [removeTarget, setRemoveTarget] = useState<DashboardWidget | null>(
    null,
  );
  const [resetOpen, setResetOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  return {
    removeTarget,
    setRemoveTarget,
    resetOpen,
    setResetOpen,
    conflictOpen,
    setConflictOpen,
    toast,
    setToast,
  };
}

type DashboardLayoutState = ReturnType<typeof useDashboardLayoutState>;
type DashboardWidgetState = ReturnType<typeof useDashboardWidgetState>;
type DashboardDialogState = ReturnType<typeof useDashboardDialogState>;
type DashboardStateGroups = ReturnType<typeof useDashboardStateGroups>;
interface DashboardActionParts {
  addWidget: () => void;
  save: () => Promise<void>;
  reset: () => Promise<void>;
  cancelChanges: () => void;
}

function useDashboardLoadAction(layoutState: DashboardLayoutState) {
  const { setDraftWidgets, setLayout, setState } = layoutState;
  return useCallback(async () => {
    setState("loading");
    try {
      const result = await ApiClient.getDashboardLayout("custom");
      applyDashboardLayout(result, setLayout, setDraftWidgets, setState);
    } catch {
      setState("error");
    }
  }, [setDraftWidgets, setLayout, setState]);
}

function useDashboardInitialLoad(load: () => Promise<void>) {
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
}

function useDashboardDirty(layoutState: DashboardLayoutState): boolean {
  return useMemo(
    () =>
      dashboardWidgetsChanged(
        layoutState.draftWidgets,
        layoutState.layout?.widgets ?? [],
      ),
    [layoutState.draftWidgets, layoutState.layout],
  );
}

function useAddDashboardWidgetAction(
  layoutState: DashboardLayoutState,
  widgetState: DashboardWidgetState,
) {
  return () => {
    if (!validDashboardWidgetTitle(widgetState)) return;
    layoutState.setDraftWidgets((current) =>
      addDashboardWidget(
        current,
        widgetState.selectedType,
        crypto.randomUUID(),
        newDashboardWidgetConfig(widgetState),
      )
    );
    widgetState.setWidgetModalOpen(false);
    layoutState.setState("ready");
  };
}

function validDashboardWidgetTitle(widgetState: DashboardWidgetState): boolean {
  if (widgetState.widgetTitle.trim()) return true;
  widgetState.setWidgetError("Widget title is required.");
  return false;
}

function newDashboardWidgetConfig(
  widgetState: DashboardWidgetState,
): Record<string, string> {
  return dashboardWidgetConfig(
    widgetState.selectedType,
    widgetState.widgetTitle,
    widgetState.kpiMetric,
  );
}

function useSaveDashboardAction(
  layoutState: DashboardLayoutState,
  dialogState: DashboardDialogState,
  dirty: boolean,
) {
  return async () => {
    await saveDashboardInState(layoutState, dialogState, dirty);
  };
}

async function saveDashboardInState(
  layoutState: DashboardLayoutState,
  dialogState: DashboardDialogState,
  dirty: boolean,
) {
  if (!layoutState.layout || !dirty) return;
  layoutState.setIsSaving(true);
  try {
    const saved = await saveDashboardLayout(
      layoutState.layout,
      layoutState.draftWidgets,
    );
    acceptSavedDashboardLayout(saved, layoutState, dialogState);
  } catch (cause) {
    handleSaveError(cause, dialogState.setConflictOpen, dialogState.setToast);
  } finally {
    layoutState.setIsSaving(false);
  }
}

function acceptSavedDashboardLayout(
  saved: DashboardLayout,
  layoutState: DashboardLayoutState,
  dialogState: DashboardDialogState,
) {
  applyDashboardLayout(
    saved,
    layoutState.setLayout,
    layoutState.setDraftWidgets,
    layoutState.setState,
  );
  layoutState.setIsEditing(false);
  dialogState.setToast(layoutSavedToast(saved.version));
}

function useResetDashboardAction(
  layoutState: DashboardLayoutState,
  dialogState: DashboardDialogState,
) {
  return async () => {
    await resetDashboardInState(layoutState, dialogState);
  };
}

async function resetDashboardInState(
  layoutState: DashboardLayoutState,
  dialogState: DashboardDialogState,
) {
  dialogState.setResetOpen(false);
  layoutState.setIsSaving(true);
  try {
    const resetLayout = await ApiClient.resetDashboardLayout("custom");
    acceptResetDashboardLayout(resetLayout, layoutState, dialogState);
  } catch {
    dialogState.setToast(resetFailedToast());
  } finally {
    layoutState.setIsSaving(false);
  }
}

function acceptResetDashboardLayout(
  resetLayout: DashboardLayout,
  layoutState: DashboardLayoutState,
  dialogState: DashboardDialogState,
) {
  applyDashboardLayout(
    resetLayout,
    layoutState.setLayout,
    layoutState.setDraftWidgets,
    layoutState.setState,
  );
  layoutState.setIsEditing(false);
  dialogState.setToast(defaultLayoutRestoredToast());
}

function useCancelDashboardChangesAction(layoutState: DashboardLayoutState) {
  return () => {
    const widgets = layoutState.layout?.widgets ?? [];
    layoutState.setDraftWidgets(widgets);
    layoutState.setIsEditing(false);
    layoutState.setState(dashboardScreenState(widgets));
  };
}

function useDashboardActions(
  layoutState: DashboardLayoutState,
  widgetState: DashboardWidgetState,
  dialogState: DashboardDialogState,
  dirty: boolean,
  load: () => Promise<void>,
): CustomDashboardController["actions"] {
  const parts = useDashboardActionParts(
    layoutState,
    widgetState,
    dialogState,
    dirty,
  );
  return dashboardActions(layoutState, widgetState, dialogState, load, parts);
}

function useDashboardActionParts(
  layoutState: DashboardLayoutState,
  widgetState: DashboardWidgetState,
  dialogState: DashboardDialogState,
  dirty: boolean,
): DashboardActionParts {
  return {
    addWidget: useAddDashboardWidgetAction(layoutState, widgetState),
    save: useSaveDashboardAction(layoutState, dialogState, dirty),
    reset: useResetDashboardAction(layoutState, dialogState),
    cancelChanges: useCancelDashboardChangesAction(layoutState),
  };
}

function dashboardController(
  layoutState: DashboardLayoutState,
  widgetState: DashboardWidgetState,
  dialogState: DashboardDialogState,
  dirty: boolean,
  actions: CustomDashboardController["actions"],
): CustomDashboardController {
  return {
    state: dashboardState(layoutState, widgetState, dialogState, dirty),
    actions,
  };
}

function dashboardControllerFromGroups(
  groups: DashboardStateGroups,
  dirty: boolean,
  actions: CustomDashboardController["actions"],
): CustomDashboardController {
  return dashboardController(
    groups.layoutState,
    groups.widgetState,
    groups.dialogState,
    dirty,
    actions,
  );
}

function dashboardState(
  layoutState: DashboardLayoutState,
  widgetState: DashboardWidgetState,
  dialogState: DashboardDialogState,
  dirty: boolean,
): CustomDashboardController["state"] {
  return { ...layoutState, ...widgetState, ...dialogState, dirty };
}

function dashboardActions(
  layoutState: DashboardLayoutState,
  widgetState: DashboardWidgetState,
  dialogState: DashboardDialogState,
  load: () => Promise<void>,
  parts: DashboardActionParts,
): CustomDashboardController["actions"] {
  return {
    ...dashboardBaseActions(layoutState, load, parts),
    addWidget: parts.addWidget,
    ...dashboardWidgetActions(widgetState),
    ...dashboardDialogActions(dialogState),
    ...dashboardGridActions(layoutState, dialogState),
  };
}

function dashboardBaseActions(
  layoutState: DashboardLayoutState,
  load: () => Promise<void>,
  parts: DashboardActionParts,
): Pick<
  CustomDashboardController["actions"],
  "load" | "save" | "reset" | "cancelChanges" | "setIsEditing"
> {
  return {
    load,
    save: parts.save,
    reset: parts.reset,
    cancelChanges: parts.cancelChanges,
    setIsEditing: layoutState.setIsEditing,
  };
}

function dashboardWidgetActions(
  widgetState: DashboardWidgetState,
): Pick<
  CustomDashboardController["actions"],
  | "selectWidgetType"
  | "setWidgetModalOpen"
  | "setWidgetTitle"
  | "setKpiMetricFromValue"
  | "setWidgetError"
> {
  return {
    selectWidgetType: (value) => selectWidgetTypeForState(value, widgetState),
    setWidgetModalOpen: widgetState.setWidgetModalOpen,
    setWidgetTitle: widgetState.setWidgetTitle,
    setKpiMetricFromValue: (value) =>
      widgetState.setKpiMetric(selectSingleValue(value)),
    setWidgetError: widgetState.setWidgetError,
  };
}

function selectWidgetTypeForState(
  value: string | string[],
  widgetState: DashboardWidgetState,
) {
  selectWidgetType(
    value,
    widgetState.setSelectedType,
    widgetState.setWidgetTitle,
    widgetState.setWidgetError,
    widgetState.setWidgetModalOpen,
  );
}

function dashboardDialogActions(
  dialogState: DashboardDialogState,
): Pick<
  CustomDashboardController["actions"],
  | "setRemoveTarget"
  | "setResetOpen"
  | "setConflictOpen"
  | "clearToast"
> {
  return {
    setRemoveTarget: dialogState.setRemoveTarget,
    setResetOpen: dialogState.setResetOpen,
    setConflictOpen: dialogState.setConflictOpen,
    clearToast: () => dialogState.setToast(null),
  };
}

function dashboardGridActions(
  layoutState: DashboardLayoutState,
  dialogState: DashboardDialogState,
): Pick<
  CustomDashboardController["actions"],
  "moveWidget" | "resizeWidget" | "removeTargetWidget"
> {
  return {
    moveWidget: (widget, direction) =>
      moveDashboardWidgetInState(layoutState, widget, direction),
    resizeWidget: (widget) => resizeDashboardWidgetInState(layoutState, widget),
    removeTargetWidget: () =>
      removeTargetWidgetInState(layoutState, dialogState),
  };
}

function moveDashboardWidgetInState(
  layoutState: DashboardLayoutState,
  widget: DashboardWidget,
  direction: -1 | 1,
) {
  layoutState.setDraftWidgets((current) =>
    moveDashboardWidget(current, widget.instanceId, direction)
  );
}

function resizeDashboardWidgetInState(
  layoutState: DashboardLayoutState,
  widget: DashboardWidget,
) {
  layoutState.setDraftWidgets((current) =>
    resizeDashboardWidget(current, widget.instanceId)
  );
}

function removeTargetWidgetInState(
  layoutState: DashboardLayoutState,
  dialogState: DashboardDialogState,
) {
  removeTargetWidget(
    dialogState.removeTarget,
    layoutState.setDraftWidgets,
    dialogState.setRemoveTarget,
  );
}

function selectSingleValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
