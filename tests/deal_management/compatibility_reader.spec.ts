import { assertEquals, assertFalse } from "@std/assert";
import {
  addDealParty,
  assignDealRole,
  CompatibilityDealReader,
  createDeal,
  type Deal,
  type DealAuthorizationInput,
  type DealAuthorizationPort,
  type DealCommandContext,
  type DealReconciliationRecord,
  type DealScope,
  DeterministicLegacyDealMapper,
  InMemoryDealReconciliationStore,
  InMemoryDealRepository,
  type LegacyDealMapper,
  type LegacyDealRecord,
  type LegacyDealSource,
  setAuthorityConstraint,
  setMandate,
} from "../../src/deal_management/v1.ts";
import {
  type AuthorizationDecision,
  field,
  type FieldMask,
} from "../../src/platform/authz/v1.ts";
import {
  contextFor,
  DenyingDealAuthorization,
  RecordingDealAuthorization,
  requiredTenantId,
  requiredWorkspaceId,
  SequentialDealIdFactory,
} from "./support.ts";

class RecordingReconciliationStore extends InMemoryDealReconciliationStore {
  findCalls = 0;
  findByAuthoritativeIdCalls = 0;

  override find(
    input: Parameters<InMemoryDealReconciliationStore["find"]>[0],
  ) {
    this.findCalls += 1;
    return super.find(input);
  }

  override findByAuthoritativeId(
    input: Parameters<
      InMemoryDealReconciliationStore["findByAuthoritativeId"]
    >[0],
  ) {
    this.findByAuthoritativeIdCalls += 1;
    return super.findByAuthoritativeId(input);
  }
}

class RecordingLegacySource implements LegacyDealSource {
  loadCalls = 0;

  constructor(private readonly record: LegacyDealRecord) {}

  load(input: {
    readonly scope: DealScope;
    readonly legacyDealId: string;
  }): Promise<LegacyDealRecord | undefined> {
    this.loadCalls += 1;
    return Promise.resolve(
      input.legacyDealId === this.record.legacyDealId ? this.record : undefined,
    );
  }
}

class RecordingDealRepository extends InMemoryDealRepository {
  findCalls = 0;

  constructor(private readonly directDeal?: Deal) {
    super();
  }

  override find(...args: Parameters<InMemoryDealRepository["find"]>) {
    this.findCalls += 1;
    if (this.directDeal !== undefined) return Promise.resolve(this.directDeal);
    return super.find(...args);
  }
}

class MaskedAuthorization implements DealAuthorizationPort {
  readonly calls: DealAuthorizationInput[] = [];

  constructor(
    private readonly fieldMask: FieldMask = {
      include: [field("deal")],
      omit: [],
      redact: [],
      approvedClassifications: [{
        name: field("deal"),
        classification: "public" as const,
      }],
    },
  ) {}

  authorize(input: DealAuthorizationInput): AuthorizationDecision {
    this.calls.push(input);
    return {
      outcome: "allow",
      reasonCode: "ALLOWED",
      allowedActions: [input.action],
      approvedScope: undefined as never,
      fieldMask: this.fieldMask,
    };
  }
}

class RecordingMapper implements LegacyDealMapper {
  constructor(private readonly deal: Deal) {}

  map(): ReturnType<DeterministicLegacyDealMapper["map"]> {
    return Promise.resolve({
      kind: "mapped",
      legacyDealId: "legacy-1",
      authoritativeDealId: this.deal.id,
      sourceFingerprint: "fingerprint",
      deal: this.deal,
    });
  }
}

function fixtureDeal(context: DealCommandContext): Deal {
  return createDeal({
    id: new SequentialDealIdFactory("compatibility").nextDealId(),
    tenantId: requiredTenantId(context.request.tenantId),
    workspaceId: requiredWorkspaceId(context.request.workspaceId!),
    name: "Compatibility projection",
    dealType: "acquisition",
    confidentiality: "sensitive",
    currency: "USD",
    now: context.now,
  });
}

