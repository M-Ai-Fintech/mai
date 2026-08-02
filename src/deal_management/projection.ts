import type {
  Deal,
  DealFieldMaskDecision,
  DealProjection,
} from "./contracts.ts";

export function projectDeal(
  deal: Deal,
  fields: DealFieldMaskDecision,
): DealProjection {
  const includeMandate = fieldAllowed(fields, "mandate_ceiling");
  const includeConstraints = fieldAllowed(fields, "authority_constraints");
  return {
    id: deal.id,
    version: deal.version,
    state: deal.state,
    name: deal.name,
    dealType: deal.dealType,
    confidentiality: deal.confidentiality,
    currency: deal.currency,
    parties: deal.parties.map(projectParty),
    roles: deal.roles.map((role) => projectRole(role, includeConstraints)),
    ...(includeMandate && deal.mandate === undefined
      ? {}
      : includeMandate
      ? { mandate: projectMandate(deal) }
      : {}),
    authorityConstraints: includeConstraints
      ? deal.authorityConstraints.map(projectConstraint)
      : [],
  };
}

function fieldAllowed(fields: DealFieldMaskDecision, name: string): boolean {
  return fields.include.includes(name) && !fields.omit.includes(name);
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
