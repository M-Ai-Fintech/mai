import type {
  Action,
  ActorReference,
  FieldName,
  Purpose,
  ResourceKind,
  Sponsor,
} from "../platform/authz/v1.ts";
import type {
  ActorId,
  CorrelationId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  InstitutionId,
  InvitationId,
  MembershipId,
  PermissionGrantId,
  RestrictionId,
  RevocationId,
  RolePolicyId,
  SessionId,
  UserIdentityId,
} from "./ids.ts";

export interface AdministrationContext {
  readonly actor: ActorReference;
  readonly actorId: ActorId;
  readonly tenantId: TenantId;
  readonly correlationId: CorrelationId;
  readonly workspaceId?: WorkspaceId;
  readonly now: string;
}

export interface AggregateBase {
  readonly version: AggregateVersion;
  readonly tenantId: TenantId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type InstitutionState = "active" | "suspended" | "closed";
export type WorkspaceState = "active" | "suspended" | "archived";
export type IdentityState = "active" | "inactive" | "revoked";
export type MembershipState = "active" | "suspended" | "revoked";
export type InvitationState = "pending" | "accepted" | "expired" | "revoked";
export type PolicyState = "active" | "revoked";
export type RevocationState = "terminal";

export interface Institution extends AggregateBase {
  readonly aggregateType: "institution";
  readonly id: InstitutionId;
  readonly name: string;
  readonly state: InstitutionState;
}

export interface Workspace extends AggregateBase {
  readonly aggregateType: "workspace";
  readonly id: WorkspaceId;
  readonly institutionId: InstitutionId;
  readonly name: string;
  readonly state: WorkspaceState;
}

export interface UserIdentity extends AggregateBase {
  readonly aggregateType: "user_identity";
  readonly id: UserIdentityId;
  readonly providerSubject: string;
  readonly displayName: string;
  readonly state: IdentityState;
}

export interface Membership extends AggregateBase {
  readonly aggregateType: "membership";
  readonly id: MembershipId;
  readonly workspaceId: WorkspaceId;
  readonly identityId: UserIdentityId;
  readonly rolePolicyIds: readonly RolePolicyId[];
  readonly state: MembershipState;
}

export interface Invitation extends AggregateBase {
  readonly aggregateType: "invitation";
  readonly id: InvitationId;
  readonly workspaceId: WorkspaceId;
  readonly identityId: UserIdentityId;
  readonly tokenDigest: string;
  readonly sponsorActorId: ActorId;
  readonly purpose: Purpose;
  readonly expiresAt: string;
  readonly state: InvitationState;
}

export interface RolePolicy extends AggregateBase {
  readonly aggregateType: "role_policy";
  readonly id: RolePolicyId;
  readonly workspaceId: WorkspaceId;
  readonly name: string;
  readonly resourceKinds: readonly ResourceKind[];
  readonly actions: readonly Action[];
  readonly fields: readonly FieldName[];
  readonly state: PolicyState;
}

export type PermissionGrantAccess = "standard" | "temporary" | "external";

export interface PermissionGrant extends AggregateBase {
  readonly aggregateType: "permission_grant";
  readonly id: PermissionGrantId;
  readonly workspaceId: WorkspaceId;
  readonly identityId: UserIdentityId;
  readonly access: PermissionGrantAccess;
  readonly resourceIds?: readonly string[];
  readonly resourceKinds: readonly ResourceKind[];
  readonly actions: readonly Action[];
  readonly fields: readonly FieldName[];
  readonly purpose?: Purpose | readonly Purpose[];
  readonly sponsor?: Sponsor;
  readonly expiresAt?: string;
  readonly state: PolicyState;
}

export interface Restriction extends AggregateBase {
  readonly aggregateType: "restriction";
  readonly id: RestrictionId;
  readonly workspaceId: WorkspaceId;
  readonly resourceIds?: readonly string[];
  readonly resourceKinds: readonly ResourceKind[];
  readonly actions: readonly Action[];
  readonly fields?: readonly FieldName[];
  readonly state: PolicyState;
}

export type RevocableAggregate =
  | UserIdentity
  | Membership
  | Invitation
  | RolePolicy
  | PermissionGrant
  | Restriction;

export type IdentityAccessAggregate =
  | Institution
  | Workspace
  | RevocableAggregate
  | Revocation;

export type RevocableAggregateType = RevocableAggregate["aggregateType"];

export interface Revocation extends AggregateBase {
  readonly aggregateType: "revocation";
  readonly id: RevocationId;
  readonly targetType: RevocableAggregateType;
  readonly targetId: string;
  readonly targetVersion: AggregateVersion;
  readonly sponsorActorId: ActorId;
  readonly reason: string;
  readonly state: RevocationState;
}

export interface SessionContext {
  readonly sessionId: SessionId;
  readonly actor: ActorReference;
  readonly identityId?: string;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt?: string;
  assertActive(now: string): void;
  toRequestContext(origin?: "http" | "job" | "internal"): {
    readonly actorId: ActorId;
    readonly tenantId: TenantId;
    readonly correlationId: CorrelationId;
    readonly origin: "http" | "job" | "internal";
    readonly workspaceId?: WorkspaceId;
  };
  toJSON(): Readonly<Record<string, unknown>>;
}

export interface IdentityAccessEvent {
  readonly eventId: string;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: AggregateVersion;
  readonly eventType: string;
  readonly schemaVersion: 1;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly correlationId: CorrelationId;
  readonly occurredAt: Date;
  readonly availableAt: Date;
}

export interface VersionedCommand {
  readonly expectedVersion?: AggregateVersion;
  readonly context: AdministrationContext;
}

export interface TenantScope {
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
}

export interface AccessRevalidationInput {
  readonly actor: ActorReference;
  readonly scope: TenantScope;
  readonly resource: { readonly kind: ResourceKind; readonly id: string };
  readonly action: Action;
  readonly requestedFields?: readonly {
    readonly name: FieldName;
    readonly classification:
      import("../platform/authz/v1.ts").FieldClassification;
  }[];
  readonly purpose?: Purpose;
  readonly sponsor?: Sponsor;
  readonly expiresAt?: string;
}

export interface IdentityAccessRepository {
  find(
    scope: TenantScope,
    aggregateType: IdentityAccessAggregate["aggregateType"],
    aggregateId: string,
  ): Promise<IdentityAccessAggregate | undefined>;
  list(
    scope: TenantScope,
    aggregateType: IdentityAccessAggregate["aggregateType"],
  ): Promise<readonly IdentityAccessAggregate[]>;
  save(
    aggregate: IdentityAccessAggregate,
    expectedVersion: AggregateVersion | number | undefined,
    event: IdentityAccessEvent,
  ): Promise<void>;
  saveBatch(operations: readonly IdentityAccessWriteOperation[]): Promise<void>;
}

export interface IdentityAccessWriteOperation {
  readonly aggregate: IdentityAccessAggregate;
  readonly expectedVersion?: AggregateVersion | number;
  readonly event: IdentityAccessEvent;
}
