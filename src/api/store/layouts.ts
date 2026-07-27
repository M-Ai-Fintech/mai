import {
  DashboardLayout,
  DashboardWidget,
  DashboardWidgetType,
} from "../contracts.ts";
import { MvpStoreError } from "./error.ts";
import { MvpStoreState } from "./state.ts";
import { clone } from "./utils.ts";

const DEFAULT_WIDGETS: DashboardWidget[] = [
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

export function defaultWidgets(): DashboardWidget[] {
  return clone(DEFAULT_WIDGETS);
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
    assertLayoutVersion(slug, version, expectedVersion);
    const layout = updatedLayout(
      slug,
      expectedVersion + 1,
      widgets,
      this.state.now(),
    );
    this.state.layouts.set(slug, layout);
    return clone(layout);
  }

  reset(slug: string, version?: number): DashboardLayout {
    const current = this.state.layouts.get(slug);
    if (!current) throw missingLayout(slug);
    if (version !== undefined) {
      assertLayoutVersion(slug, version, current.version);
    }
    const layout = updatedLayout(
      slug,
      current.version + 1,
      defaultWidgets(),
      this.state.now(),
    );
    this.state.layouts.set(slug, layout);
    return clone(layout);
  }
}

function updatedLayout(
  slug: string,
  version: number,
  widgets: DashboardWidget[],
  updatedAt: string,
): DashboardLayout {
  return { slug, version, widgets: clone(widgets), updatedAt };
}

function assertLayoutVersion(
  slug: string,
  received: number,
  expected: number,
): void {
  if (received === expected) return;
  throw new MvpStoreError(
    "LAYOUT_VERSION_CONFLICT",
    `Dashboard layout "${slug}" has version "${received}"; expected "${expected}"`,
    409,
  );
}

function missingLayout(slug: string): MvpStoreError {
  return new MvpStoreError(
    "DASHBOARD_LAYOUT_NOT_FOUND",
    `Dashboard layout "${slug}" was not found`,
    404,
  );
}
