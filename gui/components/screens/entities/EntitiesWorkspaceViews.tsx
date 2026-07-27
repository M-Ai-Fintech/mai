"use client";

import Link from "next/link";

import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import {
  type CountryCode,
  CountrySelector,
} from "@/components/CountrySelector/CountrySelector";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Icon } from "@/components/Icon/Icon";
import { Input } from "@/components/Input/Input";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import {
  Table,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
} from "@/components/Table/Table";
import { Tabs } from "@/components/Tabs/Tabs";
import type { EntitySummary, TeamMember } from "@/lib/api-client";

import {
  ENTITY_FILTER_SECTOR_OPTIONS,
  ENTITY_FORM_ROLE_OPTIONS,
  humanizeEntityValue,
  statusVariant,
} from "./entity-options";
import type { EntityRole } from "./entity-state";

export interface WorkspaceHeaderProps {
  loading: boolean;
  onCreate: () => void;
}

export function WorkspaceHeader({ loading, onCreate }: WorkspaceHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <WorkspaceHeaderCopy />
      <Button variant="primary" size="lg" onClick={onCreate} disabled={loading}>
        Add entity
      </Button>
    </header>
  );
}

function WorkspaceHeaderCopy() {
  return (
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
  );
}

export interface WorkspaceRoleTabsProps {
  role: EntityRole;
  loading: boolean;
  onChange: (nextRole: string) => void;
}

export function WorkspaceRoleTabs(props: WorkspaceRoleTabsProps) {
  const { role, loading, onChange } = props;
  return (
    <div className="mb-4">
      <Tabs
        tabs={ENTITY_FORM_ROLE_OPTIONS.map((option) => ({
          id: option.value,
          label: option.label,
          disabled: loading,
        }))}
        activeTab={role}
        onChange={onChange}
      />
    </div>
  );
}

export interface WorkspaceFiltersProps {
  loading: boolean;
  search: string;
  sector: string;
  countryCode: CountryCode;
  onSearchChange: (search: string) => void;
  onSectorChange: (sector: string | string[]) => void;
  onCountryChange: (countryCode: CountryCode) => void;
}

export function WorkspaceFilters(props: WorkspaceFiltersProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-6 rounded-xl border border-dust-taupe/60 bg-white p-4 shadow-level-1 lg:grid-cols-[minmax(320px,1.6fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)]">
      <WorkspaceSearchFilter {...props} />
      <WorkspaceSectorFilter {...props} />
      <WorkspaceCountryFilter {...props} />
    </div>
  );
}

function WorkspaceSearchFilter(props: WorkspaceFiltersProps) {
  return (
    <Input
      variant="pill"
      icon={<Icon name="search" size="sm" />}
      aria-label="Search entities"
      placeholder="Search by legal name or tax ID"
      value={props.search}
      disabled={props.loading}
      onChange={(event) => props.onSearchChange(event.target.value)}
    />
  );
}

function WorkspaceSectorFilter(props: WorkspaceFiltersProps) {
  return (
    <Dropdown
      options={ENTITY_FILTER_SECTOR_OPTIONS}
      value={props.sector}
      disabled={props.loading}
      onChange={props.onSectorChange}
    />
  );
}

function WorkspaceCountryFilter(props: WorkspaceFiltersProps) {
  return (
    <fieldset
      disabled={props.loading}
      className={props.loading ? "opacity-50" : ""}
    >
      <CountrySelector
        selectedCountry={props.countryCode}
        variant="light"
        className="w-full"
        onChange={(country) => props.onCountryChange(country.code)}
      />
    </fieldset>
  );
}

export interface WorkspaceContentProps {
  loading: boolean;
  loadError: string | null;
  entities: EntitySummary[];
  advisors: Map<string, TeamMember>;
  role: EntityRole;
  hasOptionalFilters: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onRetry: () => void;
  onClearFilters: () => void;
  onCreate: () => void;
  onEdit: (entity: EntitySummary) => void;
  onArchive: (entity: EntitySummary) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function WorkspaceContent(props: WorkspaceContentProps) {
  if (props.loading) return <EntitiesLoadingState />;
  if (props.loadError) return <EntitiesLoadError {...props} />;
  if (props.entities.length === 0) return <EntitiesEmptyState {...props} />;
  return <EntitiesTable {...props} />;
}

function EntitiesLoadingState() {
  return (
    <div
      aria-label="Loading entities"
      className="space-y-3 rounded-xl bg-white p-6 shadow-level-1"
    >
      <Skeleton variant="rectangular" height={48} />
      {Array.from(
        { length: 6 },
        (_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={64}
          />
        ),
      )}
    </div>
  );
}

function EntitiesLoadError({ loadError, onRetry }: WorkspaceContentProps) {
  return (
    <Card variant="raised" role="alert" className="p-10 text-center">
      <Icon name="alert" size="xl" className="mb-3 text-red-700" />
      <h2 className="text-lg font-semibold text-ink-black">
        Entities could not be loaded
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-gray">
        {loadError}
      </p>
      <Button className="mt-5" variant="secondary" onClick={onRetry}>
        Retry
      </Button>
    </Card>
  );
}

function EntitiesEmptyState(props: WorkspaceContentProps) {
  const { hasOptionalFilters, role, onClearFilters, onCreate } = props;
  return (
    <EmptyState
      title={hasOptionalFilters
        ? "No entities match these filters"
        : `No ${role} entities yet`}
      description={hasOptionalFilters
        ? "Clear or adjust the search and filters to see other portfolio entities."
        : `Create the first ${role} entity to start building the institutional portfolio.`}
      actionLabel={hasOptionalFilters
        ? "Clear filters"
        : `Add ${roleLabel(role)}`}
      onAction={hasOptionalFilters ? onClearFilters : onCreate}
      icon={<Icon name="user" size="lg" />}
    />
  );
}

function EntitiesTable(props: WorkspaceContentProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-level-1">
      <EntitiesTableGrid {...props} />
      <EntitiesTablePager {...props} />
    </div>
  );
}

