import type {
  Deal,
  DealCommandResult,
  DealFieldMaskDecision,
  DealProjection,
} from "./contracts.ts";
import {
  field,
  type FieldClassification,
  type FieldName,
} from "../platform/authz/v1.ts";
import { projectLifecycle } from "./lifecycle/projection.ts";

interface ProjectionField {
  readonly name: FieldName;
  readonly classification: FieldClassification;
}

const DEAL_FIELD: ProjectionField = {
  name: field("deal"),
  classification: "public",
};
const PARTIES_FIELD: ProjectionField = {
  name: field("parties"),
  classification: "external_shareable",
};
const ROLES_FIELD: ProjectionField = {
  name: field("roles"),
  classification: "relationship_ownership",
};
const MANDATE_FIELD: ProjectionField = {
  name: field("mandate_ceiling"),
  classification: "mandate_ceiling",
};
const CONSTRAINTS_FIELD: ProjectionField = {
  name: field("authority_constraints"),
  classification: "mandate_ceiling",
};

const SAFE_COMMAND_RESPONSE_MASK: DealFieldMaskDecision = Object.freeze({
  include: [field("deal")],
  omit: [
    field("parties"),
    field("roles"),
    field("mandate_ceiling"),
    field("authority_constraints"),
  ],
  redact: [],
  approvedClassifications: [{
    name: field("deal"),
    classification: "public" as const,
  }],
});

const SAFE_LIFECYCLE_COMMAND_MASK: DealFieldMaskDecision = Object.freeze({
  include: [field("lifecycle"), field("milestones")],
  omit: [],
  redact: [],
  approvedClassifications: [
    { name: field("lifecycle"), classification: "public" as const },
    { name: field("milestones"), classification: "public" as const },
  ],
});

export function projectDeal(
  deal: Deal,
  fields: DealFieldMaskDecision,
): DealProjection {
  const permissions = projectionPermissions(fields);
  return {
    ...(permissions.deal ? projectBaseDeal(deal) : {}),
    ...(permissions.parties ? { parties: deal.parties.map(projectParty) } : {}),
    ...(permissions.roles
      ? {
        roles: deal.roles.map((role) =>
          projectRole(role, permissions.constraints)
        ),
      }
      : {}),
    ...(permissions.mandate && deal.mandate === undefined
      ? {}
      : permissions.mandate
      ? { mandate: projectMandate(deal) }
      : {}),
    ...(permissions.constraints
      ? {
        authorityConstraints: deal.authorityConstraints.map(projectConstraint),
      }
      : {}),
  };
}

export function projectDealCommandResult(result: DealCommandResult) {
  const deal = projectDeal(result.deal, SAFE_COMMAND_RESPONSE_MASK);
  return result.lifecycle === undefined ? deal : {
    ...deal,
    lifecycle: projectLifecycle(
      result.lifecycle,
      SAFE_LIFECYCLE_COMMAND_MASK,
    ),
  };
}

function projectionPermissions(fields: DealFieldMaskDecision) {
  return {
    deal: fieldAllowed(fields, DEAL_FIELD),
    parties: fieldAllowed(fields, PARTIES_FIELD),
    roles: fieldAllowed(fields, ROLES_FIELD),
    mandate: fieldAllowed(fields, MANDATE_FIELD),
    constraints: fieldAllowed(fields, CONSTRAINTS_FIELD),
  };
}

function fieldAllowed(
  fields: DealFieldMaskDecision,
  definition: ProjectionField,
): boolean {
  return fields.include.includes(definition.name) &&
    !fields.omit.includes(definition.name) &&
    !fields.redact.includes(definition.name) &&
    fields.approvedClassifications.some((approved) =>
      approved.name === definition.name &&
      approved.classification === definition.classification
    );
}

function projectBaseDeal(deal: Deal): DealProjection {
  return {
    id: deal.id,
    version: deal.version,
    state: deal.state,
    name: deal.name,
    dealType: deal.dealType,
    confidentiality: deal.confidentiality,
    currency: deal.currency,
  };
}

function projectParty(
  party: Deal["parties"][number],
): Readonly<Record<string, unknown>> {
  return {
    id: party.id,
    reference: { kind: party.reference.kind, id: party.reference.id },
    side: party.side,
    label: party.label,
  };
}

function projectRole(
  role: Deal["roles"][number],
  includeAuthority: boolean,
): Readonly<Record<string, unknown>> {
  return {
    id: role.id,
    partyId: role.partyId,
    name: role.name,
    ...(includeAuthority ? { authorityLevel: role.authorityLevel } : {}),
  };
}

function projectMandate(deal: Deal): Readonly<Record<string, unknown>> {
  if (deal.mandate === undefined) return {};
  return {
    id: deal.mandate.id,
    transactionValueCeiling: { ...deal.mandate.transactionValueCeiling },
    authorityCeiling: deal.mandate.authorityCeiling,
  };
}

function projectConstraint(
  constraint: Deal["authorityConstraints"][number],
): Readonly<Record<string, unknown>> {
  return {
    id: constraint.id,
    ...(constraint.partyId === undefined
      ? {}
      : { partyId: constraint.partyId }),
    ...(constraint.roleId === undefined ? {} : { roleId: constraint.roleId }),
    action: constraint.action,
    ...(constraint.amountCeiling === undefined
      ? {}
      : { amountCeiling: { ...constraint.amountCeiling } }),
    authorityLevel: constraint.authorityLevel,
    humanOnly: constraint.humanOnly,
  };
}
