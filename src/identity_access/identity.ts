import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import {
  assertFutureExpiry,
  assertHumanAdministrator,
  assertTenantScope,
} from "./errors.ts";
import {
  aggregateBase,
  assertText,
  freezeValues,
  nextAggregateVersion,
} from "./aggregate.ts";
import type {
  AdministrationContext,
  IdentityState,
  Invitation,
  InvitationState,
  Membership,
  MembershipState,
  UserIdentity,
} from "./contracts.ts";
import type {
  InvitationId,
  MembershipId,
  RolePolicyId,
  UserIdentityId,
} from "./ids.ts";
import type {
  ActorId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { Purpose } from "../platform/authz/v1.ts";
import { digestInvitationToken } from "./invitations.ts";

export function createUserIdentity(
  input: {
    readonly id: UserIdentityId;
    readonly tenantId: TenantId;
    readonly providerSubject: string;
    readonly displayName: string;
  },
  context: AdministrationContext,
): UserIdentity {
  assertHumanAdministrator(context);
  assertTenantScope(context, input.tenantId);
  assertText(input.providerSubject, "provider subject", 255);
  assertText(input.displayName, "display name");
  return Object.freeze({
    aggregateType: "user_identity",
    id: input.id,
    providerSubject: input.providerSubject,
    displayName: input.displayName,
    state: "active" as const,
    ...aggregateBase(context),
  });
}

export function changeIdentityState(
  identity: UserIdentity,
  input: {
    readonly expectedVersion: number;
    readonly state: IdentityState;
    readonly context: AdministrationContext;
  },
): UserIdentity {
  assertHumanAdministrator(input.context);
  assertTenantScope(input.context, identity.tenantId);
  const base = nextAggregateVersion(
    identity,
    input.expectedVersion,
    input.context,
  );
  return Object.freeze({ ...identity, ...base, state: input.state });
}

export function createMembership(
  input: {
    readonly id: MembershipId;
    readonly tenantId: TenantId;
    readonly workspaceId: WorkspaceId;
    readonly identityId: UserIdentityId;
    readonly rolePolicyIds: readonly RolePolicyId[];
  },
  context: AdministrationContext,
): Membership {
  assertHumanAdministrator(context);
  assertTenantScope(context, input.tenantId);
  assertWorkspaceContext(context, input.workspaceId);
  return Object.freeze({
    aggregateType: "membership",
    id: input.id,
    workspaceId: input.workspaceId,
    identityId: input.identityId,
    rolePolicyIds: freezeValues(input.rolePolicyIds),
    state: "active" as const,
    ...aggregateBase(context),
  });
}

export function changeMembershipState(
  membership: Membership,
  input: {
    readonly expectedVersion: AggregateVersion;
    readonly state: MembershipState;
    readonly context: AdministrationContext;
  },
): Membership {
  assertHumanAdministrator(input.context);
  assertTenantScope(input.context, membership.tenantId);
  assertWorkspaceContext(input.context, membership.workspaceId);
  const base = nextAggregateVersion(
    membership,
    input.expectedVersion,
    input.context,
  );
  return Object.freeze({ ...membership, ...base, state: input.state });
}

export function createInvitation(
  input: {
    readonly id: InvitationId;
    readonly tenantId: TenantId;
    readonly workspaceId: WorkspaceId;
    readonly identityId: UserIdentityId;
    readonly tokenDigest: string;
    readonly sponsorActorId: ActorId;
    readonly purpose: Purpose;
    readonly expiresAt: string;
  },
  context: AdministrationContext,
): Invitation {
  assertHumanAdministrator(context);
  assertTenantScope(context, input.tenantId);
  assertWorkspaceContext(context, input.workspaceId);
  assertWorkspaceSponsor(input.sponsorActorId, context);
  assertTokenDigest(input.tokenDigest);
  assertFutureExpiry(input.expiresAt, context.now);
  return Object.freeze({
    aggregateType: "invitation",
    id: input.id,
    workspaceId: input.workspaceId,
    identityId: input.identityId,
    tokenDigest: input.tokenDigest,
    sponsorActorId: input.sponsorActorId,
    purpose: input.purpose,
    expiresAt: input.expiresAt,
    state: "pending" as const,
    ...aggregateBase(context),
  });
}

export async function createInvitationFromToken(
  input: Omit<Parameters<typeof createInvitation>[0], "tokenDigest"> & {
    readonly token: string;
  },
  context: AdministrationContext,
): Promise<Invitation> {
  const tokenDigest = await digestInvitationToken(input.token);
  return createInvitation({ ...input, tokenDigest }, context);
}

export function acceptInvitation(
  invitation: Invitation,
  input: {
    readonly expectedVersion: number;
    readonly context: AdministrationContext;
  },
): Invitation {
  if (invitation.state !== "pending") {
    throw new Error(
      `Invitation "${invitation.id}" is "${invitation.state}"; expected pending state.`,
    );
  }
  if (Date.parse(input.context.now) >= Date.parse(invitation.expiresAt)) {
    throw new Error(
      `Invitation "${invitation.id}" expired at "${invitation.expiresAt}".`,
    );
  }
  return changeInvitationState(invitation, {
    expectedVersion: input.expectedVersion,
    state: "accepted",
    context: input.context,
  });
}

export function expireInvitation(
  invitation: Invitation,
  input: {
    readonly expectedVersion: number;
    readonly context: AdministrationContext;
  },
): Invitation {
  if (Date.parse(input.context.now) < Date.parse(invitation.expiresAt)) {
    throw new Error(
      `Invitation "${invitation.id}" expires at "${invitation.expiresAt}"; early expiry is invalid.`,
    );
  }
  return changeInvitationState(invitation, {
    expectedVersion: input.expectedVersion,
    state: "expired",
    context: input.context,
  });
}

export function changeInvitationState(
  invitation: Invitation,
  input: {
    readonly expectedVersion: number;
    readonly state: InvitationState;
    readonly context: AdministrationContext;
  },
): Invitation {
  assertHumanAdministrator(input.context);
  assertTenantScope(input.context, invitation.tenantId);
  const base = nextAggregateVersion(
    invitation,
    input.expectedVersion,
    input.context,
  );
  return Object.freeze({ ...invitation, ...base, state: input.state });
}

function assertWorkspaceContext(
  context: AdministrationContext,
  workspaceId: WorkspaceId,
): void {
  if (context.workspaceId === workspaceId) return;
  throw new Error(
    `Workspace "${workspaceId}" does not match administration context.`,
  );
}

function assertWorkspaceSponsor(
  actorId: ActorId,
  context: AdministrationContext,
): void {
  if (actorId === context.actorId) return;
  throw new Error(
    `Invitation sponsor "${actorId}" does not match actor "${context.actorId}".`,
  );
}

function assertTokenDigest(value: string): void {
  if (/^[0-9a-f]{64}$/.test(value)) return;
  throw new Error(
    `Invitation token digest "${value}" is invalid; expected 64 lowercase hexadecimal characters.`,
  );
}