function richFixtureDeal(context: DealCommandContext): Deal {
  const ids = new SequentialDealIdFactory("rich-compatibility");
  const base = createDeal({
    id: ids.nextDealId(),
    tenantId: requiredTenantId(context.request.tenantId),
    workspaceId: requiredWorkspaceId(context.request.workspaceId!),
    name: "Rich compatibility projection",
    dealType: "acquisition",
    confidentiality: "sensitive",
    currency: "USD",
    now: context.now,
  });
  const withMandate = setMandate(base, {
    expectedVersion: 1,
    id: ids.nextMandateId(),
    transactionValueCeiling: { amount: 100, currency: "USD" },
    authorityCeiling: 2,
    now: context.now,
  });
  const withParty = addDealParty(withMandate, {
    expectedVersion: 2,
    id: ids.nextDealPartyId(),
    reference: { kind: "organization", id: "org_target" },
    side: "target",
    label: "Target",
    now: context.now,
  });
  const withRole = assignDealRole(withParty, {
    expectedVersion: 3,
    id: ids.nextDealRoleId(),
    partyId: withParty.parties[0].id,
    name: "target",
    authorityLevel: 1,
    now: context.now,
  });
  return setAuthorityConstraint(withRole, {
    expectedVersion: 4,
    id: ids.nextAuthorityConstraintId(),
    partyId: withRole.parties[0].id,
    action: "approve_terms",
    amountCeiling: { amount: 50, currency: "USD" },
    authorityLevel: 1,
    humanOnly: true,
    now: context.now,
  });
}

function completeFieldMask(): FieldMask {
  return {
    include: [
      field("deal"),
      field("parties"),
      field("roles"),
      field("mandate_ceiling"),
      field("authority_constraints"),
    ],
    omit: [],
    redact: [],
    approvedClassifications: [
      { name: field("deal"), classification: "public" as const },
      {
        name: field("parties"),
        classification: "external_shareable" as const,
      },
      {
        name: field("roles"),
        classification: "relationship_ownership" as const,
      },
      {
        name: field("mandate_ceiling"),
        classification: "mandate_ceiling" as const,
      },
      {
        name: field("authority_constraints"),
        classification: "mandate_ceiling" as const,
      },
    ],
  };
}

function readerFor(
  _context: DealCommandContext,
  deal: Deal,
  authorization: DealAuthorizationPort,
  store = new RecordingReconciliationStore(),
  repository = new RecordingDealRepository(),
): CompatibilityDealReader {
  return new CompatibilityDealReader(
    repository,
    new RecordingLegacySource(fixtureRecord({
      tenantId: deal.tenantId,
      workspaceId: deal.workspaceId,
    })),
    new RecordingMapper(deal),
    store,
    authorization,
  );
}

function fixtureRecord(scope: DealScope): LegacyDealRecord {
  return {
    source: "legacy.fixture",
    legacyDealId: "legacy-1",
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    name: "Compatibility projection",
    dealType: "acquisition",
    confidentiality: "sensitive",
    currency: "USD",
    parties: [],
    team: [],
  };
}

function routingRecord(
  context: DealCommandContext,
  deal: Deal,
): DealReconciliationRecord {
  return {
    recordId: "record-1",
    scope: {
      tenantId: requiredTenantId(context.request.tenantId),
      workspaceId: requiredWorkspaceId(context.request.workspaceId!),
    },
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
    authoritativeDealId: deal.id,
    status: "verified",
    routingMode: "authoritative",
    updatedAt: context.now,
  };
}

Deno.test("compatibility denial performs no protected reads", async () => {
  const context = contextFor();
  const scope = {
    tenantId: requiredTenantId(context.request.tenantId),
    workspaceId: requiredWorkspaceId(context.request.workspaceId!),
  };
  const store = new RecordingReconciliationStore();
  const source = new RecordingLegacySource(fixtureRecord(scope));
  const repository = new RecordingDealRepository();
  const reader = new CompatibilityDealReader(
    repository,
    source,
    new DeterministicLegacyDealMapper(),
    store,
    new DenyingDealAuthorization(),
  );

  assertEquals(
    await reader.read({
      context,
      legacySource: "legacy.fixture",
      legacyDealId: "legacy-1",
    }),
    { kind: "protected_not_found" },
  );
  assertEquals(store.findCalls, 0);
  assertEquals(source.loadCalls, 0);
  assertEquals(repository.findCalls, 0);
});

