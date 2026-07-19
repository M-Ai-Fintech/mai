"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APIError, ApiClient, type DealSummary, type EntityDetail as EntityDetailData, type TeamMember } from "@/lib/api-client";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Divider } from "@/components/Divider/Divider";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { FormField } from "@/components/FormField/FormField";
import { Icon } from "@/components/Icon/Icon";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { Toast } from "@/components/Toast/Toast";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { CountrySelector, type CountryCode } from "@/components/CountrySelector/CountrySelector";
import { usePageBreadcrumbs } from "@/components/Navigation/AppShell";
import {
  entityToForm,
  firstEntityErrorField,
  firstFieldError,
  toEntityWrite,
  validateEntityForm,
  type EntityFormErrors,
  type EntityFormState,
  type EntityRole,
  type KybStatus,
} from "./entity-state";

const ROLE_OPTIONS = ["buyer", "seller", "target", "institution"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
const SECTOR_OPTIONS = ["financial_services", "fintech", "healthcare", "saas"].map((value) => ({ value, label: value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }));
const STATUS_OPTIONS = ["pending", "in_review", "approved", "rejected"].map((value) => ({ value, label: value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }));

export function EntityDetail({ entityId }: { entityId: string }) {
  const router = useRouter();
  const [entity, setEntity] = useState<EntityDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveToastOpen, setArchiveToastOpen] = useState(false);
  const [advisor, setAdvisor] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [relatedDeals, setRelatedDeals] = useState<DealSummary[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EntityFormState | null>(null);
  const [editErrors, setEditErrors] = useState<EntityFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string; variant: "success" | "error" } | null>(null);
  const [versionConflictOpen, setVersionConflictOpen] = useState(false);
  const editFormRef = useRef<HTMLDivElement>(null);
  const detailBreadcrumbs = useMemo(() => entity ? [
    { label: "Home", href: "/" },
    { label: "Entities", href: "/entities" },
    { label: entity.legalName },
  ] : null, [entity]);
  usePageBreadcrumbs(detailBreadcrumbs);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await ApiClient.getEntityById(entityId);
      setEntity(result);
      const [teamPage, dealPage] = await Promise.all([
        ApiClient.listTeamMembers({ pageSize: 100 }),
        ApiClient.listDeals({ search: result.legalName, pageSize: 10 }),
      ]);
      setTeamMembers(teamPage.data);
      setAdvisor(teamPage.data.find((member) => member.id === result.primaryAdvisorId) ?? null);
      setRelatedDeals(dealPage.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const archive = async () => {
    if (!entity) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      await ApiClient.archiveEntity(entity.id, entity.version);
      const query = new URLSearchParams({
        role: entity.roles[0],
        country: entity.countryCode,
        notice: "archived",
        entity: entity.legalName,
      });
      router.push(`/entities?${query.toString()}`);
    } catch (cause) {
      setArchiveError(cause instanceof Error ? cause.message : "Entity could not be archived.");
      setArchiveToastOpen(true);
    } finally {
      setArchiving(false);
    }
  };

  const openEdit = () => {
    if (!entity) return;
    setEditForm(entityToForm(entity));
    setEditErrors({});
    setEditOpen(true);
  };

  const focusFirstInvalid = (errors: EntityFormErrors) => {
    const first = firstEntityErrorField(errors);
    if (!first) return;
    window.requestAnimationFrame(() => {
      editFormRef.current?.querySelector<HTMLElement>(`[data-entity-field="${first}"] input, [data-entity-field="${first}"] button`)?.focus();
    });
  };

  const saveEdit = async () => {
    if (!entity || !editForm) return;
    const errors = validateEntityForm(editForm);
    setEditErrors(errors);
    if (Object.keys(errors).length) {
      focusFirstInvalid(errors);
      return;
    }
    setSaving(true);
    try {
      const updated = await ApiClient.updateEntity(entity.id, { ...toEntityWrite(editForm), version: entity.version });
      setEntity(updated);
      setAdvisor(teamMembers.find((member) => member.id === updated.primaryAdvisorId) ?? null);
      setEditOpen(false);
      setToast({ title: "Entity updated", message: `${updated.legalName} now shows the saved values.`, variant: "success" });
    } catch (cause) {
      if (cause instanceof APIError && cause.fieldErrors) {
        const errorsFromServer = firstFieldError(cause.fieldErrors);
        setEditErrors(errorsFromServer);
        focusFirstInvalid(errorsFromServer);
      }
      const isVersionConflict = cause instanceof APIError && cause.kind === "conflict" && !cause.fieldErrors;
      if (isVersionConflict) {
        setVersionConflictOpen(true);
      }
      if (!isVersionConflict) {
        setToast({ title: "Entity was not saved", message: cause instanceof Error ? cause.message : "Review the form and try again.", variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const reloadConflictedEntity = async () => {
    try {
      const current = await ApiClient.getEntityById(entityId);
      setEntity(current);
      setEditForm(entityToForm(current));
      setEditErrors({});
      setAdvisor(teamMembers.find((member) => member.id === current.primaryAdvisorId) ?? null);
      setVersionConflictOpen(false);
    } catch (cause) {
      setToast({ title: "Entity unavailable", message: cause instanceof Error ? cause.message : "Could not reload the entity.", variant: "error" });
    }
  };

  if (loading) return <div className="mx-auto max-w-[2200px] space-y-6 p-8"><Skeleton height={96} variant="rectangular" /><div className="grid grid-cols-12 gap-6"><Skeleton className="col-span-8" height={480} variant="rectangular" /><Skeleton className="col-span-4" height={280} variant="rectangular" /></div></div>;
  if (error || !entity) return <div className="mx-auto max-w-[2200px] p-8"><Card variant="raised"><EmptyState title="Entity could not be loaded" description="Retry without changing the selected record." actionLabel="Retry" onAction={() => void load()} icon={<Icon name="alert" />} /></Card></div>;

  return (
    <div className="mx-auto max-w-[2200px] p-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div><div className="mb-3 flex gap-2">{entity.roles.map((role) => <Badge key={role} variant="outline">{role}</Badge>)}<Badge variant="orange">KYB {entity.kybStatus.replace("_", " ")}</Badge></div><h1 className="text-3xl font-bold">{entity.legalName}</h1><p className="mt-2 text-sm text-slate-gray">Entity record version {entity.version}</p></div>
        <div className="flex gap-3"><Link href={`/entities?role=${entity.roles[0]}`}><Button variant="secondary">Back to entities</Button></Link><Button variant="secondary" onClick={openEdit}>Edit</Button><Button variant="consent" onClick={() => setArchiveOpen(true)}>Archive</Button></div>
      </header>
      <div className="grid grid-cols-12 gap-6">
        <Card variant="raised" className="col-span-8">
          <h2 className="text-xl font-bold">Entity profile</h2><Divider spacing="lg" />
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm">
            <Fact label="Legal name" value={entity.legalName} /><Fact label="Tax ID" value={entity.taxId} />
            <Fact label="Sector" value={entity.sector} /><Fact label="Country" value={entity.countryCode} />
            <Fact label="Contact email" value={entity.contactEmail} /><Fact label="Regulatory clearance" value={entity.regulatoryClearanceRequired ? "Required" : "Not required"} />
          </dl>
          <Divider spacing="lg" />
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm"><Fact label="Created" value={new Date(entity.createdAt).toLocaleString()} /><Fact label="Updated" value={new Date(entity.updatedAt).toLocaleString()} /></dl>
        </Card>
        <div className="col-span-4 space-y-6">
          <Card><Badge variant="default">Primary advisor</Badge><div className="mt-5 flex items-center gap-3"><Avatar size="lg" src={advisor?.avatarUrl ?? undefined} fallback={advisor?.displayName ?? "UA"} /><div><p className="text-lg font-bold">{advisor?.displayName ?? "Unassigned"}</p><p className="text-xs text-slate-gray">{advisor?.role ?? "Available after team synchronization"}</p></div></div></Card>
          <Card><div className="flex items-center justify-between"><Badge variant="default">Related deals</Badge><Badge variant="outline">{relatedDeals.length}</Badge></div><div className="mt-4 space-y-3">{relatedDeals.length ? relatedDeals.map((deal) => <div key={deal.id} className="flex items-center justify-between gap-3 border-b border-dust-taupe/60 pb-3"><div><p className="text-sm font-bold">{deal.title}</p><p className="text-xs text-slate-gray">{deal.code}</p></div><Link href={`/deals/${deal.id}`}><Button variant="secondary" size="sm">Open</Button></Link></div>) : <p className="text-sm text-slate-gray">No related deals.</p>}</div></Card>
        </div>
      </div>
      <Modal
        isOpen={editOpen && editForm !== null}
        onClose={() => !saving && setEditOpen(false)}
        size="lg"
        title={`Edit ${entity.roles[0][0].toUpperCase()}${entity.roles[0].slice(1)}`}
        subtitle="The entity detail remains visible beneath this edit state."
        footer={<><Button variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button><Button variant="primary" onClick={() => void saveEdit()} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button></>}
      >
        {editForm && <div ref={editFormRef} className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField label="Corporate Legal Name" required error={editErrors.legalName} className="md:col-span-2">
            <div data-entity-field="legalName"><Input value={editForm.legalName} hasError={Boolean(editErrors.legalName)} onChange={(event) => setEditForm({ ...editForm, legalName: event.target.value })} /></div>
          </FormField>
          <FormField label="CNPJ / Tax ID" required error={editErrors.taxId}>
            <div data-entity-field="taxId"><Input value={editForm.taxId} hasError={Boolean(editErrors.taxId)} onChange={(event) => setEditForm({ ...editForm, taxId: event.target.value })} /></div>
          </FormField>
          <FormField label="Contact Email" required error={editErrors.contactEmail}>
            <div data-entity-field="contactEmail"><Input type="email" value={editForm.contactEmail} hasError={Boolean(editErrors.contactEmail)} onChange={(event) => setEditForm({ ...editForm, contactEmail: event.target.value })} /></div>
          </FormField>
          <FormField label="Industry Sector" required error={editErrors.sector}>
            <div data-entity-field="sector"><Dropdown options={SECTOR_OPTIONS} value={editForm.sector} error={editErrors.sector} onChange={(value) => setEditForm({ ...editForm, sector: Array.isArray(value) ? value[0] : value })} /></div>
          </FormField>
          <FormField label="Entity Roles" required error={editErrors.roles}>
            <div data-entity-field="roles"><Dropdown options={ROLE_OPTIONS} value={editForm.roles} multiSelect searchable error={editErrors.roles} onChange={(value) => setEditForm({ ...editForm, roles: (Array.isArray(value) ? value : [value]) as EntityRole[] })} /></div>
          </FormField>
          <FormField label="Country" required>
            <CountrySelector selectedCountry={editForm.countryCode as CountryCode} variant="light" onChange={(country) => setEditForm({ ...editForm, countryCode: country.code })} />
          </FormField>
          <FormField label="KYB Status" required>
            <Dropdown options={STATUS_OPTIONS} value={editForm.kybStatus} onChange={(value) => setEditForm({ ...editForm, kybStatus: (Array.isArray(value) ? value[0] : value) as KybStatus })} />
          </FormField>
          <FormField label="Primary Advisor" hint="Optional for newly sourced entities." className="md:col-span-2">
            <Dropdown options={[{ value: "", label: "Unassigned" }, ...teamMembers.map((member) => ({ value: member.id, label: `${member.displayName} — ${member.role}` }))]} value={editForm.primaryAdvisorId} searchable onChange={(value) => setEditForm({ ...editForm, primaryAdvisorId: Array.isArray(value) ? value[0] ?? "" : value })} />
          </FormField>
          <div className="md:col-span-2"><Checkbox label="Subject to BACEN Regulatory Clearance" checked={editForm.regulatoryClearanceRequired} onChange={(event) => setEditForm({ ...editForm, regulatoryClearanceRequired: event.target.checked })} /></div>
        </div>}
      </Modal>
      <Modal
        isOpen={versionConflictOpen}
        onClose={() => setVersionConflictOpen(false)}
        size="md"
        title={`${entity.legalName} was updated elsewhere`}
        subtitle="Your entered values remain preserved in the edit form behind this dialog."
        footer={<><Button variant="secondary" onClick={() => setVersionConflictOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => void reloadConflictedEntity()}>Reload current entity</Button></>}
      >
        <p>Reload the latest resource version before applying another edit. Nothing is overwritten automatically.</p>
      </Modal>
      <Modal isOpen={archiveOpen} onClose={() => !archiving && setArchiveOpen(false)} size="sm" title={`Archive ${entity.legalName}?`} footer={<><Button variant="secondary" onClick={() => setArchiveOpen(false)} disabled={archiving}>Cancel</Button><Button variant="consent" onClick={() => void archive()} disabled={archiving || Boolean(archiveError)}>{archiving ? "Archiving…" : "Archive entity"}</Button></>}><p>This reversible action removes the entity from active results.</p>{archiveError && <><p role="alert" className="mt-4 font-bold text-red-700">{archiveError}</p><Link href={`/deals?search=${encodeURIComponent(entity.legalName)}`}><Button className="mt-4" variant="secondary">View active deals</Button></Link></>}</Modal>
      {archiveError && archiveToastOpen && <div className="fixed bottom-6 right-6 z-[60]"><Toast title="Entity not archived" message={archiveError} variant="error" onClose={() => setArchiveToastOpen(false)} /></div>}
      {toast && <div className="fixed bottom-6 right-6 z-[60]"><Toast {...toast} onClose={() => setToast(null)} /></div>}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-label text-xs font-bold uppercase tracking-wider text-slate-gray">{label}</dt><dd className="mt-1 font-semibold text-ink-black">{value}</dd></div>;
}
