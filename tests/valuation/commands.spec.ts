import { assertEquals, assertRejects } from "@std/assert";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import {
  type JobId,
  parseAggregateVersion,
  parseCorrelationId,
  parseDealId,
  parseIdempotencyKey,
  parseJobId,
  parseOperationId,
  type TenantId,
} from "../../src/platform/api/v1.ts";
import {
  type IdempotencyClaim,
  type IdempotencyClaimResult,
  IdempotencyRepository,
  type TransactionHandle,
} from "../../src/platform/persistence/v1.ts";
import {
  type ClaimedJob,
  type DurableJob,
  type JobFailure,
  JobRepository,
  type StoredJob,
} from "../../src/platform/jobs/v1.ts";
import { sameScope, type ValuationScope } from "../../src/valuation/basis.ts";
import type {
  ValuationEffectInput,
  ValuationEffects,
} from "../../src/valuation/effects.ts";
import {
  type AddValuationInputCommand,
  ValuationCommandService,
  type ValuationTransactionRunner,
} from "../../src/valuation/commands.ts";
import {
  activeModel,
  computedScenario,
  humanActor,
  NOW,
  provenance,
  scope,
  successfulOutcome,
} from "./fixtures.ts";
import type { ValuationRepository } from "../../src/valuation/repository_contract.ts";
import type {
  ValuationApproval,
  ValuationComparison,
  ValuationInput,
  ValuationInvalidation,
  ValuationModel,
  ValuationResult,
  ValuationScenario,
} from "../../src/valuation/model.ts";
import type {
  ValuationApprovalId,
  ValuationComparisonId,
  ValuationInputId,
  ValuationInvalidationId,
  ValuationModelId,
  ValuationResultId,
  ValuationScenarioId,
} from "../../src/valuation/ids.ts";
import type { TransactionQueryResult } from "../../src/platform/persistence/transaction.ts";
import {
  parseValuationApprovalId,
  parseValuationInputId,
  parseValuationInvalidationId,
  parseValuationModelId,
  parseValuationResultId,
  parseValuationScenarioId,
} from "../../src/valuation/ids.ts";
import { ValuationError } from "../../src/valuation/errors.ts";

