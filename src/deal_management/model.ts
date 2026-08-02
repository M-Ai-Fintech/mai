import type {
  AuthorityConstraint,
  Deal,
  DealParty,
  DealPartyReference,
  DealRole,
  Mandate,
  Money,
} from "./contracts.ts";
import {
  assertDealConfidentiality,
  assertDealPartySide,
  assertDealRoleName,
  DealInvariantError,
  DealVersionConflictError,
} from "./errors.ts";
import type {
  AuthorityConstraintId,
  DealId,
  DealPartyId,
  DealRoleId,
  MandateId,
} from "./ids.ts";
import {
  parseLegalEntityId,
  parseOrganizationId,
  parsePersonId,
} from "../organization_registry/v1.ts";
import { userIdentityId } from "../identity_access/v1.ts";
import type {
  AggregateVersion,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";

export interface CreateDealInput {
  readonly id: DealId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly name: string;
  readonly dealType: string;
  readonly confidentiality: Deal["confidentiality"];
  readonly currency: string;
  readonly now: string;
}

export interface ConfigureDealInput {
  readonly expectedVersion: AggregateVersion | number;
  readonly name?: string;
  readonly dealType?: string;
  readonly confidentiality?: Deal["confidentiality"];
  readonly now: string;
}

export interface AddDealPartyInput {
  readonly expectedVersion: AggregateVersion | number;
  readonly id: DealPartyId;
  readonly reference: DealPartyReference;
  readonly side: DealParty["side"];
  readonly label: string;
  readonly now: string;
}

export interface AssignDealRoleInput {
  readonly expectedVersion: AggregateVersion | number;
  readonly id: DealRoleId;
  readonly partyId: DealPartyId;
  readonly name: DealRole["name"];
  readonly authorityLevel: number;
  readonly now: string;
}

export interface SetMandateInput {
  readonly expectedVersion: AggregateVersion | number;
  readonly id: MandateId;
  readonly transactionValueCeiling: Money;
  readonly authorityCeiling: number;
  readonly now: string;
}

export interface SetAuthorityConstraintInput {
  readonly expectedVersion: AggregateVersion | number;
  readonly id: AuthorityConstraintId;
  readonly partyId?: DealPartyId;
  readonly roleId?: DealRoleId;
  readonly action: string;
  readonly amountCeiling?: Money;
  readonly authorityLevel: number;
  readonly humanOnly: boolean;
  readonly now: string;
}

export function createDeal(input: CreateDealInput): Deal {
  assertText(input.name, "Deal name", 200);
  assertText(input.dealType, "Deal type", 64);
  assertDealConfidentiality(input.confidentiality);
  assertCurrency(input.currency);
  assertInstant(input.now, "Deal creation time");
  return freezeDeal({
    aggregateType: "deal",
    id: input.id,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    version: 1 as AggregateVersion,
    state: "draft",
    name: input.name.trim(),
    dealType: input.dealType.trim(),
    confidentiality: input.confidentiality,
    currency: input.currency,
    parties: [],
    roles: [],
    authorityConstraints: [],
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function configureDeal(deal: Deal, input: ConfigureDealInput): Deal {
  assertVersion(deal, input.expectedVersion);
  assertInstant(input.now, "Deal configuration time");
  if (input.name !== undefined) assertText(input.name, "Deal name", 200);
  if (input.dealType !== undefined) assertText(input.dealType, "Deal type", 64);
  if (input.confidentiality !== undefined) {
    assertDealConfidentiality(input.confidentiality);
  }
  return advance(deal, input.now, {
    ...(input.name === undefined ? {} : { name: input.name.trim() }),
    ...(input.dealType === undefined
      ? {}
      : { dealType: input.dealType.trim() }),
    ...(input.confidentiality === undefined
      ? {}
      : { confidentiality: input.confidentiality }),
  });
}

export function addDealParty(deal: Deal, input: AddDealPartyInput): Deal {
  assertVersion(deal, input.expectedVersion);
  assertReference(input.reference);
  assertDealPartySide(input.side);
  assertText(input.label, "Deal party label", 200);
  assertUniquePartyId(deal, input.id);
  if (
    deal.parties.some((party) =>
      sameReference(party.reference, input.reference)
    )
  ) {
    throw new DealInvariantError(
      `Deal party reference "${input.reference.id}" already exists; expected one reference per Deal.`,
    );
  }
  const party: DealParty = {
    id: input.id,
    reference: Object.freeze({ ...input.reference }),
    side: input.side,
    label: input.label.trim(),
  };
  return advance(deal, input.now, { parties: [...deal.parties, party] });
}

export function assignDealRole(deal: Deal, input: AssignDealRoleInput): Deal {
  assertVersion(deal, input.expectedVersion);
  assertText(input.name, "Deal role name", 64);
  assertDealRoleName(input.name);
  assertAuthorityLevel(input.authorityLevel);
  requireParty(deal, input.partyId);
  assertUniqueRoleId(deal, input.id);
  if (
    deal.roles.some((role) =>
      role.partyId === input.partyId && role.name === input.name
    )
  ) {
    throw new DealInvariantError(
      `Deal role "${input.name}" for party "${input.partyId}" already exists; expected a unique party role.`,
    );
  }
  assertMandateAuthority(deal.mandate, input.authorityLevel, "Deal role");
  const role: DealRole = {
    id: input.id,
    partyId: input.partyId,
    name: input.name,
    authorityLevel: input.authorityLevel,
  };
  return advance(deal, input.now, { roles: [...deal.roles, role] });
}

export function setMandate(deal: Deal, input: SetMandateInput): Deal {
  assertVersion(deal, input.expectedVersion);
  assertMoney(
    input.transactionValueCeiling,
    deal.currency,
    "mandate transaction ceiling",
  );
  assertAuthorityLevel(input.authorityCeiling);
  const mandate: Mandate = {
    id: input.id,
    transactionValueCeiling: freezeMoney(input.transactionValueCeiling),
    authorityCeiling: input.authorityCeiling,
  };
  assertExistingConstraints(deal, mandate);
  return advance(deal, input.now, { mandate });
}

export function setAuthorityConstraint(
  deal: Deal,
  input: SetAuthorityConstraintInput,
): Deal {
  assertVersion(deal, input.expectedVersion);
  if (input.partyId === undefined && input.roleId === undefined) {
    throw new DealInvariantError(
      `Authority constraint "${input.id}" has no party or role target; expected one target.`,
    );
  }
  if (typeof input.humanOnly !== "boolean") {
    throw new DealInvariantError(
      `Authority constraint "${input.id}" humanOnly value "${
        String(input.humanOnly)
      }" is invalid; expected a boolean.`,
    );
  }
  if (input.partyId !== undefined) requireParty(deal, input.partyId);
  if (input.roleId !== undefined) {
    const role = requireRole(deal, input.roleId);
    if (input.partyId !== undefined && role.partyId !== input.partyId) {
      throw new DealInvariantError(
        `Authority constraint "${input.id}" role "${input.roleId}" belongs to party "${role.partyId}"; expected party "${input.partyId}".`,
      );
    }
  }
  const action = input.action.trim();
  assertText(action, "Authority constraint action", 64);
  assertAuthorityLevel(input.authorityLevel);
  assertUniqueConstraintId(deal, input.id);
  assertMandateAuthority(
    deal.mandate,
    input.authorityLevel,
    "Authority constraint",
  );
  if (input.amountCeiling !== undefined) {
    assertMoney(input.amountCeiling, deal.currency, "authority amount ceiling");
    assertMandateMoney(
      deal.mandate,
      input.amountCeiling,
      "authority amount ceiling",
    );
  }
  const duplicate = deal.authorityConstraints.some((constraint) =>
    constraint.action === action &&
    constraint.partyId === input.partyId && constraint.roleId === input.roleId
  );
  if (duplicate) {
    throw new DealInvariantError(
      `Authority constraint action "${input.action}" already exists for the requested target; expected one constraint per action and target.`,
    );
  }
  const constraint: AuthorityConstraint = {
    id: input.id,
    ...(input.partyId === undefined ? {} : { partyId: input.partyId }),
    ...(input.roleId === undefined ? {} : { roleId: input.roleId }),
    action,
    ...(input.amountCeiling === undefined
      ? {}
      : { amountCeiling: freezeMoney(input.amountCeiling) }),
    authorityLevel: input.authorityLevel,
    humanOnly: input.humanOnly,
  };
  return advance(deal, input.now, {
    authorityConstraints: [...deal.authorityConstraints, constraint],
  });
}

function assertExistingConstraints(deal: Deal, mandate: Mandate): void {
  for (const constraint of deal.authorityConstraints) {
    assertMandateAuthority(
      mandate,
      constraint.authorityLevel,
      "existing authority constraint",
    );
    if (constraint.amountCeiling !== undefined) {
      assertMandateMoney(
        mandate,
        constraint.amountCeiling,
        "existing authority amount ceiling",
      );
    }
  }
  for (const role of deal.roles) {
    assertMandateAuthority(mandate, role.authorityLevel, "existing Deal role");
  }
}

function assertReference(reference: DealPartyReference): void {
  const valid = reference.kind === "organization"
    ? parseOrganizationId(reference.id).ok
    : reference.kind === "legal_entity"
    ? parseLegalEntityId(reference.id).ok
    : reference.kind === "person"
    ? parsePersonId(reference.id).ok
    : reference.kind === "user_identity"
    ? validUserIdentityId(reference.id)
    : false;
  if (valid) return;
  throw new DealInvariantError(
    `Deal party ${reference.kind} reference "${reference.id}" is invalid; expected a stable upstream identifier.`,
  );
}

function assertUniquePartyId(deal: Deal, id: DealPartyId): void {
  if (deal.parties.some((party) => party.id === id)) {
    throw new DealInvariantError(
      `Deal party ID "${id}" already exists; expected a unique owned party identifier.`,
    );
  }
}

function assertUniqueRoleId(deal: Deal, id: DealRoleId): void {
  if (deal.roles.some((role) => role.id === id)) {
    throw new DealInvariantError(
      `Deal role ID "${id}" already exists; expected a unique owned role identifier.`,
    );
  }
}

function assertUniqueConstraintId(
  deal: Deal,
  id: AuthorityConstraintId,
): void {
  if (deal.authorityConstraints.some((constraint) => constraint.id === id)) {
    throw new DealInvariantError(
      `Authority constraint ID "${id}" already exists; expected a unique owned constraint identifier.`,
    );
  }
}

function sameReference(
  left: DealPartyReference,
  right: DealPartyReference,
): boolean {
  return left.kind === right.kind && left.id === right.id;
}

function validUserIdentityId(value: string): boolean {
  try {
    userIdentityId(value);
    return true;
  } catch {
    return false;
  }
}

function requireParty(deal: Deal, id: DealPartyId): DealParty {
  const party = deal.parties.find((candidate) => candidate.id === id);
  if (party !== undefined) return party;
  throw new DealInvariantError(
    `Deal party "${id}" is not owned by deal "${deal.id}"; expected an existing party.`,
  );
}

function requireRole(deal: Deal, id: DealRoleId): DealRole {
  const role = deal.roles.find((candidate) => candidate.id === id);
  if (role !== undefined) return role;
  throw new DealInvariantError(
    `Deal role "${id}" is not owned by deal "${deal.id}"; expected an existing role.`,
  );
}

function assertVersion(deal: Deal, expected: AggregateVersion | number): void {
  if (deal.version === expected) return;
  throw new DealVersionConflictError(deal.id, expected, deal.version);
}

function advance(deal: Deal, now: string, changes: Partial<Deal>): Deal {
  assertInstant(now, "Deal update time");
  return freezeDeal({
    ...deal,
    ...changes,
    version: (deal.version + 1) as AggregateVersion,
    updatedAt: now,
  });
}

function assertMoney(money: Money, currency: string, label: string): void {
  if (
    Number.isFinite(money.amount) && money.amount >= 0 &&
    /^[A-Z]{3}$/.test(money.currency) && money.currency === currency
  ) return;
  throw new DealInvariantError(
    `${label} "${
      JSON.stringify(money)
    }" is invalid; expected a non-negative amount in Deal currency "${currency}".`,
  );
}

function assertMandateMoney(
  mandate: Mandate | undefined,
  money: Money,
  label: string,
): void {
  if (
    mandate !== undefined &&
    money.amount <= mandate.transactionValueCeiling.amount
  ) return;
  throw new DealInvariantError(
    `${label} "${money.amount}" exceeds mandate transaction ceiling; expected a value at or below the configured ceiling.`,
  );
}

function assertMandateAuthority(
  mandate: Mandate | undefined,
  level: number,
  label: string,
): void {
  if (mandate !== undefined && level <= mandate.authorityCeiling) return;
  throw new DealInvariantError(
    `${label} authority level "${level}" exceeds the mandate authority ceiling; expected a configured in-range level.`,
  );
}

function assertAuthorityLevel(level: number): void {
  if (Number.isSafeInteger(level) && level > 0) return;
  throw new DealInvariantError(
    `Authority level "${level}" is invalid; expected a positive safe integer.`,
  );
}

function assertCurrency(currency: string): void {
  if (/^[A-Z]{3}$/.test(currency)) return;
  throw new DealInvariantError(
    `Deal currency "${currency}" is invalid; expected an uppercase ISO-like 3-letter code.`,
  );
}

function assertText(value: string, label: string, maximum: number): void {
  if (value.trim().length > 0 && value.length <= maximum) return;
  throw new DealInvariantError(
    `${label} "${value}" is invalid; expected 1-${maximum} characters.`,
  );
}

function assertInstant(value: string, label: string): void {
  if (Number.isFinite(Date.parse(value))) return;
  throw new DealInvariantError(
    `${label} "${value}" is invalid; expected an ISO timestamp.`,
  );
}

function freezeMoney(money: Money): Money {
  return Object.freeze({ ...money });
}

export function freezeDeal(deal: Deal): Deal {
  return Object.freeze({
    ...deal,
    parties: Object.freeze(
      deal.parties.map((party) =>
        Object.freeze({
          ...party,
          reference: Object.freeze({ ...party.reference }),
        })
      ),
    ),
    roles: Object.freeze(deal.roles.map((role) => Object.freeze({ ...role }))),
    ...(deal.mandate === undefined ? {} : {
      mandate: Object.freeze({
        ...deal.mandate,
        transactionValueCeiling: freezeMoney(
          deal.mandate.transactionValueCeiling,
        ),
      }),
    }),
    authorityConstraints: Object.freeze(
      deal.authorityConstraints.map((constraint) =>
        Object.freeze({
          ...constraint,
          ...(constraint.amountCeiling === undefined
            ? {}
            : { amountCeiling: freezeMoney(constraint.amountCeiling) }),
        })
      ),
    ),
  });
}
