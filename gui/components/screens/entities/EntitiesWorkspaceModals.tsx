"use client";

import Link from "next/link";
import type { RefObject } from "react";

import { Button } from "@/components/Button/Button";
import { Modal } from "@/components/Modal/Modal";
import type { EntitySummary, TeamMember } from "@/lib/api-client";

import { EntityFormView } from "./EntityFormView";
import type { EntityFormErrors, EntityFormState } from "./entity-state";

export interface WorkspaceEntityFormModalProps {
  modalMode: "create" | "edit" | null;
  modalRoleLabel: string;
  saving: boolean;
  form: EntityFormState;
  formErrors: EntityFormErrors;
  teamMembers: TeamMember[];
  formRootRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (form: EntityFormState) => void;
}

export function WorkspaceEntityFormModal(props: WorkspaceEntityFormModalProps) {
  return (
    <Modal
      isOpen={props.modalMode !== null}
      onClose={props.onClose}
      size="lg"
      title={workspaceFormTitle(props.modalMode, props.modalRoleLabel)}
      subtitle="Fields map directly to the approved MVP entity contract."
      footer={<WorkspaceEntityFormFooter {...props} />}
    >
      <WorkspaceEntityFormBody {...props} />
    </Modal>
  );
}

function workspaceFormTitle(
  modalMode: "create" | "edit" | null,
  modalRoleLabel: string,
) {
  return modalMode === "edit"
    ? `Edit ${modalRoleLabel}`
    : `Add ${modalRoleLabel}`;
}

type WorkspaceEntityFormBodyProps = Pick<
  WorkspaceEntityFormModalProps,
  "form" | "formErrors" | "teamMembers" | "formRootRef" | "onFormChange"
>;

function WorkspaceEntityFormBody({
  form,
  formErrors,
  teamMembers,
  formRootRef,
  onFormChange,
}: WorkspaceEntityFormBodyProps) {
  return (
    <div ref={formRootRef}>
      <EntityFormView
        form={form}
        errors={formErrors}
        teamMembers={teamMembers}
        advisorHint="Optional for newly sourced targets."
        onChange={onFormChange}
      />
    </div>
  );
}

type WorkspaceEntityFormFooterProps = Pick<
  WorkspaceEntityFormModalProps,
  "modalMode" | "modalRoleLabel" | "saving" | "onClose" | "onSave"
>;

function WorkspaceEntityFormFooter(props: WorkspaceEntityFormFooterProps) {
  return (
    <>
      <Button
        variant="secondary"
        onClick={props.onClose}
        disabled={props.saving}
      >
        Cancel
      </Button>
      <Button variant="primary" onClick={props.onSave} disabled={props.saving}>
        {workspaceSaveLabel(props)}
      </Button>
    </>
  );
}

function workspaceSaveLabel(props: WorkspaceEntityFormFooterProps) {
  if (props.saving) return "Saving...";
  if (props.modalMode === "edit") return "Save changes";
  return `Save ${props.modalRoleLabel}`;
}

export interface WorkspaceConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
}

export function WorkspaceConflictModal(props: WorkspaceConflictModalProps) {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size="md"
      title="Entity updated elsewhere"
      subtitle="Your entered values remain visible behind this dialog."
      footer={<WorkspaceConflictFooter {...props} />}
    >
      <p>Reload the latest resource version before applying another edit.</p>
    </Modal>
  );
}

function WorkspaceConflictFooter(props: WorkspaceConflictModalProps) {
  return (
    <>
      <Button variant="secondary" onClick={props.onClose}>Cancel</Button>
      <Button variant="primary" onClick={props.onReload}>
        Reload current entity
      </Button>
    </>
  );
}

export interface WorkspaceArchiveModalProps {
  archiveTarget: EntitySummary | null;
  archiveBlocked: string | null;
  saving: boolean;
  onClose: () => void;
  onArchive: () => void;
}

export function WorkspaceArchiveModal(props: WorkspaceArchiveModalProps) {
  return (
    <Modal
      isOpen={props.archiveTarget !== null}
      onClose={props.onClose}
      size="sm"
      title="Archive entity"
      subtitle="This removes the entity from active portfolio results."
      footer={<WorkspaceArchiveFooter {...props} />}
    >
      <WorkspaceArchivePrompt entity={props.archiveTarget} />
      <WorkspaceArchiveBlock
        archiveBlocked={props.archiveBlocked}
        entity={props.archiveTarget}
      />
    </Modal>
  );
}

function WorkspaceArchivePrompt({ entity }: { entity: EntitySummary | null }) {
  return (
    <p>
      Archive{" "}
      <strong>{entity?.legalName}</strong>? Existing deal references are
      preserved.
    </p>
  );
}

function WorkspaceArchiveFooter(props: WorkspaceArchiveModalProps) {
  return (
    <>
      <Button
        variant="secondary"
        onClick={props.onClose}
        disabled={props.saving}
      >
        Cancel
      </Button>
      <Button
        variant="consent"
        onClick={props.onArchive}
        disabled={props.saving || Boolean(props.archiveBlocked)}
      >
        {props.saving ? "Archiving..." : "Archive entity"}
      </Button>
    </>
  );
}

interface WorkspaceArchiveBlockProps {
  archiveBlocked: string | null;
  entity: EntitySummary | null;
}

function WorkspaceArchiveBlock(props: WorkspaceArchiveBlockProps) {
  if (!props.archiveBlocked || !props.entity) return null;
  return (
    <>
      <p role="alert" className="mt-4 font-bold text-red-700">
        {props.archiveBlocked}
      </p>
      <Link
        href={`/deals?search=${encodeURIComponent(props.entity.legalName)}`}
      >
        <Button className="mt-4" variant="secondary" size="sm">
          View active deals
        </Button>
      </Link>
    </>
  );
}
