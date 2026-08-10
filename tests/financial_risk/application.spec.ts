import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { FinancialRiskError } from "../../src/financial_risk/errors.ts";
import type { FinancialRiskScope } from "../../src/financial_risk/model.ts";
import {
  InMemoryFinancialRiskRepository,
} from "../../src/financial_risk/repository.ts";
import { applicationFor } from "./application_test_support.ts";
import {
  computeRequest,
  FakeFinancialRiskAuthorization,
  FakeFinancialRiskInference,
  FALLBACK_OUTPUTS,
  FALLBACK_RESULT,
  financialRiskContext,
  financialRiskReferences,
  financialRiskScope,
  MODEL_OUTPUTS,
  RecordingInputLoader,
  RecordingReferenceVerifier,
  TEST_CHECKSUM,
  ThrowingFinancialRiskInference,
} from "./support.ts";

Deno.test("financial-risk authorization happens before protected input loading", async () => {
  const authorization = new FakeFinancialRiskAuthorization("deny");
  const references = new RecordingReferenceVerifier();
  const loader = new RecordingInputLoader();
  const application = applicationFor(authorization, references);

  await assertRejects(
    () => application.compute(computeRequest({ loadInput: loader })),
    FinancialRiskError,
    "Financial-risk assessment",
  );
  assertEquals(references.calls, 0);
  assertEquals(loader.calls, 0);
});

Deno.test("exact reference verification happens before protected input loading", async () => {
  const authorization = new FakeFinancialRiskAuthorization();
  const references = new RecordingReferenceVerifier(
    new FinancialRiskError("PROTECTED_NOT_FOUND", "Exact source is protected."),
  );
  const loader = new RecordingInputLoader();
  const application = applicationFor(authorization, references);

  await assertRejects(
    () => application.compute(computeRequest({ loadInput: loader })),
    FinancialRiskError,
    "Exact source is protected",
  );
  assertEquals(references.calls, 1);
  assertEquals(loader.calls, 0);
});

Deno.test("authorization grant scope reaches evidence and input protected loaders", async () => {
  const references = new RecordingReferenceVerifier();
  const loader = new RecordingInputLoader();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    references,
  );

  await application.compute(computeRequest({ loadInput: loader }));

  assertExists(references.authorization);
  assertExists(loader.authorization);
  assertEquals(references.authorization, loader.authorization);
  assertEquals(
    loader.authorization?.approvedScope.tenantId,
    financialRiskScope().tenantId,
  );
  assertEquals(
    loader.authorization?.approvedScope.workspaceId,
    financialRiskScope().workspaceId,
  );
  assertEquals(
    loader.authorization?.approvedScope.dealId,
    financialRiskScope().dealId,
  );
  assertEquals(
    loader.authorization?.fieldMask,
    references.authorization?.fieldMask,
  );
});

Deno.test("compute preserves model outputs, provenance, durable execution, and idempotent replay", async () => {
  const loader = new RecordingInputLoader();
  const inference = new FakeFinancialRiskInference();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    inference,
  );
  const request = computeRequest({ loadInput: loader });

  const accepted = await application.compute(request);
  const replayed = await application.compute(request);

  assertEquals(accepted.status, "accepted");
  assertEquals(replayed.status, "replayed");
  assertEquals(loader.calls, 1);
  assertEquals(inference.calls, 1);
  assertEquals(accepted.result.state, "completed");
  assertEquals(accepted.result.outputs, MODEL_OUTPUTS);
  assertEquals(accepted.result.provenance.kind, "model-inference");
  assertEquals(
    accepted.result.provenance.providerIdentity,
    "reference-risk-provider",
  );
  assertEquals(
    accepted.result.provenance.prompt?.promptDigest,
    "sha256:363b21dd3cf0b8704492506711ba6e42e1f6ab95de62b8d046d6495688bb2d8b",
  );
  assertEquals(accepted.result.provenance.inputDigest, TEST_CHECKSUM);
  assertEquals(accepted.result.execution.jobId, request.jobId);
  assertEquals(accepted.result.execution.operationId, request.operationId);
});

Deno.test("same idempotency key with changed exact references is rejected", async () => {
  const loader = new RecordingInputLoader();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
  );
  const first = computeRequest({ loadInput: loader });
  await application.compute(first);

  await assertRejects(
    () =>
      application.compute({
        ...first,
        resultId: "risk_result_conflict" as never,
        references: financialRiskReferences(2),
      }),
    FinancialRiskError,
    "IDEMPOTENCY_CONFLICT",
  );
  assertEquals(loader.calls, 1);
});

Deno.test("first financial-risk write rejects a non-initial expected version", async () => {
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
  );

  await assertRejects(
    () => application.compute(computeRequest({ expectedVersion: 2 as never })),
    FinancialRiskError,
    'current version is "0"',
  );
});

