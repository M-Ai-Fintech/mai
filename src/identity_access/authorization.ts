import {
  type AuthorizationDecision,
  type AuthorizationRequest,
  evaluateAuthorization,
  field,
  type FieldClassification,
  guardedLoad,
  type PolicyClock,
  projectAuthorizedDto,
  type ProjectionSchema,
  purpose,
  type RequestedField,
  sponsor,
} from "../platform/authz/v1.ts";
import type { SessionContext } from "./contracts.ts";
import type {
  IdentityAccessRepository,
  PermissionGrant,
  Restriction,
  RolePolicy,
} from "./contracts.ts";
import type { UserIdentityId } from "./ids.ts";
import type { Action, ResourceKind } from "../platform/authz/v1.ts";
import { IdentityAccessError } from "./errors.ts";

export interface IdentityAccessAuthorizationRequest {
  readonly identityId: UserIdentityId;
  readonly request: AuthorizationRequest;
}

export function createIdentityAccessAuthorization(input: {
  readonly session: SessionContext;
  readonly identityId: UserIdentityId;
  readonly resource: { readonly kind: ResourceKind; readonly id: string };
  readonly action: Action;
  readonly requestedFields: readonly RequestedField[];
  readonly policies: readonly RolePolicy[];
  readonly grants: readonly PermissionGrant[];
  readonly restrictions: readonly Restriction[];
  readonly clock?: PolicyClock;
  readonly purpose?: string;
  readonly sponsor?: string;
  readonly expiresAt?: string;
}): IdentityAccessAuthorizationRequest {
  if (input.session.workspaceId === undefined) {
    throw new Error("Authorization requires a workspace-scoped session.");
  }
  const policyNow = input.clock?.now() ?? input.session.issuedAt;
  input.session.assertActive(policyNow);
  const scope = {
    tenantId: input.session.tenantId,
    workspaceId: input.session.workspaceId,
  };
  return {
    identityId: input.identityId,
    request: {
      context: input.session.toRequestContext("internal"),
      actor: input.session.actor,
      scope,
      resource: input.resource,
      action: input.action,
      requestedFields: [...input.requestedFields],
      roleFacts: input.policies.filter((policy) =>
        isActivePolicy(policy) &&
        policy.tenantId === input.session.tenantId &&
        policy.workspaceId === input.session.workspaceId
      ).map(toRoleFact),
      grantFacts: input.grants.filter((grant) =>
        grant.identityId === input.identityId &&
        grant.tenantId === input.session.tenantId &&
        grant.workspaceId === input.session.workspaceId
      ).map(toGrantFact),
      restrictionFacts: input.restrictions.filter((restriction) =>
        isActiveRestriction(restriction) &&
        restriction.tenantId === input.session.tenantId &&
        restriction.workspaceId === input.session.workspaceId
      ).map(toRestrictionFact),
      relationshipFacts: [],
      ...(input.purpose === undefined
        ? {}
        : { purpose: purpose(input.purpose) }),
      ...(input.sponsor === undefined
        ? {}
        : { sponsor: sponsor(input.sponsor) }),
      ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
      clock: { now: () => policyNow },
    },
  };
}

export function evaluateIdentityAccess(
  request: IdentityAccessAuthorizationRequest,
): AuthorizationDecision {
  return evaluateAuthorization(request.request);
}

export class IdentityAccessJobRevalidator {
  revalidate(
    request: IdentityAccessAuthorizationRequest,
  ): AuthorizationDecision {
    return evaluateIdentityAccess(request);
  }

  beforeExternalEffect(
    request: IdentityAccessAuthorizationRequest,
  ): AuthorizationDecision {
    const decision = this.revalidate(request);
    if (decision.outcome === "allow") return decision;
    throw new IdentityAccessError(
      "AUTHORIZATION_DENIED",
      `job authorization was denied before the external effect: ${decision.reasonCode}.`,
    );
  }
}

