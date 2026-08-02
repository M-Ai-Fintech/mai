import {
  createProtectedNotFoundError,
  type ErrorEnvelope,
} from "../platform/api/v1.ts";
import type {
  AuthorityConstraint,
  Deal,
  DealAuthorizationPort,
  DealCommandContext,
  DealConfidentiality,
  DealParty,
  DealPartyReference,
  DealPartySide,
  DealProjection,
  DealRole,
  DealRoleName,
  Mandate,
  Money,
  StoredDealRow,
} from "./contracts.ts";
import {
  allowedDealFields,
  dealScope,
  freezeStoredDeal,
  requestedDealFields,
} from "./contracts.ts";
import { projectDeal } from "./projection.ts";
import type { DealRepository } from "./repository.ts";
import { DEAL_ACTION, DEAL_RESOURCE } from "./service.ts";
import {
  parseAggregateVersion,
  type ParseResult,
  parseTenantId,
  parseWorkspaceId,
} from "../platform/api/v1.ts";
import {
  parseLegalEntityId,
  parseOrganizationId,
  parsePersonId,
} from "../organization_registry/v1.ts";
import { userIdentityId } from "../identity_access/v1.ts";
import {
  authorityConstraintId,
  dealPartyId,
  dealRoleId,
  mandateId,
  parseDealId,
} from "./ids.ts";
import { DealInvariantError } from "./errors.ts";

export type DealReadResult =
  | {
    readonly kind: "loaded";
    readonly value: DealProjection;
  }
  | {
    readonly kind: "protected_not_found";
    readonly response: ErrorEnvelope;
  };

export async function readDealProjection(input: {
  readonly context: DealCommandContext;
  readonly dealId: Deal["id"];
  readonly repository: DealRepository;
  readonly authorization: DealAuthorizationPort;
}): Promise<DealReadResult> {
  const scope = dealScope(input.context);
  const decision = await input.authorization.authorize({
    context: input.context,
    scope,
    resource: { kind: DEAL_RESOURCE, id: input.dealId },
    action: DEAL_ACTION.read,
    requestedFields: requestedDealFields(),
  });
  if (decision.outcome === "deny") return protectedNotFound(input.context);
  const deal = await input.repository.find(scope, input.dealId);
  if (deal === undefined) return protectedNotFound(input.context);
  return {
    kind: "loaded",
    value: projectDeal(deal, allowedDealFields(decision)),
  };
}

function protectedNotFound(context: DealCommandContext): DealReadResult {
  return {
    kind: "protected_not_found",
    response: createProtectedNotFoundError(context.request.correlationId),
  };
}

export function parseStoredDeal(value: unknown): Deal {
  const document = objectValue(value, "Deal document");
  if (document.aggregateType !== "deal") bad("aggregateType", value, '"deal"');
  const currency = textValue(document.currency, "Deal currency", 3, 3);
  if (!/^[A-Z]{3}$/.test(currency)) {
    bad("Deal currency", currency, "an uppercase 3-letter currency");
  }
  const deal = {
    aggregateType: "deal" as const,
    id: identifier(document.id, parseDealId, "Deal ID"),
    tenantId: identifier(document.tenantId, parseTenantId, "tenant ID"),
    workspaceId: identifier(
      document.workspaceId,
      parseWorkspaceId,
      "workspace ID",
    ),
    version: versionValue(document.version),
    state: stateValue(document.state),
    name: textValue(document.name, "Deal name", 1, 200),
    dealType: textValue(document.dealType, "Deal type", 1, 64),
    confidentiality: choice<DealConfidentiality>(
      document.confidentiality,
      "Deal confidentiality",
      ["standard", "sensitive", "highly_sensitive"],
    ),
    currency,
    parties: partyValues(document.parties),
    roles: roleValues(document.roles),
    ...(document.mandate === undefined
      ? {}
      : { mandate: mandateValue(document.mandate, currency) }),
    authorityConstraints: constraintValues(
      document.authorityConstraints,
      currency,
    ),
    createdAt: instant(document.createdAt, "Deal creation time"),
    updatedAt: instant(document.updatedAt, "Deal update time"),
  } satisfies Deal;
  validateReferences(deal);
  return deal;
}

function partyValues(value: unknown): readonly DealParty[] {
  return arrayValue(value, "Deal parties").map((item) => {
    const party = objectValue(item, "Deal party");
    return {
      id: prefixedIdentifier(party.id, dealPartyId, "Deal party ID"),
      reference: referenceValue(party.reference),
      side: choice<DealPartySide>(party.side, "Deal party side", [
        "acquirer",
        "target",
        "seller",
        "buyer",
        "advisor",
        "other",
      ]),
      label: textValue(party.label, "Deal party label", 1, 200),
    };
  });
}