Deno.test("command service persists exact versions, durable job references, and idempotent replay", async () => {
  const repository = new MemoryValuationRepository();
  const idempotency = new MemoryIdempotencyRepository();
  const jobs = new MemoryJobRepository();
  const effects = new MemoryValuationEffects();
  const service = new ValuationCommandService({
    transactions: new ImmediateTransactionRunner(),
    repository,
    calculations: { compute: () => successfulOutcome() },
    idempotency,
    jobs,
    effects,
    clock: { now: () => NOW },
  });
  const actor = humanActor();
  const context = requestContext(actor);
  const modelId = required("valuation_model_command", parseValuationModelId);
  const create = {
    context,
    actor,
    idempotencyKey: required("idem_create-model", parseIdempotencyKey),
    modelId,
    name: "Command model",
    definition: activeModel().definition,
  } as const;
  const created = await service.createModel(create);
  const replay = await service.createModel(create);
  assertEquals(created.value.id, replay.value.id);
  assertEquals(repository.models.size, 1);
  const active = await service.activateModel({
    ...create,
    idempotencyKey: required("idem_activate-model", parseIdempotencyKey),
    expectedVersion: aggregateVersion(1),
  });
  const scenarioId = required(
    "valuation_scenario_command",
    parseValuationScenarioId,
  );
  const createdScenario = await service.createScenario({
    context,
    actor,
    idempotencyKey: required("idem_create-scenario", parseIdempotencyKey),
    scenarioId,
    modelId,
    modelVersion: active.value.version,
    name: "Command scenario",
  });
  const inputId = required("valuation_input_command", parseValuationInputId);
  const addInput: AddValuationInputCommand = {
    context,
    actor,
    idempotencyKey: required("idem_add-input", parseIdempotencyKey),
    scenarioId,
    inputId,
    expectedScenarioVersion: createdScenario.value.version,
    request: { method: "book-value", input: {} },
    basis: {
      ...createBasisForScenario(scenarioId, modelId, inputId),
      modelVersion: active.value.version,
    },
    provenance: provenance(actor),
  };
  const input = await service.addInput(addInput);
  assertEquals(input.value.version, aggregateVersion(1));
  const enqueue = {
    context,
    actor,
    idempotencyKey: required("idem_enqueue-compute", parseIdempotencyKey),
    scenarioId,
    jobId: required("job_valuation-command", parseJobId),
    operationId: required("op_valuation-command", parseOperationId),
    expectedScenarioVersion: aggregateVersion(2),
    timeoutMs: 60_000,
  } as const;
  const job = await service.enqueueCompute(enqueue);
  const computeReplay = await service.enqueueCompute(enqueue);
  assertEquals(computeReplay.value.jobId, job.value.jobId);
  assertEquals(computeReplay.value.operationId, job.value.operationId);
  assertEquals(jobs.jobs.length, 1);
  assertEquals(
    effects.events.filter((event) =>
      event.eventType === "valuation_compute_queued"
    )
      .length,
    1,
  );
  await assertRejects(
    () => service.enqueueCompute({ ...enqueue, timeoutMs: 61_000 }),
    Error,
    "IDEMPOTENCY_CONFLICT",
  );
  const storedJob = jobs.jobs[0];
  if (storedJob === undefined) throw new Error("Missing stored compute job.");
  jobs.jobs[0] = {
    ...storedJob,
    dealId: required("deal_foreign", parseDealId),
  };
  const scopeError = await assertRejects(
    () => service.enqueueCompute(enqueue),
    ValuationError,
    "terminal replay reference",
  );
  assertEquals(scopeError.code, "IDEMPOTENCY_CONFLICT");
  assertEquals(job.value.payload.modelVersion, active.value.version);
  assertEquals(job.value.inputVersionReferences.length, 3);
  assertEquals(effects.events.map((event) => event.eventType), [
    "valuation_model_created",
    "valuation_model_activated",
    "valuation_scenario_created",
    "valuation_input_attached",
    "valuation_compute_queued",
  ]);
  const claimed: ClaimedJob = {
    ...job.value,
    state: "running",
    attemptNumber: 1,
    workerId: "valuation-worker",
    attemptStartedAt: NOW,
    leaseExpiresAt: new Date(NOW.getTime() + 60_000),
    progress: 0,
  };
  const computed = await service.executeCompute({
    job: claimed,
    resultId: required("valuation_result_command", parseValuationResultId),
  });
  assertEquals(computed.value.modelVersion, active.value.version);
  assertEquals(repository.scenarios.get(scenarioId)?.state, "computed");
  assertEquals(jobs.completions.length, 1);
});

Deno.test("approval terminal replay returns the original approval once", async () => {
  const harness = commandHarness();
  const current = computedScenario();
  harness.repository.scenarios.set(current.scenario.id, current.scenario);
  harness.repository.results.set(current.result.id, current.result);
  const actor = humanActor();
  const command = {
    context: requestContext(actor),
    actor,
    authority: {
      snapshotId: "authority_command",
      actorId: actor.id,
      policyVersion: "valuation-policy-v1",
      scope: current.scenario.scope,
      capturedAt: NOW,
    },
    scenarioId: current.scenario.id,
    resultId: current.result.id,
    approvalId: required(
      "valuation_approval_command",
      parseValuationApprovalId,
    ),
    idempotencyKey: required("idem_approve-command", parseIdempotencyKey),
    expectedScenarioVersion: current.scenario.version,
  } as const;

  const first = await harness.service.approve(command);
  const replay = await harness.service.approve(command);

  assertEquals(replay.value.id, first.value.id);
  assertEquals(harness.repository.approvals.size, 1);
  assertEquals(
    harness.effects.events.filter((event) =>
      event.eventType === "valuation_approved"
    )
      .length,
    1,
  );
  const storedApproval = harness.repository.approvals.get(first.value.id);
  if (storedApproval === undefined) {
    throw new Error("Missing stored valuation approval.");
  }
  harness.repository.approvals.set(first.value.id, {
    ...storedApproval,
    scope: {
      ...storedApproval.scope,
      dealId: required("deal_foreign", parseDealId),
    },
  });
  const scopeError = await assertRejects(
    () => harness.service.approve(command),
    ValuationError,
    "terminal replay reference",
  );
  assertEquals(scopeError.code, "IDEMPOTENCY_CONFLICT");
  await assertRejects(
    () =>
      harness.service.approve({
        ...command,
        approvalId: required(
          "valuation_approval_changed",
          parseValuationApprovalId,
        ),
      }),
    Error,
    "IDEMPOTENCY_CONFLICT",
  );
});

