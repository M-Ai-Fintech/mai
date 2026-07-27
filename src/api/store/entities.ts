import { EntityRole, KybStatus } from "../contracts.ts";
import { assertAdvisor, getEntity } from "./accessors.ts";
import { MvpStoreError } from "./error.ts";
import { MvpStoreState } from "./state.ts";
import {
  Dossier,
  DossierPatch,
  Entity,
  EntityInput,
  EntityPatch,
  ListQuery,
  Page,
} from "./types.ts";
import { clone, normalizedSearch, normalizedTaxId, pageOf } from "./utils.ts";

export interface EntityListQuery extends ListQuery {
  role?: EntityRole;
  sector?: string;
  countryCode?: string;
  kybStatus?: KybStatus;
  includeArchived?: boolean;
}

export class EntityRepository {
  constructor(private readonly state: MvpStoreState) {}

  list(query: EntityListQuery = {}): Page<Entity> {
    const rows = [...this.state.entities.values()]
      .filter((entity) => matchesEntity(entity, query))
      .sort(entityComparator(query));
    return pageOf(rows, query);
  }

  get(id: string): Entity {
    return getEntity(this.state, id);
  }

  create(input: EntityInput): Entity {
    this.assertUniqueTaxId(input.taxId);
    assertAdvisor(this.state, input.primaryAdvisorId);
    const timestamp = this.state.now();
    const entity: Entity = {
      ...clone(input),
      id: this.state.id(),
      roles: [...new Set(input.roles)],
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    this.state.entities.set(entity.id, entity);
    return clone(entity);
  }

  update(id: string, patch: EntityPatch): Entity {
    const current = this.get(id);
    assertEntityVersion(current, patch.version);
    if (patch.taxId) this.assertUniqueTaxId(patch.taxId, id);
    if (patch.primaryAdvisorId !== undefined) {
      assertAdvisor(this.state, patch.primaryAdvisorId);
    }
    const updated = updatedEntity(current, patch, this.state.now());
    this.state.entities.set(id, updated);
    return clone(updated);
  }

  archive(id: string, version?: number): Entity {
    const current = this.get(id);
    assertEntityVersion(current, version);
    assertNoActiveDeal(this.state, id);
    if (current.archivedAt) return current;
    const archived = archivedEntity(
      current,
      this.state.now(),
      this.state.now(),
    );
    this.state.entities.set(id, archived);
    return clone(archived);
  }

  private assertUniqueTaxId(taxId: string, excludedId?: string): void {
    const normalized = normalizedTaxId(taxId);
    const conflict = [...this.state.entities.values()].find((entity) =>
      entity.id !== excludedId &&
      normalizedTaxId(entity.taxId) === normalized
    );
    if (conflict) {
      throw new MvpStoreError(
        "ENTITY_TAX_ID_CONFLICT",
        "An entity with this tax ID already exists",
        409,
        { taxId: ["Tax ID must be unique"] },
      );
    }
  }
}

function matchesEntity(entity: Entity, query: EntityListQuery): boolean {
  const text = `${entity.legalName} ${entity.taxId} ${
    entity.contactEmail ?? ""
  }`
    .toLocaleLowerCase();
  return (query.includeArchived || !entity.archivedAt) &&
    (!query.role || entity.roles.includes(query.role)) &&
    (!query.sector || entity.sector === query.sector) &&
    (!query.countryCode || entity.countryCode === query.countryCode) &&
    (!query.kybStatus || entity.kybStatus === query.kybStatus) &&
    (!query.search || text.includes(normalizedSearch(query.search)));
}

function entityComparator(
  query: EntityListQuery,
): (left: Entity, right: Entity) => number {
  const descending = query.sort?.startsWith("-") ?? false;
  const sortKey = query.sort?.replace(/^-/, "") ?? "legalName";
  return (left, right) => {
    const leftValue = sortKey === "updatedAt" ? left.updatedAt : left.legalName;
    const rightValue = sortKey === "updatedAt"
      ? right.updatedAt
      : right.legalName;
    return leftValue.localeCompare(rightValue) * (descending ? -1 : 1);
  };
}

function assertEntityVersion(entity: Entity, version?: number): void {
  if (version === undefined || version === entity.version) return;
  throw new MvpStoreError(
    "RESOURCE_VERSION_CONFLICT",
    `Entity version "${version}" is stale; expected "${entity.version}"`,
    409,
  );
}

function assertNoActiveDeal(state: MvpStoreState, entityId: string): void {
  const active = [...state.deals.values()].some((deal) =>
    deal.activeEntityIds.includes(entityId)
  );
  if (!active) return;
  throw new MvpStoreError(
    "ENTITY_HAS_ACTIVE_DEALS",
    `Entity "${entityId}" cannot be archived while it has active deals`,
    409,
  );
}

function archivedEntity(
  entity: Entity,
  archivedAt: string,
  updatedAt: string,
): Entity {
  return {
    ...entity,
    archivedAt,
    updatedAt,
    version: entity.version + 1,
  };
}

function updatedEntity(
  current: Entity,
  patch: EntityPatch,
  updatedAt: string,
): Entity {
  const { version: _expectedVersion, ...changes } = patch;
  return {
    ...current,
    ...clone(changes),
    roles: changes.roles ? [...new Set(changes.roles)] : current.roles,
    updatedAt,
    version: current.version + 1,
  };
}

export class DossierRepository {
  constructor(private readonly state: MvpStoreState) {}

  get(entityId: string): Dossier {
    this.assertEntity(entityId);
    let dossier = this.state.dossiers.get(entityId);
    if (!dossier) {
      dossier = {
        entityId,
        executiveSummary: "",
        corporateStructure: "",
        financialHealth: "",
        litigationRisks: "",
        marketPosition: "",
        version: 1,
        lastUpdated: this.state.now(),
      };
      this.state.dossiers.set(entityId, dossier);
    }
    return clone(dossier);
  }

  update(entityId: string, patch: DossierPatch): Dossier {
    const current = this.get(entityId);
    if (patch.version !== undefined && patch.version !== current.version) {
      throw new MvpStoreError(
        "RESOURCE_VERSION_CONFLICT",
        "Dossier version is stale",
        409,
      );
    }
    const { version: _expectedVersion, ...changes } = patch;
    const updated: Dossier = {
      ...current,
      ...clone(changes),
      version: current.version + 1,
      lastUpdated: this.state.now(),
    };
    this.state.dossiers.set(entityId, updated);
    return clone(updated);
  }

  private assertEntity(id: string): void {
    if (!this.state.entities.has(id)) {
      throw new MvpStoreError("ENTITY_NOT_FOUND", "Entity not found", 404);
    }
  }
}
