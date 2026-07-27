import { describe, expect, it } from "vitest";
import {
  addDashboardWidget,
  dashboardScreenState,
  type DashboardWidget,
  dashboardWidgetConfig,
  dashboardWidgetsChanged,
  moveDashboardWidget,
  removeDashboardWidget,
  resizeDashboardWidget,
} from "./custom-dashboard-model";

const first: DashboardWidget = {
  instanceId: "00000000-0000-4000-8000-000000000001",
  type: "kpi",
  grid: { x: 0, y: 0, w: 4, h: 2 },
  config: { metric: "pipeline_value" },
};

function expectSupportedWidgetAddition(): void {
  const result = addDashboardWidget(
    [first],
    "risk_summary",
    "00000000-0000-4000-8000-000000000002",
  );
  expect(result).toHaveLength(2);
  expect(result[1]).toMatchObject({
    type: "risk_summary",
    grid: { x: 0, y: 2, w: 6, h: 3 },
  });
}

function expectNormalizedWidgetOrder(): void {
  const second = addDashboardWidget(
    [first],
    "agent_entry",
    "00000000-0000-4000-8000-000000000002",
  )[1];
  const result = moveDashboardWidget([first, second], second.instanceId, -1);
  expect(result.map((widget) => widget.instanceId)).toEqual([
    second.instanceId,
    first.instanceId,
  ]);
  expect(result.map((widget) => [widget.grid.x, widget.grid.y])).toEqual([[
    0,
    0,
  ], [6, 0]]);
}

function expectWideWidgetReflow(): void {
  const wide = addDashboardWidget(
    [],
    "pipeline_table",
    "00000000-0000-4000-8000-000000000002",
  )[0];
  const small = addDashboardWidget([wide], "kpi", first.instanceId)[1];
  const result = moveDashboardWidget([wide, small], small.instanceId, -1);
  expect(result.map((widget) => [widget.grid.x, widget.grid.y])).toEqual([
    [0, 0],
    [0, 2],
  ]);
}

function expectImmutableWidgetRemoval(): void {
  const source = [first];
  expect(removeDashboardWidget(source, first.instanceId)).toEqual([]);
  expect(source).toHaveLength(1);
}

function expectApprovedWidgetResize(): void {
  const result = resizeDashboardWidget([first], first.instanceId);
  expect(result[0].grid).toEqual({ x: 0, y: 0, w: 6, h: 3 });
  expect(first.grid).toEqual({ x: 0, y: 0, w: 4, h: 2 });
}

function expectWidgetChangeDetection(): void {
  const changed = resizeDashboardWidget([first], first.instanceId);
  expect(dashboardWidgetsChanged(changed, [first])).toBe(true);
  expect(dashboardWidgetsChanged([first], [first])).toBe(false);
}

function expectDashboardScreenState(): void {
  expect(dashboardScreenState([])).toBe("empty");
  expect(dashboardScreenState([first])).toBe("ready");
}

function expectWidgetConfiguration(): void {
  expect(dashboardWidgetConfig("kpi", " Pipeline ", "win_rate")).toEqual({
    title: "Pipeline",
    metric: "win_rate",
  });
  expect(dashboardWidgetConfig("risk_summary", " Risk ", "win_rate"))
    .toEqual({ title: "Risk" });
}

function registerDashboardGridTests(): void {
  it(
    "adds only a supported widget type below the existing grid",
    expectSupportedWidgetAddition,
  );
  it(
    "reorders widgets and normalizes their grid rows",
    expectNormalizedWidgetOrder,
  );
  it(
    "wraps a wide widget onto the next row during reflow",
    expectWideWidgetReflow,
  );
  it(
    "removes a widget without mutating the source",
    expectImmutableWidgetRemoval,
  );
}

function registerDashboardStateTests(): void {
  it(
    "cycles through approved size presets and reflows persisted coordinates",
    expectApprovedWidgetResize,
  );
  it(
    "detects unsaved widget layout changes without mutating either list",
    expectWidgetChangeDetection,
  );
  it(
    "maps widget count into the dashboard screen state",
    expectDashboardScreenState,
  );
  it(
    "builds widget config from the selected type and title",
    expectWidgetConfiguration,
  );
}

describe("custom dashboard layout transitions", () => {
  registerDashboardGridTests();
  registerDashboardStateTests();
});
