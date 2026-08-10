import { assert, assertEquals, assertRejects } from "@std/assert";
import type {
  ClaimedJob,
  DurableJob,
  JobExecutionContext,
} from "../../src/platform/jobs/v1.ts";
import { FinancialRiskApplication } from "../../src/financial_risk/application.ts";
import { FinancialRiskError } from "../../src/financial_risk/errors.ts";
import {
  FinancialRiskJobExecutor,
  FinancialRiskJobVersionChecker,
} from "../../src/financial_risk/worker.ts";
import { InMemoryFinancialRiskRepository } from "../../src/financial_risk/repository.ts";
import {
  computeRequest,
  FakeFinancialRiskAuthorization,
  FakeFinancialRiskInference,
  FINANCIAL_RISK_ALL_FIELD_MASK,
  FreshnessFlippingInference,
  RecordingFinancialRiskJobPort,
  RecordingInputLoader,
  RecordingReferenceVerifier,
  TEST_TIME,
} from "./support.ts";
import {
  FINANCIAL_RISK_INPUT_FIELD_MASK,
  FINANCIAL_RISK_INPUT_FIELDS,
} from "../../src/financial_risk/input_contract.ts";

Deno.test("financial-risk queued jobs carry exact evidence fences and reauthorize before loading", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const references = new RecordingReferenceVerifier();
  const loader = new RecordingInputLoader();
  const application = new FinancialRiskApplication(
    new FakeFinancialRiskAuthorization(),
    references,
    new FakeFinancialRiskInference(),
    new InMemoryFinancialRiskRepository(),
    { now: () => new Date(TEST_TIME) },
    jobs,
  );
  const accepted = await application.enqueueCompute(
    computeRequest({ loadInput: loader }),
  );
  const fence = accepted.job.inputVersionReferences;
  assert(
    fence.some((entry) =>
      entry.aggregateType === "financial_risk_evidence_basis"
    ),
  );
  assert(fence.some((entry) => entry.aggregateType === "evidence"));
  assert(fence.every((entry) => entry.exactReference !== undefined));

  const checker = new FinancialRiskJobVersionChecker(application);
  assertEquals(await checker.recheck(claimed(accepted.job)), true);
  assertEquals(references.calls, 2);
  assertEquals(loader.calls, 0);
  const payloadReferences = accepted.job.payload.references as Record<
    string,
    unknown
  >;
  const basis = payloadReferences.evidenceBasis as Record<string, unknown>;
  const tampered = {
    ...accepted.job,
    payload: {
      ...accepted.job.payload,
      references: {
        ...payloadReferences,
        evidenceBasis: { ...basis, basisDigest: "b".repeat(64) },
      },
    },
  };
  assertEquals(await checker.recheck(claimed(tampered)), false);
  assertEquals(references.calls, 2);
  references.setFailure(
    new FinancialRiskError(
      "EXACT_VERSION_MISMATCH",
      "Queued evidence basis is no longer current.",
    ),
  );
  assertEquals(await checker.recheck(claimed(accepted.job)), false);
  assertEquals(loader.calls, 0);
  references.setFailure();

  const executor = new FinancialRiskJobExecutor(application, loader);
  const output = await executor.execute(
    claimed(accepted.job),
    executionContext(),
  );

  assertEquals(output.resultReference, "risk_result_alpha");
  assertEquals(loader.calls, 1);
  assertEquals(references.calls, 5);

  assertEquals(await checker.recheck(claimed(accepted.job)), true);
  const replayed = await executor.execute(
    claimed(accepted.job),
    executionContext(),
  );
  assertEquals(replayed.resultReference, "risk_result_alpha");
  assertEquals(loader.calls, 1);
});

