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
import type { IdempotencyKey } from "../platform/api/v1.ts";
import {
  assertDealConfidentiality,
  assertDealPartySide,
  assertDealRoleName,
} from "./errors.ts";
import {
  authorityConstraintId,
  dealPartyId,
  dealRoleId,
  mandateId,
} from "./ids.ts";
import { parseDealRouteId } from "./route_identifiers.ts";
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

/**
 * Translates one semantic Deal command route into the existing service API.
 *
 * @example await executeDealCommand({ request, segments, context, service })
 */
export async function executeDealCommand(input: {
  readonly request: Request;
  readonly segments: readonly string[];
  readonly context: DealCommandContext;
  readonly service: DealManagementService;
}): Promise<DealCommandResult> {
  const body = await readBody(input.request);
  const idempotencyKey = requiredIdempotency(input.request);
  if (input.segments.length === 1) {
    return createCommand(input, body, idempotencyKey);
  }
  const deal = parseDealRouteId(input.segments[1]);
  const expectedVersion = requiredIfMatch(input.request);
  return mutationCommand({
    body,
    context: input.context,
    deal,
    expectedVersion,
    command: input.segments[2],
    idempotencyKey,
    service: input.service,
    segments: input.segments,
  });
}

interface MutationCommandInput {
  readonly body: Record<string, unknown>;
  readonly context: DealCommandContext;
  readonly deal: ReturnType<typeof parseDealRouteId>;
  readonly expectedVersion: number;
  readonly command: string | undefined;
  readonly idempotencyKey: IdempotencyKey;
  readonly service: DealManagementService;
  readonly segments: readonly string[];
}

function createCommand(
  input: {
    readonly context: DealCommandContext;
    readonly service: DealManagementService;
  },
  body: Record<string, unknown>,
  idempotencyKey: IdempotencyKey,
): Promise<DealCommandResult> {
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

function mutationCommand(
  input: MutationCommandInput,
): Promise<DealCommandResult> {
  const commands = {
    configure: configureCommand,
    parties: partyCommand,
    roles: roleCommand,
    mandate: mandateCommand,
    "authority-constraints": constraintCommand,
  } as const;
  const command = input.command === undefined
    ? undefined
    : commands[input.command as keyof typeof commands];
  if (command !== undefined && input.segments.length === 3) {
    return command(input);
  }
  throw new RequestInputError(
    `Deal command route "${
      input.command ?? "undefined"
    }" is not supported; expected a semantic configuration command with one route segment.`,
  );
}

function configureCommand(
  input: MutationCommandInput,
): Promise<DealCommandResult> {
  return input.service.configureDeal({
    type: "configure_deal",
    context: input.context,
    idempotencyKey: input.idempotencyKey,
    dealId: input.deal,
    expectedVersion: input.expectedVersion,
    name: optionalString(input.body, "name"),
    dealType: optionalString(input.body, "dealType"),
    confidentiality: optionalConfidentiality(input.body),
  });
}

function partyCommand(input: MutationCommandInput): Promise<DealCommandResult> {
  return input.service.addDealParty({
    type: "add_deal_party",
    context: input.context,
    idempotencyKey: input.idempotencyKey,
    dealId: input.deal,
    expectedVersion: input.expectedVersion,
    partyId: optionalPartyId(input.body),
    reference: parseReference(input.body),
    side: requiredPartySide(input.body),
    label: requiredString(input.body, "label"),
  });
}

function roleCommand(input: MutationCommandInput): Promise<DealCommandResult> {
  return input.service.assignDealRole({
    type: "assign_deal_role",
    context: input.context,
    idempotencyKey: input.idempotencyKey,
    dealId: input.deal,
    expectedVersion: input.expectedVersion,
    roleId: optionalRoleId(input.body),
    partyId: dealPartyId(requiredString(input.body, "partyId")),
    name: requiredRoleName(input.body),
    authorityLevel: requiredNumber(input.body, "authorityLevel"),
  });
}

function mandateCommand(
  input: MutationCommandInput,
): Promise<DealCommandResult> {
  return input.service.setMandate({
    type: "set_mandate",
    context: input.context,
    idempotencyKey: input.idempotencyKey,
    dealId: input.deal,
    expectedVersion: input.expectedVersion,
    mandateId: optionalMandateId(input.body),
    transactionValueCeiling: requiredMoney(
      input.body,
      "transactionValueCeiling",
    ),
    authorityCeiling: requiredNumber(input.body, "authorityCeiling"),
  });
}

function constraintCommand(
  input: MutationCommandInput,
): Promise<DealCommandResult> {
  return input.service.setAuthorityConstraint({
    type: "set_authority_constraint",
    context: input.context,
    idempotencyKey: input.idempotencyKey,
    dealId: input.deal,
    expectedVersion: input.expectedVersion,
    constraintId: optionalConstraintId(input.body),
    partyId: optionalPartyId(input.body),
    roleId: optionalRoleId(input.body),
    action: requiredString(input.body, "action"),
    amountCeiling: optionalMoney(input.body, "amountCeiling"),
    authorityLevel: requiredNumber(input.body, "authorityLevel"),
    humanOnly: requiredBoolean(input.body, "humanOnly"),
  });
}

function parseReference(
  body: Record<string, unknown>,
): DealPartyReference {
  const value = body.reference;
  if (
    !isRecord(value) || typeof value.kind !== "string" ||
    typeof value.id !== "string"
  ) {
    throw new RequestInputError(
      `reference received ${
        safeShape(value)
      }; expected an object with string kind and id fields.`,
    );
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
      `${fieldName} received ${
        safeShape(value)
      }; expected an object with finite numeric amount and string currency.`,
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

function optionalPartyId(
  body: Record<string, unknown>,
): ReturnType<typeof dealPartyId> | undefined {
  const value = optionalString(body, "partyId");
  return value === undefined ? undefined : dealPartyId(value);
}

function optionalRoleId(
  body: Record<string, unknown>,
): ReturnType<typeof dealRoleId> | undefined {
  const value = optionalString(body, "roleId");
  return value === undefined ? undefined : dealRoleId(value);
}

function optionalMandateId(
  body: Record<string, unknown>,
): ReturnType<typeof mandateId> | undefined {
  const value = optionalString(body, "mandateId");
  return value === undefined ? undefined : mandateId(value);
}

function optionalConstraintId(
  body: Record<string, unknown>,
): ReturnType<typeof authorityConstraintId> | undefined {
  const value = optionalString(body, "constraintId");
  return value === undefined ? undefined : authorityConstraintId(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeShape(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (
    typeof value === "string" || typeof value === "number" ||
    typeof value === "boolean"
  ) return JSON.stringify(value);
  return `<${Array.isArray(value) ? "array" : "object"}>`;
}

const REFERENCE_KINDS: readonly DealPartyReferenceKind[] = [
  "organization",
  "legal_entity",
  "person",
  "user_identity",
];
