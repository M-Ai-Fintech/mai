import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import type { DashboardWidgetType } from "./custom-dashboard-model";

const widgetOptions = [
  { value: "kpi", label: "KPI card" },
  { value: "pipeline_table", label: "Pipeline table" },
  { value: "agent_entry", label: "Agent entry" },
  { value: "risk_summary", label: "Risk summary" },
];

interface CustomDashboardToolbarProps {
  dirty: boolean;
  isEditing: boolean;
  isSaving: boolean;
  selectedType: DashboardWidgetType;
  onSelectWidgetType: (value: string | string[]) => void;
  onCancelChanges: () => void;
  onResetOpen: () => void;
  onEdit: () => void;
  onSave: () => void;
}

export function CustomDashboardToolbar(props: CustomDashboardToolbarProps) {
  return (
    <div className="sticky top-0 z-30 mb-6 flex flex-wrap items-center justify-between gap-6 rounded-xl border border-dust-taupe bg-canvas-cream/95 p-4 backdrop-blur">
      <ToolbarTitle dirty={props.dirty} isEditing={props.isEditing} />
      <ToolbarActions {...props} />
    </div>
  );
}

function ToolbarTitle(
  { dirty, isEditing }: { dirty: boolean; isEditing: boolean },
) {
  return (
    <div>
      <Badge variant={dirty ? "outline" : isEditing ? "orange" : "default"}>
        {dirty ? "Unsaved" : isEditing ? "Editing layout" : "Saved layout"}
      </Badge>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-black">
        My dashboard layout
      </h1>
    </div>
  );
}

function ToolbarActions(props: CustomDashboardToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {props.isEditing && <EditingActions {...props} />}
      <EditLayoutButton {...props} />
      <SaveLayoutButton {...props} />
    </div>
  );
}

function EditLayoutButton(props: CustomDashboardToolbarProps) {
  return (
    <Button
      variant="secondary"
      onClick={props.onEdit}
      disabled={props.isEditing || props.isSaving}
    >
      Edit layout
    </Button>
  );
}

function SaveLayoutButton(props: CustomDashboardToolbarProps) {
  return (
    <Button
      variant="primary"
      onClick={props.onSave}
      disabled={!props.isEditing || !props.dirty || props.isSaving}
    >
      {props.isSaving ? "Saving…" : "Save layout"}
    </Button>
  );
}

function EditingActions(props: CustomDashboardToolbarProps) {
  return (
    <>
      <AddWidgetDropdown {...props} />
      {props.dirty && (
        <Button variant="secondary" onClick={props.onCancelChanges}>
          Cancel changes
        </Button>
      )}
      <Button
        variant="secondary"
        onClick={props.onResetOpen}
        disabled={props.isSaving}
      >
        Reset layout
      </Button>
    </>
  );
}

function AddWidgetDropdown(props: CustomDashboardToolbarProps) {
  return (
    <div className="w-52">
      <Dropdown
        options={widgetOptions}
        value={props.selectedType}
        onChange={props.onSelectWidgetType}
        label="Add widget"
        searchable
      />
    </div>
  );
}