Deno.test("queued worker reauthorization blocks a named loader after an input grant is narrowed", async () => {
  const authorization = new FakeFinancialRiskAuthorization();
  const loader = new RecordingInputLoader();
  const application = new FinancialRiskApplication(
    authorization,
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    new InMemoryFinancialRiskRepository(),
    { now: () => new Date(TEST_TIME) },
    new RecordingFinancialRiskJobPort(),
  );
  const accepted = await application.enqueueCompute(
    computeRequest({ loadInput: loader }),
  );
  const missing = FINANCIAL_RISK_INPUT_FIELDS.totalAssets;
  authorization.setFieldMask({
    ...FINANCIAL_RISK_ALL_FIELD_MASK,
    include: FINANCIAL_RISK_INPUT_FIELD_MASK.include.filter((name) =>
      name !== missing
    ),
    approvedClassifications: FINANCIAL_RISK_INPUT_FIELD_MASK
      .approvedClassifications.filter((entry) => entry.name !== missing),
  });

  const executor = new FinancialRiskJobExecutor(application, loader);
  await assertRejects(
    () => executor.execute(claimed(accepted.job), executionContext()),
    FinancialRiskError,
    "Financial-risk assessment",
  );
  assertEquals(loader.calls, 0);
});

Deno.test("queued compute records cancellation observed after inference", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const repository = new InMemoryFinancialRiskRepository();
  const loader = new RecordingInputLoader();
  const application = new FinancialRiskApplication(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    repository,
    { now: () => new Date(TEST_TIME) },
    jobs,
  );
  const accepted = await application.enqueueCompute(
    computeRequest({ loadInput: loader }),
  );
  let cancellationChecks = 0;
  const executor = new FinancialRiskJobExecutor(application, loader);

  const output = await executor.execute(
    claimed(accepted.job),
    executionContext({
      cancellationRequested: () => {
        cancellationChecks++;
        return Promise.resolve(cancellationChecks >= 3);
      },
    }),
  );

  assertEquals(loader.calls, 1);
  assertEquals(output.resultReference, "risk_result_alpha");
  assertEquals(
    (await repository.findById(
      financialRiskScopeFromJob(accepted.job),
      "risk_result_alpha",
    ))?.state,
    "cancelled",
  );
});

Deno.test("queued compute records cancellation observed before protected input loading", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const repository = new InMemoryFinancialRiskRepository();
  const loader = new RecordingInputLoader();
  const application = new FinancialRiskApplication(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    repository,
    { now: () => new Date(TEST_TIME) },
    jobs,
  );
  const accepted = await application.enqueueCompute(
    computeRequest({ loadInput: loader }),
  );
  const executor = new FinancialRiskJobExecutor(application, loader);

  const output = await executor.execute(
    claimed(accepted.job),
    executionContext({ cancellationRequested: () => Promise.resolve(true) }),
  );

  assertEquals(output.resultReference, "risk_result_alpha");
  assertEquals(loader.calls, 0);
  assertEquals(
    (await repository.findById(
      financialRiskScopeFromJob(accepted.job),
      "risk_result_alpha",
    ))?.state,
    "cancelled",
  );
});

Deno.test("queued compute rejects a result whose claimed lease is already expired", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const repository = new InMemoryFinancialRiskRepository();
  const application = new FinancialRiskApplication(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    repository,
    { now: () => new Date(TEST_TIME) },
    jobs,
  );
  const accepted = await application.enqueueCompute(computeRequest());
  const executor = new FinancialRiskJobExecutor(
    application,
    new RecordingInputLoader(),
  );
  const expiredLease = new Date(TEST_TIME.getTime() - 1);

  await assertRejects(
    () =>
      executor.execute(
        {
          ...claimed(accepted.job),
          leaseExpiresAt: expiredLease,
        },
        executionContext({
          currentLeaseExpiry: () => expiredLease,
          heartbeat: () => Promise.resolve(expiredLease),
        }),
      ),
    Error,
    "lease fence",
  );
  assertEquals(
    await repository.findById(
      financialRiskScopeFromJob(accepted.job),
      "risk_result_alpha",
    ),
    undefined,
  );
});

Deno.test("queued compute commits with the lease renewed by execution heartbeat", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const repository = new InMemoryFinancialRiskRepository();
  const application = new FinancialRiskApplication(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    repository,
    { now: () => new Date(TEST_TIME) },
    jobs,
  );
  const accepted = await application.enqueueCompute(computeRequest());
  const renewedLease = new Date(TEST_TIME.getTime() + 120_000);
  const executor = new FinancialRiskJobExecutor(
    application,
    new RecordingInputLoader(),
  );

  const output = await executor.execute(
    {
      ...claimed(accepted.job),
      leaseExpiresAt: new Date(TEST_TIME.getTime() - 1),
    },
    executionContext({
      currentLeaseExpiry: () => renewedLease,
      heartbeat: () => Promise.resolve(renewedLease),
    }),
  );

  assertEquals(output.resultReference, "risk_result_alpha");
  assertEquals(
    (await repository.findById(
      financialRiskScopeFromJob(accepted.job),
      "risk_result_alpha",
    ))?.state,
    "completed",
  );
});

