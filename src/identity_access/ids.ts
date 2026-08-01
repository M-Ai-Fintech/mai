import {
  type ActorId,
  type CorrelationId,
  type IdempotencyKey,
  parseActorId,
  parseCorrelationId,
  parseIdempotencyKey,
  parseTenantId,
  parseWorkspaceId,
  type TenantId,
  type WorkspaceId,
} from "../shared/contracts/identifiers.ts";

declare const identityAccessIdBrand: unique symbol;
type IdentityAccessId<Kind extends string> = string & {
  readonly [identityAccessIdBrand]: Kind;
};

export type InstitutionId = IdentityAccessId<"InstitutionId">;
export type UserIdentityId = IdentityAccessId<"UserIdentityId">;
export type MembershipId = IdentityAccessId<"MembershipId">;
export type InvitationId = IdentityAccessId<"InvitationId">;
export type SessionId = IdentityAccessId<"SessionId">;
export type RolePolicyId = IdentityAccessId<"RolePolicyId">;
export type PermissionGrantId = IdentityAccessId<"PermissionGrantId">;
export type RestrictionId = IdentityAccessId<"RestrictionId">;
export type RevocationId = IdentityAccessId<"RevocationId">;

export function actorId(value: string): ActorId {
  return parseRequired(value, parseActorId, "actor ID");
}

export function correlationId(value: string): CorrelationId {
  return parseRequired(value, parseCorrelationId, "correlation ID");
}

export function idempotencyKey(value: string): IdempotencyKey {
  return parseRequired(value, parseIdempotencyKey, "idempotency key");
}

export function tenantId(value: string): TenantId {
  return parseRequired(value, parseTenantId, "tenant ID");
}

export function workspaceId(value: string): WorkspaceId {
  return parseRequired(value, parseWorkspaceId, "workspace ID");
}

export function institutionId(value: string): InstitutionId {
  return prefixedId<InstitutionId>(value, "institution_", "institution ID");
}

export function userIdentityId(value: string): UserIdentityId {
  return prefixedId<UserIdentityId>(value, "identity_", "user identity ID");
}

export function membershipId(value: string): MembershipId {
  return prefixedId<MembershipId>(value, "membership_", "membership ID");
}

export function invitationId(value: string): InvitationId {
  return prefixedId<InvitationId>(value, "invitation_", "invitation ID");
}

export function sessionId(value: string): SessionId {
  return prefixedId<SessionId>(value, "session_", "session ID");
}

export function rolePolicyId(value: string): RolePolicyId {
  return prefixedId<RolePolicyId>(value, "role_", "role policy ID");
}

export function permissionGrantId(value: string): PermissionGrantId {
  return prefixedId<PermissionGrantId>(value, "grant_", "permission grant ID");
}

export function restrictionId(value: string): RestrictionId {
  return prefixedId<RestrictionId>(value, "restriction_", "restriction ID");
}

export function revocationId(value: string): RevocationId {
  return prefixedId<RevocationId>(value, "revocation_", "revocation ID");
}

type IdentifierParser<T> = (value: unknown) =>
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false };

function parseRequired<T>(
  value: string,
  parser: IdentifierParser<T>,
  label: string,
): T {
  const parsed = parser(value);
  if (parsed.ok) return parsed.value;
  throw new Error(`Invalid ${label} "${value}"; expected a canonical ID.`);
}

function prefixedId<T extends string>(
  value: string,
  prefix: string,
  label: string,
): T {
  if (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length)) &&
    value.startsWith(prefix)
  ) return value as T;
  throw new Error(
    `Invalid ${label} "${value}"; expected prefix "${prefix}" and slug characters.`,
  );
}
