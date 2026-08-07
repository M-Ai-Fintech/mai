import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import type { ErasureExecutor } from "../../src/deal_governance/service_contracts.ts";
import { DealGovernanceError } from "../../src/deal_governance/errors.ts";
import {
  commandContext,
  idempotency,
  testClock,
  testComposition,
} from "./helpers.ts";

async function prepareDeletion(
  clock: ReturnType<typeof testClock>,
  requiredApprovalCount = 1,
) {
  const composition = testComposition(clock);
  const context = commandContext(clock);
  const created = await composition.service.createGovernance({
    type: "create_governance",
    context,
    idempotencyKey: idempotency("create-deletion-flow"),
  });
  await composition.service.assignRetention({
    type: "assign_retention",
    context,
    idempotencyKey: idempotency("retention-deletion-flow"),
    expectedVersion: created.version,
    policySource: "records-policy",
    policyVersion: "2026.1",
    retainedCategories: ["documents", "audit"],
    retentionStartEvent: "archive",
    retentionUntil: "2026-08-08T00:00:00.000Z",
    disposition: "retain_complete_record",
  });
  const pausedPreview = await composition.service.previewTransition(
    context,
    "pause",
  );
  const paused = await composition.service.transitionGovernance({
    type: "transition_governance",
    context,
    idempotencyKey: idempotency("pause-deletion-flow"),
    action: "pause",
    expectedVersion: created.version + 1 as never,
    preview: pausedPreview,
  });
  const archivedPreview = await composition.service.previewTransition(
    context,
    "archive",
  );
  const archived = await composition.service.transitionGovernance({
    type: "transition_governance",
    context,
    idempotencyKey: idempotency("archive-deletion-flow"),
    action: "archive",
    expectedVersion: paused.version,
    preview: archivedPreview,
  });
  clock.set("2026-08-09T12:00:00.000Z");
  const deletion = await composition.service.createDeletionRequest({
    type: "create_deletion_request",
    context: commandContext(clock),
    idempotencyKey: idempotency("request-deletion-flow"),
    requestedGovernanceVersion: archived.version,
    reason: "Approved records disposition",
    typedConfirmation: "DELETE DEAL GOVERNANCE TEST",
    expectedConfirmation: "DELETE DEAL GOVERNANCE TEST",
    requiredApprovalCount,
  });
  const impact = await composition.service.assessDeletionImpact({
    type: "assess_deletion_impact",
    context: commandContext(clock),
    idempotencyKey: idempotency("impact-deletion-flow"),
    requestId: deletion.id,
    expectedVersion: deletion.version,
    impact: {
      categories: ["documents", "audit"],
      recordCounts: { documents: 4, audit: 6 },
      retainedCategories: ["audit"],
      excludedRecords: ["audit:immutable-proof"],
      irreversibleConsequences: [
        "Source copies may become unavailable downstream.",
      ],
      assessedAt: clock.now(),
    },
  });
  const submitted = await composition.service.submitDeletionRequest({
    type: "submit_deletion_request",
    context: commandContext(clock),
    idempotencyKey: idempotency("submit-deletion-flow"),
    requestId: deletion.id,
    expectedVersion: impact.version,
  });
  const approved = await composition.service.decideDeletionRequest({
    type: "decide_deletion_request",
    context: commandContext(clock, "actor_approver-test"),
    idempotencyKey: idempotency("approve-deletion-flow"),
    requestId: deletion.id,
    expectedVersion: submitted.version,
    role: "records_custodian",
    decision: "approve",
    waitingPeriodMs: 0,
  });
  return {
    composition,
    clock,
    context: commandContext(clock),
    request: approved,
  };
}

Deno.test("deletion requests require impact, separate human approval, and produce a retained manifest", async () => {
  const prepared = await prepareDeletion(testClock());
  const result = await prepared.composition.service.startOrchestration({
    type: "start_erasure_orchestration",
    context: prepared.context,
    idempotencyKey: idempotency("start-retained-orchestration"),
    requestId: prepared.request.id,
    categories: ["documents", "audit"],
  });
  assertEquals(result.orchestration.state, "completed");
  assertEquals(result.manifest.status, "verified");
  assert(
    result.manifest.entries.every((entry) => entry.disposition === "retained"),
  );
  assertStringIncludes(result.manifest.limitations.join(" "), "disabled");
  assertEquals(result.deletionRequest.state, "completed");
  assert(
    result.deletionRequest.confirmationDigest !== "DELETE DEAL GOVERNANCE TEST",
  );
});

