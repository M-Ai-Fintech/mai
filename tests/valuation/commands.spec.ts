import { assertEquals, assertRejects } from "@std/assert";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import {
  parseAggregateVersion,
  parseCorrelationId,
  parseIdempotencyKey,
  parseJobId,
  parseOperationId,
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
} from "../../src/platform/jobs/v1.ts";
import type { ValuationScope } from "../../src/valuation/basis.ts";
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
  ValuationComparisonId,
  ValuationInputId,
  ValuationModelId,
  ValuationResultId,
  ValuationScenarioId,
} from "../../src/valuation/ids.ts";
import type { TransactionQueryResult } from "../../src/platform/persistence/transaction.ts";
import {
  parseValuationInputId,
  parseValuationModelId,
  parseValuationResultId,
  parseValuationScenarioId,
} from "../../src/valuation/ids.ts";

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
  const job = await service.enqueueCompute({
    context,
    actor,
    idempotencyKey: required("idem_enqueue-compute", parseIdempotencyKey),
    scenarioId,
    jobId: required("job_valuation-command", parseJobId),
    operationId: required("op_valuation-command", parseOperationId),
    expectedScenarioVersion: aggregateVersion(2),
    timeoutMs: 60_000,
  });
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

class MemoryJobRepository extends JobRepository {
  readonly jobs: DurableJob[] = [];
  readonly completions: string[] = [];

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
    _value: ValuationApproval,
  ): Promise<void> {
    return Promise.resolve();
  }
  insertInvalidation(
    _transaction: TransactionHandle,
    _value: ValuationInvalidation,
  ): Promise<void> {
    return Promise.resolve();
  }
  listInvalidations(
    _transaction: TransactionHandle,
    _scope: ValuationScope,
    _id: ValuationScenarioId,
  ): Promise<ValuationInvalidation[]> {
    return Promise.resolve([]);
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