Deno.test(
  "invalidation terminal replay returns the original invalidation once",
  async () => {
    const harness = commandHarness();
    const current = computedScenario();
    harness.repository.scenarios.set(current.scenario.id, current.scenario);
    harness.repository.results.set(current.result.id, current.result);
    const actor = humanActor();
    const command = {
      context: requestContext(actor),
      actor,
      scenarioId: current.scenario.id,
      resultId: current.result.id,
      invalidationId: required(
        "valuation_invalidation_command",
        parseValuationInvalidationId,
      ),
      idempotencyKey: required("idem_invalidate-command", parseIdempotencyKey),
      expectedScenarioVersion: current.scenario.version,
      kind: "stale" as const,
      reason: "The reviewed input became stale.",
      sourceReference: "evidence-command",
    } as const;

    const first = await harness.service.invalidate(command);
    const replay = await harness.service.invalidate(command);

    assertEquals(replay.value.id, first.value.id);
    assertEquals(harness.repository.invalidations.size, 1);
    assertEquals(
      harness.effects.events.filter((event) =>
        event.eventType === "valuation_invalidated"
      )
        .length,
      1,
    );
    const storedInvalidation = harness.repository.invalidations.get(
      first.value.id,
    );
    if (storedInvalidation === undefined) {
      throw new Error("Missing stored valuation invalidation.");
    }
    harness.repository.invalidations.set(first.value.id, {
      ...storedInvalidation,
      scope: {
        ...storedInvalidation.scope,
        dealId: required("deal_foreign", parseDealId),
      },
    });
    const scopeError = await assertRejects(
      () => harness.service.invalidate(command),
      ValuationError,
      "terminal replay reference",
    );
    assertEquals(scopeError.code, "IDEMPOTENCY_CONFLICT");
    await assertRejects(
      () =>
        harness.service.invalidate({
          ...command,
          reason: "A different stale reason.",
        }),
      Error,
      "IDEMPOTENCY_CONFLICT",
    );
  },
);

Deno.test("in-progress Valuation claims retain platform retry semantics", async () => {
  const actor = humanActor();
  const service = new ValuationCommandService({
    transactions: new ImmediateTransactionRunner(),
    repository: new MemoryValuationRepository(),
    calculations: { compute: () => successfulOutcome() },
    idempotency: new InProgressIdempotencyRepository(),
    jobs: new MemoryJobRepository(),
    effects: new MemoryValuationEffects(),
    clock: { now: () => NOW },
  });

  const error = await assertRejects(
    () =>
      service.enqueueCompute({
        context: requestContext(actor),
        actor,
        idempotencyKey: required("idem_in-progress", parseIdempotencyKey),
        scenarioId: required(
          "valuation_scenario_inprogress",
          parseValuationScenarioId,
        ),
        jobId: required("job_valuation-inprogress", parseJobId),
        operationId: required("op_valuation-inprogress", parseOperationId),
        expectedScenarioVersion: aggregateVersion(1),
      }),
    ValuationError,
    "no replayable terminal result",
  );
  assertEquals(error.code, "IDEMPOTENCY_IN_PROGRESS");
});

