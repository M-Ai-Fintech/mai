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
import {
  type DashboardPhase,
  PHASE_LABELS,
} from "@/components/screens/dashboard/dashboard-model";
import type { DealDetail, EntitySummary, TeamMember } from "@/lib/api-client";
import { buildUnassignedAdvisorOptions } from "@/lib/select-options";
import {
  type EditDraft,
  type EditErrors,
  selectablePhases,
} from "./deal-detail-model";

interface EditDealModalProps {
  deal: DealDetail;
  draft: EditDraft | null;
  editErrors: EditErrors;
  editOpen: boolean;
  optionsError: string | null;
  optionsLoading: boolean;
  saving: boolean;
  targets: EntitySummary[];
  teamMembers: TeamMember[];
  onClose: () => void;
  onDraftChange: (draft: EditDraft) => void;
  onRetryOptions: () => void;
  onSubmit: () => void;
}

export function EditDealModal(props: EditDealModalProps) {
  return (
    <Modal
      isOpen={props.editOpen}
      onClose={() => !props.saving && props.onClose()}
      title="Edit deal"
      subtitle={`Editing version ${props.deal.version}`}
      size="lg"
      footer={<EditDealFooter {...props} />}
    >
      <EditDealBody {...props} />
    </Modal>
  );
}

function EditDealFooter(props: EditDealModalProps) {
  const disabled = props.saving || props.optionsLoading ||
    Boolean(props.optionsError);
  return (
    <>
      <Button
        variant="secondary"
        disabled={props.saving}
        onClick={props.onClose}
      >
        Cancel
      </Button>
      <Button variant="primary" disabled={disabled} onClick={props.onSubmit}>
        {props.saving ? "Saving…" : "Save changes"}
      </Button>
    </>
  );
}

function EditDealBody(props: EditDealModalProps) {
  if (props.optionsLoading) return <EditDealSkeleton />;
  if (props.optionsError) return <EditDealOptionsError {...props} />;
  if (!props.draft) return null;
  return <EditDealFields {...props} draft={props.draft} />;
}

function EditDealSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading edit form">
      <Skeleton />
      <Skeleton variant="rectangular" height={44} />
      <Skeleton />
      <Skeleton variant="rectangular" height={44} />
      <Skeleton variant="rectangular" height={100} />
    </div>
  );
}

function EditDealOptionsError(props: EditDealModalProps) {
  return (
    <Card variant="raised">
      <Icon name="alert" className="text-signal-orange" />
      <h3 className="mt-3 font-semibold">Form options unavailable</h3>
      <p className="mt-1 text-xs text-slate-gray">{props.optionsError}</p>
      <Button
        className="mt-4"
        variant="secondary"
        size="sm"
        onClick={props.onRetryOptions}
      >
        Retry
      </Button>
    </Card>
  );
}

function EditDealFields(props: EditDealModalProps & { draft: EditDraft }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <EditIdentityFields {...props} />
      <EditValuationFields {...props} />
      <FormField label="Internal note" className="md:col-span-2">
        <Textarea
          value={props.draft.internalNote}
          onChange={(event) =>
            props.onDraftChange({
              ...props.draft,
              internalNote: event.target.value,
            })}
        />
      </FormField>
    </div>
  );
}

function EditIdentityFields(props: EditDealModalProps & { draft: EditDraft }) {
  return (
    <>
      <EditTitleField {...props} />
      <EditDealTypeField {...props} />
      <EditTargetField {...props} />
      <EditLeadAdvisorField {...props} />
    </>
  );
}

function EditValuationFields(props: EditDealModalProps & { draft: EditDraft }) {
  return (
    <>
      <EditValuationMinimumField {...props} />
      <EditValuationMaximumField {...props} />
      <EditCurrencyField {...props} />
    </>
  );
}

function EditTitleField(props: EditDealModalProps & { draft: EditDraft }) {
  return (
    <FormField
      label="Project title"
      required
      error={props.editErrors.title}
      className="md:col-span-2"
    >
      <Input
        autoFocus
        value={props.draft.title}
        hasError={Boolean(props.editErrors.title)}
        onChange={(event) =>
          props.onDraftChange({ ...props.draft, title: event.target.value })}
      />
    </FormField>
  );
}

function EditDealTypeField(props: EditDealModalProps & { draft: EditDraft }) {
  return (
    <FormField label="Deal type" required>
      <Dropdown
        value={props.draft.dealType}
        options={[{ value: "buy_side", label: "Buy-side" }, {
          value: "sell_side",
          label: "Sell-side",
        }]}
        onChange={(value) =>
          props.onDraftChange({
            ...props.draft,
            dealType: value as EditDraft["dealType"],
          })}
      />
    </FormField>
  );
}

function EditTargetField(props: EditDealModalProps & { draft: EditDraft }) {
  return (
    <FormField label="Target" required error={props.editErrors.targetId}>
      <Dropdown
        searchable
        value={props.draft.targetId}
        error={props.editErrors.targetId}
        options={props.targets.map((target) => ({
          value: target.id,
          label: target.legalName,
        }))}
        onChange={(value) =>
          props.onDraftChange({ ...props.draft, targetId: value as string })}
      />
    </FormField>
  );
}

