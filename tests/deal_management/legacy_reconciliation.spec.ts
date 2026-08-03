import { assert, assertEquals, assertNotEquals } from "@std/assert";
import {
  CompatibilityDealReader,
  DealManagementService,
  DealReconciliationExecutor,
  DeterministicLegacyDealMapper,
  InMemoryDealReconciliationStore,
  InMemoryDealRepository,
  InMemoryLegacyDealSource,
  type LegacyDealRecord,
} from "../../src/deal_management/v1.ts";
import {
  contextFor,
  FixedDealClock,
  keyFor,
  RecordingDealAuthorization,
  requiredTenantId,
  requiredWorkspaceId,
  SequentialDealIdFactory,
} from "./support.ts";

const context = contextFor();
const scope = {
  tenantId: requiredTenantId(context.request.tenantId),
  workspaceId: requiredWorkspaceId(context.request.workspaceId!),
};

function validLegacyDeal(
  overrides: Partial<LegacyDealRecord> = {},
): LegacyDealRecord {
  return {
    source: "legacy.fixture",
    legacyDealId: "legacy-deal-1",
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    name: "Legacy acquisition",
    dealType: "acquisition",
    confidentiality: "sensitive",
    currency: "USD",
    parties: [{
      legacyPartyId: "business-target",
      reference: { kind: "organization", id: "org_target" },
      side: "target",
      label: "Target",
    }],
    team: [{
      legacyMemberId: "advisor-1",
      reference: { kind: "person", id: "person_advisor" },
      assignmentRole: "advisor",
      side: "advisor",
      label: "Advisor",
      authorityLevel: 1,
    }],
    mandate: {
      transactionValueCeiling: 100,
      currency: "USD",
      authorityCeiling: 2,
    },
    ...overrides,
  };
}

function operatorContext() {
  return {
    scope,
    actorId: context.actor.id,
    correlationId: context.request.correlationId,
    now: context.now,
    commandContext: context,
  };
}

function executorFixture(record: LegacyDealRecord) {
  const source = new InMemoryLegacyDealSource([record]);
  const mapper = new DeterministicLegacyDealMapper();
  const store = new InMemoryDealReconciliationStore();
  const repository = new InMemoryDealRepository();
  const authorization = new RecordingDealAuthorization();
  const service = new DealManagementService({
    repository,
    authorization,
    ids: new SequentialDealIdFactory("reconcile"),
    clock: new FixedDealClock(context.now),
  });
  const executor = new DealReconciliationExecutor(
    source,
    mapper,
    store,
    service,
    repository,
  );
  return {
    source,
    mapper,
    store,
    repository,
    authorization,
    service,
    executor,
  };
}

Deno.test("legacy mapper preserves stable identity and maps parties and team roles", async () => {
  const mapper = new DeterministicLegacyDealMapper();
  const record = validLegacyDeal();
  const first = await mapper.map({ record, scope, now: context.now });
  const second = await mapper.map({ record, scope, now: context.now });
  assertEquals(first.kind, "mapped");
  assertEquals(second.kind, "mapped");
  if (first.kind !== "mapped" || second.kind !== "mapped") return;
  assertEquals(first.authoritativeDealId, second.authoritativeDealId);
  assertEquals(first.sourceFingerprint, second.sourceFingerprint);
  assertEquals(first.deal.parties.length, 2);
  assertEquals(first.deal.roles.length, 1);
  assertEquals(first.deal.mandate?.authorityCeiling, 2);
});

Deno.test("legacy mapper returns explicit outcomes for unsafe values", async () => {
  const mapper = new DeterministicLegacyDealMapper();
  const invalidCurrency = await mapper.map({
    record: validLegacyDeal({ currency: "usd" }),
    scope,
    now: context.now,
  });
  assertEquals(invalidCurrency.kind, "invalid_legacy_record");
  if (invalidCurrency.kind === "invalid_legacy_record") {
    assertEquals(invalidCurrency.issue.code, "INVALID_CURRENCY");
    assert(invalidCurrency.issue.expected.includes("uppercase"));
  }
  const unsupportedType = await mapper.map({
    record: validLegacyDeal({ dealType: "unknown-workflow" }),
    scope,
    now: context.now,
  });
  assertEquals(unsupportedType.kind, "unsupported_legacy_shape");
  const missingReference = await mapper.map({
    record: validLegacyDeal({
      parties: [{
        legacyPartyId: "business-target",
        side: "target",
        label: "Target",
      }],
    }),
    scope,
    now: context.now,
  });
  assertEquals(missingReference.kind, "missing_required_reference");
});

