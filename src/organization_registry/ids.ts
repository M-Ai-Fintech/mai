import type {
  IdentifierIssueCode,
  ParseResult,
} from "../shared/contracts/identifiers.ts";

const registryIdBrand: unique symbol = Symbol("organization-registry-id");

type RegistryId<Kind extends string> = string & {
  readonly [registryIdBrand]: Kind;
};

export type OrganizationId = RegistryId<"OrganizationId">;
export type LegalEntityId = RegistryId<"LegalEntityId">;
export type PersonId = RegistryId<"PersonId">;
export type MergeRecordId = RegistryId<"MergeRecordId">;

export type RegistryEntityId =
  | OrganizationId
  | LegalEntityId
  | PersonId;

export function parseOrganizationId(
  value: unknown,
): ParseResult<OrganizationId> {
  return parseRegistryId(value, "org_");
}

export function parseLegalEntityId(
  value: unknown,
): ParseResult<LegalEntityId> {
  return parseRegistryId(value, "legal_");
}

export function parsePersonId(value: unknown): ParseResult<PersonId> {
  return parseRegistryId(value, "person_");
}

export function parseMergeRecordId(
  value: unknown,
): ParseResult<MergeRecordId> {
  return parseRegistryId(value, "merge_");
}

function parseRegistryId<Kind extends string>(
  value: unknown,
  prefix: string,
): ParseResult<RegistryId<Kind>> {
  const issue = registryIdIssue(value, prefix);
  return issue === undefined
    ? { ok: true, value: value as RegistryId<Kind> }
    : { ok: false, issue: { code: issue } };
}

function registryIdIssue(
  value: unknown,
  prefix: string,
): IdentifierIssueCode | undefined {
  if (typeof value !== "string") return "INVALID_TYPE";
  if (value.length === 0) return "EMPTY";
  if (value.trim().length === 0) return "WHITESPACE_ONLY";
  if (value !== value.trim()) return "SURROUNDING_WHITESPACE";
  if (!value.startsWith(prefix)) return "WRONG_PREFIX";
  if (value.length === prefix.length) return "INCOMPLETE";
  if (value.length > 64) return "INVALID_LENGTH";
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length))
    ? undefined
    : "INVALID_FORMAT";
}
