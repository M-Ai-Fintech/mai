import { assertEquals } from "@std/assert";
import {
  reconcileExternalIdentities,
  userIdentityId,
} from "../../src/identity_access/v1.ts";

Deno.test("identity reconciliation matches, creates, and reports conflicts without deleting history", async () => {
  const existing = [{
    aggregateType: "user_identity" as const,
    id: userIdentityId("identity_existing"),
    tenantId: "tenant_acme" as never,
    providerSubject: "provider-existing",
    displayName: "Existing",
    state: "active" as const,
    version: 1 as never,
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-01T12:00:00.000Z",
  }];
  const result = await reconcileExternalIdentities({
    existing,
    records: [
      {
        source: "idp",
        externalId: "ext_existing",
        providerSubject: "provider-existing",
        displayName: "Existing renamed",
      },
      {
        source: "idp",
        externalId: "ext_new",
        providerSubject: "provider-new",
        displayName: "New",
      },
      {
        source: "idp",
        externalId: "ext_conflict",
        providerSubject: "provider-one",
        displayName: "Conflict one",
      },
      {
        source: "idp",
        externalId: "ext_conflict",
        providerSubject: "provider-two",
        displayName: "Conflict two",
      },
    ],
    create: (record) =>
      Promise.resolve({
        ...existing[0],
        id: userIdentityId(
          `identity_${record.externalId.replaceAll("_", "-")}`,
        ),
        providerSubject: record.providerSubject,
        displayName: record.displayName,
      }),
  });
  assertEquals(result.matched, 1);
  assertEquals(result.created, 1);
  assertEquals(result.conflicts, 1);
  assertEquals(result.rollback.historyRetained, true);
  assertEquals(result.mappings.map((mapping) => mapping.outcome), [
    "matched",
    "created",
    "conflict",
  ]);
});
