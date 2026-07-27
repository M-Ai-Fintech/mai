import type { DashboardLayout } from "@/lib/api-client";
import type {
  DashboardWidget,
  DashboardWidgetType,
} from "./custom-dashboard-model";

export type ScreenState = "loading" | "ready" | "empty" | "error";

export type ToastState = {
  title: string;
  message: string;
  variant: "success" | "error" | "info";
};

export interface CustomDashboardState {
  state: ScreenState;
  layout: DashboardLayout | null;
  draftWidgets: DashboardWidget[];
  isEditing: boolean;
  selectedType: DashboardWidgetType;
  widgetModalOpen: boolean;
  widgetTitle: string;
  kpiMetric: string;
  widgetError: string | null;
  removeTarget: DashboardWidget | null;
  resetOpen: boolean;
  conflictOpen: boolean;
  isSaving: boolean;
  toast: ToastState | null;
  dirty: boolean;
}

export interface CustomDashboardActions {
  load: () => Promise<void>;
  addWidget: () => void;
  save: () => Promise<void>;
  reset: () => Promise<void>;
  cancelChanges: () => void;
  setIsEditing: (isEditing: boolean) => void;
  selectWidgetType: (value: string | string[]) => void;
  setWidgetModalOpen: (open: boolean) => void;
  setWidgetTitle: (title: string) => void;
  setKpiMetricFromValue: (value: string | string[]) => void;
  setWidgetError: (error: string | null) => void;
  setRemoveTarget: (widget: DashboardWidget | null) => void;
  setResetOpen: (open: boolean) => void;
  setConflictOpen: (open: boolean) => void;
  moveWidget: (widget: DashboardWidget, direction: -1 | 1) => void;
  resizeWidget: (widget: DashboardWidget) => void;
  removeTargetWidget: () => void;
  clearToast: () => void;
}

export interface CustomDashboardController {
  state: CustomDashboardState;
  actions: CustomDashboardActions;
}
