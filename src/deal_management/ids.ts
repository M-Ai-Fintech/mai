import {
  type DealId,
  parseDealId as parseSharedDealId,
} from "../shared/contracts/identifiers.ts";
import type { ParseResult } from "../shared/contracts/identifiers.ts";

const dealManagementIdBrand: unique symbol = Symbol("deal-management-id");

type DealManagementId<Kind extends string> = string & {
  readonly [dealManagementIdBrand]: Kind;
};

export type DealPartyId = DealManagementId<"DealPartyId">;
export type DealRoleId = DealManagementId<"DealRoleId">;
export type MandateId = DealManagementId<"MandateId">;
export type AuthorityConstraintId = DealManagementId<"AuthorityConstraintId">;
export type DealEventId = DealManagementId<"DealEventId">;
export type DealReceiptId = DealManagementId<"DealReceiptId">;

export type { DealId };
export { parseSharedDealId as parseDealId };

export interface DealIdFactory {
  nextDealId(): DealId;
  nextDealPartyId(): DealPartyId;
  nextDealRoleId(): DealRoleId;
  nextMandateId(): MandateId;
  nextAuthorityConstraintId(): AuthorityConstraintId;
  nextEventId(): DealEventId;
}

export function dealId(value: string): DealId {
  return parseRequired(value, parseSharedDealId, "deal ID");
}

export function dealPartyId(value: string): DealPartyId {
  return prefixedId(value, "party_", "deal party ID");
}

export function dealRoleId(value: string): DealRoleId {
  return prefixedId(value, "dealrole_", "deal role ID");
}

export function mandateId(value: string): MandateId {
  return prefixedId(value, "mandate_", "mandate ID");
}

export function authorityConstraintId(value: string): AuthorityConstraintId {
  return prefixedId(value, "constraint_", "authority constraint ID");
}

export function dealEventId(value: string): DealEventId {
  return prefixedId(value, "event_", "deal event ID");
}

export function dealReceiptId(value: string): DealReceiptId {
  return prefixedId(value, "receipt_", "deal receipt ID");
}

function prefixedId<T extends string>(
  value: string,
  prefix: string,
  label: string,
): T {
  if (
    value.startsWith(prefix) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length))
  ) return value as T;
  throw new Error(
    `Invalid ${label} "${value}"; expected prefix "${prefix}" and slug characters.`,
  );
}

function parseRequired<T>(
  value: string,
  parser: (value: unknown) => ParseResult<T>,
  label: string,
): T {
  const parsed = parser(value);
  if (parsed.ok) return parsed.value;
  throw new Error(`Invalid ${label} "${value}"; expected a canonical ID.`);
}