Deno.test("compatibility reads return a masked projection and safe routing metadata", async () => {
  const context = contextFor();
  const deal = fixtureDeal(context);
  const scope = { tenantId: deal.tenantId, workspaceId: deal.workspaceId };
  const store = new RecordingReconciliationStore();
  const source = new RecordingLegacySource(fixtureRecord(scope));
  const reader = new CompatibilityDealReader(
    new RecordingDealRepository(),
    source,
    new RecordingMapper(deal),
    store,
    new MaskedAuthorization(),
  );
  const result = await reader.read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
  });

  assertEquals(result.kind, "loaded");
  if (result.kind !== "loaded") return;
  assertEquals(result.value.id, deal.id);
  assertEquals(result.value.name, deal.name);
  assertEquals(result.value.parties, undefined);
  assertEquals(result.routing, {
    source: "legacy",
    routingMode: "legacy",
  });
  assertFalse("deal" in result);
  assertFalse("issue" in result.routing);
  assertFalse("intendedDeal" in result.routing);
});

Deno.test("compatibility projections enforce omit, redact, and classification rules", async () => {
  const context = contextFor();
  const deal = richFixtureDeal(context);
  const omitted = await readerFor(
    context,
    deal,
    new MaskedAuthorization({
      ...completeFieldMask(),
      omit: [field("parties"), field("roles")],
    }),
  ).read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
  });
  const redacted = await readerFor(
    context,
    deal,
    new MaskedAuthorization({
      ...completeFieldMask(),
      redact: [field("deal"), field("mandate_ceiling")],
    }),
  ).read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
  });
  const mismatched = await readerFor(
    context,
    deal,
    new MaskedAuthorization({
      ...completeFieldMask(),
      approvedClassifications: completeFieldMask().approvedClassifications.map(
        (approval) =>
          approval.name === field("parties")
            ? { ...approval, classification: "restricted" as const }
            : approval,
      ),
    }),
  ).read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
  });

  if (
    omitted.kind !== "loaded" ||
    redacted.kind !== "loaded" ||
    mismatched.kind !== "loaded"
  ) {
    throw new Error("expected all projection reads to be allowed");
  }
  assertEquals(omitted.value.parties, undefined);
  assertEquals(omitted.value.roles, undefined);
  assertEquals(redacted.value.id, undefined);
  assertEquals(redacted.value.mandate, undefined);
  assertEquals(mismatched.value.parties, undefined);
});

Deno.test("mandate and authority projections require explicit matching approval", async () => {
  const context = contextFor();
  const deal = richFixtureDeal(context);
  const noAuthority = await readerFor(
    context,
    deal,
    new MaskedAuthorization({
      ...completeFieldMask(),
      include: [field("deal")],
    }),
  ).read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
  });
  const authorityApproved = await readerFor(
    context,
    deal,
    new MaskedAuthorization(completeFieldMask()),
  ).read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
  });

  if (noAuthority.kind !== "loaded" || authorityApproved.kind !== "loaded") {
    throw new Error("expected projection reads to be allowed");
  }
  assertEquals(noAuthority.value.mandate, undefined);
  assertEquals(noAuthority.value.authorityConstraints, undefined);
  assertEquals(
    authorityApproved.value.mandate?.transactionValueCeiling,
    { amount: 100, currency: "USD" },
  );
  assertEquals(authorityApproved.value.authorityConstraints?.length, 1);
});

Deno.test("legacy and authoritative routes share projection semantics", async () => {
  const context = contextFor();
  const deal = richFixtureDeal(context);
  const decision = new MaskedAuthorization(completeFieldMask());
  const legacy = await readerFor(context, deal, decision).read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
  });
  const store = new RecordingReconciliationStore();
  await store.save(routingRecord(context, deal));
  const repository = new RecordingDealRepository(deal);
  const authoritative = await readerFor(
    context,
    deal,
    new MaskedAuthorization(completeFieldMask()),
    store,
    repository,
  ).read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
  });

  if (legacy.kind !== "loaded" || authoritative.kind !== "loaded") {
    throw new Error("expected both compatibility routes to load");
  }
  assertEquals(authoritative.value, legacy.value);
});

