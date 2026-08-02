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
import {
  field,
  type FieldClassification,
} from "../../src/platform/authz/v1.ts";

function mask(input: {
  readonly include?: readonly string[];
  readonly omit?: readonly string[];
  readonly redact?: readonly string[];
  readonly approved?: readonly {
    readonly name: string;
    readonly classification: FieldClassification;
  }[];
} = {}): DealFieldMaskDecision {
  return {
    include: (input.include ?? []).map(field),
    omit: (input.omit ?? []).map(field),
    redact: (input.redact ?? []).map(field),
    approvedClassifications: (input.approved ?? []).map((approved) => ({
      name: field(approved.name),
      classification: approved.classification,
    })),
  };
}

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

  const safe = projectDeal(deal, mask());
  assertEquals(safe.id, undefined);
  assertEquals(safe.version, undefined);
  assertEquals(safe.state, undefined);
  assertEquals(safe.name, undefined);
  assertEquals(safe.dealType, undefined);
  assertEquals(safe.confidentiality, undefined);
  assertEquals(safe.currency, undefined);
  assertEquals(safe.mandate, undefined);
  assertEquals(safe.authorityConstraints, undefined);
  assertEquals(safe.parties, undefined);
  assertEquals(safe.roles, undefined);
});

Deno.test("Deal projection requires a matching approved classification for base fields", () => {
  const context = contextFor();
  const deal = createDeal({
    id: new SequentialDealIdFactory().nextDealId(),
    tenantId: requiredTenantId(context.request.tenantId),
    workspaceId: requiredWorkspaceId(context.request.workspaceId!),
    name: "Classified projection",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
    now: context.now,
  });
  const unapproved = projectDeal(deal, mask({ include: ["deal"] }));
  const mismatched = projectDeal(
    deal,
    mask({
      include: ["deal"],
      approved: [{ name: "deal", classification: "restricted" }],
    }),
  );
  const approved = projectDeal(
    deal,
    mask({
      include: ["deal"],
      approved: [{ name: "deal", classification: "public" }],
    }),
  );

  assertEquals(unapproved.name, undefined);
  assertEquals(mismatched.name, undefined);
  assertEquals(approved.name, "Classified projection");
  assertEquals(approved.id, deal.id);
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

  const relationships = projectDeal(
    deal,
    mask({
      include: ["parties", "roles"],
      approved: [
        { name: "parties", classification: "external_shareable" },
        { name: "roles", classification: "relationship_ownership" },
      ],
    }),
  );
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
  const allowed: DealFieldMaskDecision = mask({
    include: ["mandate_ceiling", "authority_constraints"],
    approved: [
      { name: "mandate_ceiling", classification: "mandate_ceiling" },
      { name: "authority_constraints", classification: "mandate_ceiling" },
    ],
  });
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
  const projected = projectDeal(
    deal,
    mask({
      include: [
        "deal",
        "parties",
        "roles",
        "mandate_ceiling",
        "authority_constraints",
      ],
      omit: [
        "deal",
        "parties",
        "roles",
        "mandate_ceiling",
        "authority_constraints",
      ],
      approved: [
        { name: "deal", classification: "public" },
        { name: "parties", classification: "external_shareable" },
        { name: "roles", classification: "relationship_ownership" },
        { name: "mandate_ceiling", classification: "mandate_ceiling" },
        { name: "authority_constraints", classification: "mandate_ceiling" },
      ],
    }),
  );
  assertEquals(projected.id, undefined);
  assertEquals(projected.name, undefined);
  assertEquals(projected.parties, undefined);
  assertEquals(projected.roles, undefined);
  assertEquals(projected.mandate, undefined);
  assertEquals(projected.authorityConstraints, undefined);
});

Deno.test("Deal projection suppresses redacted fields even when classification is approved", () => {
  const context = contextFor();
  const deal = createDeal({
    id: new SequentialDealIdFactory().nextDealId(),
    tenantId: requiredTenantId(context.request.tenantId),
    workspaceId: requiredWorkspaceId(context.request.workspaceId!),
    name: "Redacted projection",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
    now: context.now,
  });
  const projected = projectDeal(
    deal,
    mask({
      include: ["deal"],
      redact: ["deal"],
      approved: [{ name: "deal", classification: "public" }],
    }),
  );

  assertEquals(projected.id, undefined);
  assertEquals(projected.name, undefined);
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