Deno.test("dry-run writes diagnostics only and creates no Deal history or outbox", async () => {
  const fixture = executorFixture(validLegacyDeal());
  const result = await fixture.executor.run({
    mode: "dry-run",
    legacyDealId: "legacy-deal-1",
    operator: operatorContext(),
  });
  assertEquals(result.outcomes[0]?.kind, "mapped");
  assertEquals((await fixture.repository.list(scope)).length, 0);
  const mapped = await fixture.mapper.map({
    record: validLegacyDeal(),
    scope,
    now: context.now,
  });
  if (mapped.kind === "mapped") {
    assertEquals(
      (await fixture.repository.listEvents(scope, mapped.deal.id)).length,
      0,
    );
  }
  const stored = await fixture.store.find({
    scope,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-deal-1",
  });
  assertEquals(stored?.status, "dry_run_valid");
  assertEquals(stored?.routingMode, "legacy");
});

Deno.test("apply is idempotent, resumable, and records verified per-Deal state", async () => {
  const fixture = executorFixture(validLegacyDeal());
  const first = await fixture.executor.run({
    mode: "apply",
    legacyDealId: "legacy-deal-1",
    operator: operatorContext(),
  });
  const second = await fixture.executor.run({
    mode: "resume",
    legacyDealId: "legacy-deal-1",
    operator: operatorContext(),
  });
  assertEquals(first.outcomes[0]?.kind, "verified");
  assertEquals(second.outcomes[0]?.kind, "already_reconciled");
  const dryRun = await fixture.executor.run({
    mode: "dry-run",
    legacyDealId: "legacy-deal-1",
    operator: operatorContext(),
  });
  assertEquals(dryRun.outcomes[0]?.kind, "mapped");
  assertEquals(
    (await fixture.store.find({
      scope,
      legacySource: "legacy.fixture",
      legacyDealId: "legacy-deal-1",
    }))?.routingMode,
    "authoritative",
  );
  const verification = await fixture.executor.verifyBatch({
    legacyDealIds: ["legacy-deal-1"],
    operator: operatorContext(),
  });
  assertEquals(verification.outcomes[0]?.kind, "verified");
  const verifiedRecord = verification.outcomes[0]?.record;
  if (verifiedRecord === undefined) throw new Error("expected verified record");
  await fixture.store.save({ ...verifiedRecord, status: "applied" });
  const interrupted = await fixture.executor.verifyBatch({
    legacyDealIds: ["legacy-deal-1"],
    operator: operatorContext(),
  });
  assertEquals(interrupted.outcomes[0]?.record.status, "verified");
  assertEquals(
    (await fixture.store.find({
      scope,
      legacySource: "legacy.fixture",
      legacyDealId: "legacy-deal-1",
    }))?.status,
    "verified",
  );
  const driftExecutor = new DealReconciliationExecutor(
    new InMemoryLegacyDealSource([
      validLegacyDeal({ name: "Changed legacy content" }),
    ]),
    fixture.mapper,
    fixture.store,
    fixture.service,
    fixture.repository,
  );
  const drift = await driftExecutor.run({
    mode: "resume",
    legacyDealId: "legacy-deal-1",
    operator: operatorContext(),
  });
  assertEquals(drift.outcomes[0]?.kind, "conflict");
  assertEquals(
    (await fixture.store.find({
      scope,
      legacySource: "legacy.fixture",
      legacyDealId: "legacy-deal-1",
    }))?.status,
    "conflict",
  );
  assertEquals((await fixture.repository.list(scope)).length, 1);
  const stored = await fixture.store.find({
    scope,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-deal-1",
  });
  assertEquals(stored?.status, "conflict");
  assertEquals(stored?.routingMode, "authoritative");
});

Deno.test("one invalid legacy Deal does not erase an earlier successful reconciliation", async () => {
  const valid = validLegacyDeal();
  const invalid = validLegacyDeal({
    legacyDealId: "legacy-deal-invalid",
    currency: "usd",
  });
  const fixture = executorFixture(valid);
  const source = new InMemoryLegacyDealSource([valid, invalid]);
  const mapper = new DeterministicLegacyDealMapper();
  const batchExecutor = new DealReconciliationExecutor(
    source,
    mapper,
    fixture.store,
    fixture.service,
    fixture.repository,
  );
  const result = await batchExecutor.runBatch({
    mode: "apply",
    legacyDealIds: [valid.legacyDealId, invalid.legacyDealId],
    operator: operatorContext(),
  });
  assertEquals(result.outcomes.map((outcome) => outcome.kind), [
    "verified",
    "rejected",
  ]);
  assertEquals((await fixture.repository.list(scope)).length, 1);
});