Deno.test("physical erasure executor failures checkpoint and resume without replaying completed work", async () => {
  let attempts = 0;
  const executor: ErasureExecutor = {
    erase: ({ category }) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error(`executor unavailable for ${category}`);
      }
      return Promise.resolve({ proofReference: `proof_${category}` });
    },
  };
  const clock = testClock();
  const composition = testComposition(clock, executor);
  const context = commandContext(clock);
  const created = await composition.service.createGovernance({
    type: "create_governance",
    context,
    idempotencyKey: idempotency("create-retry-flow"),
  });
  await composition.service.assignRetention({
    type: "assign_retention",
    context,
    idempotencyKey: idempotency("retention-retry-flow"),
    expectedVersion: created.version,
    policySource: "records-policy",
    policyVersion: "2026.1",
    retainedCategories: ["documents"],
    retentionStartEvent: "archive",
    retentionUntil: "2026-08-08T00:00:00.000Z",
    disposition: "permanently_delete_eligible_records",
  });
  const paused = await transition(
    composition,
    context,
    created.version + 1,
    "pause",
    "retry-pause",
  );
  const archived = await transition(
    composition,
    context,
    paused.version,
    "archive",
    "retry-archive",
  );
  clock.set("2026-08-09T12:00:00.000Z");
  const request = await composition.service.createDeletionRequest({
    type: "create_deletion_request",
    context: commandContext(clock),
    idempotencyKey: idempotency("request-retry-flow"),
    requestedGovernanceVersion: archived.version,
    reason: "Downstream erasure retry",
    typedConfirmation: "DELETE DEAL RETRY",
    expectedConfirmation: "DELETE DEAL RETRY",
    requiredApprovalCount: 1,
  });
  const impact = await composition.service.assessDeletionImpact({
    type: "assess_deletion_impact",
    context: commandContext(clock),
    idempotencyKey: idempotency("impact-retry-flow"),
    requestId: request.id,
    expectedVersion: request.version,
    impact: {
      categories: ["documents"],
      recordCounts: { documents: 1 },
      retainedCategories: [],
      excludedRecords: [],
      irreversibleConsequences: ["The source copy may be erased."],
      assessedAt: clock.now(),
    },
  });
  const submitted = await composition.service.submitDeletionRequest({
    type: "submit_deletion_request",
    context: commandContext(clock),
    idempotencyKey: idempotency("submit-retry-flow"),
    requestId: request.id,
    expectedVersion: impact.version,
  });
  const approved = await composition.service.decideDeletionRequest({
    type: "decide_deletion_request",
    context: commandContext(clock, "actor_approver-test"),
    idempotencyKey: idempotency("approve-retry-flow"),
    requestId: request.id,
    expectedVersion: submitted.version,
    role: "records_custodian",
    decision: "approve",
    waitingPeriodMs: 0,
  });
  const first = await composition.service.startOrchestration({
    type: "start_erasure_orchestration",
    context: commandContext(clock),
    idempotencyKey: idempotency("start-retry-flow"),
    requestId: approved.id,
    categories: ["documents"],
    gate: {
      policyApproved: true,
      infrastructureApproved: true,
      physicalErasureEnabled: true,
    },
  });
  assertEquals(first.orchestration.state, "failed");
  assertEquals(first.manifest.status, "draft");
  assertStringIncludes(
    first.orchestration.steps[0]?.lastError ?? "",
    "executor unavailable",
  );
  const resumed = await composition.service.resumeOrchestration({
    type: "resume_erasure_orchestration",
    context: commandContext(clock),
    idempotencyKey: idempotency("resume-retry-flow"),
    orchestrationId: first.orchestration.id,
    expectedVersion: first.orchestration.version,
  });
  assertEquals(resumed.orchestration.state, "completed");
  assertEquals(resumed.manifest.status, "verified");
  assertEquals(resumed.orchestration.checkpoint.sequence, 1);
  assertEquals(resumed.orchestration.steps[0]?.attemptCount, 2);
  assertEquals(resumed.manifest.entries[0]?.proofReference, "proof_documents");
  assertEquals(attempts, 2);
});

Deno.test("approval authority rejects requester self-approval", async () => {
  const prepared = await prepareDeletion(testClock(), 2);
  await assertRejects(
    () =>
      prepared.composition.service.decideDeletionRequest({
        type: "decide_deletion_request",
        context: prepared.context,
        idempotencyKey: idempotency("self-approve"),
        requestId: prepared.request.id,
        expectedVersion: prepared.request.version,
        role: "requester",
        decision: "approve",
      }),
    DealGovernanceError,
    "cannot approve",
  );
});

async function transition(
  composition: Awaited<ReturnType<typeof prepareDeletion>>["composition"],
  context: Awaited<ReturnType<typeof prepareDeletion>>["context"],
  expectedVersion: number,
  action: "pause" | "archive",
  key: string,
) {
  const preview = await composition.service.previewTransition(context, action);
  return await composition.service.transitionGovernance({
    type: "transition_governance",
    context,
    idempotencyKey: idempotency(key),
    action,
    expectedVersion: expectedVersion as never,
    preview,
  });
}
