"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/Badge/Badge";
import { Avatar } from "@/components/Avatar/Avatar";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import {
  type CountryCode,
  CountrySelector,
} from "@/components/CountrySelector/CountrySelector";
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
  TablePagination,
  TableRow,
} from "@/components/Table/Table";
import { Toast } from "@/components/Toast/Toast";
import { Tabs } from "@/components/Tabs/Tabs";
import {
  ApiClient,
  APIError,
  type EntitySummary,
  type TeamMember,
} from "@/lib/api-client";
import {
  EMPTY_ENTITY_FORM,
  entityArchiveSuccessNotice,
  type EntityFormErrors,
  type EntityFormState,
  type EntityRole,
  entityToForm,
  firstEntityErrorField,
  firstFieldError,
  type KybStatus,
  toEntityWrite,
  validateEntityForm,
} from "./entity-state";

const ROLE_OPTIONS = [
  { value: "", label: "All entity roles" },
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "target", label: "Target" },
  { value: "institution", label: "Institution" },
];
const FORM_ROLE_OPTIONS = ROLE_OPTIONS.slice(1);
const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const SECTOR_OPTIONS = [
  { value: "", label: "All sectors" },
  { value: "financial_services", label: "Financial services" },
  { value: "fintech", label: "Fintech" },
  { value: "healthcare", label: "Healthcare" },
  { value: "saas", label: "SaaS" },
];
type ToastState = {
  title: string;
  message: string;
  variant: "success" | "error";
};

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(
    /\b\w/g,
    (letter) => letter.toUpperCase(),
  );
}

function statusVariant(
  status: KybStatus,
): "default" | "orange" | "dark" | "outline" {
  if (status === "approved") return "dark";
  if (status === "pending" || status === "in_review") return "orange";
  return "outline";
}

interface EntitiesWorkspaceProps {
  initialRole?: EntityRole;
  initialSearch?: string;
  initialSector?: string;
  initialCountryCode?: CountryCode;
}

