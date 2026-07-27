"use client";

import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { FormField } from "@/components/FormField/FormField";
import { Icon } from "@/components/Icon/Icon";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { Textarea } from "@/components/Textarea/Textarea";
import type {
  DealDraft,
  DealDraftErrors,
} from "@/components/screens/dashboard/dashboard-model";
import type { EntitySummary, TeamMember } from "@/lib/api-client";
import { buildUnassignedAdvisorOptions } from "@/lib/select-options";

interface DashboardCreateModalProps {
  creating: boolean;
  draft: DealDraft;
  draftErrors: DealDraftErrors;
  isCreateOpen: boolean;
  optionsError: string | null;
  optionsLoading: boolean;
  targets: EntitySummary[];
  teamMembers: TeamMember[];
  onClose: () => void;
  onDraftChange: (draft: DealDraft) => void;
  onRetryOptions: () => void;
  onSubmit: () => void;
}

export function DashboardCreateModal(props: DashboardCreateModalProps) {
  return (
    <Modal
      isOpen={props.isCreateOpen}
      onClose={() => !props.creating && props.onClose()}
      title="Create Deal"
      subtitle="Add a new mandate to the sourcing pipeline."
      size="lg"
      footer={<CreateModalFooter {...props} />}
    >
      <CreateModalBody {...props} />
    </Modal>
  );
}

function CreateModalFooter(props: DashboardCreateModalProps) {
  const disabled = props.creating || props.optionsLoading ||
    Boolean(props.optionsError);
  return (
    <>
      <Button
        variant="secondary"
        onClick={props.onClose}
        disabled={props.creating}
      >
        Cancel
      </Button>
      <Button variant="primary" onClick={props.onSubmit} disabled={disabled}>
        {props.creating ? "Creating…" : "Create Deal"}
      </Button>
    </>
  );
}

function CreateModalBody(props: DashboardCreateModalProps) {
  if (props.optionsLoading) return <CreateFormSkeleton />;
  if (props.optionsError) return <CreateFormError {...props} />;
  return <CreateFormFields {...props} />;
}

function CreateFormSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading deal form">
      <Skeleton />
      <Skeleton variant="rectangular" height={44} />
      <Skeleton />
      <Skeleton variant="rectangular" height={44} />
      <Skeleton variant="rectangular" height={96} />
    </div>
  );
}

function CreateFormError(props: DashboardCreateModalProps) {
  return (
    <Card variant="raised">
      <div className="flex items-start gap-3">
        <Icon name="alert" className="mt-0.5 text-signal-orange" />
        <CreateFormErrorContent {...props} />
      </div>
    </Card>
  );
}

function CreateFormErrorContent(props: DashboardCreateModalProps) {
  return (
    <div>
      <h3 className="font-semibold">Form options unavailable</h3>
      <p className="mt-1 text-xs text-slate-gray">{props.optionsError}</p>
      <Button
        className="mt-4"
        variant="secondary"
        size="sm"
        onClick={props.onRetryOptions}
      >
        Retry
      </Button>
    </div>
  );
}

function CreateFormFields(props: DashboardCreateModalProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <CreateCoreFields {...props} />
      <CreateValuationFields {...props} />
      <CreateInternalNoteField {...props} />
    </div>
  );
}

function CreateCoreFields(props: DashboardCreateModalProps) {
  return (
    <>
      <CreateTitleField {...props} />
      <CreateDealTypeField {...props} />
      <CreateTargetField {...props} />
      <CreatePhaseField {...props} />
      <CreateLeadAdvisorField {...props} />
    </>
  );
}

function CreateValuationFields(props: DashboardCreateModalProps) {
  return (
    <>
      <CreateCurrencyField {...props} />
      <CreateValuationMinimumField {...props} />
      <CreateValuationMaximumField {...props} />
    </>
  );
}

function CreateTitleField(props: DashboardCreateModalProps) {
  return (
    <FormField
      label="Deal Title"
      required
      error={props.draftErrors.title}
      className="md:col-span-2"
    >
      <Input
        autoFocus
        value={props.draft.title}
        hasError={Boolean(props.draftErrors.title)}
        onChange={(event) =>
          props.onDraftChange({ ...props.draft, title: event.target.value })}
        placeholder="Project Horizon"
      />
    </FormField>
  );
}

