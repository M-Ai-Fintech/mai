import { assert, assertEquals, assertNotEquals } from "@std/assert";
import {
  canonicalJson,
  legacyDealId,
  mandateIdFor,
  partyIdFor,
  reconciliationIdempotencyKey,
  reconciliationRecordId,
  roleIdFor,
  sha256Hex,
  sourceFingerprint,
} from "../../src/deal_management/migration_identity.ts";
import { replayExpectedIdempotencyKey } from "../../src/deal_management/reconciliation_replay.ts";
import { verificationExpectedIdempotencyKey } from "../../src/deal_management/reconciliation_verification.ts";

const identity = {
  source: "legacy.postgres",
  legacyDealId: "Deal/ABC-001",
};

Deno.test("canonical JSON sorts objects but preserves array order and types", () => {
  assertEquals(
    canonicalJson({
      number: 1,
      nested: { b: true, a: null },
      array: ["1", 1],
    }),
    '{"array":["1",1],"nested":{"a":null,"b":true},"number":1}',
  );
  assertEquals(
    canonicalJson({ a: 1, b: { c: 2 } }),
    canonicalJson({ b: { c: 2 }, a: 1 }),
  );
  assertNotEquals(
    canonicalJson(["first", "second"]),
    canonicalJson(["second", "first"]),
  );
});

Deno.test("SHA-256 fingerprints are deterministic and distinguish type/order changes", async () => {
  const ordered = { a: 1, b: ["x", "y"] };
  const reordered = { b: ["x", "y"], a: 1 };
  assertEquals(
    await sourceFingerprint(ordered),
    await sourceFingerprint(reordered),
  );
  assertNotEquals(
    await sourceFingerprint({ a: 1, b: ["y", "x"] }),
    await sourceFingerprint(ordered),
  );
  assertEquals(
    await sha256Hex("hello"),
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  );
});

Deno.test("migration identities retain prefixes and avoid normalization collisions", async () => {
  const other = { ...identity, legacyDealId: "deal_abc-001" };
  const longA = { ...identity, legacyDealId: `same-prefix-${"a".repeat(200)}` };
  const longB = { ...identity, legacyDealId: `same-prefix-${"b".repeat(200)}` };
  const deal = await legacyDealId(identity);
  assert(deal.startsWith("deal_legacy-"));
  assertNotEquals(deal, await legacyDealId(other));
  assertNotEquals(await legacyDealId(longA), await legacyDealId(longB));
  assert(
    String(await partyIdFor({ ...identity, legacyEntityId: "entity" })) !==
      String(await roleIdFor({ ...identity, legacyEntityId: "entity" })),
  );
  assert(
    (await partyIdFor({ ...identity, legacyEntityId: "entity" })).startsWith(
      "party_legacy-",
    ),
  );
  assert(
    (await roleIdFor({ ...identity, legacyEntityId: "entity" })).startsWith(
      "dealrole_legacy-",
    ),
  );
  assert((await mandateIdFor(identity)).startsWith("mandate_legacy-"));
  assert(
    (await reconciliationRecordId(identity)).startsWith("reconcile_legacy-"),
  );
});

Deno.test("reconciliation IDs and keys are retry-stable and shared by callers", async () => {
  const entity = { ...identity, legacyEntityId: "party/1" };
  assertEquals(
    await reconciliationRecordId(identity),
    await reconciliationRecordId(identity),
  );
  assertEquals(
    await reconciliationIdempotencyKey(identity, "party", "party/1"),
    await reconciliationIdempotencyKey(identity, "party", "party/1"),
  );
  assert(
    (await reconciliationIdempotencyKey(identity, "party", "party/1"))
      .startsWith("idem_reconcile-"),
  );
  assertNotEquals(
    await reconciliationIdempotencyKey(identity, "party", "party/1"),
    await reconciliationIdempotencyKey(identity, "role", "party/1"),
  );
  assertNotEquals(
    await partyIdFor(entity),
    await partyIdFor({ ...entity, legacyEntityId: "role/1" }),
  );
  const replayKey = await replayExpectedIdempotencyKey(
    identity,
    "party",
    "party/1",
  );
  const verificationKey = await verificationExpectedIdempotencyKey(
    identity,
    "party",
    "party/1",
  );
  const canonicalKey = await reconciliationIdempotencyKey(
    identity,
    "party",
    "party/1",
  );
  assertEquals(replayKey, canonicalKey);
  assertEquals(verificationKey, canonicalKey);
});

Deno.test("one source entity has isolated migration namespaces", async () => {
  const entity = { ...identity, legacyEntityId: identity.legacyDealId };
  const values = await Promise.all([
    legacyDealId(entity),
    partyIdFor(entity),
    roleIdFor(entity),
    mandateIdFor(entity),
    reconciliationRecordId(entity),
    reconciliationIdempotencyKey(entity, "deal", entity.legacyEntityId),
  ]);
  assertEquals(new Set(values.map(String)).size, values.length);
});