Deno.test("compute command rejects an optimistic concurrency mismatch before queueing", async () => {
  const repository = new MemoryValuationRepository();
  const actor = humanActor();
  const service = new ValuationCommandService({
    transactions: new ImmediateTransactionRunner(),
    repository,
    calculations: { compute: () => successfulOutcome() },
    idempotency: new MemoryIdempotencyRepository(),
    jobs: new MemoryJobRepository(),
    effects: new MemoryValuationEffects(),
    clock: { now: () => NOW },
  });
  const context = requestContext(actor);
  const scenarioId = required(
    "valuation_scenario_missing",
    parseValuationScenarioId,
  );
  await assertRejects(
    () =>
      service.enqueueCompute({
        context,
        actor,
        idempotencyKey: required("idem_missing-scenario", parseIdempotencyKey),
        scenarioId,
        jobId: required("job_missing-scenario", parseJobId),
        operationId: required("op_missing-scenario", parseOperationId),
        expectedScenarioVersion: aggregateVersion(1),
      }),
    Error,
    "not found",
  );
});

class ImmediateTransactionRunner implements ValuationTransactionRunner {
  private readonly transaction = new EmptyTransaction();

  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    return Promise.resolve(callback(this.transaction));
  }
}

function commandHarness() {
  const repository = new MemoryValuationRepository();
  const idempotency = new MemoryIdempotencyRepository();
  const jobs = new MemoryJobRepository();
  const effects = new MemoryValuationEffects();
  const service = new ValuationCommandService({
    transactions: new ImmediateTransactionRunner(),
    repository,
    calculations: { compute: () => successfulOutcome() },
    idempotency,
    jobs,
    effects,
    clock: { now: () => NOW },
  });
  return { repository, idempotency, jobs, effects, service };
}

class EmptyTransaction implements TransactionHandle {
  readonly metadata = {};

  query<TRow = Record<string, unknown>>(
    _text: string,
    _parameters: readonly unknown[] = [],
  ): Promise<TransactionQueryResult<TRow>> {
    return Promise.resolve({ rows: [], rowCount: 0 });
  }
}

class MemoryIdempotencyRepository extends IdempotencyRepository {
  private readonly records = new Map<
    string,
    {
      readonly digest: string;
      state: "in_progress" | "completed";
      reference?: string;
    }
  >();

  constructor() {
    super({ now: () => NOW });
  }

  override claim(
    _transaction: TransactionHandle,
    claim: IdempotencyClaim,
  ): Promise<IdempotencyClaimResult> {
    const key = idempotencyIdentity(claim);
    const existing = this.records.get(key);
    if (existing === undefined) {
      this.records.set(key, {
        digest: claim.payloadDigest,
        state: "in_progress",
      });
      return Promise.resolve({ status: "claimed" });
    }
    if (existing.digest !== claim.payloadDigest) {
      throw new Error("IDEMPOTENCY_CONFLICT");
    }
    if (existing.state === "in_progress") {
      return Promise.resolve({ status: "in_progress" });
    }
    return Promise.resolve({
      status: "replay",
      state: "completed",
      resultReference: existing.reference,
      errorReference: undefined,
    });
  }

  override complete(
    _transaction: TransactionHandle,
    claim: IdempotencyClaim,
    resultReference: string,
  ): Promise<void> {
    const record = this.records.get(idempotencyIdentity(claim));
    if (record === undefined) throw new Error("Missing fake idempotency claim");
    this.records.set(idempotencyIdentity(claim), {
      ...record,
      state: "completed",
      reference: resultReference,
    });
    return Promise.resolve();
  }
}

class InProgressIdempotencyRepository extends IdempotencyRepository {
  constructor() {
    super({ now: () => NOW });
  }

  override claim(
    _transaction: TransactionHandle,
    _claim: IdempotencyClaim,
  ): Promise<IdempotencyClaimResult> {
    return Promise.resolve({ status: "in_progress" });
  }
}

