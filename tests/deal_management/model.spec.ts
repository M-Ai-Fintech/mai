import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  addDealParty,
  assignDealRole,
  createDeal,
  setAuthorityConstraint,
  setMandate,
} from "../../src/deal_management/v1.ts";
import { DealInvariantError } from "../../src/deal_management/v1.ts";
import { contextFor, SequentialDealIdFactory } from "./support.ts";

const ids = new SequentialDealIdFactory();

Deno.test("deal model owns party, role, mandate, and constraint invariants", () => {
  let deal = createDeal({
    id: ids.nextDealId(),
    tenantId: contextFor().request.tenantId,
    workspaceId: contextFor().request.workspaceId!,
    name: "Northstar acquisition",
    dealType: "acquisition",
    confidentiality: "sensitive",
    currency: "USD",
    now: "2026-08-02T12:00:00.000Z",
  });
  deal = setMandate(deal, {
    expectedVersion: 1,
    id: ids.nextMandateId(),
    transactionValueCeiling: { amount: 10_000_000, currency: "USD" },
    authorityCeiling: 3,
    now: "2026-08-02T12:01:00.000Z",
  });
  const party = addDealParty(deal, {
    expectedVersion: 2,
    id: ids.nextDealPartyId(),
    reference: { kind: "organization", id: "org_target" },
    side: "target",
    label: "Target company",
    now: "2026-08-02T12:02:00.000Z",
  });
  deal = party;
  deal = assignDealRole(deal, {
    expectedVersion: 3,
    id: ids.nextDealRoleId(),
    partyId: party.parties[0].id,
    name: "target",
    authorityLevel: 2,
    now: "2026-08-02T12:03:00.000Z",
  });
  deal = setAuthorityConstraint(deal, {
    expectedVersion: 4,
    id: ids.nextAuthorityConstraintId(),
    roleId: deal.roles[0].id,
    action: "approve_terms",
    amountCeiling: { amount: 5_000_000, currency: "USD" },
    authorityLevel: 2,
    humanOnly: true,
    now: "2026-08-02T12:04:00.000Z",
  });

  assertEquals(deal.version, 5);
  assertEquals(deal.parties.length, 1);
  assertEquals(deal.roles.length, 1);
  assertEquals(deal.authorityConstraints.length, 1);
  assertEquals(deal.mandate?.transactionValueCeiling.amount, 10_000_000);
});

Deno.test("deal model rejects invalid references and authority ceilings", async () => {
  const deal = createDeal({
    id: ids.nextDealId(),
    tenantId: contextFor().request.tenantId,
    workspaceId: contextFor().request.workspaceId!,
    name: "Reference validation",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
    now: "2026-08-02T12:00:00.000Z",
  });
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        addDealParty(deal, {
          expectedVersion: 1,
          id: ids.nextDealPartyId(),
          reference: { kind: "person", id: "organization_wrong" },
          side: "seller",
          label: "Wrong reference",
          now: "2026-08-02T12:01:00.000Z",
        })
      ),
    DealInvariantError,
    "person reference",
  );
  const mandated = setMandate(deal, {
    expectedVersion: 1,
    id: ids.nextMandateId(),
    transactionValueCeiling: { amount: 1_000_000, currency: "USD" },
    authorityCeiling: 2,
    now: "2026-08-02T12:02:00.000Z",
  });
  const withParty = addDealParty(mandated, {
    expectedVersion: 2,
    id: ids.nextDealPartyId(),
    reference: { kind: "organization", id: "org_limit-target" },
    side: "target",
    label: "Limit target",
    now: "2026-08-02T12:02:30.000Z",
  });
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        setAuthorityConstraint(withParty, {
          expectedVersion: 3,
          id: ids.nextAuthorityConstraintId(),
          partyId: withParty.parties[0].id,
          action: "approve_terms",
          amountCeiling: { amount: 1_000_001, currency: "USD" },
          authorityLevel: 2,
          humanOnly: true,
          now: "2026-08-02T12:03:00.000Z",
        })
      ),
    DealInvariantError,
    "mandate transaction ceiling",
  );
  assert(true);
});

Deno.test("deal model rejects invalid runtime choices and duplicate owned IDs", async () => {
  const context = contextFor();
  const deal = createDeal({
    id: ids.nextDealId(),
    tenantId: context.request.tenantId,
    workspaceId: context.request.workspaceId!,
    name: "Runtime validation",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
    now: context.now,
  });
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        createDeal({
          ...deal,
          id: ids.nextDealId(),
          confidentiality: "public" as never,
          now: context.now,
        })
      ),
    DealInvariantError,
    "Deal confidentiality",
  );
  const withParty = addDealParty(deal, {
    expectedVersion: 1,
    id: ids.nextDealPartyId(),
    reference: { kind: "organization", id: "org_runtime-target" },
    side: "target",
    label: "Target",
    now: context.now,
  });
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        addDealParty(withParty, {
          expectedVersion: 2,
          id: withParty.parties[0].id,
          reference: { kind: "person", id: "person_runtime-owner" },
          side: "seller",
          label: "Owner",
          now: context.now,
        })
      ),
    DealInvariantError,
    "unique owned party identifier",
  );
});
