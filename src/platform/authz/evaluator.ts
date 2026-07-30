import {
  type Action,
  allowedDecision,
  type AuthorizationDecision,
  type AuthorizationRequest,
  deniedDecision,
  type FieldClassification,
  type FieldName,
  type GrantFact,
  type RelationshipFact,
  type RestrictionFact,
  type RoleFact,
} from "./vocabulary.ts";

export function evaluateAuthorization(
  request: AuthorizationRequest,
): AuthorizationDecision {
  const now = request.clock.now();
  const denied = initialDenial(request, now);
  if (denied !== undefined) return denied;
  const candidates = matchingFacts(request);
  if (candidates.length === 0) {
    return deniedDecision(request, "NO_MATCHING_GRANT");
  }
  if (candidates.some(isRevokedGrant)) {
    return deniedDecision(request, "GRANT_REVOKED");
  }
  if (candidates.some((fact) => expired(fact.expiresAt, now))) {
    return deniedDecision(request, "GRANT_EXPIRED");
  }
  if (
    requiresTemporaryConstraints(candidates) &&
    !hasTemporaryConstraints(request, candidates, now)
  ) {
    return deniedDecision(request, "TEMPORARY_CONSTRAINT_REQUIRED");
  }
  if (hasWholeRestriction(request)) {
    return deniedDecision(request, "EXPLICIT_RESTRICTION");
  }
  const fields = approvedFields(request, candidates);
  if (request.requestedFields.length > 0 && fields.include.length === 0) {
    return deniedDecision(request, "FIELD_SCOPE_DENIED");
  }
  return allowedDecision({
    request,
    allowedActions: allowedActions(candidates),
    fieldMask: fields,
    expiresAt: earliestExpiry(request, candidates),
  });
}

function isRevokedGrant(fact: RoleFact | GrantFact): fact is GrantFact {
  return "state" in fact && fact.state === "revoked";
}

function initialDenial(
  request: AuthorizationRequest,
  now: string,
): AuthorizationDecision | undefined {
  if (!isValidInstant(now)) {
    return deniedDecision(request, "INVALID_POLICY_TIME");
  }
  if (request.actor.state === "inactive") {
    return deniedDecision(request, "ACTOR_INACTIVE");
  }
  if (request.actor.state === "revoked") {
    return deniedDecision(request, "ACTOR_REVOKED");
  }
  if (!matchesContextScope(request)) {
    return deniedDecision(request, "SCOPE_MISMATCH");
  }
  if (
    request.authorityRequirement?.humanOnly && request.actor.kind !== "human"
  ) {
    return deniedDecision(request, "HUMAN_AUTHORITY_REQUIRED");
  }
  return undefined;
}

function matchesContextScope(request: AuthorizationRequest): boolean {
  const context = request.context;
  const scope = request.scope;
  return context.actorId === request.actor.id &&
    context.tenantId === scope.tenantId &&
    context.workspaceId === scope.workspaceId &&
    context.dealId === scope.dealId;
}

function matchingFacts(
  request: AuthorizationRequest,
): readonly (RoleFact | GrantFact)[] {
  const facts = [...request.roleFacts, ...request.grantFacts];
  return facts.filter((fact) => matchesFact(request, fact));
}

function matchesFact(
  request: AuthorizationRequest,
  fact: RoleFact | GrantFact,
): boolean {
  if (!sameScope(request, fact) || !fact.actions.includes(request.action)) {
    return false;
  }
  if (!fact.resourceKinds.includes(request.resource.kind)) return false;
  if (
    "resourceIds" in fact && fact.resourceIds !== undefined &&
    !fact.resourceIds.includes(request.resource.id)
  ) return false;
  if (request.actor.kind === "external" && !isExternalGrant(fact)) return false;
  if (isExternalGrant(fact) && !hasExplicitExternalScope(fact)) return false;
  if (!matchesAuthorityRequirement(request, fact)) return false;
  return hasRequiredRelationships(request, fact.relationshipRequirements);
}

function matchesAuthorityRequirement(
  request: AuthorizationRequest,
  fact: RoleFact | GrantFact,
): boolean {
  const requirement = request.authorityRequirement;
  if (requirement === undefined) return true;
  if (requirement.action !== request.action) return false;
  return requirement.snapshotReference === undefined ||
    fact.authoritySnapshotReferences?.includes(
        requirement.snapshotReference,
      ) === true;
}

function hasRequiredRelationships(
  request: AuthorizationRequest,
  required: readonly string[] | undefined,
): boolean {
  if (required === undefined || required.length === 0) return true;
  return required.every((type) =>
    request.relationshipFacts.some((fact) =>
      matchesRelationship(request, fact, type)
    )
  );
}

