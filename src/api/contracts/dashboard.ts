/** Custom-dashboard layout contracts. */

import type { ISODateTime, UUID, VersionedResource } from "./common.ts";

export enum DashboardWidgetType {
  Kpi = "kpi",
  PipelineTable = "pipeline_table",
  AgentEntry = "agent_entry",
  RiskSummary = "risk_summary",
}

export interface DashboardWidgetGrid {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  instanceId: UUID;
  type: DashboardWidgetType;
  grid: DashboardWidgetGrid;
  config: Record<string, unknown>;
}

export interface DashboardLayout extends VersionedResource {
  slug: string;
  widgets: DashboardWidget[];
  updatedAt: ISODateTime;
}

export interface PutDashboardLayoutRequest extends VersionedResource {
  widgets: DashboardWidget[];
}
