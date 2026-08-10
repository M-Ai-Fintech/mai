import { assert, assertEquals } from "@std/assert";
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
  RecordingFinancialRiskJobPort,
  RecordingInputLoader,
  RecordingReferenceVerifier,
  TEST_TIME,
} from "./support.ts";

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
  assertEquals(references.calls, 4);

  assertEquals(await checker.recheck(claimed(accepted.job)), true);
  const replayed = await executor.execute(
    claimed(accepted.job),
    executionContext(),
  );
  assertEquals(replayed.resultReference, "risk_result_alpha");
  assertEquals(loader.calls, 1);
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

function executionContext(): JobExecutionContext {
  return {
    deadline: new Date(TEST_TIME.getTime() + 300_000),
    currentLeaseExpiry: () => new Date(TEST_TIME.getTime() + 60_000),
    cancellationRequested: () => Promise.resolve(false),
    heartbeat: () => Promise.resolve(new Date(TEST_TIME.getTime() + 60_000)),
    beforeExternalEffect: () => Promise.resolve(),
  };
}
