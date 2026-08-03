import { addDealParty, assignDealRole } from "./model.ts";
import { dealPartyId, dealRoleId } from "./ids.ts";
import type { Deal, DealPartyReference } from "./contracts.ts";
import type { DealRoleName } from "./contracts.ts";
import {
  isDealPartySide,
  isDealRoleName,
  type LegacyDealRecord,
  type LegacyMappingResult,
  type LegacyPartyRecord,
  type LegacyTeamMemberRecord,
} from "./legacy_contracts.ts";
import {
  invariantIssue,
  issue,
  issueResult,
  shortSlug,
} from "./legacy_mapper_validation.ts";

export interface LegacyMappingInput {
  readonly record: LegacyDealRecord;
  readonly now: string;
}

export type LegacyReferenceLookup = (
  legacyId: string,
  kind: NonNullable<LegacyPartyRecord["referenceKind"]>,
) => Promise<DealPartyReference | undefined>;

export async function mapParties(
  input: LegacyMappingInput,
  initial: Deal,
  resolveReference: LegacyReferenceLookup,
): Promise<MappingAggregateResult> {
  let deal = initial;
  const seen = new Set<string>();
  for (const party of input.record.parties) {
    const mapped = await mapParty(input, deal, party, seen, resolveReference);
    if (mapped.kind !== "ok") return mapped;
    deal = mapped.deal;
  }
  return { kind: "ok", deal };
}

async function mapParty(
  input: LegacyMappingInput,
  deal: Deal,
  party: LegacyPartyRecord,
  seen: Set<string>,
  resolveReference: LegacyReferenceLookup,
): Promise<MappingAggregateResult> {
  const reference = await resolvePartyReference(party, resolveReference);
  if (reference === undefined) {
    return missingPartyReference(input.record, party.legacyPartyId);
  }
  const referenceKey = `${reference.kind}:${reference.id}`;
  if (seen.has(referenceKey)) return duplicateParty(input.record, referenceKey);
  seen.add(referenceKey);
  const side = party.side?.trim().toLowerCase();
  if (side === undefined || !isDealPartySide(side)) {
    return issueResult(
      "unsupported_legacy_shape",
      issue(
        "UNSUPPORTED_LEGACY_SHAPE",
        input.record,
        party.side ?? "undefined",
        "a supported Deal party side",
        "Legacy party side cannot be mapped without inventing ownership.",
      ),
    );
  }
  if (party.label === undefined || party.label.trim().length === 0) {
    return issueResult(
      "invalid_legacy_record",
      issue(
        "MISSING_REQUIRED_FIELD",
        input.record,
        party.label ?? "undefined",
        "a non-empty party label",
        "Legacy party label is required for an owned Deal party.",
      ),
    );
  }
  return appendParty(deal, input.record, party, reference, side, input.now);
}

function appendParty(
  deal: Deal,
  record: LegacyDealRecord,
  party: LegacyPartyRecord,
  reference: DealPartyReference,
  side: NonNullable<Deal["parties"][number]["side"]>,
  now: string,
): MappingAggregateResult {
  try {
    return {
      kind: "ok",
      deal: addDealParty(deal, {
        expectedVersion: deal.version,
        id: dealPartyId(`party_legacy-${shortSlug(party.legacyPartyId)}`),
        reference,
        side,
        label: party.label!,
        now,
      }),
    };
  } catch (error) {
    return invariantIssue(record, error);
  }
}

export async function mapTeam(
  input: LegacyMappingInput,
  initial: Deal,
  resolveReference: LegacyReferenceLookup,
): Promise<MappingAggregateResult> {
  let deal = initial;
  const roleKeys = new Set<string>();
  for (const member of input.record.team) {
    const mapped = await mapTeamMember(
      input,
      deal,
      member,
      roleKeys,
      resolveReference,
    );
    if (mapped.kind !== "ok") return mapped;
    deal = mapped.deal;
  }
  return { kind: "ok", deal };
}

async function mapTeamMember(
  input: LegacyMappingInput,
  initial: Deal,
  member: LegacyTeamMemberRecord,
  roleKeys: Set<string>,
  resolveReference: LegacyReferenceLookup,
): Promise<MappingAggregateResult> {
  const role = normalizeRole(member.assignmentRole);
  if (role === undefined) return unsupportedRole(input.record, member);
  const reference = await resolveTeamReference(member, resolveReference);
  if (reference === undefined) {
    return missingTeamReference(input.record, member.legacyMemberId);
  }
  const partyResult = addMissingTeamParty(input, initial, member, reference);
  if (partyResult.kind !== "ok") return partyResult;
  const party = findParty(partyResult.deal, reference);
  if (party === undefined) {
    return invariantIssue(input.record, "team party was not persisted");
  }
  if (member.authorityLevel === undefined) {
    return missingAuthority(input.record);
  }
  const roleKey = `${party.id}:${role}`;
  if (roleKeys.has(roleKey)) return duplicateRole(input.record, roleKey);
  roleKeys.add(roleKey);
  return appendRole(
    partyResult.deal,
    input.record,
    member,
    party.id,
    role,
    input.now,
  );
}