function EditLeadAdvisorField(
  props: EditDealModalProps & { draft: EditDraft },
) {
  return (
    <FormField label="Lead advisor">
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

function EditValuationMinimumField(
  props: EditDealModalProps & { draft: EditDraft },
) {
  return (
    <EditValuationInput
      error={props.editErrors.valuationMin}
      label="Valuation minimum"
      value={props.draft.valuationMin}
      onChange={(valuationMin) =>
        props.onDraftChange({ ...props.draft, valuationMin })}
    />
  );
}

function EditValuationMaximumField(
  props: EditDealModalProps & { draft: EditDraft },
) {
  return (
    <EditValuationInput
      error={props.editErrors.valuationMax}
      label="Valuation maximum"
      value={props.draft.valuationMax}
      onChange={(valuationMax) =>
        props.onDraftChange({ ...props.draft, valuationMax })}
    />
  );
}

function EditValuationInput(props: {
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
        value={props.value}
        hasError={Boolean(props.error)}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </FormField>
  );
}

function EditCurrencyField(props: EditDealModalProps & { draft: EditDraft }) {
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
            currency: value as EditDraft["currency"],
          })}
      />
    </FormField>
  );
}

interface ArchiveDetailModalProps {
  archiveError: string | null;
  archiveOpen: boolean;
  archiving: boolean;
  deal: DealDetail;
  onClose: () => void;
  onConfirm: () => void;
}

export function ArchiveDetailModal(props: ArchiveDetailModalProps) {
  return (
    <Modal
      isOpen={props.archiveOpen}
      onClose={() => !props.archiving && props.onClose()}
      title={`Archive ${props.deal.title}?`}
      subtitle="This reversible action removes the deal from the active pipeline."
      size="sm"
      footer={<ArchiveDetailFooter {...props} />}
    >
      <ArchiveDetailBody archiveError={props.archiveError} />
    </Modal>
  );
}

function ArchiveDetailBody({ archiveError }: { archiveError: string | null }) {
  return (
    <>
      <p className="text-sm text-slate-gray">
        The deal and its history remain available as an archived record.
      </p>
      {archiveError && (
        <p className="mt-4 text-xs font-semibold text-red-600">
          {archiveError}
        </p>
      )}
    </>
  );
}

function ArchiveDetailFooter(props: ArchiveDetailModalProps) {
  return (
    <>
      <Button
        variant="secondary"
        disabled={props.archiving}
        onClick={props.onClose}
      >
        Cancel
      </Button>
      <Button
        variant="consent"
        disabled={props.archiving || Boolean(props.archiveError)}
        onClick={props.onConfirm}
      >
        {props.archiving ? "Archiving…" : "Archive deal"}
      </Button>
    </>
  );
}

interface PhaseTransitionModalProps {
  deal: DealDetail;
  moving: boolean;
  phaseComment: string;
  phaseError: string | null;
  phaseOpen: boolean;
  targetPhase: DashboardPhase;
  onClose: () => void;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
  onTargetPhaseChange: (phase: DashboardPhase) => void;
}

export function PhaseTransitionModal(props: PhaseTransitionModalProps) {
  return (
    <Modal
      isOpen={props.phaseOpen}
      onClose={() => !props.moving && props.onClose()}
      title={`Move ${props.deal.title} to ${PHASE_LABELS[props.targetPhase]}`}
      subtitle="Sequential workflow transition"
      size="md"
      footer={<PhaseTransitionFooter {...props} />}
    >
      <PhaseTransitionBody {...props} />
    </Modal>
  );
}

function PhaseTransitionBody(props: PhaseTransitionModalProps) {
  return (
    <div className="space-y-6">
      <PhaseDestinationField {...props} />
      <PhaseCommentField {...props} />
      <p className="font-public-sans text-xs text-slate-gray">
        Submitting against current deal version {props.deal.version}.
      </p>
    </div>
  );
}

function PhaseDestinationField(props: PhaseTransitionModalProps) {
  return (
    <FormField label="Destination phase" required>
      <Dropdown
        value={props.targetPhase}
        options={selectablePhases(props.deal.currentPhase)}
        onChange={(value) => props.onTargetPhaseChange(value as DashboardPhase)}
      />
    </FormField>
  );
}

function PhaseCommentField(props: PhaseTransitionModalProps) {
  return (
    <FormField
      label="Transition comment"
      required
      error={props.phaseError ?? undefined}
    >
      <Textarea
        value={props.phaseComment}
        hasError={Boolean(props.phaseError)}
        onChange={(event) => props.onCommentChange(event.target.value)}
        placeholder="Explain why this deal is ready to move."
      />
    </FormField>
  );
}

function PhaseTransitionFooter(props: PhaseTransitionModalProps) {
  return (
    <>
      <Button
        variant="secondary"
        disabled={props.moving}
        onClick={props.onClose}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        disabled={props.moving}
        onClick={props.onSubmit}
      >
        {props.moving ? "Moving…" : "Move deal"}
      </Button>
    </>
  );
}

interface ConflictModalProps {
  conflictOpen: boolean;
  deal: DealDetail;
  onClose: () => void;
  onReload: () => void;
}

export function ConflictModal(props: ConflictModalProps) {
  return (
    <Modal
      isOpen={props.conflictOpen}
      onClose={props.onClose}
      title={`${props.deal.title} was updated elsewhere`}
      subtitle="Your entered values have been preserved."
      size="md"
      footer={
        <ConflictFooter onClose={props.onClose} onReload={props.onReload} />
      }
    >
      <ConflictBody />
    </Modal>
  );
}

function ConflictBody() {
  return (
    <p className="text-sm text-slate-gray">
      Reload the current deal before deciding whether to reapply these changes.
      Nothing was overwritten.
    </p>
  );
}

function ConflictFooter(
  { onClose, onReload }: { onClose: () => void; onReload: () => void },
) {
  return (
    <>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={onReload}>Reload current deal</Button>
    </>
  );
}
