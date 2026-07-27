import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import {
  Table,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/Table/Table";
import type { DashboardWidget } from "./custom-dashboard-model";

interface DashboardWidgetGridProps {
  widgets: DashboardWidget[];
  editing: boolean;
  onEdit: () => void;
  onMove: (widget: DashboardWidget, direction: -1 | 1) => void;
  onResize: (widget: DashboardWidget) => void;
  onRemove: (widget: DashboardWidget) => void;
}

export function DashboardWidgetGrid(props: DashboardWidgetGridProps) {
  if (props.widgets.length === 0) {
    return <DashboardWidgetEmpty onEdit={props.onEdit} />;
  }
  return (
    <div className="grid auto-rows-[64px] grid-cols-12 gap-6">
      {props.widgets.map((widget, index) => (
        <WidgetGridItem
          key={widget.instanceId}
          widget={widget}
          index={index}
          props={props}
        />
      ))}
    </div>
  );
}

function DashboardWidgetEmpty({ onEdit }: { onEdit: () => void }) {
  return (
    <Card>
      <EmptyState
        title="Build your dashboard"
        description="Enter edit mode to add an approved widget to this layout."
        actionLabel="Edit layout"
        onAction={onEdit}
      />
    </Card>
  );
}

function WidgetGridItem(
  { widget, index, props }: {
    widget: DashboardWidget;
    index: number;
    props: DashboardWidgetGridProps;
  },
) {
  return (
    <WidgetFrame
      widget={widget}
      editing={props.editing}
      index={index}
      count={props.widgets.length}
      onMove={props.onMove}
      onResize={props.onResize}
      onRemove={props.onRemove}
    />
  );
}

function WidgetFrame(
  props: WidgetFrameProps,
) {
  return (
    <div
      className={widgetFrameClassName(props.editing)}
      style={widgetFrameStyle(props.widget)}
    >
      {props.editing && <WidgetFrameControls {...props} />}
      <div className="min-h-0 flex-1">
        <WidgetContent widget={props.widget} />
      </div>
    </div>
  );
}

interface WidgetFrameProps {
  widget: DashboardWidget;
  editing: boolean;
  index: number;
  count: number;
  onMove: (widget: DashboardWidget, direction: -1 | 1) => void;
  onResize: (widget: DashboardWidget) => void;
  onRemove: (widget: DashboardWidget) => void;
}

function WidgetFrameControls(props: WidgetFrameProps) {
  return (
    <WidgetEditingControls
      index={props.index}
      count={props.count}
      onMove={(direction) => props.onMove(props.widget, direction)}
      onResize={() => props.onResize(props.widget)}
      onRemove={() => props.onRemove(props.widget)}
    />
  );
}

function widgetFrameClassName(editing: boolean): string {
  return editing
    ? "flex h-full flex-col rounded-xl border border-dust-taupe p-2"
    : "flex h-full flex-col";
}

function widgetFrameStyle(widget: DashboardWidget) {
  return {
    gridColumn: `${widget.grid.x + 1} / span ${widget.grid.w}`,
    gridRow: `${widget.grid.y + 1} / span ${widget.grid.h}`,
  };
}

function WidgetEditingControls(
  { index, count, onMove, onResize, onRemove }: {
    index: number;
    count: number;
    onMove: (direction: -1 | 1) => void;
    onResize: () => void;
    onRemove: () => void;
  },
) {
  return (
    <div className="mb-2 flex justify-end gap-2">
      <WidgetMoveButtons index={index} count={count} onMove={onMove} />
      <WidgetEditButton label="Resize" onClick={onResize} />
      <WidgetEditButton label="Remove" onClick={onRemove} />
    </div>
  );
}

function WidgetMoveButtons(
  { index, count, onMove }: {
    index: number;
    count: number;
    onMove: (direction: -1 | 1) => void;
  },
) {
  return (
    <>
      <MoveWidgetButton direction={-1} disabled={index === 0} onMove={onMove} />
      <MoveWidgetButton
        direction={1}
        disabled={index === count - 1}
        onMove={onMove}
      />
    </>
  );
}

function WidgetEditButton(
  { label, onClick }: { label: string; onClick: () => void },
) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick}>{label}</Button>
  );
}

function MoveWidgetButton(
  { direction, disabled, onMove }: {
    direction: -1 | 1;
    disabled: boolean;
    onMove: (direction: -1 | 1) => void;
  },
) {
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={disabled}
      onClick={() => onMove(direction)}
    >
      {direction === -1 ? "Move earlier" : "Move later"}
    </Button>
  );
}

function WidgetContent({ widget }: { widget: DashboardWidget }) {
  const configuredTitle = typeof widget.config.title === "string"
    ? widget.config.title
    : null;
  if (widget.type === "kpi") {
    return <KpiWidget widget={widget} configuredTitle={configuredTitle} />;
  }
  if (widget.type === "pipeline_table") {
    return <PipelineWidget configuredTitle={configuredTitle} />;
  }
  if (widget.type === "risk_summary") {
    return <RiskSummaryWidget configuredTitle={configuredTitle} />;
  }
  return <AgentEntryWidget configuredTitle={configuredTitle} />;
}

