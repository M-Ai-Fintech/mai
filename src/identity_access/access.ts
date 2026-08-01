import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import {
  action,
  field,
  type Purpose,
  purpose,
  resourceKind,
  type Sponsor,
  sponsor,
} from "../platform/authz/v1.ts";
import type { TenantId, WorkspaceId } from "../shared/contracts/identifiers.ts";
import {
  assertFutureExpiry,
  assertHumanAdministrator,
  assertTenantScope,
} from "./errors.ts";
import {
  aggregateBase,
  assertName,
  assertText,
  freezeValues,
  nextAggregateVersion,
} from "./aggregate.ts";
import type {
  AdministrationContext,
  PermissionGrant,
  PermissionGrantAccess,
  Restriction,
  RolePolicy,
} from "./contracts.ts";
import type {
  PermissionGrantId,
  RestrictionId,
  RolePolicyId,
  UserIdentityId,
} from "./ids.ts";

export function createRolePolicy(
  input: {
    readonly id: RolePolicyId;
    readonly tenantId: TenantId;
    readonly workspaceId: WorkspaceId;
    readonly name: string;
    readonly resourceKinds: readonly string[];
    readonly actions: readonly string[];
    readonly fields: readonly string[];
  },
  context: AdministrationContext,
): RolePolicy {
  assertHumanAdministrator(context);
  assertTenantScope(context, input.tenantId);
  assertWorkspace(context, input.workspaceId);
  assertName(input.name, "role policy name");
  return Object.freeze({
    aggregateType: "role_policy",
    id: input.id,
    workspaceId: input.workspaceId,
    name: input.name,
    resourceKinds: freezeValues(input.resourceKinds.map(resourceKind)),
    actions: freezeValues(input.actions.map(action)),
    fields: freezeValues(input.fields.map(field)),
    state: "active" as const,
    ...aggregateBase(context),
  });
}

export function createPermissionGrant(
  input: {
    readonly id: PermissionGrantId;
    readonly tenantId: TenantId;
    readonly workspaceId: WorkspaceId;
    readonly identityId: UserIdentityId;
    readonly access: PermissionGrantAccess;
    readonly resourceIds?: readonly string[];
    readonly resourceKinds: readonly string[];
    readonly actions: readonly string[];
    readonly fields: readonly string[];
    readonly purpose?: string | readonly string[];
    readonly sponsor?: string;
    readonly expiresAt?: string;
  },
  context: AdministrationContext,
): PermissionGrant {
  assertHumanAdministrator(context);
  assertTenantScope(context, input.tenantId);
  assertWorkspace(context, input.workspaceId);
  const grant = normalizeGrant(input, context);
  return Object.freeze({
    aggregateType: "permission_grant",
    id: input.id,
    workspaceId: input.workspaceId,
    identityId: input.identityId,
    access: input.access,
    ...(input.resourceIds === undefined
      ? {}
      : { resourceIds: freezeValues(input.resourceIds) }),
    resourceKinds: freezeValues(input.resourceKinds.map(resourceKind)),
    actions: freezeValues(input.actions.map(action)),
    fields: freezeValues(input.fields.map(field)),
    ...(grant.purpose === undefined ? {} : { purpose: grant.purpose }),
    ...(grant.sponsor === undefined ? {} : { sponsor: grant.sponsor }),
    ...(grant.expiresAt === undefined ? {} : { expiresAt: grant.expiresAt }),
    state: "active" as const,
    ...aggregateBase(context),
  });
}

export function createRestriction(
  input: {
    readonly id: RestrictionId;
    readonly tenantId: TenantId;
    readonly workspaceId: WorkspaceId;
    readonly resourceIds?: readonly string[];
    readonly resourceKinds: readonly string[];
    readonly actions: readonly string[];
    readonly fields?: readonly string[];
  },
  context: AdministrationContext,
): Restriction {
  assertHumanAdministrator(context);
  assertTenantScope(context, input.tenantId);
  assertWorkspace(context, input.workspaceId);
  if (input.resourceKinds.length === 0 || input.actions.length === 0) {
    throw new Error("Restriction resource kinds and actions are required.");
  }
  return Object.freeze({
    aggregateType: "restriction",
    id: input.id,
    workspaceId: input.workspaceId,
    ...(input.resourceIds === undefined
      ? {}
      : { resourceIds: freezeValues(input.resourceIds) }),
    resourceKinds: freezeValues(input.resourceKinds.map(resourceKind)),
    actions: freezeValues(input.actions.map(action)),
    ...(input.fields === undefined
      ? {}
      : { fields: freezeValues(input.fields.map(field)) }),
    state: "active" as const,
    ...aggregateBase(context),
  });
}

export function revokePolicy(
  policy: RolePolicy | PermissionGrant | Restriction,
  context: AdministrationContext,
  expectedVersion: AggregateVersion,
): typeof policy {
  assertHumanAdministrator(context);
  assertTenantScope(context, policy.tenantId);
  const base = nextAggregateVersion(policy, expectedVersion, context);
  return Object.freeze({ ...policy, ...base, state: "revoked" as const });
}

function normalizeGrant(
  input: {
    readonly access: PermissionGrantAccess;
    readonly resourceIds?: readonly string[];
    readonly resourceKinds: readonly string[];
    readonly actions: readonly string[];
    readonly fields: readonly string[];
    readonly purpose?: string | readonly string[];
    readonly sponsor?: string;
    readonly expiresAt?: string;
  },
  context: AdministrationContext,
): {
  readonly purpose?: Purpose | readonly Purpose[];
  readonly sponsor?: Sponsor;
  readonly expiresAt?: string;
} {
  if (input.access === "standard") {
    if (
      input.purpose !== undefined || input.sponsor !== undefined ||
      input.expiresAt !== undefined
    ) {
      throw new Error(
        "Standard grants cannot carry temporary or external constraints.",
      );
    }
    return {};
  }
  if (
    input.resourceIds === undefined || input.resourceIds.length === 0 ||
    input.resourceKinds.length === 0 ||
    input.actions.length === 0 || input.fields.length === 0
  ) {
    throw new Error(
      "Bound grants require resource IDs, kinds, actions, and fields.",
    );
  }
  if (
    input.purpose === undefined || input.sponsor === undefined ||
    input.expiresAt === undefined
  ) {
    throw new Error("Bound grants require purpose, sponsor, and expiry.");
  }
  assertText(input.sponsor, "grant sponsor");
  assertFutureExpiry(input.expiresAt, context.now);
  const purposes = typeof input.purpose === "string"
    ? purpose(input.purpose)
    : freezeValues(input.purpose.map(purpose));
  return {
    purpose: purposes,
    sponsor: sponsor(input.sponsor),
    expiresAt: input.expiresAt,
  };
}

function assertWorkspace(
  context: AdministrationContext,
  workspaceId: WorkspaceId,
): void {
  if (context.workspaceId === workspaceId) return;
  throw new Error(
    `Workspace "${workspaceId}" does not match administration context.`,
  );
}