class MemoryJobRepository extends JobRepository {
  readonly jobs: DurableJob[] = [];
  readonly completions: string[] = [];

  override find(
    _transaction: TransactionHandle,
    tenantId: TenantId,
    jobId: JobId,
  ): Promise<StoredJob | undefined> {
    const job = this.jobs.find((candidate) =>
      candidate.tenantId === tenantId && candidate.jobId === jobId
    );
    if (job === undefined || job.operationId === undefined) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve({
      ...job,
      operationId: job.operationId,
      state: "queued" as const,
      progress: 0,
      attemptCount: 0,
    });
  }

  override enqueue(
    _transaction: TransactionHandle,
    job: DurableJob,
  ): Promise<void> {
    this.jobs.push(job);
    return Promise.resolve();
  }

  override complete(
    _transaction: TransactionHandle,
    job: ClaimedJob,
    resultReference: string,
    _completedAt: Date,
  ): Promise<void> {
    this.completions.push(`${job.jobId}:${resultReference}`);
    return Promise.resolve();
  }

  override fail(
    _transaction: TransactionHandle,
    _job: ClaimedJob,
    _failure: JobFailure,
  ): Promise<void> {
    return Promise.resolve();
  }
}

class MemoryValuationEffects implements ValuationEffects {
  readonly events: ValuationEffectInput[] = [];

  append(
    _transaction: TransactionHandle,
    input: ValuationEffectInput,
  ): Promise<void> {
    this.events.push(input);
    return Promise.resolve();
  }
}

class MemoryValuationRepository implements ValuationRepository {
  readonly models = new Map<string, ValuationModel>();
  readonly scenarios = new Map<string, ValuationScenario>();
  readonly inputs = new Map<string, ValuationInput>();
  readonly results = new Map<string, ValuationResult>();
  readonly approvals = new Map<string, ValuationApproval>();
  readonly invalidations = new Map<string, ValuationInvalidation>();