function KpiWidget(
  { widget, configuredTitle }: {
    widget: DashboardWidget;
    configuredTitle: string | null;
  },
) {
  const metric = typeof widget.config.metric === "string"
    ? widget.config.metric
    : "pipeline_value";
  const content = kpiContent(metric);
  const title = configuredTitle ?? content[0];
  return (
    <Card variant="raised" className="h-full">
      <Badge variant="default">{title}</Badge>
      <p className="mt-5 text-4xl font-bold">{content[1]}</p>
      <p className="mt-2 text-sm font-bold text-signal-orange">{content[2]}</p>
    </Card>
  );
}

function kpiContent(metric: string): string[] {
  if (metric === "win_rate") return ["Win rate", "68%", "+4 pts"];
  if (metric === "active_dd") {
    return ["Active due diligence", "6", "2 nearing review"];
  }
  return ["Total pipeline value", "$1.8B", "+12% this quarter"];
}

function PipelineWidget(
  { configuredTitle }: { configuredTitle: string | null },
) {
  return (
    <Card variant="dark" className="h-full">
      <PipelineWidgetHeader configuredTitle={configuredTitle} />
      <PipelineStageGrid />
    </Card>
  );
}

function PipelineWidgetHeader(
  { configuredTitle }: { configuredTitle: string | null },
) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Badge variant="orange">Active pipeline</Badge>
        <h2 className="mt-3 text-2xl font-bold">
          {configuredTitle ?? "Compact deal stages"}
        </h2>
      </div>
      <Badge
        variant="outline"
        className="border-canvas-cream text-canvas-cream"
      >
        18 deals
      </Badge>
    </div>
  );
}

function PipelineStageGrid() {
  return (
    <div className="mt-6 grid grid-cols-4 gap-3">
      {pipelineStages().map(([label, count]) => (
        <PipelineStage key={label} label={label} count={count} />
      ))}
    </div>
  );
}

function pipelineStages(): Array<[string, number]> {
  return [
    ["Sourcing", 5],
    ["Due diligence", 6],
    ["Negotiation", 4],
    ["Closing", 3],
  ];
}

function PipelineStage({ label, count }: { label: string; count: number }) {
  return (
    <Card padding="sm">
      <div className="flex items-center justify-between">
        <strong className="text-sm">{label}</strong>
        <Badge variant="orange">{count}</Badge>
      </div>
      <div className="mt-3 rounded-lg bg-canvas-cream p-3 text-xs font-bold text-ink-black">
        Project {label === "Sourcing" ? "Aurora" : "Horizon"}
      </div>
    </Card>
  );
}

function RiskSummaryWidget(
  { configuredTitle }: { configuredTitle: string | null },
) {
  return (
    <Card variant="raised" className="h-full">
      <Badge variant="orange">{configuredTitle ?? "Risk summary"}</Badge>
      <RiskDistributionTable />
    </Card>
  );
}

function RiskDistributionTable() {
  return (
    <div className="mt-5">
      <Table aria-label="Risk distribution">
        <RiskDistributionHead />
        <RiskDistributionBody />
      </Table>
    </div>
  );
}

function RiskDistributionHead() {
  return (
    <TableHead>
      <TableRow isHeader>
        <TableCell isHeader>Risk band</TableCell>
        <TableCell isHeader>Deals</TableCell>
        <TableCell isHeader>Share</TableCell>
      </TableRow>
    </TableHead>
  );
}

function RiskDistributionBody() {
  return (
    <tbody>
      {riskRows().map((row) => (
        <TableRow key={row[0]}>
          {row.map((cell) => <TableCell key={cell}>{cell}</TableCell>)}
        </TableRow>
      ))}
    </tbody>
  );
}

function riskRows(): string[][] {
  return [["Low", "11", "62%"], ["Moderate", "5", "28%"], ["High", "2", "10%"]];
}

function AgentEntryWidget(
  { configuredTitle }: { configuredTitle: string | null },
) {
  return (
    <Card variant="raised" className="h-full">
      <Badge variant="default">{configuredTitle ?? "Team activity"}</Badge>
      <p className="mt-2 text-xs text-slate-gray">
        Prototype-only display content · Agent Entry widget
      </p>
      <AgentActivityList />
    </Card>
  );
}

function AgentActivityList() {
  return (
    <div className="mt-5 space-y-4">
      {agentActivityRows().map(([initials, action, time]) => (
        <AgentActivityItem
          key={action}
          initials={initials}
          action={action}
          time={time}
        />
      ))}
    </div>
  );
}

function AgentActivityItem(
  { initials, action, time }: {
    initials: string;
    action: string;
    time: string;
  },
) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="md" fallback={initials} />
      <p className="flex-1 text-sm font-medium">{action}</p>
      <span className="text-xs text-slate-gray">{time}</span>
    </div>
  );
}

function agentActivityRows(): string[][] {
  return [
    ["AM", "Ana moved Project Horizon to diligence", "8 min"],
    ["BR", "Bruno requested a FinancialRisk analysis", "24 min"],
    ["LS", "Luisa reviewed the VDR citations", "1 hr"],
  ];
}