Deno.test("queued compute re-verifies exact references after inference", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const repository = new InMemoryFinancialRiskRepository();
  const references = new RecordingReferenceVerifier();
  const inference = new FreshnessFlippingInference(references);
  const application = new FinancialRiskApplication(
    new FakeFinancialRiskAuthorization(),
    references,
    inference,
    repository,
    { now: () => new Date(TEST_TIME) },
    jobs,
  );
  const accepted = await application.enqueueCompute(computeRequest());
  const executor = new FinancialRiskJobExecutor(
    application,
    new RecordingInputLoader(),
  );

  await assertRejects(
    () => executor.execute(claimed(accepted.job), executionContext()),
    FinancialRiskError,
    "changed during inference",
  );
  assertEquals(inference.calls, 1);
  assertEquals(
    await repository.findById(
      financialRiskScopeFromJob(accepted.job),
      "risk_result_alpha",
    ),
    undefined,
  );
});

Deno.test("queued compute and invalidation honor the lease fence before effects", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const repository = new InMemoryFinancialRiskRepository();
  const application = new FinancialRiskApplication(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    repository,
    { now: () => new Date(TEST_TIME) },
    jobs,
  );
  const compute = await application.enqueueCompute(computeRequest());
  const executor = new FinancialRiskJobExecutor(
    application,
    new RecordingInputLoader(),
  );
  const expired = executionContext({
    beforeExternalEffect: () => Promise.reject(new Error("lease expired")),
  });

  await assertRejects(
    () => executor.execute(claimed(compute.job), expired),
    Error,
    "lease expired",
  );
  assertEquals(
    await repository.findById(
      financialRiskScopeFromJob(compute.job),
      "risk_result_alpha",
    ),
    undefined,
  );

  await application.compute(computeRequest());
  const invalidation = await application.enqueueInvalidate({
    context: computeRequest().context,
    actor: computeRequest().actor,
    assessmentId: "risk_assessment_alpha" as never,
    resultId: "risk_result_worker-stale" as never,
    invalidationId: "risk_invalidation_worker" as never,
    operationId: "op_worker-invalidate" as never,
    jobId: "job_worker-invalidate" as never,
    idempotencyKey: "idem_worker-invalidate" as never,
    expectedVersion: 1 as never,
    reason: "Worker lease test.",
  });
  await assertRejects(
    () => executor.execute(claimed(invalidation.job), expired),
    Error,
    "lease expired",
  );
  assertEquals(
    (await repository.listHistory(
      financialRiskScopeFromJob(compute.job),
      "risk_assessment_alpha" as never,
    )).length,
    1,
  );
});

function claimed(job: DurableJob): ClaimedJob {
  return {
    ...job,
    state: "running",
    attemptNumber: 1,
    workerId: "financial-risk-worker",
    attemptStartedAt: new Date(TEST_TIME),
    leaseExpiresAt: new Date(TEST_TIME.getTime() + 60_000),
    progress: 0,
  };
}

function executionContext(
  overrides: Partial<JobExecutionContext> = {},
): JobExecutionContext {
  return {
    deadline: new Date(TEST_TIME.getTime() + 300_000),
    currentLeaseExpiry: () => new Date(TEST_TIME.getTime() + 60_000),
    cancellationRequested: () => Promise.resolve(false),
    heartbeat: () => Promise.resolve(new Date(TEST_TIME.getTime() + 60_000)),
    beforeExternalEffect: () => Promise.resolve(),
    ...overrides,
  };
}

function financialRiskScopeFromJob(job: DurableJob) {
  return {
    tenantId: job.tenantId,
    workspaceId: job.workspaceId!,
    dealId: job.dealId!,
  } as never;
}