export async function projectAuthorizedIdentity(
  request: IdentityAccessAuthorizationRequest,
  identity: {
    readonly id: UserIdentityId;
    readonly displayName: string;
    readonly providerSubject: string;
  },
): Promise<
  | {
    readonly kind: "loaded";
    readonly value: Readonly<Record<string, unknown>>;
    readonly decision: AuthorizationDecision;
  }
  | {
    readonly kind: "protected_not_found";
    readonly response: import("../platform/api/v1.ts").ErrorEnvelope;
  }
> {
  return await guardedLoad(request.request, {
    load: () =>
      Promise.resolve().then(() => {
        const decision = evaluateAuthorization(request.request);
        if (decision.outcome === "deny") return undefined;
        return projectAuthorizedDto(
          identity,
          identityProjectionSchema(),
          decision.fieldMask,
          decision.allowedActions,
        );
      }),
  });
}

export async function loadAuthorizedIdentity(
  request: IdentityAccessAuthorizationRequest,
  repository: IdentityAccessRepository,
): Promise<
  | {
    readonly kind: "loaded";
    readonly value: Readonly<Record<string, unknown>>;
    readonly decision: AuthorizationDecision;
  }
  | {
    readonly kind: "protected_not_found";
    readonly response: import("../platform/api/v1.ts").ErrorEnvelope;
  }
> {
  const guarded = await guardedLoad(request.request, {
    load: async (scope) => {
      const aggregate = await repository.find(
        { tenantId: scope.tenantId },
        "user_identity",
        request.identityId,
      );
      return aggregate?.aggregateType === "user_identity"
        ? aggregate
        : undefined;
    },
  });
  if (guarded.kind === "protected_not_found") return guarded;
  return {
    kind: "loaded",
    value: projectAuthorizedDto(
      guarded.value,
      identityProjectionSchema(),
      guarded.decision.fieldMask,
      guarded.decision.allowedActions,
    ),
    decision: guarded.decision,
  };
}

function toRoleFact(policy: RolePolicy) {
  return {
    id: policy.id,
    scope: { tenantId: policy.tenantId, workspaceId: policy.workspaceId },
    resourceKinds: policy.resourceKinds,
    actions: policy.actions,
    fields: policy.fields,
  };
}

function toGrantFact(grant: PermissionGrant) {
  return grant.access === "standard"
    ? {
      id: grant.id,
      access: "standard" as const,
      scope: { tenantId: grant.tenantId, workspaceId: grant.workspaceId },
      resourceIds: grant.resourceIds,
      resourceKinds: grant.resourceKinds,
      actions: grant.actions,
      fields: grant.fields,
      state: grant.state,
    }
    : {
      id: grant.id,
      access: grant.access,
      scope: { tenantId: grant.tenantId, workspaceId: grant.workspaceId },
      resourceIds: grant.resourceIds ?? [],
      resourceKinds: grant.resourceKinds,
      actions: grant.actions,
      fields: grant.fields,
      purpose: grant.purpose!,
      sponsor: grant.sponsor!,
      expiresAt: grant.expiresAt!,
      state: grant.state,
    };
}

function toRestrictionFact(restriction: Restriction) {
  return {
    id: restriction.id,
    scope: {
      tenantId: restriction.tenantId,
      workspaceId: restriction.workspaceId,
    },
    resourceIds: restriction.resourceIds,
    resourceKinds: restriction.resourceKinds,
    actions: restriction.actions,
    fields: restriction.fields,
  };
}

function isActivePolicy(policy: RolePolicy): boolean {
  return policy.state === "active";
}

function isActiveRestriction(restriction: Restriction): boolean {
  return restriction.state === "active";
}

function identityProjectionSchema(): ProjectionSchema<{
  readonly id: UserIdentityId;
  readonly displayName: string;
  readonly providerSubject: string;
}> {
  return {
    id: {
      field: field("id"),
      sourceKey: "id",
      classification: "public" as const,
    },
    displayName: {
      field: field("display_name"),
      sourceKey: "displayName",
      classification: "public" as const,
    },
    providerSubject: {
      field: field("provider_subject"),
      sourceKey: "providerSubject",
      classification: "restricted" as const,
    },
  };
}

export function requestedField(
  name: string,
  classification: FieldClassification,
): RequestedField {
  return { name: field(name), classification };
}
