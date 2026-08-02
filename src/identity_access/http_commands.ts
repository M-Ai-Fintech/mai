import { action, purpose, resourceKind } from "../platform/authz/v1.ts";
import { withWorkspaceContext } from "./context.ts";
import { IdentityAccessError } from "./errors.ts";
import {
  createIdentityAccessAuthorization,
  loadAuthorizedIdentity,
  requestedField,
} from "./authorization.ts";
import type {
  AdministrationContext,
  IdentityAccessAggregate,
  IdentityAccessRepository,
  PermissionGrant,
  Restriction,
  RevocableAggregateType,
  RolePolicy,
} from "./contracts.ts";
import {
  actorId,
  institutionId,
  invitationId,
  membershipId,
  permissionGrantId,
  restrictionId,
  revocationId,
  rolePolicyId,
  userIdentityId,
  workspaceId,
} from "./ids.ts";
import type { AuthenticatedRequest } from "./http_shared.ts";
import {
  optionalActorId,
  optionalPurpose,
  optionalString,
  optionalStringArray,
  RequestInputError,
  requiredString,
  requiredStringArray,
  requireIfMatch,
} from "./http_shared.ts";
import { IdentityAccessService } from "./service.ts";
import type { IdempotencyKey } from "../shared/contracts/identifiers.ts";

export async function createAggregate(
  segments: readonly string[],
  body: Record<string, unknown>,
  authenticated: AuthenticatedRequest,
  service: IdentityAccessService,
  commandKey: IdempotencyKey,
  ifMatch: string | null,
): Promise<IdentityAccessAggregate> {
  const [collection] = segments;
  if (segments.length !== 1) throw new RequestInputError("unsupported route");
  if (collection === "institutions") {
    return await createInstitution(body, authenticated, service, commandKey);
  }
  if (collection === "workspaces") {
    return await createWorkspace(body, authenticated, service, commandKey);
  }
  if (collection === "identities") {
    return await createIdentity(body, authenticated, service, commandKey);
  }
  if (collection === "memberships") {
    return await createMembership(body, authenticated, service, commandKey);
  }
  if (collection === "invitations") {
    return await createInvitation(body, authenticated, service, commandKey);
  }
  if (collection === "grants") {
    return await createGrant(body, authenticated, service, commandKey);
  }
  if (collection === "restrictions") {
    return await createRestriction(body, authenticated, service, commandKey);
  }
  if (collection === "revocations") {
    return await revokeAggregate(
      body,
      authenticated,
      service,
      commandKey,
      ifMatch,
    );
  }
  throw new RequestInputError("unsupported route");
}

export async function readAuthorizedIdentity(
  identityValue: string,
  authenticated: AuthenticatedRequest,
  repository: IdentityAccessRepository,
  policyClock: import("../platform/authz/v1.ts").PolicyClock | undefined,
): Promise<Awaited<ReturnType<typeof loadAuthorizedIdentity>>> {
  if (authenticated.session.workspaceId === undefined) {
    return {
      kind: "protected_not_found",
      response: {
        error: {
          code: "PROTECTED_NOT_FOUND",
          message: "The protected resource was not found.",
          correlationId: authenticated.correlationId,
          retryable: false,
        },
      },
    };
  }
  const policies = await listPolicies(repository, authenticated.context);
  const request = createIdentityAccessAuthorization({
    session: authenticated.session,
    identityId: userIdentityId(identityValue),
    resource: { kind: resourceKind("identity"), id: identityValue },
    action: action("read"),
    requestedFields: [
      requestedField("id", "public"),
      requestedField("display_name", "public"),
      requestedField("provider_subject", "restricted"),
    ],
    policies: policies.rolePolicies,
    grants: policies.grants,
    restrictions: policies.restrictions,
    clock: policyClock,
  });
  return await loadAuthorizedIdentity(request, repository);
}

