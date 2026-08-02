import type {
  DealCommandContext,
  DealCommandResult,
  DealConfidentiality,
  DealPartyReference,
  DealPartyReferenceKind,
  DealPartySide,
  DealRoleName,
  Money,
} from "./contracts.ts";
import {
  assertDealConfidentiality,
  assertDealPartySide,
  assertDealRoleName,
} from "./errors.ts";
import {
  authorityConstraintId,
  dealId,
  dealPartyId,
  dealRoleId,
  mandateId,
} from "./ids.ts";
import type { DealManagementService } from "./service.ts";
import {
  optionalString,
  readBody,
  RequestInputError,
  requiredBoolean,
  requiredIdempotency,
  requiredIfMatch,
  requiredNumber,
  requiredString,
} from "./http_shared.ts";

export async function executeDealCommand(input: {
  readonly request: Request;
  readonly segments: readonly string[];
  readonly context: DealCommandContext;
  readonly service: DealManagementService;
}): Promise<DealCommandResult> {
  const body = await readBody(input.request);
  const idempotencyKey = requiredIdempotency(input.request);
  if (input.segments.length === 1) {
    return input.service.createDeal({
      type: "create_deal",
      context: input.context,
      idempotencyKey,
      name: requiredString(body, "name"),
      dealType: requiredString(body, "dealType"),
      confidentiality: requiredConfidentiality(body, "confidentiality"),
      currency: requiredString(body, "currency"),
    });
  }
  const deal = parseDeal(input.segments[1]);
  const expectedVersion = requiredIfMatch(input.request);
  const command = input.segments[2];
  if (command === "configure" && input.segments.length === 3) {
    return input.service.configureDeal({
      type: "configure_deal",
      context: input.context,
      idempotencyKey,
      dealId: deal,
      expectedVersion,
      name: optionalString(body, "name"),
      dealType: optionalString(body, "dealType"),
      confidentiality: optionalConfidentiality(body),
    });
  }
  if (command === "parties" && input.segments.length === 3) {
    return input.service.addDealParty({
      type: "add_deal_party",
      context: input.context,
      idempotencyKey,
      dealId: deal,
      expectedVersion,
      partyId: optionalPartyId(body),
      reference: parseReference(body),
      side: requiredPartySide(body),
      label: requiredString(body, "label"),
    });
  }
  if (command === "roles" && input.segments.length === 3) {
    return input.service.assignDealRole({
      type: "assign_deal_role",
      context: input.context,
      idempotencyKey,
      dealId: deal,
      expectedVersion,
      roleId: optionalRoleId(body),
      partyId: dealPartyId(requiredString(body, "partyId")),
      name: requiredRoleName(body),
      authorityLevel: requiredNumber(body, "authorityLevel"),
    });
  }
  if (command === "mandate" && input.segments.length === 3) {
    return input.service.setMandate({
      type: "set_mandate",
      context: input.context,
      idempotencyKey,
      dealId: deal,
      expectedVersion,
      mandateId: optionalMandateId(body),
      transactionValueCeiling: requiredMoney(body, "transactionValueCeiling"),
      authorityCeiling: requiredNumber(body, "authorityCeiling"),
    });
  }
  if (command === "authority-constraints" && input.segments.length === 3) {
    return input.service.setAuthorityConstraint({
      type: "set_authority_constraint",
      context: input.context,
      idempotencyKey,
      dealId: deal,
      expectedVersion,
      constraintId: optionalConstraintId(body),
      partyId: optionalPartyId(body),
      roleId: optionalRoleId(body),
      action: requiredString(body, "action"),
      amountCeiling: optionalMoney(body, "amountCeiling"),
      authorityLevel: requiredNumber(body, "authorityLevel"),
      humanOnly: requiredBoolean(body, "humanOnly"),
    });
  }
  throw new RequestInputError(
    "Deal command route is not supported; expected a semantic configuration command.",
  );
}

function parseDeal(value: string | undefined) {
  if (value === undefined) {
    throw new RequestInputError("dealId is required in the route.");
  }
  try {
    return dealId(value);
  } catch {
    throw new RequestInputError(
      `dealId "${value}" is invalid; expected a canonical Deal identifier.`,
    );
  }
}

function parseReference(body: Record<string, unknown>) {
  const value = body.reference;
  if (
    !isRecord(value) || typeof value.kind !== "string" ||
    typeof value.id !== "string"
  ) {
    throw new RequestInputError("reference must contain kind and id strings.");
  }
  if (!REFERENCE_KINDS.includes(value.kind as DealPartyReferenceKind)) {
    throw new RequestInputError(
      `reference kind "${value.kind}" is invalid; expected a supported stable reference kind.`,
    );
  }
  return {
    kind: value.kind as DealPartyReferenceKind,
    id: value.id,
  } satisfies DealPartyReference;
}

function requiredConfidentiality(
  body: Record<string, unknown>,
  fieldName: string,
): DealConfidentiality {
  const value = requiredString(body, fieldName);
  assertDealConfidentiality(value);
  return value;
}

function optionalConfidentiality(
  body: Record<string, unknown>,
): DealConfidentiality | undefined {
  const value = optionalString(body, "confidentiality");
  if (value === undefined) return undefined;
  assertDealConfidentiality(value);
  return value;
}

function requiredPartySide(body: Record<string, unknown>): DealPartySide {
  const value = requiredString(body, "side");
  assertDealPartySide(value);
  return value;
}

function requiredRoleName(body: Record<string, unknown>): DealRoleName {
  const value = requiredString(body, "name");
  assertDealRoleName(value);
  return value;
}

function requiredMoney(
  body: Record<string, unknown>,
  fieldName: string,
): Money {
  const value = body[fieldName];
  if (
    !isRecord(value) || typeof value.currency !== "string" ||
    typeof value.amount !== "number"
  ) {
    throw new RequestInputError(
      `${fieldName} must contain numeric amount and currency string.`,
    );
  }
  return { amount: value.amount, currency: value.currency };
}

function optionalMoney(
  body: Record<string, unknown>,
  fieldName: string,
): Money | undefined {
  return body[fieldName] === undefined
    ? undefined
    : requiredMoney(body, fieldName);
}

function optionalPartyId(body: Record<string, unknown>) {
  const value = optionalString(body, "partyId");
  return value === undefined ? undefined : dealPartyId(value);
}

function optionalRoleId(body: Record<string, unknown>) {
  const value = optionalString(body, "roleId");
  return value === undefined ? undefined : dealRoleId(value);
}

function optionalMandateId(body: Record<string, unknown>) {
  const value = optionalString(body, "mandateId");
  return value === undefined ? undefined : mandateId(value);
}

function optionalConstraintId(body: Record<string, unknown>) {
  const value = optionalString(body, "constraintId");
  return value === undefined ? undefined : authorityConstraintId(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const REFERENCE_KINDS: readonly DealPartyReferenceKind[] = [
  "organization",
  "legal_entity",
  "person",
  "user_identity",
];
