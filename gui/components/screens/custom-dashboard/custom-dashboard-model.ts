import type { DashboardLayout } from "@/lib/api-client";

export type DashboardWidget = DashboardLayout["widgets"][number];
export type DashboardWidgetType = DashboardWidget["type"];
export type DashboardWidgetScreenState = "ready" | "empty";

const widgetSizes: Record<DashboardWidgetType, { w: number; h: number }> = {
  kpi: { w: 4, h: 2 },
  pipeline_table: { w: 12, h: 4 },
  agent_entry: { w: 6, h: 3 },
  risk_summary: { w: 6, h: 3 },
};

const widgetPresets: Record<
  DashboardWidgetType,
  Array<{ w: number; h: number }>
> = {
  kpi: [{ w: 4, h: 2 }, { w: 6, h: 3 }, { w: 12, h: 3 }],
  pipeline_table: [{ w: 6, h: 4 }, { w: 12, h: 4 }],
  agent_entry: [{ w: 4, h: 3 }, { w: 6, h: 3 }, { w: 12, h: 4 }],
  risk_summary: [{ w: 4, h: 3 }, { w: 6, h: 3 }, { w: 12, h: 4 }],
};

interface DashboardGridCursor {
  x: number;
  y: number;
  rowHeight: number;
}

function reflowDashboardWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  let cursor = { x: 0, y: 0, rowHeight: 0 };
  return widgets.map((widget) => {
    const result = placeDashboardWidget(widget, cursor);
    cursor = result.cursor;
    return result.widget;
  });
}

function placeDashboardWidget(
  widget: DashboardWidget,
  cursor: DashboardGridCursor,
): { widget: DashboardWidget; cursor: DashboardGridCursor } {
  const wrapped = wrapDashboardGridRow(cursor, widget);
  const placed = {
    ...widget,
    grid: { ...widget.grid, x: wrapped.x, y: wrapped.y },
  };
  return {
    widget: placed,
    cursor: advanceDashboardGridCursor(wrapped, widget),
  };
}

function wrapDashboardGridRow(
  cursor: DashboardGridCursor,
  widget: DashboardWidget,
): DashboardGridCursor {
  if (cursor.x + widget.grid.w <= 12) return cursor;
  return { x: 0, y: cursor.y + cursor.rowHeight, rowHeight: 0 };
}

function advanceDashboardGridCursor(
  cursor: DashboardGridCursor,
  widget: DashboardWidget,
): DashboardGridCursor {
  const next = {
    x: cursor.x + widget.grid.w,
    y: cursor.y,
    rowHeight: Math.max(cursor.rowHeight, widget.grid.h),
  };
  return next.x === 12
    ? { x: 0, y: next.y + next.rowHeight, rowHeight: 0 }
    : next;
}

export function addDashboardWidget(
  widgets: DashboardWidget[],
  type: DashboardWidgetType,
  instanceId: string,
  config: Record<string, string> = {},
): DashboardWidget[] {
  return [...widgets, newDashboardWidget(widgets, type, instanceId, config)];
}

function newDashboardWidget(
  widgets: DashboardWidget[],
  type: DashboardWidgetType,
  instanceId: string,
  config: Record<string, string>,
): DashboardWidget {
  return {
    instanceId,
    type,
    grid: { x: 0, y: nextDashboardWidgetY(widgets), ...widgetSizes[type] },
    config: dashboardWidgetInitialConfig(type, config),
  };
}

function nextDashboardWidgetY(widgets: DashboardWidget[]): number {
  return widgets.reduce(
    (maximum, widget) => Math.max(maximum, widget.grid.y + widget.grid.h),
    0,
  );
}

function dashboardWidgetInitialConfig(
  type: DashboardWidgetType,
  config: Record<string, string>,
): Record<string, string> {
  return type === "kpi"
    ? { metric: config.metric ?? "pipeline_value", ...config }
    : config;
}

export function dashboardWidgetsChanged(
  draftWidgets: DashboardWidget[],
  persistedWidgets: DashboardWidget[],
): boolean {
  return JSON.stringify(draftWidgets) !== JSON.stringify(persistedWidgets);
}

export function dashboardScreenState(
  widgets: DashboardWidget[],
): DashboardWidgetScreenState {
  return widgets.length ? "ready" : "empty";
}

export function dashboardWidgetConfig(
  type: DashboardWidgetType,
  title: string,
  kpiMetric: string,
): Record<string, string> {
  const config = { title: title.trim() };
  return type === "kpi" ? { ...config, metric: kpiMetric } : config;
}

export function moveDashboardWidget(
  widgets: DashboardWidget[],
  instanceId: string,
  direction: -1 | 1,
): DashboardWidget[] {
  const currentIndex = widgets.findIndex((widget) =>
    widget.instanceId === instanceId
  );
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= widgets.length) {
    return widgets;
  }
  const result = [...widgets];
  [result[currentIndex], result[nextIndex]] = [
    result[nextIndex],
    result[currentIndex],
  ];
  return reflowDashboardWidgets(result);
}

export function resizeDashboardWidget(
  widgets: DashboardWidget[],
  instanceId: string,
): DashboardWidget[] {
  const resized = widgets.map((widget) => {
    if (widget.instanceId !== instanceId) return widget;
    const presets = widgetPresets[widget.type];
    const current = presets.findIndex(({ w, h }) =>
      w === widget.grid.w && h === widget.grid.h
    );
    const next = presets[(current + 1) % presets.length];
    return { ...widget, grid: { ...widget.grid, ...next } };
  });
  return reflowDashboardWidgets(resized);
}

export function removeDashboardWidget(
  widgets: DashboardWidget[],
  instanceId: string,
): DashboardWidget[] {
  return reflowDashboardWidgets(
    widgets.filter((widget) => widget.instanceId !== instanceId),
  );
}