function matchesRelationship(
  request: AuthorizationRequest,
  fact: RelationshipFact,
  type: string,
): boolean {
  return fact.active !== false && fact.type === type &&
    sameScope(request, fact) &&
    (fact.resource === undefined ||
      (fact.resource.kind === request.resource.kind &&
        fact.resource.id === request.resource.id));
}

function sameScope(
  request: AuthorizationRequest,
  fact: { readonly scope: AuthorizationRequest["scope"] },
): boolean {
  const scope = request.scope;
  return fact.scope.tenantId === scope.tenantId &&
    fact.scope.workspaceId === scope.workspaceId &&
    fact.scope.dealId === scope.dealId;
}

function isExternalGrant(fact: RoleFact | GrantFact): boolean {
  return "access" in fact && fact.access === "external";
}

function hasExplicitExternalScope(
  fact: RoleFact | GrantFact,
): fact is GrantFact {
  return "resourceIds" in fact && fact.resourceIds !== undefined &&
    fact.resourceIds.length > 0 &&
    fact.actions.length > 0 && fact.fields.length > 0;
}

function expired(expiresAt: string | undefined, now: string): boolean {
  return expiresAt !== undefined &&
    (!isValidInstant(expiresAt) || Date.parse(expiresAt) <= Date.parse(now));
}

function requiresTemporaryConstraints(
  facts: readonly (RoleFact | GrantFact)[],
): boolean {
  return facts.some(isTemporaryOrExternal);
}

function hasTemporaryConstraints(
  request: AuthorizationRequest,
  candidates: readonly (RoleFact | GrantFact)[],
  now: string,
): boolean {
  const temporaryFacts = candidates.filter(isTemporaryOrExternal);
  return request.purpose !== undefined && request.sponsor !== undefined &&
    request.expiresAt !== undefined &&
    !expired(request.expiresAt, now) &&
    temporaryFacts.every((fact) => fact.expiresAt !== undefined);
}

function isTemporaryOrExternal(fact: RoleFact | GrantFact): fact is GrantFact {
  return "access" in fact &&
    (fact.access === "temporary" || fact.access === "external");
}

function hasWholeRestriction(request: AuthorizationRequest): boolean {
  return request.restrictionFacts.some((fact) =>
    matchesRestriction(request, fact) && fact.fields === undefined
  );
}

function approvedFields(
  request: AuthorizationRequest,
  facts: readonly (RoleFact | GrantFact)[],
): {
  readonly include: readonly FieldName[];
  readonly omit: readonly FieldName[];
  readonly redact: readonly FieldName[];
  readonly approvedClassifications: readonly {
    readonly name: FieldName;
    readonly classification: FieldClassification;
  }[];
} {
  const include = request.requestedFields.filter((requested) => {
    if (requested.classification === "unknown") return false;
    if (
      request.actor.kind === "external" &&
      !isExternalClassification(requested.classification)
    ) return false;
    if (!facts.some((fact) => fact.fields.includes(requested.name))) {
      return false;
    }
    return !request.restrictionFacts.some((restriction) =>
      matchesRestriction(request, restriction) &&
      restriction.fields?.includes(requested.name)
    );
  }).map((requested) => requested.name);
  const omit = request.requestedFields.map((requested) => requested.name)
    .filter((name) => !include.includes(name));
  return {
    include,
    omit,
    redact: [],
    approvedClassifications: request.requestedFields.filter((requested) =>
      include.includes(requested.name)
    ).map((requested) => ({
      name: requested.name,
      classification: requested.classification,
    })),
  };
}

function isExternalClassification(classification: string): boolean {
  return classification === "public" || classification === "external_shareable";
}

function matchesRestriction(
  request: AuthorizationRequest,
  fact: RestrictionFact,
): boolean {
  if (!sameScope(request, fact) || !fact.actions.includes(request.action)) {
    return false;
  }
  if (!fact.resourceKinds.includes(request.resource.kind)) return false;
  return fact.resourceIds === undefined ||
    fact.resourceIds.includes(request.resource.id);
}

function allowedActions(
  facts: readonly (RoleFact | GrantFact)[],
): readonly Action[] {
  return [...new Set(facts.flatMap((fact) => fact.actions))];
}

function earliestExpiry(
  request: AuthorizationRequest,
  facts: readonly (RoleFact | GrantFact)[],
): string | undefined {
  return [request.expiresAt, ...facts.map((fact) => fact.expiresAt)].filter((
    value,
  ): value is string => value !== undefined).sort()[0];
}

function isValidInstant(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}