async function createInstitution(
  body: Record<string, unknown>,
  authenticated: AuthenticatedRequest,
  service: IdentityAccessService,
  key: IdempotencyKey,
): Promise<IdentityAccessAggregate> {
  return await service.createInstitution(
    {
      id: institutionId(requiredString(body, "id")),
      tenantId: authenticated.context.tenantId,
      name: requiredString(body, "name"),
    },
    authenticated.context,
    key,
  );
}

async function createWorkspace(
  body: Record<string, unknown>,
  authenticated: AuthenticatedRequest,
  service: IdentityAccessService,
  key: IdempotencyKey,
): Promise<IdentityAccessAggregate> {
  return await service.createWorkspace(
    {
      id: workspaceId(requiredString(body, "id")),
      tenantId: authenticated.context.tenantId,
      institutionId: institutionId(requiredString(body, "institutionId")),
      name: requiredString(body, "name"),
    },
    authenticated.context,
    key,
  );
}

async function createIdentity(
  body: Record<string, unknown>,
  authenticated: AuthenticatedRequest,
  service: IdentityAccessService,
  key: IdempotencyKey,
): Promise<IdentityAccessAggregate> {
  return await service.createUserIdentity(
    {
      id: userIdentityId(requiredString(body, "id")),
      tenantId: authenticated.context.tenantId,
      providerSubject: requiredString(body, "providerSubject"),
      displayName: requiredString(body, "displayName"),
    },
    authenticated.context,
    key,
  );
}

async function createMembership(
  body: Record<string, unknown>,
  authenticated: AuthenticatedRequest,
  service: IdentityAccessService,
  key: IdempotencyKey,
): Promise<IdentityAccessAggregate> {
  const context = contextForBodyWorkspace(authenticated.context, body);
  return await service.createMembership(
    {
      id: membershipId(requiredString(body, "id")),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId!,
      identityId: userIdentityId(requiredString(body, "identityId")),
      rolePolicyIds: requiredStringArray(body, "rolePolicyIds").map(
        rolePolicyId,
      ),
    },
    context,
    key,
  );
}

async function createInvitation(
  body: Record<string, unknown>,
  authenticated: AuthenticatedRequest,
  service: IdentityAccessService,
  key: IdempotencyKey,
): Promise<IdentityAccessAggregate> {
  const context = contextForBodyWorkspace(authenticated.context, body);
  return await service.createInvitationFromToken(
    {
      id: invitationId(requiredString(body, "id")),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId!,
      identityId: userIdentityId(requiredString(body, "identityId")),
      sponsorActorId: context.actorId,
      token: requiredString(body, "token"),
      purpose: purpose(requiredString(body, "purpose")),
      expiresAt: requiredString(body, "expiresAt"),
    },
    context,
    key,
  );
}

async function createGrant(
  body: Record<string, unknown>,
  authenticated: AuthenticatedRequest,
  service: IdentityAccessService,
  key: IdempotencyKey,
): Promise<IdentityAccessAggregate> {
  const context = contextForBodyWorkspace(authenticated.context, body);
  return await service.createPermissionGrant(
    {
      id: permissionGrantId(requiredString(body, "id")),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId!,
      identityId: userIdentityId(requiredString(body, "identityId")),
      access: grantAccess(body),
      resourceIds: requiredStringArray(body, "resourceIds"),
      resourceKinds: requiredStringArray(body, "resourceKinds"),
      actions: requiredStringArray(body, "actions"),
      fields: requiredStringArray(body, "fields"),
      purpose: optionalPurpose(body.purpose),
      sponsor: optionalString(body, "sponsor"),
      expiresAt: optionalString(body, "expiresAt"),
    },
    context,
    key,
  );
}