Deno.test("protected absence and unauthorized compatibility reads are indistinguishable", async () => {
  const context = contextFor();
  const deal = fixtureDeal(context);
  const denied = await readerFor(
    context,
    deal,
    new DenyingDealAuthorization(),
  ).read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
  });
  const absent = await readerFor(
    context,
    deal,
    new RecordingDealAuthorization(),
  ).read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-missing",
  });

  assertEquals(denied, { kind: "protected_not_found" });
  assertEquals(absent, { kind: "protected_not_found" });
});

Deno.test("authoritative routing authorizes logical and exact resources before loading", async () => {
  const context = contextFor();
  const deal = fixtureDeal(context);
  const store = new RecordingReconciliationStore();
  await store.save(routingRecord(context, deal));
  const source = new RecordingLegacySource(fixtureRecord({
    tenantId: deal.tenantId,
    workspaceId: deal.workspaceId,
  }));
  const repository = new RecordingDealRepository();
  await repository.save({
    scope: { tenantId: deal.tenantId, workspaceId: deal.workspaceId },
    aggregate: deal,
    event: {
      eventId: "event_compatibility" as never,
      tenantId: deal.tenantId,
      workspaceId: deal.workspaceId,
      dealId: deal.id,
      actorId: context.actor.id,
      actorKind: context.actor.kind,
      correlationId: context.request.correlationId!,
      aggregateVersion: deal.version,
      eventType: "DealCreated",
      schemaVersion: 1,
      payload: {},
      occurredAt: new Date(context.now),
      availableAt: new Date(context.now),
    },
  });
  const authorization = new RecordingDealAuthorization();
  const reader = new CompatibilityDealReader(
    repository,
    source,
    new RecordingMapper(deal),
    store,
    authorization,
  );
  const result = await reader.read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
  });

  assertEquals(result.kind, "loaded");
  assertEquals(
    authorization.calls.map((call) => call.resource.id),
    ["legacy-1", deal.id],
  );
  assertEquals(source.loadCalls, 0);
  assertEquals(repository.findCalls, 1);
});

Deno.test("routingState authorizes before exposing sanitized metadata", async () => {
  const context = contextFor();
  const deal = fixtureDeal(context);
  const store = new RecordingReconciliationStore();
  await store.save(routingRecord(context, deal));
  const reader = new CompatibilityDealReader(
    new RecordingDealRepository(),
    new RecordingLegacySource(fixtureRecord({
      tenantId: deal.tenantId,
      workspaceId: deal.workspaceId,
    })),
    new RecordingMapper(deal),
    store,
    new DenyingDealAuthorization(),
  );

  assertEquals(
    await reader.routingState({
      context,
      legacySource: "legacy.fixture",
      legacyDealId: "legacy-1",
    }),
    undefined,
  );
  assertEquals(store.findCalls, 0);
});

Deno.test("ordinary compatibility callers cannot retrieve routing records", async () => {
  const context = contextFor();
  const deal = fixtureDeal(context);
  const store = new RecordingReconciliationStore();
  await store.save({
    ...routingRecord(context, deal),
    sourceFingerprint: "secret-fingerprint",
    intendedDeal: deal,
    issue: {
      code: "SCOPE_MISMATCH",
      legacyDealId: "legacy-1",
      received: "secret-received",
      expected: "secret-expected",
      explanation: "secret-explanation",
      operatorInterventionRequired: true,
      retrySafe: false,
    },
  });
  const reader = readerFor(
    context,
    deal,
    new RecordingDealAuthorization(),
    store,
  );
  const result = await reader.routingState({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-1",
  });

  assertEquals(result, {
    source: "authoritative",
    routingMode: "authoritative",
  });
  assertEquals(Object.keys(result ?? {}).sort(), ["routingMode", "source"]);
  assertFalse(JSON.stringify(result).includes("secret"));
  assertFalse(JSON.stringify(result).includes(context.actor.id));
  assertFalse(JSON.stringify(result).includes("history"));
});