  insertModel(
    _transaction: TransactionHandle,
    model: ValuationModel,
  ): Promise<void> {
    this.models.set(`${model.id}:${model.version}`, model);
    return Promise.resolve();
  }
  findModel(
    _transaction: TransactionHandle,
    _scope: ValuationScope,
    id: ValuationModelId,
    version?: number,
  ): Promise<ValuationModel | undefined> {
    return Promise.resolve(
      [...this.models.values()].filter((model) =>
        model.id === id && (version === undefined || model.version === version)
      ).sort((left, right) => right.version - left.version)[0],
    );
  }
  insertScenario(
    _transaction: TransactionHandle,
    value: ValuationScenario,
  ): Promise<void> {
    this.scenarios.set(value.id, value);
    return Promise.resolve();
  }
  findScenario(
    _transaction: TransactionHandle,
    _scope: ValuationScope,
    id: ValuationScenarioId,
  ): Promise<ValuationScenario | undefined> {
    return Promise.resolve(this.scenarios.get(id));
  }
  updateScenario(
    _transaction: TransactionHandle,
    value: ValuationScenario,
    expectedVersion: number,
  ): Promise<void> {
    const current = this.scenarios.get(value.id);
    if (current?.version !== expectedVersion) {
      throw new Error("VERSION_CONFLICT");
    }
    this.scenarios.set(value.id, value);
    return Promise.resolve();
  }
  insertInput(
    _transaction: TransactionHandle,
    value: ValuationInput,
  ): Promise<void> {
    this.inputs.set(`${value.id}:${value.version}`, value);
    return Promise.resolve();
  }
  findInput(
    _transaction: TransactionHandle,
    _scope: ValuationScope,
    id: ValuationInputId,
    version?: number,
  ): Promise<ValuationInput | undefined> {
    return Promise.resolve(
      [...this.inputs.values()].filter((value) =>
        value.id === id && (version === undefined || value.version === version)
      ).sort((left, right) => right.version - left.version)[0],
    );
  }
  insertResult(
    _transaction: TransactionHandle,
    value: ValuationResult,
  ): Promise<void> {
    this.results.set(value.id, value);
    return Promise.resolve();
  }
  findResult(
    _transaction: TransactionHandle,
    _scope: ValuationScope,
    id: ValuationResultId,
  ): Promise<ValuationResult | undefined> {
    return Promise.resolve(this.results.get(id));
  }
  insertApproval(
    _transaction: TransactionHandle,
    value: ValuationApproval,
  ): Promise<void> {
    this.approvals.set(value.id, value);
    return Promise.resolve();
  }
  findApproval(
    _transaction: TransactionHandle,
    lookupScope: ValuationScope,
    id: ValuationApprovalId,
  ): Promise<ValuationApproval | undefined> {
    const approval = this.approvals.get(id);
    return Promise.resolve(
      approval !== undefined && sameScope(approval.scope, lookupScope)
        ? approval
        : undefined,
    );
  }
  insertInvalidation(
    _transaction: TransactionHandle,
    value: ValuationInvalidation,
  ): Promise<void> {
    this.invalidations.set(value.id, value);
    return Promise.resolve();
  }
  findInvalidation(
    _transaction: TransactionHandle,
    lookupScope: ValuationScope,
    id: ValuationInvalidationId,
  ): Promise<ValuationInvalidation | undefined> {
    const invalidation = this.invalidations.get(id);
    return Promise.resolve(
      invalidation !== undefined && sameScope(invalidation.scope, lookupScope)
        ? invalidation
        : undefined,
    );
  }
  listInvalidations(
    _transaction: TransactionHandle,
    lookupScope: ValuationScope,
    scenarioId: ValuationScenarioId,
  ): Promise<ValuationInvalidation[]> {
    return Promise.resolve(
      [...this.invalidations.values()].filter((invalidation) =>
        sameScope(invalidation.scope, lookupScope) &&
        invalidation.scenarioId === scenarioId
      ),
    );
  }
  insertComparison(
    _transaction: TransactionHandle,
    _value: ValuationComparison,
  ): Promise<void> {
    return Promise.resolve();
  }
  findComparison(
    _transaction: TransactionHandle,
    _scope: ValuationScope,
    _id: ValuationComparisonId,
  ): Promise<ValuationComparison | undefined> {
    return Promise.resolve(undefined);
  }
}

function requestContext(actor: ActorReference) {
  const currentScope = scope();
  return {
    actorId: actor.id,
    tenantId: currentScope.tenantId,
    workspaceId: currentScope.workspaceId,
    dealId: currentScope.dealId,
    correlationId: required("cor_valuation-command", parseCorrelationId),
    origin: "http" as const,
  };
}

function createBasisForScenario(
  scenarioId: ValuationScenarioId,
  modelId: ValuationModelId,
  inputId: ValuationInputId,
) {
  return {
    scope: scope(),
    modelId,
    modelVersion: aggregateVersion(1),
    scenarioId,
    scenarioVersion: aggregateVersion(1),
    inputId,
    inputVersion: aggregateVersion(1),
    references: [{
      kind: "fact_version" as const,
      id: "factver_financials",
      version: aggregateVersion(1),
    }],
    basisDigest: "b".repeat(64),
    capturedAt: NOW,
  };
}

function idempotencyIdentity(claim: IdempotencyClaim): string {
  return [
    claim.tenantId,
    claim.actorId,
    claim.commandType,
    claim.targetType,
    claim.targetId,
    claim.idempotencyKey,
  ].join(":");
}

function required<T>(
  value: unknown,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const parsed = parser(value);
  if (parsed.ok) return parsed.value;
  throw new Error(`Fixture identifier "${String(value)}" is invalid.`);
}

function aggregateVersion(value: number) {
  const parsed = parseAggregateVersion(value);
  if (parsed.ok) return parsed.value;
  throw new Error(`Fixture version "${value}" is invalid.`);
}
