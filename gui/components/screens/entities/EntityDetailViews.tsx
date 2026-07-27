"use client";

import Link from "next/link";
import type { RefObject } from "react";

import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Divider } from "@/components/Divider/Divider";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Icon } from "@/components/Icon/Icon";
import { Modal } from "@/components/Modal/Modal";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { Toast } from "@/components/Toast/Toast";
import type {
  DealSummary,
  EntityDetail as EntityDetailData,
  TeamMember,
} from "@/lib/api-client";

import { EntityFormView } from "./EntityFormView";
import { TargetDossier } from "./TargetDossier";
import type { EntityFormErrors, EntityFormState } from "./entity-state";

export function EntityDetailLoading() {
  return (
    <div className="mx-auto max-w-[2200px] space-y-6 p-8">
      <Skeleton height={96} variant="rectangular" />
      <div className="grid grid-cols-12 gap-6">
        <Skeleton className="col-span-8" height={480} variant="rectangular" />
        <Skeleton className="col-span-4" height={280} variant="rectangular" />
      </div>
    </div>
  );
}

interface EntityDetailErrorProps {
  onRetry: () => void;
}

export function EntityDetailError({ onRetry }: EntityDetailErrorProps) {
  return (
    <div className="mx-auto max-w-[2200px] p-8">
      <Card variant="raised">
        <EmptyState
          title="Entity could not be loaded"
          description="Retry without changing the selected record."
          actionLabel="Retry"
          onAction={onRetry}
          icon={<Icon name="alert" />}
        />
      </Card>
    </div>
  );
}

export interface EntityDetailHeaderProps {
  entity: EntityDetailData;
  onEdit: () => void;
  onArchive: () => void;
}

export function EntityDetailHeader(props: EntityDetailHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <EntityHeaderTitle entity={props.entity} />
      <EntityHeaderActions {...props} />
    </header>
  );
}

function EntityHeaderTitle({ entity }: { entity: EntityDetailData }) {
  return (
    <div>
      <EntityHeaderBadges entity={entity} />
      <h1 className="text-3xl font-bold">{entity.legalName}</h1>
      <p className="mt-2 text-sm text-slate-gray">
        Entity record version {entity.version}
      </p>
    </div>
  );
}

function EntityHeaderActions(props: EntityDetailHeaderProps) {
  return (
    <div className="flex gap-3">
      <Link href={`/entities?role=${props.entity.roles[0]}`}>
        <Button variant="secondary">Back to entities</Button>
      </Link>
      <Button variant="secondary" onClick={props.onEdit}>Edit</Button>
      <Button variant="consent" onClick={props.onArchive}>Archive</Button>
    </div>
  );
}

function EntityHeaderBadges({ entity }: { entity: EntityDetailData }) {
  return (
    <div className="mb-3 flex gap-2">
      {entity.roles.map((role) => (
        <Badge key={role} variant="outline">{role}</Badge>
      ))}
      <Badge variant="orange">
        KYB {entity.kybStatus.replace("_", " ")}
      </Badge>
    </div>
  );
}

export interface EntityDetailGridProps {
  entity: EntityDetailData;
  advisor: TeamMember | null;
  relatedDeals: DealSummary[];
}

export function EntityDetailGrid(props: EntityDetailGridProps) {
  return (
    <div className="grid grid-cols-12 gap-6">
      <EntityProfileCard entity={props.entity} />
      <div className="col-span-4 space-y-6">
        <EntityAdvisorCard advisor={props.advisor} />
        <TargetDossier entityId={props.entity.id} />
        <RelatedDealsCard relatedDeals={props.relatedDeals} />
      </div>
    </div>
  );
}

function EntityProfileCard({ entity }: { entity: EntityDetailData }) {
  return (
    <Card variant="raised" className="col-span-8">
      <h2 className="text-xl font-bold">Entity profile</h2>
      <Divider spacing="lg" />
      <EntityCoreFacts entity={entity} />
      <Divider spacing="lg" />
      <EntityAuditFacts entity={entity} />
    </Card>
  );
}

function EntityCoreFacts({ entity }: { entity: EntityDetailData }) {
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm">
      <Fact label="Legal name" value={entity.legalName} />
      <Fact label="Tax ID" value={entity.taxId} />
      <Fact label="Sector" value={entity.sector} />
      <Fact label="Country" value={entity.countryCode} />
      <Fact label="Contact email" value={entity.contactEmail} />
      <Fact label="Regulatory clearance" value={clearanceText(entity)} />
    </dl>
  );
}

function EntityAuditFacts({ entity }: { entity: EntityDetailData }) {
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm">
      <Fact
        label="Created"
        value={new Date(entity.createdAt).toLocaleString()}
      />
      <Fact
        label="Updated"
        value={new Date(entity.updatedAt).toLocaleString()}
      />
    </dl>
  );
}

function EntityAdvisorCard({ advisor }: { advisor: TeamMember | null }) {
  return (
    <Card>
      <Badge variant="default">Primary advisor</Badge>
      <div className="mt-5 flex items-center gap-3">
        <EntityAdvisorAvatar advisor={advisor} />
        <EntityAdvisorCopy advisor={advisor} />
      </div>
    </Card>
  );
}

function EntityAdvisorAvatar({ advisor }: { advisor: TeamMember | null }) {
  return (
    <Avatar
      size="lg"
      src={advisor?.avatarUrl ?? undefined}
      fallback={advisor?.displayName ?? "UA"}
    />
  );
}

function EntityAdvisorCopy({ advisor }: { advisor: TeamMember | null }) {
  return (
    <div>
      <p className="text-lg font-bold">
        {advisor?.displayName ?? "Unassigned"}
      </p>
      <p className="text-xs text-slate-gray">
        {advisor?.role ?? "Available after team synchronization"}
      </p>
    </div>
  );
}

