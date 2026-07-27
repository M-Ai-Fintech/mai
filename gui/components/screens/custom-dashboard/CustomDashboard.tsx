"use client";

import { CustomDashboardModals } from "./CustomDashboardModals";
import {
  DashboardError,
  DashboardLoading,
} from "./CustomDashboardStatusPanels";
import { CustomDashboardToolbar } from "./CustomDashboardToolbar";
import { DashboardWidgetGrid } from "./CustomDashboardWidgets";
import type { CustomDashboardController } from "./custom-dashboard-types";
import { useCustomDashboard } from "./useCustomDashboard";

export function CustomDashboard() {
  return <CustomDashboardContent {...useCustomDashboard()} />;
}

function CustomDashboardContent({ state, actions }: CustomDashboardController) {
  if (state.state === "loading") return <DashboardLoading />;

  if (state.state === "error") {
    return (
      <DashboardError
        onRetry={() => void actions.load()}
        onReset={() => void actions.reset()}
      />
    );
  }

  return (
    <div className="p-8 text-left">
      <DashboardToolbarSection state={state} actions={actions} />
      <DashboardGridSection state={state} actions={actions} />
      <DashboardModalSection state={state} actions={actions} />
    </div>
  );
}

function DashboardToolbarSection(
  { state, actions }: CustomDashboardController,
) {
  return (
    <CustomDashboardToolbar
      dirty={state.dirty}
      isEditing={state.isEditing}
      isSaving={state.isSaving}
      selectedType={state.selectedType}
      onSelectWidgetType={actions.selectWidgetType}
      onCancelChanges={actions.cancelChanges}
      onResetOpen={() => actions.setResetOpen(true)}
      onEdit={() => actions.setIsEditing(true)}
      onSave={() => void actions.save()}
    />
  );
}

function DashboardGridSection({ state, actions }: CustomDashboardController) {
  return (
    <DashboardWidgetGrid
      widgets={state.draftWidgets}
      editing={state.isEditing}
      onEdit={() => actions.setIsEditing(true)}
      onMove={actions.moveWidget}
      onResize={actions.resizeWidget}
      onRemove={actions.setRemoveTarget}
    />
  );
}

function DashboardModalSection({ state, actions }: CustomDashboardController) {
  return (
    <CustomDashboardModals
      {...dashboardModalStateProps(state)}
      {...dashboardModalActionProps(actions)}
    />
  );
}

function dashboardModalStateProps(
  state: CustomDashboardController["state"],
) {
  return {
    conflictOpen: state.conflictOpen,
    widgetModalOpen: state.widgetModalOpen,
    removeTarget: state.removeTarget,
    resetOpen: state.resetOpen,
    selectedType: state.selectedType,
    widgetTitle: state.widgetTitle,
    kpiMetric: state.kpiMetric,
    widgetError: state.widgetError,
    toast: state.toast,
  };
}

function dashboardModalActionProps(
  actions: CustomDashboardController["actions"],
) {
  return {
    onConflictClose: () => actions.setConflictOpen(false),
    onLoadLatest: () => loadLatestDashboard(actions),
    onWidgetModalClose: () => actions.setWidgetModalOpen(false),
    onAddWidget: actions.addWidget,
    onWidgetTitleChange: actions.setWidgetTitle,
    onWidgetErrorChange: actions.setWidgetError,
    onKpiMetricChange: actions.setKpiMetricFromValue,
    onRemoveClose: () => actions.setRemoveTarget(null),
    onRemoveConfirm: actions.removeTargetWidget,
    onResetClose: () => actions.setResetOpen(false),
    onResetConfirm: () => void actions.reset(),
    onToastClose: actions.clearToast,
  };
}

function loadLatestDashboard(actions: CustomDashboardController["actions"]) {
  actions.setConflictOpen(false);
  void actions.load();
}