function EntitiesTableGrid(props: WorkspaceContentProps) {
  return (
    <Table aria-label="Portfolio entities">
      <TableHead>
        <EntityTableHeader />
      </TableHead>
      <tbody>
        {props.entities.map((entity) => (
          <EntityTableRow key={entity.id} entity={entity} {...props} />
        ))}
      </tbody>
    </Table>
  );
}

function EntitiesTablePager(props: WorkspaceContentProps) {
  return (
    <TablePagination
      currentPage={props.page}
      totalPages={props.totalPages}
      totalItems={props.total}
      pageSize={props.pageSize}
      onPageChange={props.onPageChange}
      onPageSizeChange={props.onPageSizeChange}
    />
  );
}

function EntityTableHeader() {
  return (
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
  );
}

interface EntityTableRowProps extends WorkspaceContentProps {
  entity: EntitySummary;
}

function EntityTableRow(props: EntityTableRowProps) {
  const { entity } = props;
  return (
    <TableRow>
      <EntitySelectionCell entity={entity} />
      <EntityNameCell entity={entity} />
      <TableCell>{roleLabel(entity.sector)}</TableCell>
      <TableCell>
        <EntityRoleBadges entity={entity} />
      </TableCell>
      <TableCell>{entity.countryCode}</TableCell>
      <EntityAdvisorTableCell entity={entity} advisors={props.advisors} />
      <EntityStatusCell entity={entity} />
      <TableCell>{formatEntityDate(entity.updatedAt)}</TableCell>
      <TableCell>
        <EntityActions {...props} />
      </TableCell>
    </TableRow>
  );
}

function EntitySelectionCell({ entity }: { entity: EntitySummary }) {
  return (
    <TableCell>
      <Checkbox aria-label={`Select ${entity.legalName}`} />
    </TableCell>
  );
}

function EntityAdvisorTableCell(props: AdvisorCellProps) {
  return (
    <TableCell>
      <AdvisorCell {...props} />
    </TableCell>
  );
}

function EntityStatusCell({ entity }: { entity: EntitySummary }) {
  return (
    <TableCell>
      <Badge variant={statusVariant(entity.kybStatus)}>
        {roleLabel(entity.kybStatus)}
      </Badge>
    </TableCell>
  );
}

function EntityNameCell({ entity }: { entity: EntitySummary }) {
  return (
    <TableCell className="font-semibold text-ink-black">
      <span className="block truncate">{entity.legalName}</span>
      <span className="mt-1 block text-xs font-normal text-slate-gray">
        {entity.taxId}
      </span>
    </TableCell>
  );
}

function EntityRoleBadges({ entity }: { entity: EntitySummary }) {
  return (
    <div className="flex gap-1">
      {entity.roles.slice(0, 2).map((entityRole) => (
        <Badge
          key={entityRole}
          variant={entityRole === "buyer" ? "dark" : "outline"}
        >
          {roleLabel(entityRole)}
        </Badge>
      ))}
    </div>
  );
}

interface AdvisorCellProps {
  entity: EntitySummary;
  advisors: Map<string, TeamMember>;
}

function AdvisorCell({ entity, advisors }: AdvisorCellProps) {
  if (!entity.primaryAdvisorId) return <>Unassigned</>;
  const advisor = advisors.get(entity.primaryAdvisorId);
  return (
    <div className="flex items-center gap-2">
      <Avatar
        size="sm"
        src={advisor?.avatarUrl ?? undefined}
        alt={advisor?.displayName ?? "Assigned advisor"}
        fallback={advisor?.displayName ?? "AD"}
      />
      <span>{advisor?.displayName ?? "Assigned"}</span>
    </div>
  );
}

function EntityActions(props: EntityTableRowProps) {
  const { entity, onEdit, onArchive } = props;
  return (
    <div className="flex gap-2">
      <Link href={`/entities/${entity.id}`}>
        <Button variant="secondary" size="sm">View</Button>
      </Link>
      <Button variant="secondary" size="sm" onClick={() => onEdit(entity)}>
        Edit
      </Button>
      <Button variant="secondary" size="sm" onClick={() => onArchive(entity)}>
        Archive
      </Button>
    </div>
  );
}

function formatEntityDate(updatedAt: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })
    .format(new Date(updatedAt));
}

function roleLabel(value: string): string {
  return humanizeEntityValue(value);
}