export function EntitiesWorkspace({
  initialRole = "buyer",
  initialSearch = "",
  initialSector = "",
  initialCountryCode = "BR",
}: EntitiesWorkspaceProps) {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState(initialSearch);
  const [role, setRole] = useState<EntityRole>(initialRole);
  const [countryCode, setCountryCode] = useState<CountryCode>(
    initialCountryCode,
  );
  const [sector, setSector] = useState(initialSector);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingEntity, setEditingEntity] = useState<EntitySummary | null>(
    null,
  );
  const [form, setForm] = useState<EntityFormState>(EMPTY_ENTITY_FORM);
  const [formErrors, setFormErrors] = useState<EntityFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<EntitySummary | null>(
    null,
  );
  const [archiveBlocked, setArchiveBlocked] = useState<string | null>(null);
  const [versionConflictOpen, setVersionConflictOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const formRootRef = useRef<HTMLDivElement>(null);

  const syncQuery = useCallback((next: {
    role?: EntityRole;
    search?: string;
    sector?: string;
    countryCode?: string;
  }) => {
    const url = new URL(window.location.href);
    const values = { role, search, sector, countryCode, ...next };
    url.searchParams.set("role", values.role);
    for (
      const [key, value] of Object.entries({
        search: values.search,
        sector: values.sector,
        country: values.countryCode,
      })
    ) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [countryCode, role, search, sector]);

  const focusFirstInvalidField = useCallback((errors: EntityFormErrors) => {
    const firstField = firstEntityErrorField(errors);
    if (!firstField) return;
    window.requestAnimationFrame(() => {
      const field = formRootRef.current?.querySelector<HTMLElement>(
        `[data-entity-field="${firstField}"] input, [data-entity-field="${firstField}"] button`,
      );
      field?.focus();
    });
  }, []);

  const loadEntities = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await ApiClient.listEntities({
        page,
        pageSize,
        search: search.trim() || undefined,
        role,
        sector: sector.trim() || undefined,
        countryCode: countryCode || undefined,
        sort: "-updatedAt",
      });
      if (signal?.aborted) return;
      if (result.meta.totalPages > 0 && page > result.meta.totalPages) {
        setPage(result.meta.totalPages);
        return;
      }
      setEntities(result.data);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(
        error instanceof Error ? error.message : "Unable to load entities.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [countryCode, page, pageSize, role, search, sector]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("country")) return;
    url.searchParams.set("country", countryCode);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [countryCode]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("notice") !== "archived") return;
    const entityName = url.searchParams.get("entity") ?? "";
    const notice = entityArchiveSuccessNotice(entityName);
    const timer = window.setTimeout(
      () => setToast({ ...notice, variant: "success" }),
      0,
    );
    url.searchParams.delete("notice");
    url.searchParams.delete("entity");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => void loadEntities(controller.signal),
      250,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadEntities, reloadKey]);

  useEffect(() => {
    void ApiClient.listTeamMembers({ pageSize: 100 })
      .then((result) => setTeamMembers(result.data))
      .catch(() => setTeamMembers([]));
  }, []);

  const advisors = useMemo(
    () => new Map(teamMembers.map((member) => [member.id, member])),
    [teamMembers],
  );

  const openCreate = () => {
    setEditingEntity(null);
    setForm({ ...EMPTY_ENTITY_FORM, roles: [role] });
    setFormErrors({});
    setModalMode("create");
  };

  const openEdit = (entity: EntitySummary) => {
    setEditingEntity(entity);
    setForm(entityToForm(entity));
    setFormErrors({});
    setModalMode("edit");
  };

  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get("edit");
    if (!editId) return;
    void ApiClient.getEntityById(editId)
      .then((entity) => {
        setEditingEntity(entity);
        setForm(entityToForm(entity));
        setFormErrors({});
        setModalMode("edit");
      })
      .catch(() =>
        setToast({
          title: "Entity unavailable",
          message: "The selected entity could not be opened for editing.",
          variant: "error",
        })
      );
  }, []);

  const closeForm = () => {
    if (saving) return;
    setModalMode(null);
    setEditingEntity(null);
    setFormErrors({});
  };

  const saveEntity = async () => {
    const validationErrors = validateEntityForm(form);
    setFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      focusFirstInvalidField(validationErrors);
      return;
    }
    setSaving(true);
    try {
      const payload = toEntityWrite(form);
      if (modalMode === "edit" && editingEntity) {
        await ApiClient.updateEntity(editingEntity.id, {
          ...payload,
          version: editingEntity.version,
        });
      } else {
        await ApiClient.createEntity(payload);
      }
      setToast({
        title: modalMode === "edit"
          ? `${modalRoleLabel} updated`
          : `${modalRoleLabel} created`,
        message:
          `${payload.legalName} is now available in the entity workspace.`,
        variant: "success",
      });
      setModalMode(null);
      setEditingEntity(null);
      setPage(1);
      setReloadKey((key) => key + 1);
    } catch (error) {
      if (error instanceof APIError && error.fieldErrors) {
        const backendErrors = firstFieldError(error.fieldErrors);
        setFormErrors(backendErrors);
        focusFirstInvalidField(backendErrors);
      }
      if (
        error instanceof APIError && error.kind === "conflict" &&
        !error.fieldErrors
      ) {
        setVersionConflictOpen(true);
      }
      setToast({
        title: `${modalRoleLabel} was not saved`,
        message: error instanceof Error
          ? error.message
          : "Review the form and try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const archiveEntity = async () => {
    if (!archiveTarget) return;
    setSaving(true);
    try {
      await ApiClient.archiveEntity(archiveTarget.id, archiveTarget.version);
      setToast({
        title: "Entity archived",
        message: `${archiveTarget.legalName} was removed from active results.`,
        variant: "success",
      });
      setArchiveTarget(null);
      setArchiveBlocked(null);
      setReloadKey((key) => key + 1);
    } catch (error) {
      setArchiveBlocked(
        error instanceof Error
          ? error.message
          : "This entity cannot be archived while it has active deals.",
      );
      setToast({
        title: "Entity was not archived",
        message: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const reloadConflictedEntity = async () => {
    if (!editingEntity) return;
    try {
      const current = await ApiClient.getEntityById(editingEntity.id);
      setEditingEntity(current);
      setForm(entityToForm(current));
      setFormErrors({});
      setVersionConflictOpen(false);
    } catch (cause) {
      setToast({
        title: "Entity unavailable",
        message: cause instanceof Error
          ? cause.message
          : "Could not reload the entity.",
        variant: "error",
      });
    }
  };

  const setFilter = (
    setter: (value: string) => void,
    value: string | string[],
  ) => {
    const nextValue = Array.isArray(value) ? value[0] ?? "" : value;
    setter(nextValue);
    setPage(1);
    syncQuery({ sector: nextValue });
  };

  const selectRole = (nextRole: string) => {
    if (!["buyer", "seller", "target", "institution"].includes(nextRole)) {
      return;
    }
    setRole(nextRole as EntityRole);
    setPage(1);
    syncQuery({ role: nextRole as EntityRole });
  };

  const modalRole = editingEntity?.roles[0] ?? form.roles[0] ?? role;
  const modalRoleLabel = humanize(modalRole);
  const hasOptionalFilters = Boolean(search || sector || countryCode !== "BR");

  return (
    <section className="mx-auto w-full max-w-[2200px] p-8 text-left">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <p className="mb-2 font-sans text-xs font-bold uppercase tracking-[0.18em] text-slate-gray">
            Portfolio management
          </p>
          <h1 className="text-[28px] font-bold tracking-tight text-ink-black">
            Portfolio &amp; Clients
          </h1>
          <p className="mt-2 text-sm text-slate-gray">
            Manage buyer, seller, target, and institutional records from one
            contract-backed workspace.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={openCreate}
          disabled={loading}
        >
          Add entity
        </Button>
      </header>

      <div className="mb-4">
        <Tabs
          tabs={FORM_ROLE_OPTIONS.map((option) => ({
            id: option.value,
            label: option.label,
            disabled: loading,
          }))}
          activeTab={role}
          onChange={selectRole}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 rounded-xl border border-dust-taupe/60 bg-white p-4 shadow-level-1 lg:grid-cols-[minmax(320px,1.6fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)]">
        <Input
          variant="pill"
          icon={<Icon name="search" size="sm" />}
          aria-label="Search entities"
          placeholder="Search by legal name or tax ID"
          value={search}
          disabled={loading}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
            syncQuery({ search: event.target.value });
          }}
        />
        <Dropdown
          options={SECTOR_OPTIONS}
          value={sector}
          disabled={loading}
          onChange={(value) => setFilter(setSector, value)}
        />
        <fieldset disabled={loading} className={loading ? "opacity-50" : ""}>
          <CountrySelector
            selectedCountry={countryCode}
            variant="light"
            className="w-full"
            onChange={(country) => {
              setCountryCode(country.code);
              setPage(1);
              syncQuery({ countryCode: country.code });
            }}
          />
        </fieldset>
      </div>

      {loading
        ? (
          <div
            aria-label="Loading entities"
            className="space-y-3 rounded-xl bg-white p-6 shadow-level-1"
          >
            <Skeleton variant="rectangular" height={48} />
            {Array.from(
              { length: 6 },
              (_, index) => (
                <Skeleton key={index} variant="rectangular" height={64} />
              ),
            )}
          </div>
        )
        : loadError
        ? (
          <Card variant="raised" role="alert" className="p-10 text-center">
            <Icon name="alert" size="xl" className="mb-3 text-red-700" />
            <h2 className="text-lg font-semibold text-ink-black">
              Entities could not be loaded
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-gray">
              {loadError}
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Retry
            </Button>
          </Card>
        )
        : entities.length === 0
        ? (
          <EmptyState
            title={hasOptionalFilters
              ? "No entities match these filters"
              : `No ${role} entities yet`}
            description={hasOptionalFilters
              ? "Clear or adjust the search and filters to see other portfolio entities."
              : `Create the first ${role} entity to start building the institutional portfolio.`}
            actionLabel={hasOptionalFilters
              ? "Clear filters"
              : `Add ${humanize(role)}`}
            onAction={() => {
              if (hasOptionalFilters) {
                setSearch("");
                setSector("");
                setCountryCode("BR");
                setPage(1);
                syncQuery({ search: "", sector: "", countryCode: "BR" });
              } else openCreate();
            }}
            icon={<Icon name="user" size="lg" />}
          />
        )
        : (
          <div className="overflow-hidden rounded-xl bg-white shadow-level-1">
            <Table aria-label="Portfolio entities">
              <TableHead>
                <TableRow isHeader>
                  <TableCell isHeader>
                    <Checkbox aria-label="Select all visible entities" />
                  </TableCell>
                  <TableCell isHeader>Target CNPJ / Name</TableCell>
                  <TableCell isHeader>Sector</TableCell>
                  <TableCell isHeader>Entity Role</TableCell>
                  <TableCell isHeader>Jurisdiction</TableCell>
                  <TableCell isHeader>Primary Advisor</TableCell>
                  <TableCell isHeader>KYB Status</TableCell>
                  <TableCell isHeader>Updated</TableCell>
                  <TableCell isHeader>Actions</TableCell>
                </TableRow>
              </TableHead>
              <tbody>
                {entities.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell>
                      <Checkbox aria-label={`Select ${entity.legalName}`} />
                    </TableCell>
                    <TableCell className="font-semibold text-ink-black">
                      <span className="block truncate">{entity.legalName}</span>
                      <span className="mt-1 block text-xs font-normal text-slate-gray">
                        {entity.taxId}
                      </span>
                    </TableCell>
                    <TableCell>{humanize(entity.sector)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {entity.roles.slice(0, 2).map((entityRole) => (
                          <Badge
                            key={entityRole}
                            variant={entityRole === "buyer"
                              ? "dark"
                              : "outline"}
                          >
                            {humanize(entityRole)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{entity.countryCode}</TableCell>
                    <TableCell>
                      {entity.primaryAdvisorId
                        ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              size="sm"
                              src={advisors.get(entity.primaryAdvisorId)
                                ?.avatarUrl ?? undefined}
                              alt={advisors.get(entity.primaryAdvisorId)
                                ?.displayName ?? "Assigned advisor"}
                              fallback={advisors.get(entity.primaryAdvisorId)
                                ?.displayName ?? "AD"}
                            />
                            <span>
                              {advisors.get(entity.primaryAdvisorId)
                                ?.displayName ?? "Assigned"}
                            </span>
                          </div>
                        )
                        : "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(entity.kybStatus)}>
                        {humanize(entity.kybStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })
                        .format(new Date(entity.updatedAt))}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/entities/${entity.id}`}>
                          <Button variant="secondary" size="sm">View</Button>
                        </Link>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(entity)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setArchiveBlocked(null);
                            setArchiveTarget(entity);
                          }}
                        >
                          Archive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}

      <Modal
        isOpen={modalMode !== null}
        onClose={closeForm}
        size="lg"
        title={modalMode === "edit"
          ? `Edit ${modalRoleLabel}`
          : `Add ${modalRoleLabel}`}
        subtitle="Fields map directly to the approved MVP entity contract."
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void saveEntity()}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : modalMode === "edit"
                ? "Save changes"
                : `Save ${modalRoleLabel}`}
            </Button>
          </>
        }
      >
        <div
          ref={formRootRef}
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <FormField
            label="Corporate Legal Name"
            required
            error={formErrors.legalName}
            className="md:col-span-2"
            id="entity-legal-name"
          >
            <div data-entity-field="legalName">
              <Input
                value={form.legalName}
                hasError={Boolean(formErrors.legalName)}
                onChange={(event) =>
                  setForm({ ...form, legalName: event.target.value })}
              />
            </div>
          </FormField>
          <FormField label="CNPJ / Tax ID" required error={formErrors.taxId}>
            <div data-entity-field="taxId">
              <Input
                value={form.taxId}
                hasError={Boolean(formErrors.taxId)}
                onChange={(event) =>
                  setForm({ ...form, taxId: event.target.value })}
              />
            </div>
          </FormField>
          <FormField
            label="Contact Email"
            required
            error={formErrors.contactEmail}
          >
            <div data-entity-field="contactEmail">
              <Input
                type="email"
                value={form.contactEmail}
                hasError={Boolean(formErrors.contactEmail)}
                onChange={(event) =>
                  setForm({ ...form, contactEmail: event.target.value })}
              />
            </div>
          </FormField>
          <FormField label="Industry Sector" required error={formErrors.sector}>
            <div data-entity-field="sector">
              <Dropdown
                options={SECTOR_OPTIONS.slice(1)}
                value={form.sector}
                error={formErrors.sector}
                onChange={(value) =>
                  setForm({
                    ...form,
                    sector: Array.isArray(value) ? value[0] : value,
                  })}
              />
            </div>
          </FormField>
          <FormField label="Entity Roles" required error={formErrors.roles}>
            <div data-entity-field="roles">
              <Dropdown
                options={FORM_ROLE_OPTIONS}
                value={form.roles}
                multiSelect
                searchable
                error={formErrors.roles}
                onChange={(value) =>
                  setForm({
                    ...form,
                    roles:
                      (Array.isArray(value) ? value : [value]) as EntityRole[],
                  })}
              />
            </div>
          </FormField>
          <FormField label="Country" required>
            <CountrySelector
              selectedCountry={form.countryCode as CountryCode}
              variant="light"
              onChange={(country) =>
                setForm({ ...form, countryCode: country.code })}
            />
          </FormField>
          <FormField label="KYB Status" required>
            <Dropdown
              options={STATUS_OPTIONS}
              value={form.kybStatus}
              onChange={(value) =>
                setForm({
                  ...form,
                  kybStatus:
                    (Array.isArray(value) ? value[0] : value) as KybStatus,
                })}
            />
          </FormField>
          <FormField
            label="Primary Advisor"
            hint="Optional for newly sourced targets."
            className="md:col-span-2"
          >
            <Dropdown
              options={[
                { value: "", label: "Unassigned" },
                ...teamMembers.map((member) => ({
                  value: member.id,
                  label: `${member.displayName} — ${member.role}`,
                })),
              ]}
              value={form.primaryAdvisorId}
              searchable
              onChange={(value) =>
                setForm({
                  ...form,
                  primaryAdvisorId: Array.isArray(value)
                    ? value[0] ?? ""
                    : value,
                })}
            />
          </FormField>
          <div className="md:col-span-2">
            <Checkbox
              label="Subject to BACEN Regulatory Clearance"
              checked={form.regulatoryClearanceRequired}
              onChange={(event) => setForm({
                ...form,
                regulatoryClearanceRequired: event.target.checked,
              })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={versionConflictOpen}
        onClose={() => setVersionConflictOpen(false)}
        size="md"
        title="Entity updated elsewhere"
        subtitle="Your entered values remain visible behind this dialog."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setVersionConflictOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void reloadConflictedEntity()}
            >
              Reload current entity
            </Button>
          </>
        }
      >
        <p>Reload the latest resource version before applying another edit.</p>
      </Modal>

      <Modal
        isOpen={archiveTarget !== null}
        onClose={() => !saving && setArchiveTarget(null)}
        size="sm"
        title="Archive entity"
        subtitle="This removes the entity from active portfolio results."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setArchiveTarget(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="consent"
              onClick={() => void archiveEntity()}
              disabled={saving || Boolean(archiveBlocked)}
            >
              {saving ? "Archiving..." : "Archive entity"}
            </Button>
          </>
        }
      >
        <p>
          Archive{" "}
          <strong>{archiveTarget?.legalName}</strong>? Existing deal references
          are preserved.
        </p>
        {archiveBlocked && (
          <p role="alert" className="mt-4 font-bold text-red-700">
            {archiveBlocked}
          </p>
        )}
        {archiveBlocked && archiveTarget && (
          <Link
            href={`/deals?search=${
              encodeURIComponent(archiveTarget.legalName)
            }`}
          >
            <Button className="mt-4" variant="secondary" size="sm">
              View active deals
            </Button>
          </Link>
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </section>
  );
}
