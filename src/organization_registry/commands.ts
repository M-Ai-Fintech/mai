import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type {
  LegalEntity,
  Organization,
  Person,
  RegistryAggregate,
  RegistryCommandBase,
  RegistryMergeResult,
} from "./contracts.ts";
import type { LegalEntityId, OrganizationId, PersonId } from "./ids.ts";

export interface CreateOrganizationCommand extends RegistryCommandBase {
  readonly name: string;
  readonly externalReference?: string;
}

export interface UpdateOrganizationCommand extends RegistryCommandBase {
  readonly organizationId: OrganizationId;
  readonly expectedVersion: AggregateVersion;
  readonly patch: OrganizationPatch;
}

export interface ArchiveOrganizationCommand extends RegistryCommandBase {
  readonly organizationId: OrganizationId;
  readonly expectedVersion: AggregateVersion;
}

export interface RestoreOrganizationCommand extends RegistryCommandBase {
  readonly organizationId: OrganizationId;
  readonly expectedVersion: AggregateVersion;
}

export interface CreateLegalEntityCommand extends RegistryCommandBase {
  readonly organizationId: OrganizationId;
  readonly legalName: string;
  readonly jurisdictionCode: string;
  readonly registrationNumber: string;
}

export interface UpdateLegalEntityCommand extends RegistryCommandBase {
  readonly legalEntityId: LegalEntityId;
  readonly expectedVersion: AggregateVersion;
  readonly patch: LegalEntityPatch;
}

export interface ArchiveLegalEntityCommand extends RegistryCommandBase {
  readonly legalEntityId: LegalEntityId;
  readonly expectedVersion: AggregateVersion;
}

export interface RestoreLegalEntityCommand extends RegistryCommandBase {
  readonly legalEntityId: LegalEntityId;
  readonly expectedVersion: AggregateVersion;
}

export interface CreatePersonCommand extends RegistryCommandBase {
  readonly organizationId?: OrganizationId;
  readonly givenName: string;
  readonly familyName: string;
  readonly email?: string;
  readonly phone?: string;
  readonly nationalId?: string;
}

export interface UpdatePersonCommand extends RegistryCommandBase {
  readonly personId: PersonId;
  readonly expectedVersion: AggregateVersion;
  readonly patch: PersonPatch;
}

export interface ArchivePersonCommand extends RegistryCommandBase {
  readonly personId: PersonId;
  readonly expectedVersion: AggregateVersion;
}

export interface RestorePersonCommand extends RegistryCommandBase {
  readonly personId: PersonId;
  readonly expectedVersion: AggregateVersion;
}

export interface MergeOrganizationsCommand extends RegistryCommandBase {
  readonly sourceId: OrganizationId;
  readonly targetId: OrganizationId;
  readonly sourceExpectedVersion: AggregateVersion;
  readonly targetExpectedVersion: AggregateVersion;
  readonly reason: string;
}

export interface MergeLegalEntitiesCommand extends RegistryCommandBase {
  readonly sourceId: LegalEntityId;
  readonly targetId: LegalEntityId;
  readonly sourceExpectedVersion: AggregateVersion;
  readonly targetExpectedVersion: AggregateVersion;
  readonly reason: string;
}

export interface MergePeopleCommand extends RegistryCommandBase {
  readonly sourceId: PersonId;
  readonly targetId: PersonId;
  readonly sourceExpectedVersion: AggregateVersion;
  readonly targetExpectedVersion: AggregateVersion;
  readonly reason: string;
}

export interface OrganizationPatch {
  readonly name?: Organization["name"];
  readonly externalReference?: string | null;
}

export type LegalEntityPatch = Partial<
  Pick<LegalEntity, "legalName" | "jurisdictionCode" | "registrationNumber">
>;

export interface PersonPatch {
  readonly organizationId?: OrganizationId | null;
  readonly givenName?: Person["givenName"];
  readonly familyName?: Person["familyName"];
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly nationalId?: string | null;
}

export type RegistryCommandResult = RegistryAggregate | RegistryMergeResult;

export type RegistryCommand =
  | CreateOrganizationCommand
  | UpdateOrganizationCommand
  | ArchiveOrganizationCommand
  | RestoreOrganizationCommand
  | CreateLegalEntityCommand
  | UpdateLegalEntityCommand
  | ArchiveLegalEntityCommand
  | RestoreLegalEntityCommand
  | CreatePersonCommand
  | UpdatePersonCommand
  | ArchivePersonCommand
  | RestorePersonCommand
  | MergeOrganizationsCommand
  | MergeLegalEntitiesCommand
  | MergePeopleCommand;

export type RegistryContext = RequestContext;
