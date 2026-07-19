import { describe, expect, it } from "vitest";
import {
  addDashboardWidget,
  moveDashboardWidget,
  removeDashboardWidget,
  resizeDashboardWidget,
  type DashboardWidget,
} from "./custom-dashboard-model";

const first: DashboardWidget = {
  instanceId: "00000000-0000-4000-8000-000000000001",
  type: "kpi",
  grid: { x: 0, y: 0, w: 4, h: 2 },
  config: { metric: "pipeline_value" },
};

describe("custom dashboard layout transitions", () => {
  it("adds only a supported widget type below the existing grid", () => {
    const result = addDashboardWidget(
      [first],
      "risk_summary",
      "00000000-0000-4000-8000-000000000002",
    );
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ type: "risk_summary", grid: { x: 0, y: 2, w: 6, h: 3 } });
  });

  it("reorders widgets and normalizes their grid rows", () => {
    const second = addDashboardWidget(
      [first],
      "agent_entry",
      "00000000-0000-4000-8000-000000000002",
    )[1];
    const result = moveDashboardWidget([first, second], second.instanceId, -1);
    expect(result.map((widget) => widget.instanceId)).toEqual([second.instanceId, first.instanceId]);
    expect(result.map((widget) => [widget.grid.x, widget.grid.y])).toEqual([[0, 0], [6, 0]]);
  });

  it("removes a widget without mutating the source", () => {
    const source = [first];
    expect(removeDashboardWidget(source, first.instanceId)).toEqual([]);
    expect(source).toHaveLength(1);
  });

  it("cycles through approved size presets and reflows persisted coordinates", () => {
    const result = resizeDashboardWidget([first], first.instanceId);
    expect(result[0].grid).toEqual({ x: 0, y: 0, w: 6, h: 3 });
    expect(first.grid).toEqual({ x: 0, y: 0, w: 4, h: 2 });
  });
});
