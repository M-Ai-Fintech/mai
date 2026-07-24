import type { DashboardLayout } from "@/lib/api-client";

export type DashboardWidget = DashboardLayout["widgets"][number];
export type DashboardWidgetType = DashboardWidget["type"];

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

function reflowDashboardWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  return widgets.map((widget) => {
    if (x + widget.grid.w > 12) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    const placed = { ...widget, grid: { ...widget.grid, x, y } };
    x += widget.grid.w;
    rowHeight = Math.max(rowHeight, widget.grid.h);
    if (x === 12) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    return placed;
  });
}

export function addDashboardWidget(
  widgets: DashboardWidget[],
  type: DashboardWidgetType,
  instanceId: string,
  config: Record<string, string> = {},
): DashboardWidget[] {
  const size = widgetSizes[type];
  const y = widgets.reduce(
    (maximum, widget) => Math.max(maximum, widget.grid.y + widget.grid.h),
    0,
  );
  return [
    ...widgets,
    {
      instanceId,
      type,
      grid: { x: 0, y, ...size },
      config: type === "kpi"
        ? { metric: config.metric ?? "pipeline_value", ...config }
        : config,
    },
  ];
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
