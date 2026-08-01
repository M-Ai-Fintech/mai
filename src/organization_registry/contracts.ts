import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type {
  LegalEntityId,
  MergeRecordId,
  OrganizationId,
  PersonId,
  RegistryEntityId,
} from "./ids.ts";

export type RegistryEntityKind = "organization" | "legal_entity" | "person";
export type RegistryLifecycleState = "active" | "archived" | "merged";

export interface RegistryScope {
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
}

export interface RegistryAggregateBase<
  Kind extends RegistryEntityKind,
  Id extends RegistryEntityId,
> {
  readonly kind: Kind;
  readonly id: Id;
  readonly scope: RegistryScope;
  readonly version: AggregateVersion;
  readonly state: RegistryLifecycleState;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly mergedIntoId?: Id;
}

export interface Organization
  extends RegistryAggregateBase<"organization", OrganizationId> {
  readonly name: string;
  readonly normalizedName: string;
  readonly externalReference?: string;
}

export interface LegalEntity
  extends RegistryAggregateBase<"legal_entity", LegalEntityId> {
  readonly organizationId: OrganizationId;
  readonly legalName: string;
  readonly jurisdictionCode: string;
  readonly registrationNumber: string;
}

export interface Person extends RegistryAggregateBase<"person", PersonId> {
  readonly organizationId?: OrganizationId;
  readonly givenName: string;
  readonly familyName: string;
  readonly email?: string;
  readonly phone?: string;
  readonly nationalId?: string;
}

export type RegistryAggregate = Organization | LegalEntity | Person;

export interface MergeHistory {
  readonly recordId: MergeRecordId;
  readonly kind: RegistryEntityKind;
  readonly scope: RegistryScope;
  readonly sourceId: RegistryEntityId;
  readonly targetId: RegistryEntityId;
  readonly sourceVersion: AggregateVersion;
  readonly targetVersion: AggregateVersion;
  readonly actorId: ActorId;
  readonly reason: string;
  readonly recordedAt: string;
}

export interface RegistryMergeResult {
  readonly source: RegistryAggregate;
  readonly target: RegistryAggregate;
  readonly history: MergeHistory;
}

export interface RegistryCommandBase {
  readonly context: RequestContext;
  readonly idempotencyKey: IdempotencyKey;
}

export type RegistryReadRoute = "canonical" | "historical";

export function registryScope(context: RequestContext): RegistryScope {
  return Object.freeze({
    tenantId: context.tenantId,
    ...(context.workspaceId === undefined
      ? {}
      : { workspaceId: context.workspaceId }),
  });
}

export function sameRegistryScope(
  left: RegistryScope,
  right: RegistryScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId;
}

export function registryReference(
  kind: RegistryEntityKind,
  id: RegistryEntityId,
): { readonly kind: RegistryEntityKind; readonly id: RegistryEntityId } {
  return { kind, id };
}