Deno.test("verification rejects a mismatched persisted intended document", async () => {
  const fixture = executorFixture(validLegacyDeal());
  await fixture.executor.run({
    mode: "apply",
    legacyDealId: "legacy-deal-1",
    operator: operatorContext(),
  });
  const stored = await fixture.store.find({
    scope,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-deal-1",
  });
  if (stored?.intendedDeal === undefined) throw new Error("expected intent");
  await fixture.store.save({
    ...stored,
    status: "applied",
    intendedDeal: { ...stored.intendedDeal, name: "Corrupted intent" },
  });
  const result = await fixture.executor.verifyBatch({
    legacyDealIds: ["legacy-deal-1"],
    operator: operatorContext(),
  });
  assertEquals(result.outcomes[0]?.kind, "conflict");
  assertEquals(result.outcomes[0]?.record.status, "conflict");
});

Deno.test("identity collision is rejected before any authoritative mutation", async () => {
  const fixture = executorFixture(validLegacyDeal());
  const mapped = await fixture.mapper.map({
    record: validLegacyDeal(),
    scope,
    now: context.now,
  });
  if (mapped.kind !== "mapped") throw new Error("expected mapped fixture");
  const created = await fixture.service.createDeal({
    type: "create_deal",
    context,
    idempotencyKey: keyFor("collision-seed"),
    dealId: mapped.deal.id,
    name: "Unrelated authoritative Deal",
    dealType: mapped.deal.dealType,
    confidentiality: mapped.deal.confidentiality,
    currency: mapped.deal.currency,
  });
  const beforeEvents = await fixture.repository.listEvents(
    scope,
    mapped.deal.id,
  );
  const reconciliation = await fixture.executor.run({
    mode: "apply",
    legacyDealId: "legacy-deal-1",
    operator: operatorContext(),
  });
  const persisted = await fixture.repository.find(scope, mapped.deal.id);
  assertEquals(reconciliation.outcomes[0]?.kind, "conflict");
  assertEquals(persisted, created.deal);
  assertEquals(
    await fixture.repository.listEvents(scope, mapped.deal.id),
    beforeEvents,
  );
});

Deno.test("rollback routing reads legacy data while retaining authoritative Deal", async () => {
  const fixture = executorFixture(validLegacyDeal());
  await fixture.executor.run({
    mode: "apply",
    legacyDealId: "legacy-deal-1",
    operator: operatorContext(),
  });
  const reader = new CompatibilityDealReader(
    fixture.repository,
    fixture.source,
    fixture.mapper,
    fixture.store,
    fixture.authorization,
  );
  const authoritative = await reader.read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-deal-1",
  });
  assertEquals(authoritative.kind, "loaded");
  if (authoritative.kind === "loaded") {
    assertEquals(authoritative.source, "authoritative");
  }
  await fixture.executor.rollbackReadRouting({
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-deal-1",
    operator: operatorContext(),
    reason: "operator rollback validation",
  });
  const legacy = await reader.read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-deal-1",
  });
  assertEquals(legacy.kind, "loaded");
  if (legacy.kind === "loaded") assertEquals(legacy.source, "legacy");
  const stored = await fixture.store.find({
    scope,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-deal-1",
  });
  assertEquals(stored?.status, "rollback_routed");
  assertEquals(stored?.routingMode, "legacy");
  assertEquals((await fixture.repository.list(scope)).length, 1);
  assertNotEquals(stored?.authoritativeDealId, undefined);
  assertEquals(
    (await fixture.store.listRoutingChanges({
      scope,
      legacySource: "legacy.fixture",
      legacyDealId: "legacy-deal-1",
    })).length,
    1,
  );
  await fixture.executor.restoreAuthoritativeReadRouting({
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-deal-1",
    operator: operatorContext(),
    reason: "operator restore validation",
  });
  const restored = await reader.read({
    context,
    legacySource: "legacy.fixture",
    legacyDealId: "legacy-deal-1",
  });
  assertEquals(restored.kind, "loaded");
  if (restored.kind === "loaded") {
    assertEquals(restored.source, "authoritative");
  }
  assertEquals(
    (await fixture.store.listRoutingChanges({
      scope,
      legacySource: "legacy.fixture",
      legacyDealId: "legacy-deal-1",
    })).length,
    2,
  );
});
