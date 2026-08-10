import { assertEquals, assertRejects } from "@std/assert";
import { FinancialRiskError } from "../../src/financial_risk/errors.ts";
import {
  InMemoryFinancialRiskRepository,
} from "../../src/financial_risk/repository.ts";
import { applicationFor } from "./application_test_support.ts";
import {
  computeRequest,
  FakeFinancialRiskAuthorization,
  FakeFinancialRiskInference,
  financialRiskContext,
  financialRiskScope,
  RecordingFinancialRiskJobPort,
  RecordingInputLoader,
  RecordingReferenceVerifier,
} from "./support.ts";

Deno.test("queued compute claims and replays the persisted job without computing", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const loader = new RecordingInputLoader();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    new InMemoryFinancialRiskRepository(),
    jobs,
  );
  const request = computeRequest({ loadInput: loader });

  const accepted = await application.enqueueCompute(request);
  const replayed = await application.enqueueCompute(request);

  assertEquals(accepted.status, "accepted");
  assertEquals(replayed.status, "replayed");
  assertEquals(jobs.enqueueCalls, 1);
  assertEquals(loader.calls, 0);
  assertEquals(accepted.job.jobId, replayed.job.jobId);
});

Deno.test("queued compute records a stale first-write version failure before queueing", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    new InMemoryFinancialRiskRepository(),
    jobs,
  );
  const stale = computeRequest({
    idempotencyKey: "idem_preflight-stale" as never,
    expectedVersion: 2 as never,
  });

  await assertRejects(
    () => application.enqueueCompute(stale),
    FinancialRiskError,
    'current version is "0"',
  );
  const accepted = await application.enqueueCompute({
    ...stale,
    idempotencyKey: "idem_preflight-valid" as never,
    expectedVersion: 1 as never,
  });

  assertEquals(accepted.status, "accepted");
  assertEquals(jobs.enqueueCalls, 1);
});

Deno.test("queued invalidation records a stale existing version failure before queueing", async () => {
  const repository = new InMemoryFinancialRiskRepository();
  const jobs = new RecordingFinancialRiskJobPort();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    repository,
    jobs,
  );
  const seed = await application.compute(computeRequest());
  const stale = {
    context: financialRiskContext(financialRiskScope()),
    actor: computeRequest().actor,
    assessmentId: seed.result.assessmentId,
    resultId: "risk_result_preflight-stale" as never,
    invalidationId: "risk_invalidation_preflight-stale" as never,
    operationId: "op_preflight-stale" as never,
    jobId: "job_preflight-stale" as never,
    idempotencyKey: "idem_preflight-existing" as never,
    expectedVersion: 2 as never,
    reason: "A source version changed.",
  };

  await assertRejects(
    () => application.enqueueInvalidate(stale),
    FinancialRiskError,
    'current version is "1"',
  );
  const accepted = await application.enqueueInvalidate({
    ...stale,
    idempotencyKey: "idem_preflight-existing-valid" as never,
    expectedVersion: 1 as never,
  });

  assertEquals(accepted.status, "accepted");
  assertEquals(jobs.enqueueCalls, 1);
});

Deno.test("queued invalidation preserves protected not-found without a prior result", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    new InMemoryFinancialRiskRepository(),
    jobs,
  );
  const request = {
    context: financialRiskContext(),
    actor: computeRequest().actor,
    assessmentId: "risk_assessment_missing" as never,
    resultId: "risk_result_missing" as never,
    invalidationId: "risk_invalidation_missing" as never,
    operationId: "op_invalidation_missing" as never,
    jobId: "job_invalidation_missing" as never,
    idempotencyKey: "idem_invalidation_missing" as never,
    expectedVersion: 1 as never,
    reason: "A source version changed.",
  };

  await assertRejects(
    () => application.enqueueInvalidate(request),
    FinancialRiskError,
    "risk_assessment_missing",
  );
  assertEquals(jobs.enqueueCalls, 0);
});

Deno.test("accepted queue replay wins after the assessment version advances", async () => {
  const repository = new InMemoryFinancialRiskRepository();
  const jobs = new RecordingFinancialRiskJobPort();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    repository,
    jobs,
  );
  const queued = computeRequest({
    idempotencyKey: "idem_queue-replay-version" as never,
  });
  const accepted = await application.enqueueCompute(queued);
  const later = await application.compute(computeRequest({
    resultId: "risk_result_later" as never,
    operationId: "op_later-compute" as never,
    jobId: "job_later-compute" as never,
    idempotencyKey: "idem_later-compute" as never,
  }));
  await application.invalidate({
    context: queued.context,
    actor: queued.actor,
    assessmentId: queued.assessmentId,
    resultId: "risk_result_later-stale" as never,
    invalidationId: "risk_invalidation_later" as never,
    operationId: "op_later-invalidate" as never,
    jobId: "job_later-invalidate" as never,
    idempotencyKey: "idem_later-invalidate" as never,
    expectedVersion: later.result.version,
    reason: "A later source version superseded the result.",
  });

  const replayed = await application.enqueueCompute(queued);

  assertEquals(accepted.status, "accepted");
  assertEquals(replayed.status, "replayed");
  assertEquals(replayed.job.jobId, accepted.job.jobId);
  assertEquals(jobs.enqueueCalls, 1);
});

Deno.test("exact source version failures become replayable stale queue failures", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const references = new RecordingReferenceVerifier(
    new FinancialRiskError(
      "EXACT_VERSION_MISMATCH",
      "Exact source version changed.",
    ),
  );
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    references,
    new FakeFinancialRiskInference(),
    new InMemoryFinancialRiskRepository(),
    jobs,
  );
  const request = computeRequest({
    idempotencyKey: "idem_exact-stale" as never,
  });

  await assertRejects(
    () => application.enqueueCompute(request),
    FinancialRiskError,
    "Exact source version changed",
  );
  await assertRejects(
    () => application.enqueueCompute(request),
    FinancialRiskError,
    "previously failed",
  );
  assertEquals(references.calls, 1);
  assertEquals(jobs.enqueueCalls, 0);
});

Deno.test("reference version conflicts become replayable queue failures", async () => {
  const jobs = new RecordingFinancialRiskJobPort();
  const references = new RecordingReferenceVerifier(
    new FinancialRiskError(
      "VERSION_CONFLICT",
      "The exact source version is already superseded.",
    ),
  );
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    references,
    new FakeFinancialRiskInference(),
    new InMemoryFinancialRiskRepository(),
    jobs,
  );
  const request = computeRequest({
    idempotencyKey: "idem_reference-conflict" as never,
  });

  await assertRejects(
    () => application.enqueueCompute(request),
    FinancialRiskError,
    "already superseded",
  );
  await assertRejects(
    () => application.enqueueCompute(request),
    FinancialRiskError,
    "previously failed",
  );
  assertEquals(references.calls, 1);
  assertEquals(jobs.enqueueCalls, 0);
});