function roleValues(value: unknown): readonly DealRole[] {
  return arrayValue(value, "Deal roles").map((item) => {
    const role = objectValue(item, "Deal role");
    return {
      id: prefixedIdentifier(role.id, dealRoleId, "Deal role ID"),
      partyId: prefixedIdentifier(
        role.partyId,
        dealPartyId,
        "Deal role party ID",
      ),
      name: choice<DealRoleName>(role.name, "Deal role name", [
        "acquirer",
        "target",
        "seller",
        "buyer",
        "advisor",
        "counsel",
        "lender",
        "other",
      ]),
      authorityLevel: authority(role.authorityLevel, "Deal role"),
    };
  });
}

function mandateValue(value: unknown, currency: string): Mandate {
  const mandate = objectValue(value, "Deal mandate");
  return {
    id: prefixedIdentifier(mandate.id, mandateId, "Mandate ID"),
    transactionValueCeiling: money(
      mandate.transactionValueCeiling,
      currency,
      "mandate transaction ceiling",
    ),
    authorityCeiling: authority(mandate.authorityCeiling, "Mandate"),
  };
}

function constraintValues(
  value: unknown,
  currency: string,
): readonly AuthorityConstraint[] {
  return arrayValue(value, "Deal authority constraints").map((item) => {
    const constraint = objectValue(item, "Authority constraint");
    const partyId = optionalPrefixed(
      constraint.partyId,
      dealPartyId,
      "constraint party ID",
    );
    const roleId = optionalPrefixed(
      constraint.roleId,
      dealRoleId,
      "constraint role ID",
    );
    if (partyId === undefined && roleId === undefined) {
      bad("constraint target", item, "partyId or roleId");
    }
    return {
      id: prefixedIdentifier(
        constraint.id,
        authorityConstraintId,
        "Authority constraint ID",
      ),
      ...(partyId === undefined ? {} : { partyId }),
      ...(roleId === undefined ? {} : { roleId }),
      action: textValue(
        constraint.action,
        "Authority constraint action",
        1,
        64,
      ),
      ...(constraint.amountCeiling === undefined ? {} : {
        amountCeiling: money(
          constraint.amountCeiling,
          currency,
          "authority amount ceiling",
        ),
      }),
      authorityLevel: authority(
        constraint.authorityLevel,
        "Authority constraint",
      ),
      humanOnly: booleanValue(constraint.humanOnly, "humanOnly"),
    };
  });
}

function referenceValue(value: unknown): DealPartyReference {
  const reference = objectValue(value, "Deal party reference");
  if (typeof reference.kind !== "string" || typeof reference.id !== "string") {
    bad("Deal party reference", value, "kind and id strings");
  }
  const valid = reference.kind === "organization"
    ? parseOrganizationId(reference.id).ok
    : reference.kind === "legal_entity"
    ? parseLegalEntityId(reference.id).ok
    : reference.kind === "person"
    ? parsePersonId(reference.id).ok
    : reference.kind === "user_identity"
    ? validIdentity(reference.id)
    : false;
  if (!valid) {
    bad("Deal party reference", value, "a stable upstream identifier");
  }
  return {
    kind: reference.kind as DealPartyReference["kind"],
    id: reference.id,
  };
}

