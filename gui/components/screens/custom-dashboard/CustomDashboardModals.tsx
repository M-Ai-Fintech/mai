import { Button } from "@/components/Button/Button";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { FormField } from "@/components/FormField/FormField";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Toast } from "@/components/Toast/Toast";
import type {
  DashboardWidget,
  DashboardWidgetType,
} from "./custom-dashboard-model";
import type { ToastState } from "./custom-dashboard-types";

const kpiOptions = [
  { value: "pipeline_value", label: "Total pipeline value" },
  { value: "win_rate", label: "Win rate" },
  { value: "active_dd", label: "Active due diligence" },
];

interface DashboardModalsProps {
  conflictOpen: boolean;
  widgetModalOpen: boolean;
  removeTarget: DashboardWidget | null;
  resetOpen: boolean;
  selectedType: DashboardWidgetType;
  widgetTitle: string;
  kpiMetric: string;
  widgetError: string | null;
  toast: ToastState | null;
  onConflictClose: () => void;
  onLoadLatest: () => void;
  onWidgetModalClose: () => void;
  onAddWidget: () => void;
  onWidgetTitleChange: (title: string) => void;
  onWidgetErrorChange: (error: string | null) => void;
  onKpiMetricChange: (value: string | string[]) => void;
  onRemoveClose: () => void;
  onRemoveConfirm: () => void;
  onResetClose: () => void;
  onResetConfirm: () => void;
  onToastClose: () => void;
}

export function CustomDashboardModals(props: DashboardModalsProps) {
  return (
    <>
      <ConflictModal {...props} />
      <WidgetModal {...props} />
      <RemoveWidgetModal {...props} />
      <ResetDashboardModal {...props} />
      {props.toast && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <Toast {...props.toast} onClose={props.onToastClose} />
        </div>
      )}
    </>
  );
}

function ConflictModal(props: DashboardModalsProps) {
  return (
    <Modal
      isOpen={props.conflictOpen}
      onClose={props.onConflictClose}
      size="md"
      title="Dashboard updated elsewhere"
      subtitle="Your local draft has not been discarded."
      footer={<ConflictFooter {...props} />}
    >
      <p>
        Load the current server version before saving again, or keep this
        unsaved draft for review.
      </p>
    </Modal>
  );
}

function ConflictFooter(props: DashboardModalsProps) {
  return (
    <>
      <Button variant="secondary" onClick={props.onConflictClose}>
        Keep local draft
      </Button>
      <Button variant="primary" onClick={props.onLoadLatest}>
        Load latest layout
      </Button>
    </>
  );
}

function WidgetModal(props: DashboardModalsProps) {
  return (
    <Modal
      isOpen={props.widgetModalOpen}
      onClose={props.onWidgetModalClose}
      size="md"
      title="Configure widget"
      subtitle="Only approved component-based widget types are available."
      footer={<WidgetFooter {...props} />}
    >
      <div className="space-y-5">
        <WidgetTitleField {...props} />
        {props.selectedType === "kpi" && <KpiMetricField {...props} />}
      </div>
    </Modal>
  );
}

function WidgetFooter(props: DashboardModalsProps) {
  return (
    <>
      <Button variant="secondary" onClick={props.onWidgetModalClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={props.onAddWidget}>Add widget</Button>
    </>
  );
}

function WidgetTitleField(props: DashboardModalsProps) {
  return (
    <FormField
      label="Widget title"
      required
      error={props.widgetError ?? undefined}
    >
      <Input
        autoFocus
        value={props.widgetTitle}
        hasError={Boolean(props.widgetError)}
        onChange={(event) => {
          props.onWidgetTitleChange(event.target.value);
          props.onWidgetErrorChange(null);
        }}
      />
    </FormField>
  );
}

function KpiMetricField(props: DashboardModalsProps) {
  return (
    <FormField label="Metric" required>
      <Dropdown
        options={kpiOptions}
        value={props.kpiMetric}
        onChange={props.onKpiMetricChange}
      />
    </FormField>
  );
}

function RemoveWidgetModal(props: DashboardModalsProps) {
  return (
    <Modal
      isOpen={props.removeTarget !== null}
      onClose={props.onRemoveClose}
      size="sm"
      title="Remove widget?"
      footer={<RemoveFooter {...props} />}
    >
      <p>This change remains local until you save the layout.</p>
    </Modal>
  );
}

function RemoveFooter(props: DashboardModalsProps) {
  return (
    <>
      <Button variant="secondary" onClick={props.onRemoveClose}>Cancel</Button>
      <Button variant="consent" onClick={props.onRemoveConfirm}>Remove</Button>
    </>
  );
}

function ResetDashboardModal(props: DashboardModalsProps) {
  return (
    <Modal
      isOpen={props.resetOpen}
      onClose={props.onResetClose}
      size="sm"
      title="Reset dashboard layout?"
      footer={<ResetFooter {...props} />}
    >
      <p>The server default will replace the current custom layout.</p>
    </Modal>
  );
}

function ResetFooter(props: DashboardModalsProps) {
  return (
    <>
      <Button variant="secondary" onClick={props.onResetClose}>Cancel</Button>
      <Button variant="consent" onClick={props.onResetConfirm}>
        Reset layout
      </Button>
    </>
  );
}