Deno.test("in-memory command commit rejects a duplicate result ID without overwrite", async () => {
  const repository = new InMemoryFinancialRiskRepository();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    repository,
  );
  const first = await application.compute(computeRequest());

  await assertRejects(
    () =>
      application.compute(computeRequest({
        resultId: first.result.resultId,
        idempotencyKey: "idem_duplicate-result" as never,
        operationId: "op_duplicate-result" as never,
        jobId: "job_duplicate-result" as never,
      })),
    FinancialRiskError,
    "already exists",
  );
  assertEquals(
    (await repository.findLatest(
      financialRiskScope(),
      first.result.assessmentId,
    ))
      ?.resultId,
    first.result.resultId,
  );
});

Deno.test("stale commands retain a replayable idempotency failure", async () => {
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
  );
  await application.compute(computeRequest());
  const request = computeRequest({
    expectedVersion: 2 as never,
    idempotencyKey: "idem_stale-replay" as never,
  });

  await assertRejects(
    () => application.compute(request),
    FinancialRiskError,
    "current version",
  );
  await assertRejects(
    () => application.compute(request),
    FinancialRiskError,
    "previously failed",
  );
});

Deno.test("configured fallback is an explicit non-model result", async () => {
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(FALLBACK_RESULT),
  );
  const result = await application.compute(computeRequest());

  assertEquals(result.result.state, "fallback");
  assertEquals(result.result.provenance.kind, "configured-fallback");
  assertEquals(result.result.provenance.readiness, "not-claimed");
  assertEquals(result.result.outputs, FALLBACK_OUTPUTS);
  assertEquals(result.result.provenance.modelId, undefined);
});

Deno.test("cancellation creates a distinct immutable result without loading inputs", async () => {
  const loader = new RecordingInputLoader();
  const inference = new FakeFinancialRiskInference();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    inference,
  );
  const result = await application.compute(computeRequest({
    loadInput: loader,
    cancellationRequested: () => Promise.resolve(true),
  }));

  assertEquals(result.result.state, "cancelled");
  assertEquals(result.result.outputs, undefined);
  assertEquals(loader.calls, 0);
  assertEquals(inference.calls, 0);
});

Deno.test("inference adapter exceptions become a durable failed result", async () => {
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new ThrowingFinancialRiskInference(),
  );
  const result = await application.compute(computeRequest());

  assertEquals(result.result.state, "failed");
  assertEquals(result.result.execution.status, "failed");
  assertEquals(result.result.provenance.kind, "failed");
});

Deno.test("stale invalidation appends history and never mutates the completed result", async () => {
  const repository = new InMemoryFinancialRiskRepository();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    repository,
  );
  const request = computeRequest();
  const original = await application.compute(request);
  const invalidation = {
    context: request.context,
    actor: request.actor,
    assessmentId: request.assessmentId,
    resultId: "risk_result_stale" as never,
    invalidationId: "risk_invalidation_alpha" as never,
    operationId: "op_stale" as never,
    jobId: "job_stale" as never,
    idempotencyKey: "idem_stale" as never,
    expectedVersion: original.result.version,
    reason: "Financial source version changed.",
  };
  const stale = await application.invalidate(invalidation);
  const replayed = await application.invalidate(invalidation);

  assertEquals(original.result.state, "completed");
  assertEquals(stale.result.state, "stale");
  assertEquals(stale.result.supersedesResultId, original.result.resultId);
  assertEquals(replayed.status, "replayed");
  assertEquals(replayed.result.resultId, stale.result.resultId);
  assertEquals(
    (await repository.listHistory(financialRiskScope(), request.assessmentId))
      .length,
    2,
  );
});

Deno.test("read is scope-isolated and returns protected not-found for another deal", async () => {
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
  );
  const request = computeRequest();
  await application.compute(request);
  const foreignScope: FinancialRiskScope = {
    tenantId: request.context.tenantId,
    workspaceId: request.context.workspaceId!,
    dealId: "deal_foreign" as never,
  };

  await assertRejects(
    () =>
      application.read(
        financialRiskContext(foreignScope),
        request.actor,
        request.assessmentId,
      ),
    FinancialRiskError,
    "Financial-risk assessment",
  );
});

Deno.test("in-memory reads return isolated immutable history snapshots", async () => {
  const repository = new InMemoryFinancialRiskRepository();
  const application = applicationFor(
    new FakeFinancialRiskAuthorization(),
    new RecordingReferenceVerifier(),
    new FakeFinancialRiskInference(),
    repository,
  );
  const request = computeRequest();
  await application.compute(request);
  const first = await repository.findLatest(
    financialRiskScope(),
    request.assessmentId,
  );
  if (first?.outputs === undefined) throw new Error("Expected model outputs.");
  const mutableOutputs = first.outputs as unknown as { insolvencyRisk: number };
  mutableOutputs.insolvencyRisk = 0.99;
  const second = await repository.findLatest(
    financialRiskScope(),
    request.assessmentId,
  );

  assertEquals(second?.outputs?.insolvencyRisk, MODEL_OUTPUTS.insolvencyRisk);
});