function addMissingTeamParty(
  input: LegacyMappingInput,
  deal: Deal,
  member: LegacyTeamMemberRecord,
  reference: DealPartyReference,
): MappingAggregateResult {
  if (findParty(deal, reference) !== undefined) return { kind: "ok", deal };
  const side = member.side?.trim().toLowerCase();
  if (side === undefined || !isDealPartySide(side)) {
    return issueResult(
      "unsupported_legacy_shape",
      issue(
        "UNSUPPORTED_LEGACY_SHAPE",
        input.record,
        member.side ?? "undefined",
        "an explicit supported side for a legacy team party",
        "Legacy team membership has no safe party side.",
      ),
    );
  }
  if (member.label === undefined || member.label.trim().length === 0) {
    return issueResult(
      "invalid_legacy_record",
      issue(
        "MISSING_REQUIRED_FIELD",
        input.record,
        member.label ?? "undefined",
        "a non-empty team member label",
        "A team member promoted to a Deal party needs an explicit label.",
      ),
    );
  }
  try {
    return {
      kind: "ok",
      deal: addDealParty(deal, {
        expectedVersion: deal.version,
        id: dealPartyId(`party_legacy-${shortSlug(member.legacyMemberId)}`),
        reference,
        side,
        label: member.label,
        now: input.now,
      }),
    };
  } catch (error) {
    return invariantIssue(input.record, error);
  }
}

function appendRole(
  deal: Deal,
  record: LegacyDealRecord,
  member: LegacyTeamMemberRecord,
  partyId: Deal["parties"][number]["id"],
  role: DealRoleName,
  now: string,
): MappingAggregateResult {
  try {
    return {
      kind: "ok",
      deal: assignDealRole(deal, {
        expectedVersion: deal.version,
        id: dealRoleId(`dealrole_legacy-${shortSlug(member.legacyMemberId)}`),
        partyId,
        name: role,
        authorityLevel: member.authorityLevel!,
        now,
      }),
    };
  } catch (error) {
    return teamRoleIssue(record, member, error);
  }
}

function findParty(
  deal: Deal,
  reference: DealPartyReference,
): Deal["parties"][number] | undefined {
  return deal.parties.find((candidate) =>
    candidate.reference.kind === reference.kind &&
    candidate.reference.id === reference.id
  );
}

async function resolvePartyReference(
  party: LegacyPartyRecord,
  resolveReference: LegacyReferenceLookup,
): Promise<DealPartyReference | undefined> {
  if (party.reference !== undefined) return party.reference;
  if (party.referenceKind === undefined) return undefined;
  return await resolveReference(party.legacyPartyId, party.referenceKind);
}

async function resolveTeamReference(
  member: LegacyTeamMemberRecord,
  resolveReference: LegacyReferenceLookup,
): Promise<DealPartyReference | undefined> {
  if (member.reference !== undefined) return member.reference;
  if (member.referenceKind === undefined) return undefined;
  return await resolveReference(member.legacyMemberId, member.referenceKind);
}

function normalizeRole(value: string | undefined): DealRoleName | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase().replaceAll(" ", "_");
  if (normalized === "lead_advisor") return "advisor";
  if (isDealRoleName(normalized)) return normalized;
  return undefined;
}

function missingPartyReference(
  record: LegacyDealRecord,
  legacyPartyId: string,
): LegacyMappingResult {
  return issueResult(
    "missing_required_reference",
    issue(
      "MISSING_UPSTREAM_REFERENCE",
      record,
      legacyPartyId,
      "a verified organization, legal_entity, person, or user_identity reference",
      "Legacy party cannot be safely attached without an upstream stable ID.",
    ),
  );
}

function duplicateParty(
  record: LegacyDealRecord,
  referenceKey: string,
): LegacyMappingResult {
  return issueResult(
    "invalid_legacy_record",
    issue(
      "DUPLICATE_PARTY",
      record,
      referenceKey,
      "one party reference per Deal",
      "Legacy parties contain a duplicate stable reference.",
    ),
  );
}

function unsupportedRole(
  record: LegacyDealRecord,
  member: LegacyTeamMemberRecord,
): LegacyMappingResult {
  return issueResult(
    "unsupported_legacy_shape",
    issue(
      "UNSUPPORTED_LEGACY_SHAPE",
      record,
      member.assignmentRole ?? "undefined",
      "a supported Deal role name",
      "Legacy team assignment role is not representable.",
    ),
  );
}

function missingTeamReference(
  record: LegacyDealRecord,
  legacyMemberId: string,
): LegacyMappingResult {
  return issueResult(
    "missing_required_reference",
    issue(
      "MISSING_UPSTREAM_REFERENCE",
      record,
      legacyMemberId,
      "a verified upstream party reference",
      "Legacy team membership cannot become an owned Deal role without a stable party.",
    ),
  );
}

function missingAuthority(record: LegacyDealRecord): LegacyMappingResult {
  return issueResult(
    "missing_required_reference",
    issue(
      "MISSING_REQUIRED_FIELD",
      record,
      "undefined",
      "an explicit positive authorityLevel for each team role",
      "Legacy team authority cannot be inferred from membership alone.",
    ),
  );
}

function duplicateRole(
  record: LegacyDealRecord,
  roleKey: string,
): LegacyMappingResult {
  return issueResult(
    "invalid_legacy_record",
    issue(
      "DUPLICATE_PARTY",
      record,
      roleKey,
      "one role assignment per party and role name",
      "Legacy team membership duplicates a Deal role assignment.",
    ),
  );
}

function teamRoleIssue(
  record: LegacyDealRecord,
  member: LegacyTeamMemberRecord,
  error: unknown,
): LegacyMappingResult {
  const message = error instanceof Error ? error.message : String(error);
  const issueCode = message.includes("mandate authority ceiling")
    ? "AUTHORITY_EXCEEDS_MANDATE"
    : "UNSUPPORTED_LEGACY_SHAPE";
  return issueResult(
    issueCode === "AUTHORITY_EXCEEDS_MANDATE"
      ? "conflict"
      : "unsupported_legacy_shape",
    issue(
      issueCode,
      record,
      String(member.authorityLevel),
      "a positive authority level at or below the Deal mandate ceiling",
      "Legacy team authority cannot be reconciled safely.",
    ),
  );
}

export type MappingAggregateResult =
  | { readonly kind: "ok"; readonly deal: Deal }
  | LegacyMappingResult;
