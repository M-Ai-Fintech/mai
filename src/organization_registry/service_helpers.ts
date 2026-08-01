import type { RequestContext } from "../shared/contracts/request_context.ts";
import { RegistryInvariantError, RegistryNotFoundError } from "./errors.ts";
import type {
  LegalEntity,
  Organization,
  Person,
  RegistryAggregate,
  RegistryEntityKind,
} from "./contracts.ts";
import { registryScope } from "./contracts.ts";
import type {
  LegalEntityId,
  OrganizationId,
  PersonId,
  RegistryEntityId,
} from "./ids.ts";
import type { OrganizationRegistryRepository } from "./repository.ts";

export function requireOrganization(
  repository: OrganizationRegistryRepository,
  context: RequestContext,
  id: OrganizationId,
): Promise<Organization> {
  return requireKind(repository, context, "organization", id, isOrganization);
}

export function requireLegalEntity(
  repository: OrganizationRegistryRepository,
  context: RequestContext,
  id: LegalEntityId,
): Promise<LegalEntity> {
  return requireKind(repository, context, "legal_entity", id, isLegalEntity);
}

export function requirePerson(
  repository: OrganizationRegistryRepository,
  context: RequestContext,
  id: PersonId,
): Promise<Person> {
  return requireKind(repository, context, "person", id, isPerson);
}

export async function requireActiveOrganization(
  repository: OrganizationRegistryRepository,
  context: RequestContext,
  id: OrganizationId,
): Promise<Organization> {
  const organization = await requireOrganization(repository, context, id);
  if (organization.state === "active") return organization;
  throw new RegistryInvariantError(
    `Organization "${id}" is "${organization.state}"; expected an active organization reference.`,
  );
}

export async function requireAggregate(
  repository: OrganizationRegistryRepository,
  context: RequestContext,
  kind: RegistryEntityKind,
  id: RegistryEntityId,
): Promise<RegistryAggregate> {
  const aggregate = await repository.get(registryScope(context), { kind, id });
  if (
    aggregate === undefined || aggregate.kind !== kind || aggregate.id !== id
  ) {
    throw new RegistryNotFoundError(kind, id);
  }
  return aggregate;
}

async function requireKind<T extends RegistryAggregate>(
  repository: OrganizationRegistryRepository,
  context: RequestContext,
  kind: RegistryEntityKind,
  id: RegistryEntityId,
  predicate: (aggregate: RegistryAggregate) => aggregate is T,
): Promise<T> {
  const aggregate = await requireAggregate(repository, context, kind, id);
  if (predicate(aggregate)) return aggregate;
  throw new RegistryNotFoundError(kind, id);
}

function isOrganization(
  aggregate: RegistryAggregate,
): aggregate is Organization {
  return aggregate.kind === "organization";
}

function isLegalEntity(aggregate: RegistryAggregate): aggregate is LegalEntity {
  return aggregate.kind === "legal_entity";
}

function isPerson(aggregate: RegistryAggregate): aggregate is Person {
  return aggregate.kind === "person";
}