function RelatedDealsCard({ relatedDeals }: { relatedDeals: DealSummary[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Badge variant="default">Related deals</Badge>
        <Badge variant="outline">{relatedDeals.length}</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {relatedDeals.length
          ? relatedDeals.map((deal) => (
            <RelatedDealRow key={deal.id} deal={deal} />
          ))
          : <p className="text-sm text-slate-gray">No related deals.</p>}
      </div>
    </Card>
  );
}

function RelatedDealRow({ deal }: { deal: DealSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dust-taupe/60 pb-3">
      <div>
        <p className="text-sm font-bold">{deal.title}</p>
        <p className="text-xs text-slate-gray">{deal.code}</p>
      </div>
      <Link href={`/deals/${deal.id}`}>
        <Button variant="secondary" size="sm">Open</Button>
      </Link>
    </div>
  );
}

export interface EntityEditModalProps {
  entity: EntityDetailData;
  editOpen: boolean;
  editForm: EntityFormState | null;
  editErrors: EntityFormErrors;
  saving: boolean;
  teamMembers: TeamMember[];
  editFormRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (form: EntityFormState) => void;
}

export function EntityEditModal(props: EntityEditModalProps) {
  return (
    <Modal
      isOpen={props.editOpen && props.editForm !== null}
      onClose={props.onClose}
      size="lg"
      title={`Edit ${capitalize(props.entity.roles[0])}`}
      subtitle="The entity detail remains visible beneath this edit state."
      footer={<EntityEditFooter {...props} />}
    >
      <EntityEditBody {...props} />
    </Modal>
  );
}

type EntityEditBodyProps = Pick<
  EntityEditModalProps,
  "editForm" | "editErrors" | "teamMembers" | "editFormRef" | "onFormChange"
>;

function EntityEditBody({
  editForm,
  editErrors,
  teamMembers,
  editFormRef,
  onFormChange,
}: EntityEditBodyProps) {
  if (!editForm) return null;
  return (
    <div ref={editFormRef}>
      <EntityFormView
        form={editForm}
        errors={editErrors}
        teamMembers={teamMembers}
        advisorHint="Optional for newly sourced entities."
        onChange={onFormChange}
      />
    </div>
  );
}

type EntityEditFooterProps = Pick<
  EntityEditModalProps,
  "saving" | "onClose" | "onSave"
>;

function EntityEditFooter(props: EntityEditFooterProps) {
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
        {props.saving ? "Saving..." : "Save changes"}
      </Button>
    </>
  );
}

export interface EntityConflictModalProps {
  entity: EntityDetailData;
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
}

export function EntityConflictModal(props: EntityConflictModalProps) {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size="md"
      title={`${props.entity.legalName} was updated elsewhere`}
      subtitle="Your entered values remain preserved in the edit form behind this dialog."
      footer={<EntityConflictFooter {...props} />}
    >
      <p>
        Reload the latest resource version before applying another edit. Nothing
        is overwritten automatically.
      </p>
    </Modal>
  );
}

function EntityConflictFooter(props: EntityConflictModalProps) {
  return (
    <>
      <Button variant="secondary" onClick={props.onClose}>Cancel</Button>
      <Button variant="primary" onClick={props.onReload}>
        Reload current entity
      </Button>
    </>
  );
}

export interface EntityArchiveModalProps {
  entity: EntityDetailData;
  archiveOpen: boolean;
  archiving: boolean;
  archiveError: string | null;
  onClose: () => void;
  onArchive: () => void;
}

export function EntityArchiveModal(props: EntityArchiveModalProps) {
  return (
    <Modal
      isOpen={props.archiveOpen}
      onClose={props.onClose}
      size="sm"
      title={`Archive ${props.entity.legalName}?`}
      footer={<EntityArchiveFooter {...props} />}
    >
      <p>This reversible action removes the entity from active results.</p>
      <EntityArchiveError
        entity={props.entity}
        archiveError={props.archiveError}
      />
    </Modal>
  );
}

function EntityArchiveFooter(props: EntityArchiveModalProps) {
  return (
    <>
      <Button
        variant="secondary"
        onClick={props.onClose}
        disabled={props.archiving}
      >
        Cancel
      </Button>
      <Button
        variant="consent"
        onClick={props.onArchive}
        disabled={props.archiving || Boolean(props.archiveError)}
      >
        {props.archiving ? "Archiving…" : "Archive entity"}
      </Button>
    </>
  );
}

interface EntityArchiveErrorProps {
  entity: EntityDetailData;
  archiveError: string | null;
}

function EntityArchiveError({ entity, archiveError }: EntityArchiveErrorProps) {
  if (!archiveError) return null;
  return (
    <>
      <p role="alert" className="mt-4 font-bold text-red-700">
        {archiveError}
      </p>
      <Link href={`/deals?search=${encodeURIComponent(entity.legalName)}`}>
        <Button className="mt-4" variant="secondary">
          View active deals
        </Button>
      </Link>
    </>
  );
}

export interface EntityArchiveToastProps {
  archiveError: string | null;
  archiveToastOpen: boolean;
  onClose: () => void;
}

export function EntityArchiveToast(props: EntityArchiveToastProps) {
  if (!props.archiveError || !props.archiveToastOpen) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <Toast
        title="Entity not archived"
        message={props.archiveError}
        variant="error"
        onClose={props.onClose}
      />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-label text-xs font-bold uppercase tracking-wider text-slate-gray">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-ink-black">{value}</dd>
    </div>
  );
}

function clearanceText(entity: EntityDetailData): string {
  return entity.regulatoryClearanceRequired ? "Required" : "Not required";
}

function capitalize(value: string): string {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}
