import { assert, assertEquals } from "@std/assert";
import {
  addDealParty,
  assignDealRole,
  createDeal,
  type DealFieldMaskDecision,
  projectDeal,
  setAuthorityConstraint,
  setMandate,
} from "../../src/deal_management/v1.ts";
import {
  contextFor,
  DenyingDealAuthorization,
  eventFor,
  RecordingDealAuthorization,
  requiredTenantId,
  requiredWorkspaceId,
  SequentialDealIdFactory,
} from "./support.ts";
import {
  InMemoryDealRepository,
  readDealProjection,
} from "../../src/deal_management/v1.ts";

Deno.test("Deal projection omits mandate ceilings without an approved field mask", () => {
  const ids = new SequentialDealIdFactory();
  const context = contextFor();
  let deal = createDeal({
    id: ids.nextDealId(),
    tenantId: context.request.tenantId as never,
    workspaceId: context.request.workspaceId! as never,
    name: "Permission-safe projection",
    dealType: "acquisition",
    confidentiality: "sensitive",
    currency: "USD",
    now: context.now,
  });
  deal = setMandate(deal, {
    expectedVersion: 1,
    id: ids.nextMandateId(),
    transactionValueCeiling: { amount: 10_000_000, currency: "USD" },
    authorityCeiling: 3,
    now: context.now,
  });
  deal = addDealParty(deal, {
    expectedVersion: 2,
    id: ids.nextDealPartyId(),
    reference: { kind: "organization", id: "org_projection-target" },
    side: "target",
    label: "Target",
    now: context.now,
  });
  deal = setAuthorityConstraint(deal, {
    expectedVersion: 3,
    id: ids.nextAuthorityConstraintId(),
    partyId: deal.parties[0].id,
    action: "approve_terms",
    amountCeiling: { amount: 2_000_000, currency: "USD" },
    authorityLevel: 2,
    humanOnly: true,
    now: context.now,
  });

  const safe = projectDeal(deal, { include: [], omit: [] });
  assertEquals(safe.mandate, undefined);
  assertEquals(safe.authorityConstraints, undefined);
  assertEquals(safe.parties, undefined);
  assertEquals(safe.roles, undefined);
});

Deno.test("Deal projection includes parties and roles only when each field is allowed", () => {
  const ids = new SequentialDealIdFactory();
  const context = contextFor();
  let deal = createDeal({
    id: ids.nextDealId(),
    tenantId: requiredTenantId(context.request.tenantId),
    workspaceId: requiredWorkspaceId(context.request.workspaceId!),
    name: "Relationship projection",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
    now: context.now,
  });
  deal = addDealParty(deal, {
    expectedVersion: 1,
    id: ids.nextDealPartyId(),
    reference: { kind: "organization", id: "org_projection-owner" },
    side: "acquirer",
    label: "Acquirer",
    now: context.now,
  });
  deal = setMandate(deal, {
    expectedVersion: 2,
    id: ids.nextMandateId(),
    transactionValueCeiling: { amount: 100, currency: "USD" },
    authorityCeiling: 2,
    now: context.now,
  });
  deal = assignDealRole(deal, {
    expectedVersion: 3,
    id: ids.nextDealRoleId(),
    partyId: deal.parties[0].id,
    name: "acquirer",
    authorityLevel: 1,
    now: context.now,
  });

  const relationships = projectDeal(deal, {
    include: ["parties", "roles"],
    omit: [],
  });
  assertEquals(relationships.parties?.[0].reference, {
    kind: "organization",
    id: "org_projection-owner",
  });
  assertEquals(relationships.roles?.[0].authorityLevel, undefined);
  assertEquals(relationships.mandate, undefined);
  assertEquals(relationships.authorityConstraints, undefined);
});

Deno.test("Deal projection includes authority data only when explicitly allowed", () => {
  const ids = new SequentialDealIdFactory();
  const context = contextFor();
  const deal = setMandate(
    createDeal({
      id: ids.nextDealId(),
      tenantId: context.request.tenantId as never,
      workspaceId: context.request.workspaceId! as never,
      name: "Authorized projection",
      dealType: "acquisition",
      confidentiality: "sensitive",
      currency: "USD",
      now: context.now,
    }),
    {
      expectedVersion: 1,
      id: ids.nextMandateId(),
      transactionValueCeiling: { amount: 10_000_000, currency: "USD" },
      authorityCeiling: 3,
      now: context.now,
    },
  );
  const allowed: DealFieldMaskDecision = {
    include: ["mandate_ceiling", "authority_constraints"],
    omit: [],
  };
  const projected = projectDeal(deal, allowed);
  assert(projected.mandate !== undefined);
  assertEquals(projected.mandate?.transactionValueCeiling, {
    amount: 10_000_000,
    currency: "USD",
  });
});

Deno.test("Deal projection honors explicit field omissions", () => {
  const context = contextFor();
  const ids = new SequentialDealIdFactory();
  const deal = setMandate(
    createDeal({
      id: ids.nextDealId(),
      tenantId: context.request.tenantId as never,
      workspaceId: context.request.workspaceId! as never,
      name: "Omitted authority",
      dealType: "acquisition",
      confidentiality: "standard",
      currency: "USD",
      now: context.now,
    }),
    {
      expectedVersion: 1,
      id: ids.nextMandateId(),
      transactionValueCeiling: { amount: 100, currency: "USD" },
      authorityCeiling: 1,
      now: context.now,
    },
  );
  const projected = projectDeal(deal, {
    include: [
      "parties",
      "roles",
      "mandate_ceiling",
      "authority_constraints",
    ],
    omit: [
      "parties",
      "roles",
      "mandate_ceiling",
      "authority_constraints",
    ],
  });
  assertEquals(projected.parties, undefined);
  assertEquals(projected.roles, undefined);
  assertEquals(projected.mandate, undefined);
  assertEquals(projected.authorityConstraints, undefined);
});

Deno.test("Deal read model makes denied and absent protected reads equivalent", async () => {
  const ids = new SequentialDealIdFactory();
  const context = contextFor();
  const scope = {
    tenantId: requiredTenantId(context.request.tenantId),
    workspaceId: requiredWorkspaceId(context.request.workspaceId!),
  };
  const deal = createDeal({
    id: ids.nextDealId(),
    ...scope,
    name: "Protected read",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
    now: context.now,
  });
  const repository = new InMemoryDealRepository();
  await repository.save({
    scope,
    aggregate: deal,
    event: eventFor(deal, context),
  });
  const denied = await readDealProjection({
    context,
    dealId: deal.id,
    repository,
    authorization: new DenyingDealAuthorization(),
  });
  const absent = await readDealProjection({
    context,
    dealId: "deal_absent" as never,
    repository,
    authorization: new RecordingDealAuthorization(),
  });
  assertEquals(denied, absent);
});