async function createRestriction(
  body: Record<string, unknown>,
  authenticated: AuthenticatedRequest,
  service: IdentityAccessService,
  key: IdempotencyKey,
): Promise<IdentityAccessAggregate> {
  const context = contextForBodyWorkspace(authenticated.context, body);
  return await service.createRestriction(
    {
      id: restrictionId(requiredString(body, "id")),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId!,
      resourceIds: optionalStringArray(body, "resourceIds"),
      resourceKinds: requiredStringArray(body, "resourceKinds"),
      actions: requiredStringArray(body, "actions"),
      fields: optionalStringArray(body, "fields"),
    },
    context,
    key,
  );
}

async function revokeAggregate(
  body: Record<string, unknown>,
  authenticated: AuthenticatedRequest,
  service: IdentityAccessService,
  key: IdempotencyKey,
  ifMatch: string | null,
): Promise<IdentityAccessAggregate> {
  const result = await service.revoke(
    requiredTargetType(body.targetType),
    requiredString(body, "targetId"),
    {
      revocationId: revocationId(requiredString(body, "revocationId")),
      expectedVersion: requireIfMatch(ifMatch),
      reason: requiredString(body, "reason"),
      invalidatedActorId: optionalActorId(body, "invalidatedActorId", actorId),
    },
    contextForOptionalBodyWorkspace(authenticated.context, body),
    key,
  );
  return result.revocation;
}

function contextForBodyWorkspace(
  context: AdministrationContext,
  body: Record<string, unknown>,
): AdministrationContext {
  const value = optionalString(body, "workspaceId");
  if (value === undefined && context.workspaceId !== undefined) return context;
  return contextForWorkspace(
    context,
    value ?? requiredString(body, "workspaceId"),
  );
}

function contextForOptionalBodyWorkspace(
  context: AdministrationContext,
  body: Record<string, unknown>,
): AdministrationContext {
  const value = optionalString(body, "workspaceId");
  return value === undefined ? context : contextForWorkspace(context, value);
}

function contextForWorkspace(
  context: AdministrationContext,
  value: string,
): AdministrationContext {
  const requested = workspaceId(value);
  if (context.workspaceId !== undefined && context.workspaceId !== requested) {
    throw new IdentityAccessError(
      "SCOPE_MISMATCH",
      `workspace "${requested}" is outside the authenticated scope.`,
    );
  }
  return withWorkspaceContext(context, requested);
}

async function listPolicies(
  repository: IdentityAccessRepository,
  context: AdministrationContext,
): Promise<{
  readonly rolePolicies: readonly RolePolicy[];
  readonly grants: readonly PermissionGrant[];
  readonly restrictions: readonly Restriction[];
}> {
  const scope = {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId!,
  };
  const [rolePolicies, grants, restrictions] = await Promise.all([
    repository.list(scope, "role_policy"),
    repository.list(scope, "permission_grant"),
    repository.list(scope, "restriction"),
  ]);
  return {
    rolePolicies: rolePolicies.filter((value): value is RolePolicy =>
      value.aggregateType === "role_policy"
    ),
    grants: grants.filter((value): value is PermissionGrant =>
      value.aggregateType === "permission_grant"
    ),
    restrictions: restrictions.filter((value): value is Restriction =>
      value.aggregateType === "restriction"
    ),
  };
}

function grantAccess(
  body: Record<string, unknown>,
): "standard" | "temporary" | "external" {
  const value = requiredString(body, "access");
  if (value === "standard" || value === "temporary" || value === "external") {
    return value;
  }
  throw new RequestInputError(
    "access must be standard, temporary, or external.",
  );
}

function requiredTargetType(value: unknown): RevocableAggregateType {
  const allowed: readonly RevocableAggregateType[] = [
    "user_identity",
    "membership",
    "invitation",
    "role_policy",
    "permission_grant",
    "restriction",
  ];
  if (
    typeof value === "string" &&
    allowed.includes(value as RevocableAggregateType)
  ) {
    return value as RevocableAggregateType;
  }
  throw new RequestInputError("targetType is not revocable.");
}
