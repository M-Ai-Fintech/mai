"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiClient, APIError, type DashboardLayout } from "@/lib/api-client";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { FormField } from "@/components/FormField/FormField";
import { Icon } from "@/components/Icon/Icon";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import {
  Table,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/Table/Table";
import { Toast } from "@/components/Toast/Toast";
import {
  addDashboardWidget,
  type DashboardWidget,
  type DashboardWidgetType,
  moveDashboardWidget,
  removeDashboardWidget,
  resizeDashboardWidget,
} from "./custom-dashboard-model";

type ScreenState = "loading" | "ready" | "empty" | "error";
type ToastState = {
  title: string;
  message: string;
  variant: "success" | "error" | "info";
};

const widgetOptions = [
  { value: "kpi", label: "KPI card" },
  { value: "pipeline_table", label: "Pipeline table" },
  { value: "agent_entry", label: "Agent entry" },
  { value: "risk_summary", label: "Risk summary" },
];

const kpiOptions = [
  { value: "pipeline_value", label: "Total pipeline value" },
  { value: "win_rate", label: "Win rate" },
  { value: "active_dd", label: "Active due diligence" },
];

export function CustomDashboard() {
  const [state, setState] = useState<ScreenState>("loading");
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [draftWidgets, setDraftWidgets] = useState<DashboardWidget[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState<DashboardWidgetType>("kpi");
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [widgetTitle, setWidgetTitle] = useState("");
  const [kpiMetric, setKpiMetric] = useState("pipeline_value");
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<DashboardWidget | null>(
    null,
  );
  const [resetOpen, setResetOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await ApiClient.getDashboardLayout("custom");
      setLayout(result);
      setDraftWidgets(result.widgets);
      setState(result.widgets.length ? "ready" : "empty");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const dirty = useMemo(
    () =>
      JSON.stringify(draftWidgets) !== JSON.stringify(layout?.widgets ?? []),
    [draftWidgets, layout],
  );

  const addWidget = () => {
    if (!widgetTitle.trim()) {
      setWidgetError("Widget title is required.");
      return;
    }
    setDraftWidgets((current) =>
      addDashboardWidget(
        current,
        selectedType,
        crypto.randomUUID(),
        {
          title: widgetTitle.trim(),
          ...(selectedType === "kpi" ? { metric: kpiMetric } : {}),
        },
      )
    );
    setWidgetModalOpen(false);
    setState("ready");
  };

  const save = async () => {
    if (!layout || !dirty) return;
    setIsSaving(true);
    try {
      const saved = await ApiClient.saveDashboardLayout("custom", {
        version: layout.version,
        widgets: draftWidgets,
      });
      setLayout(saved);
      setDraftWidgets(saved.widgets);
      setIsEditing(false);
      setState(saved.widgets.length ? "ready" : "empty");
      setToast({
        title: "Layout saved",
        message: `Version ${saved.version} is now active.`,
        variant: "success",
      });
    } catch (cause) {
      if (cause instanceof APIError && cause.kind === "conflict") {
        setConflictOpen(true);
      } else {
        setToast({
          title: "Layout not saved",
          message:
            "The local draft is preserved. Retry when the service is available.",
          variant: "error",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const reset = async () => {
    setResetOpen(false);
    setIsSaving(true);
    try {
      const resetLayout = await ApiClient.resetDashboardLayout("custom");
      setLayout(resetLayout);
      setDraftWidgets(resetLayout.widgets);
      setIsEditing(false);
      setState(resetLayout.widgets.length ? "ready" : "empty");
      setToast({
        title: "Default layout restored",
        message: "The approved dashboard layout is active.",
        variant: "success",
      });
    } catch {
      setToast({
        title: "Reset failed",
        message: "The saved layout was not changed.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelChanges = () => {
    const widgets = layout?.widgets ?? [];
    setDraftWidgets(widgets);
    setIsEditing(false);
    setState(widgets.length ? "ready" : "empty");
  };

  if (state === "loading") return <DashboardLoading />;

  if (state === "error") {
    return (
      <div className="p-8">
        <StaticDashboardToolbar />
        <Card
          variant="raised"
          className="flex min-h-[320px] flex-col items-center justify-center text-center"
        >
          <Icon name="alert" size="xl" className="text-signal-orange" />
          <h1 className="mt-4 text-xl font-bold">
            Dashboard layout could not be loaded
          </h1>
          <p className="mt-2 text-sm text-slate-gray">
            The saved layout remains unchanged.
          </p>
          <div className="mt-5 flex gap-3">
            <Button variant="primary" onClick={() => void load()}>Retry</Button>
            <Button variant="secondary" onClick={() => void reset()}>
              Use default layout
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 text-left">
      <div className="sticky top-0 z-30 mb-6 flex flex-wrap items-center justify-between gap-6 rounded-xl border border-dust-taupe bg-canvas-cream/95 p-4 backdrop-blur">
        <div>
          <Badge variant={dirty ? "outline" : isEditing ? "orange" : "default"}>
            {dirty ? "Unsaved" : isEditing ? "Editing layout" : "Saved layout"}
          </Badge>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-black">
            My dashboard layout
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {isEditing && (
            <>
              <div className="w-52">
                <Dropdown
                  options={widgetOptions}
                  value={selectedType}
                  onChange={(value) => {
                    setSelectedType(
                      (Array.isArray(value)
                        ? value[0]
                        : value) as DashboardWidgetType,
                    );
                    setWidgetTitle("");
                    setWidgetError(null);
                    setWidgetModalOpen(true);
                  }}
                  label="Add widget"
                  searchable
                />
              </div>
              {dirty && (
                <Button variant="secondary" onClick={cancelChanges}>
                  Cancel changes
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setResetOpen(true)}
                disabled={isSaving}
              >
                Reset layout
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            onClick={() => setIsEditing(true)}
            disabled={isEditing || isSaving}
          >
            Edit layout
          </Button>
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={!isEditing || !dirty || isSaving}
          >
            {isSaving ? "Saving…" : "Save layout"}
          </Button>
        </div>
      </div>

      {state === "empty" || draftWidgets.length === 0
        ? (
          <Card>
            <EmptyState
              title="Build your dashboard"
              description="Enter edit mode to add an approved widget to this layout."
              actionLabel="Edit layout"
              onAction={() => setIsEditing(true)}
            />
          </Card>
        )
        : (
          <div className="grid auto-rows-[64px] grid-cols-12 gap-6">
            {draftWidgets.map((widget, index) => (
              <WidgetFrame
                key={widget.instanceId}
                widget={widget}
                editing={isEditing}
                index={index}
                count={draftWidgets.length}
                onMove={(direction) =>
                  setDraftWidgets((current) =>
                    moveDashboardWidget(current, widget.instanceId, direction)
                  )}
                onResize={() =>
                  setDraftWidgets((current) =>
                    resizeDashboardWidget(current, widget.instanceId)
                  )}
                onRemove={() => setRemoveTarget(widget)}
              />
            ))}
          </div>
        )}

      <Modal
        isOpen={conflictOpen}
        onClose={() => setConflictOpen(false)}
        size="md"
        title="Dashboard updated elsewhere"
        subtitle="Your local draft has not been discarded."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConflictOpen(false)}>
              Keep local draft
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConflictOpen(false);
                void load();
              }}
            >
              Load latest layout
            </Button>
          </>
        }
      >
        <p>
          Load the current server version before saving again, or keep this
          unsaved draft for review.
        </p>
      </Modal>

      <Modal
        isOpen={widgetModalOpen}
        onClose={() => setWidgetModalOpen(false)}
        size="md"
        title="Configure widget"
        subtitle="Only approved component-based widget types are available."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setWidgetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={addWidget}>Add widget</Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormField
            label="Widget title"
            required
            error={widgetError ?? undefined}
          >
            <Input
              autoFocus
              value={widgetTitle}
              hasError={Boolean(widgetError)}
              onChange={(event) => {
                setWidgetTitle(event.target.value);
                setWidgetError(null);
              }}
            />
          </FormField>
          {selectedType === "kpi" && (
            <FormField label="Metric" required>
              <Dropdown
                options={kpiOptions}
                value={kpiMetric}
                onChange={(value) =>
                  setKpiMetric(Array.isArray(value) ? value[0] : value)}
              />
            </FormField>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        size="sm"
        title="Remove widget?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="consent"
              onClick={() => {
                if (removeTarget) {
                  setDraftWidgets((current) =>
                    removeDashboardWidget(current, removeTarget.instanceId)
                  );
                }
                setRemoveTarget(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p>This change remains local until you save the layout.</p>
      </Modal>

      <Modal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        size="sm"
        title="Reset dashboard layout?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="consent" onClick={() => void reset()}>
              Reset layout
            </Button>
          </>
        }
      >
        <p>The server default will replace the current custom layout.</p>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}

function WidgetFrame(
  { widget, editing, index, count, onMove, onResize, onRemove }: {
    widget: DashboardWidget;
    editing: boolean;
    index: number;
    count: number;
    onMove: (direction: -1 | 1) => void;
    onResize: () => void;
    onRemove: () => void;
  },
) {
  return (
    <div
      className={editing
        ? "flex h-full flex-col rounded-xl border border-dust-taupe p-2"
        : "flex h-full flex-col"}
      style={{
        gridColumn: `${widget.grid.x + 1} / span ${widget.grid.w}`,
        gridRow: `${widget.grid.y + 1} / span ${widget.grid.h}`,
      }}
    >
      {editing && (
        <div className="mb-2 flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            Move earlier
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            Move later
          </Button>
          <Button variant="secondary" size="sm" onClick={onResize}>
            Resize
          </Button>
          <Button variant="secondary" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <WidgetContent widget={widget} />
      </div>
    </div>
  );
}

function WidgetContent({ widget }: { widget: DashboardWidget }) {
  const configuredTitle = typeof widget.config.title === "string"
    ? widget.config.title
    : null;
  if (widget.type === "kpi") {
    const metric = typeof widget.config.metric === "string"
      ? widget.config.metric
      : "pipeline_value";
    const content = metric === "win_rate"
      ? ["Win rate", "68%", "+4 pts"]
      : metric === "active_dd"
      ? ["Active due diligence", "6", "2 nearing review"]
      : ["Total pipeline value", "$1.8B", "+12% this quarter"];
    const title = configuredTitle ?? content[0];
    return (
      <Card variant="raised" className="h-full">
        <Badge variant="default">{title}</Badge>
        <p className="mt-5 text-4xl font-bold">{content[1]}</p>
        <p className="mt-2 text-sm font-bold text-signal-orange">
          {content[2]}
        </p>
      </Card>
    );
  }
  if (widget.type === "pipeline_table") {
    return (
      <Card variant="dark" className="h-full">
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
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[["Sourcing", 5], ["Due diligence", 6], ["Negotiation", 4], [
            "Closing",
            3,
          ]].map(([label, count]) => (
            <Card key={label} padding="sm">
              <div className="flex items-center justify-between">
                <strong className="text-sm">{label}</strong>
                <Badge variant="orange">{count}</Badge>
              </div>
              <div className="mt-3 rounded-lg bg-canvas-cream p-3 text-xs font-bold text-ink-black">
                Project {label === "Sourcing" ? "Aurora" : "Horizon"}
              </div>
            </Card>
          ))}
        </div>
      </Card>
    );
  }
  if (widget.type === "risk_summary") {
    return (
      <Card variant="raised" className="h-full">
        <Badge variant="orange">{configuredTitle ?? "Risk summary"}</Badge>
        <div className="mt-5">
          <Table aria-label="Risk distribution">
            <TableHead>
              <TableRow isHeader>
                <TableCell isHeader>Risk band</TableCell>
                <TableCell isHeader>Deals</TableCell>
                <TableCell isHeader>Share</TableCell>
              </TableRow>
            </TableHead>
            <tbody>
              {[["Low", "11", "62%"], ["Moderate", "5", "28%"], [
                "High",
                "2",
                "10%",
              ]].map((row) => (
                <TableRow key={row[0]}>
                  {row.map((cell) => <TableCell key={cell}>{cell}</TableCell>)}
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    );
  }
  return (
    <Card variant="raised" className="h-full">
      <Badge variant="default">{configuredTitle ?? "Team activity"}</Badge>
      <p className="mt-2 text-xs text-slate-gray">
        Prototype-only display content · Agent Entry widget
      </p>
      <div className="mt-5 space-y-4">
        {[["AM", "Ana moved Project Horizon to diligence", "8 min"], [
          "BR",
          "Bruno requested a FinancialRisk analysis",
          "24 min",
        ], ["LS", "Luisa reviewed the VDR citations", "1 hr"]].map((
          [initials, action, time],
        ) => (
          <div key={action} className="flex items-center gap-3">
            <Avatar size="md" fallback={initials} />
            <p className="flex-1 text-sm font-medium">{action}</p>
            <span className="text-xs text-slate-gray">{time}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DashboardLoading() {
  return (
    <div className="p-8" aria-label="Loading custom dashboard">
      <StaticDashboardToolbar />
      <div className="mt-6 grid grid-cols-3 gap-6">
        <Skeleton height={190} variant="rectangular" />
        <Skeleton height={190} variant="rectangular" />
        <Skeleton height={190} variant="rectangular" />
      </div>
      <Skeleton height={300} variant="rectangular" className="mt-6" />
      <div className="mt-6 grid grid-cols-2 gap-6">
        <Skeleton height={260} variant="rectangular" />
        <Skeleton height={260} variant="rectangular" />
      </div>
    </div>
  );
}

function StaticDashboardToolbar() {
  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-dust-taupe bg-canvas-cream p-4">
      <h1 className="text-3xl font-bold">My dashboard layout</h1>
      <div className="flex gap-3">
        <Button variant="secondary" disabled>Edit layout</Button>
        <Button variant="primary" disabled>Save layout</Button>
      </div>
    </div>
  );
}