function validateReferences(deal: Deal): void {
  unique(deal.parties.map((party) => party.id), "Deal party ID");
  unique(deal.roles.map((role) => role.id), "Deal role ID");
  unique(
    deal.authorityConstraints.map((constraint) => constraint.id),
    "Authority constraint ID",
  );
  unique(
    deal.parties.map((party) =>
      `${party.reference.kind}:${party.reference.id}`
    ),
    "Deal party reference",
  );
  for (const role of deal.roles) {
    if (!deal.parties.some((party) => party.id === role.partyId)) {
      bad("Deal role party ID", role.partyId, "an owned party");
    }
    if (
      deal.mandate === undefined ||
      role.authorityLevel > deal.mandate.authorityCeiling
    ) {
      bad(
        "Deal role authority",
        role.authorityLevel,
        "the mandate authority ceiling",
      );
    }
  }
  for (const constraint of deal.authorityConstraints) {
    if (
      constraint.partyId !== undefined &&
      !deal.parties.some((party) => party.id === constraint.partyId)
    ) {
      bad(
        "Authority constraint party ID",
        constraint.partyId,
        "an owned party",
      );
    }
    const role = constraint.roleId === undefined
      ? undefined
      : deal.roles.find((candidate) => candidate.id === constraint.roleId);
    if (constraint.roleId !== undefined && role === undefined) {
      bad("Authority constraint role ID", constraint.roleId, "an owned role");
    }
    if (
      role !== undefined && constraint.partyId !== undefined &&
      role.partyId !== constraint.partyId
    ) {
      bad(
        "Authority constraint target",
        constraint,
        "matching party and role ownership",
      );
    }
    if (
      deal.mandate === undefined ||
      constraint.authorityLevel > deal.mandate.authorityCeiling
    ) {
      bad(
        "Authority constraint authority",
        constraint.authorityLevel,
        "the mandate authority ceiling",
      );
    }
    if (
      constraint.amountCeiling !== undefined && deal.mandate !== undefined &&
      constraint.amountCeiling.amount >
        deal.mandate.transactionValueCeiling.amount
    ) {
      bad(
        "Authority constraint amount",
        constraint.amountCeiling,
        "the mandate transaction ceiling",
      );
    }
  }
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  const parsed = typeof value === "string" ? parseJson(value, label) : value;
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  bad(label, value, "an object");
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    bad(label, value, "valid JSON object");
  }
}

function arrayValue(value: unknown, label: string): unknown[] {
  if (Array.isArray(value)) return value;
  bad(label, value, "an array");
}

function identifier<T>(
  value: unknown,
  parser: (value: unknown) => ParseResult<T>,
  label: string,
): T {
  const parsed = parser(value);
  if (parsed.ok) return parsed.value;
  bad(label, value, "a canonical identifier");
}

function prefixedIdentifier<T>(
  value: unknown,
  parser: (value: string) => T,
  label: string,
): T {
  if (typeof value !== "string") bad(label, value, "a canonical identifier");
  try {
    return parser(value);
  } catch {
    bad(label, value, "a canonical identifier");
  }
}

function optionalPrefixed<T>(
  value: unknown,
  parser: (value: string) => T,
  label: string,
): T | undefined {
  return value === undefined
    ? undefined
    : prefixedIdentifier(value, parser, label);
}

function versionValue(value: unknown): Deal["version"] {
  const parsed = parseAggregateVersion(value);
  if (parsed.ok) return parsed.value;
  bad("Deal version", value, "a positive safe integer");
}

function stateValue(value: unknown): Deal["state"] {
  if (value === "draft") return value;
  bad("Deal state", value, '"draft"');
}

function choice<T extends string>(
  value: unknown,
  label: string,
  choices: readonly T[],
): T {
  if (typeof value === "string" && choices.includes(value as T)) {
    return value as T;
  }
  bad(label, value, choices.join(", "));
}

function textValue(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): string {
  if (
    typeof value === "string" && value.trim().length >= minimum &&
    value.length <= maximum
  ) return value;
  bad(label, value, `${minimum}-${maximum} characters`);
}

function money(value: unknown, currency: string, label: string): Money {
  const amount = objectValue(value, label);
  if (
    amount.currency !== currency || typeof amount.amount !== "number" ||
    !Number.isFinite(amount.amount) || amount.amount < 0
  ) bad(label, value, `a non-negative amount in ${currency}`);
  return { amount: amount.amount, currency };
}

function authority(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value;
  }
  bad(`${label} authority`, value, "a positive safe integer");
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value === "boolean") return value;
  bad(label, value, "a boolean");
}

function instant(value: unknown, label: string): string {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return value;
  }
  bad(label, value, "an ISO timestamp");
}

function validIdentity(value: string): boolean {
  try {
    userIdentityId(value);
    return true;
  } catch {
    return false;
  }
}

function unique(values: readonly string[], label: string): void {
  if (new Set(values).size === values.length) return;
  bad(label, values, "unique values");
}

function bad(label: string, value: unknown, expected: string): never {
  throw new DealInvariantError(
    `Stored ${label} value "${
      String(value)
    }" is invalid; expected ${expected}.`,
  );
}

export function readStoredDeal(row: StoredDealRow): Deal {
  const deal = freezeStoredDeal(parseStoredDeal(row.document));
  const rowVersion = Number(row.version);
  if (
    deal.id === row.dealId && deal.tenantId === row.tenantId &&
    deal.workspaceId === row.workspaceId && deal.version === rowVersion &&
    deal.state === row.state
  ) return deal;
  throw new DealInvariantError(
    `Stored Deal "${row.dealId}" does not match its relational identity; expected document and indexed columns to agree.`,
  );
}
