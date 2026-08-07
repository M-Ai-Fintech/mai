const MAX_IDENTIFIER_LENGTH = 96;
const dealAccessBrand: unique symbol = Symbol("deal-access-identifier");

type DealAccessIdentifier<Kind extends string> = string & {
  readonly [dealAccessBrand]: Kind;
};

export type ParticipationId = DealAccessIdentifier<"ParticipationId">;
export type InvitationId = DealAccessIdentifier<"InvitationId">;
export type ExternalGrantId = DealAccessIdentifier<"ExternalGrantId">;
export type PortalObjectId = DealAccessIdentifier<"PortalObjectId">;
export type SubmissionId = DealAccessIdentifier<"SubmissionId">;
export type PortalReceiptId = DealAccessIdentifier<"PortalReceiptId">;

export function participationId(value: string): ParticipationId {
  return parseDealAccessId(value, "participation_", "participation ID");
}

export function invitationId(value: string): InvitationId {
  return parseDealAccessId(value, "invitation_", "invitation ID");
}

export function externalGrantId(value: string): ExternalGrantId {
  return parseDealAccessId(value, "grant_", "external grant ID");
}

export function portalObjectId(value: string): PortalObjectId {
  return parseDealAccessId(value, "object_", "portal object ID");
}

export function submissionId(value: string): SubmissionId {
  return parseDealAccessId(value, "submission_", "submission ID");
}

export function portalReceiptId(value: string): PortalReceiptId {
  return parseDealAccessId(value, "receipt_", "portal receipt ID");
}

function parseDealAccessId<T extends string>(
  value: string,
  prefix: string,
  label: string,
): DealAccessIdentifier<T> {
  if (isValidDealAccessId(value, prefix)) {
    return value as DealAccessIdentifier<T>;
  }
  throw new Error(
    `Deal Access ${label} "${value}" is invalid; expected ${prefix}<lowercase-slug>.`,
  );
}

function isValidDealAccessId(value: string, prefix: string): boolean {
  return value.length > prefix.length &&
    value.length <= MAX_IDENTIFIER_LENGTH &&
    value.startsWith(prefix) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length));
}
