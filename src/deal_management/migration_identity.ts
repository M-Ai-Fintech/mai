import {
  type IdempotencyKey,
  parseIdempotencyKey,
} from "../platform/api/v1.ts";
import {
  type DealId,
  dealId,
  type DealPartyId,
  dealPartyId,
  type DealRoleId,
  dealRoleId,
  type MandateId,
  mandateId,
} from "./ids.ts";

const namespaceSeparator = "\u001f";
const hashLength = 47;

export interface LegacyIdentity {
  readonly source: string;
  readonly legacyDealId: string;
}

export interface LegacyEntityIdentity extends LegacyIdentity {
  readonly legacyEntityId: string;
}

/**
 * Serializes JSON values deterministically for fingerprints and replay.
 *
 * @example canonicalJson({ b: 2, a: 1 }) === '{"a":1,"b":2}'
 */
export function canonicalJson(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new Error(
        'Cannot canonicalize value "' + String(value) +
          '"; expected a JSON value.',
      );
    }
    return serialized;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  const object = value as Record<string, unknown>;
  return "{" +
    Object.keys(object).sort().map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(object[key])
    ).join(",") + "}";
}

/** Hashes UTF-8 input with SHA-256 and returns lowercase hexadecimal output. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Hashes a JSON value after recursively canonicalizing its object keys. */
export function sourceFingerprint(value: unknown): Promise<string> {
  return sha256Hex(canonicalJson(value));
}

/** Derives the stable authoritative Deal ID for one legacy source record. */
export async function legacyDealId(
  input: LegacyIdentity,
): Promise<DealId> {
  return dealId(
    "deal_legacy-" + await identityHash(input, "deal", input.legacyDealId),
  );
}

/** Derives a stable bounded Deal party ID from its source identity. */
export async function partyIdFor(
  input: LegacyEntityIdentity,
): Promise<DealPartyId> {
  return dealPartyId(
    "party_legacy-" +
      await identityHash(input, "party", input.legacyEntityId),
  );
}

/** Derives a stable bounded Deal role ID from its source identity. */
export async function roleIdFor(
  input: LegacyEntityIdentity,
): Promise<DealRoleId> {
  return dealRoleId(
    "dealrole_legacy-" +
      await identityHash(input, "role", input.legacyEntityId),
  );
}

/** Derives a stable bounded mandate ID from its source Deal identity. */
export async function mandateIdFor(
  input: LegacyIdentity,
): Promise<MandateId> {
  return mandateId(
    "mandate_legacy-" +
      await identityHash(input, "mandate", input.legacyDealId),
  );
}

/** Derives a stable bounded reconciliation record ID. */
export async function reconciliationRecordId(
  input: LegacyIdentity,
): Promise<string> {
  return "reconcile_legacy-" +
    await identityHash(input, "reconciliation_record", input.legacyDealId);
}

/** Derives the shared idempotency key used by replay and evidence verification. */
export async function reconciliationIdempotencyKey(
  input: LegacyIdentity,
  operation: string,
  legacyEntityId: string,
): Promise<IdempotencyKey> {
  const hash = await identityHash(
    input,
    "reconciliation_idempotency_key",
    operation + namespaceSeparator + legacyEntityId,
  );
  const value = "idem_reconcile-" + hash.slice(0, 48);
  const parsed = parseIdempotencyKey(value);
  if (parsed.ok) return parsed.value;
  throw new Error(
    'Reconciliation idempotency key "' + value +
      '" is invalid; expected a canonical idempotency key.',
  );
}

async function identityHash(
  input: LegacyIdentity,
  entityKind: string,
  legacyEntityId: string,
): Promise<string> {
  const payload = [
    "mai-110-migration-identity",
    entityKind,
    input.source,
    input.legacyDealId,
    legacyEntityId,
  ].join(namespaceSeparator);
  return (await sha256Hex(payload)).slice(0, hashLength);
}