function CreateDealTypeField(props: DashboardCreateModalProps) {
  return (
    <FormField label="Deal Type" required error={props.draftErrors.dealType}>
      <Dropdown
        value={props.draft.dealType}
        options={[{ value: "buy_side", label: "Buy-side" }, {
          value: "sell_side",
          label: "Sell-side",
        }]}
        onChange={(value) =>
          props.onDraftChange({
            ...props.draft,
            dealType: value as DealDraft["dealType"],
          })}
      />
    </FormField>
  );
}

function CreateTargetField(props: DashboardCreateModalProps) {
  const noTargets = props.targets.length === 0;
  return (
    <FormField
      label="Target Entity"
      required
      error={props.draftErrors.targetId}
      hint={noTargets
        ? "Create a target entity before creating a deal."
        : undefined}
    >
      <CreateTargetDropdown {...props} disabled={noTargets} />
    </FormField>
  );
}

function CreateTargetDropdown(
  props: DashboardCreateModalProps & { disabled: boolean },
) {
  return (
    <Dropdown
      searchable
      value={props.draft.targetId}
      placeholder="Select target"
      error={props.draftErrors.targetId}
      options={props.targets.map((target) => ({
        value: target.id,
        label: target.legalName,
      }))}
      onChange={(value) =>
        props.onDraftChange({ ...props.draft, targetId: value as string })}
      disabled={props.disabled}
    />
  );
}

function CreatePhaseField(props: DashboardCreateModalProps) {
  return (
    <FormField
      label="Phase"
      required
      hint="New mandates enter the sequential workflow in Sourcing."
    >
      <Dropdown
        value={props.draft.phase}
        options={[{ value: "sourcing", label: "Sourcing" }]}
        onChange={() => undefined}
        disabled
      />
    </FormField>
  );
}

function CreateLeadAdvisorField(props: DashboardCreateModalProps) {
  return (
    <FormField label="Lead Advisor" hint="Optional">
      <Dropdown
        searchable
        value={props.draft.leadAdvisorId}
        placeholder="Unassigned"
        options={buildUnassignedAdvisorOptions(props.teamMembers)}
        onChange={(value) =>
          props.onDraftChange({
            ...props.draft,
            leadAdvisorId: value as string,
          })}
      />
    </FormField>
  );
}

function CreateCurrencyField(props: DashboardCreateModalProps) {
  return (
    <FormField label="Currency" required>
      <Dropdown
        value={props.draft.currency}
        options={["BRL", "USD", "EUR"].map((currency) => ({
          value: currency,
          label: currency,
        }))}
        onChange={(value) =>
          props.onDraftChange({
            ...props.draft,
            currency: value as DealDraft["currency"],
          })}
      />
    </FormField>
  );
}

function CreateValuationMinimumField(props: DashboardCreateModalProps) {
  return (
    <CreateValuationInput
      label="Valuation Minimum"
      error={props.draftErrors.valuationMin}
      value={props.draft.valuationMin}
      onChange={(valuationMin) =>
        props.onDraftChange({ ...props.draft, valuationMin })}
    />
  );
}

function CreateValuationMaximumField(props: DashboardCreateModalProps) {
  return (
    <CreateValuationInput
      label="Valuation Maximum"
      error={props.draftErrors.valuationMax}
      value={props.draft.valuationMax}
      onChange={(valuationMax) =>
        props.onDraftChange({ ...props.draft, valuationMax })}
    />
  );
}

function CreateValuationInput(props: {
  error: string | undefined;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormField label={props.label} required error={props.error}>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={props.value}
        hasError={Boolean(props.error)}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </FormField>
  );
}

function CreateInternalNoteField(props: DashboardCreateModalProps) {
  return (
    <FormField
      label="Internal Note"
      hint="Optional; visible only to the deal team."
      className="md:col-span-2"
    >
      <Textarea
        value={props.draft.internalNote}
        onChange={(event) =>
          props.onDraftChange({
            ...props.draft,
            internalNote: event.target.value,
          })}
        placeholder="Add sourcing context or initial constraints."
      />
    </FormField>
  );
}
