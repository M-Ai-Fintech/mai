import {
  DashboardLayout,
  DashboardWidget,
  DashboardWidgetType,
} from "../contracts.ts";
import { MvpStoreError } from "./error.ts";
import { MvpStoreState } from "./state.ts";
import { clone } from "./utils.ts";

export function defaultWidgets(): DashboardWidget[] {
  return [
    {
      instanceId: "00000000-0000-4000-8000-000000000051",
      type: DashboardWidgetType.Kpi,
      grid: { x: 0, y: 0, w: 4, h: 2 },
      config: { metric: "pipeline_value" },
    },
    {
      instanceId: "00000000-0000-4000-8000-000000000052",
      type: DashboardWidgetType.Kpi,
      grid: { x: 4, y: 0, w: 4, h: 2 },
      config: { metric: "win_rate" },
    },
    {
      instanceId: "00000000-0000-4000-8000-000000000053",
      type: DashboardWidgetType.Kpi,
      grid: { x: 8, y: 0, w: 4, h: 2 },
      config: { metric: "active_dd" },
    },
    {
      instanceId: "00000000-0000-4000-8000-000000000054",
      type: DashboardWidgetType.PipelineTable,
      grid: { x: 0, y: 2, w: 12, h: 4 },
      config: {},
    },
    {
      instanceId: "00000000-0000-4000-8000-000000000055",
      type: DashboardWidgetType.RiskSummary,
      grid: { x: 0, y: 6, w: 6, h: 3 },
      config: {},
    },
    {
      instanceId: "00000000-0000-4000-8000-000000000056",
      type: DashboardWidgetType.AgentEntry,
      grid: { x: 6, y: 6, w: 6, h: 3 },
      config: {},
    },
  ];
}

export class DashboardLayoutRepository {
  constructor(private readonly state: MvpStoreState) {}

  get(slug: string): DashboardLayout {
    const layout = this.state.layouts.get(slug);
    if (!layout) {
      throw new MvpStoreError(
        "DASHBOARD_LAYOUT_NOT_FOUND",
        "Dashboard layout not found",
        404,
      );
    }
    return clone(layout);
  }

  put(
    slug: string,
    version: number,
    widgets: DashboardWidget[],
  ): DashboardLayout {
    const current = this.state.layouts.get(slug);
    const expectedVersion = current?.version ?? 0;
    if (version !== expectedVersion) {
      throw new MvpStoreError(
        "LAYOUT_VERSION_CONFLICT",
        "Dashboard layout version is stale",
        409,
      );
    }
    const layout: DashboardLayout = {
      slug,
      version: expectedVersion + 1,
      widgets: clone(widgets),
      updatedAt: this.state.now(),
    };
    this.state.layouts.set(slug, layout);
    return clone(layout);
  }

  reset(slug: string, version?: number): DashboardLayout {
    const current = this.state.layouts.get(slug);
    if (!current) {
      throw new MvpStoreError(
        "DASHBOARD_LAYOUT_NOT_FOUND",
        "Dashboard layout not found",
        404,
      );
    }
    if (version !== undefined && version !== current.version) {
      throw new MvpStoreError(
        "LAYOUT_VERSION_CONFLICT",
        "Dashboard layout version is stale",
        409,
      );
    }
    const layout: DashboardLayout = {
      slug,
      version: current.version + 1,
      widgets: defaultWidgets(),
      updatedAt: this.state.now(),
    };
    this.state.layouts.set(slug, layout);
    return clone(layout);
  }
}
