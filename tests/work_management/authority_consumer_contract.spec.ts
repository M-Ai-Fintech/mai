import { assertEquals, assertRejects } from "@std/assert";
import {
  authorityConsumerProjection,
  protectTargetCommand,
  validateAuthorityProtectedTargetCommand,
} from "../../src/work_management/authority_consumer_contract.ts";
import { evaluateApprovalAuthority } from "../../src/work_management/authority_evaluation.ts";
import { InMemoryAuthorityEvaluationStore } from "../../src/work_management/authority_evaluation_store.ts";
import { StoredAuthorityProofResolver } from "../../src/work_management/authority_proof.ts";
import { approvalNotificationProjection } from "../../src/work_management/notification_projections.ts";
import { recipientSafeApprovalPayload } from "../../src/work_management/events.ts";
import { WorkManagementError } from "../../src/work_management/model.ts";
import {
  authorityApprover,
  authorityDispatch,
  authorityFacts,
  authorityPackage,
  authorityScope,
  completeLimits,
} from "./authority_test_support.ts";
import {
  actor,
  aggregateVersion,
  approvalRequestId,
} from "../../src/work_management/ids.ts";

Deno.test("valid proof resolves and exact replay yields one persisted evaluation and one consumer dispatch", async () => {
  const packageValue = await authorityPackage(completeLimits);
  const evaluation = await evaluateApprovalAuthority({
    package: packageValue,
    expectedPackage: packageValue,
    facts: authorityFacts(),
    evaluatedAt: "2026-08-06T12:00:00.000Z",
  });
  const store = new InMemoryAuthorityEvaluationStore();
  await store.append(evaluation);
  await store.append(evaluation);
  const command = await protectTargetCommand(
    authorityDispatch(packageValue),
    evaluation,
  );
  const resolver = new StoredAuthorityProofResolver(store);
  const consumer = new IdempotentConsumer();
  for (let replay = 0; replay < 2; replay++) {
    const validated = await validateAuthorityProtectedTargetCommand(
      command,
      resolver,
      "2026-08-06T12:30:00.000Z",
    );
    consumer.consume(validated.dispatch.dispatchId);
  }
  assertEquals(store.count(), 1);
  assertEquals(consumer.dispatches, 1);
});

Deno.test("consumer rejects missing, unresolved, mismatched, expired, and tampered proof", async () => {
  const packageValue = await authorityPackage(completeLimits);
  const evaluation = await evaluateApprovalAuthority({
    package: packageValue,
    expectedPackage: packageValue,
    facts: authorityFacts(),
    evaluatedAt: "2026-08-06T12:00:00.000Z",
  });
  const command = await protectTargetCommand(
    authorityDispatch(packageValue),
    evaluation,
  );
  const missing = { schemaVersion: 1, dispatch: command.dispatch };
  await assertRejects(
    () =>
      validateAuthorityProtectedTargetCommand(missing, {
        resolve: () => Promise.resolve(undefined),
      }, "2026-08-06T12:00:00.000Z"),
    WorkManagementError,
  );
  await assertRejects(
    () =>
      validateAuthorityProtectedTargetCommand(command, {
        resolve: () => Promise.resolve(undefined),
      }, "2026-08-06T12:00:00.000Z"),
    WorkManagementError,
    "unresolved",
  );
  const store = new InMemoryAuthorityEvaluationStore();
  await store.append(evaluation);
  const resolver = new StoredAuthorityProofResolver(store);
  await assertRejects(
    () =>
      validateAuthorityProtectedTargetCommand(
        {
          ...command,
          dispatch: { ...command.dispatch, targetAggregateId: "wrong" },
        },
        resolver,
        "2026-08-06T12:00:00.000Z",
      ),
    WorkManagementError,
    "does not match authority evaluation",
  );
  await assertRejects(
    () =>
      validateAuthorityProtectedTargetCommand(
        command,
        resolver,
        "2026-08-06T13:00:00.000Z",
      ),
    WorkManagementError,
    "not effective",
  );
  await assertRejects(
    () =>
      validateAuthorityProtectedTargetCommand(
        {
          ...command,
          authorityProof: {
            ...command.authorityProof,
            evaluationDigest: "0".repeat(64),
          },
        },
        resolver,
        "2026-08-06T12:00:00.000Z",
      ),
    WorkManagementError,
    "tampered",
  );
});

Deno.test("denied evaluations cannot dispatch and safe projections and notifications omit protected authority content", async () => {
  const packageValue = await authorityPackage(completeLimits);
  const denied = await evaluateApprovalAuthority({
    package: packageValue,
    expectedPackage: packageValue,
    facts: authorityFacts({ amount: { minorUnits: 100_001, currency: "USD" } }),
    evaluatedAt: "2026-08-06T12:00:00.000Z",
  });
  await assertRejects(
    () => protectTargetCommand(authorityDispatch(packageValue), denied),
    WorkManagementError,
    "cannot authorize",
  );
  const allowed = await evaluateApprovalAuthority({
    package: packageValue,
    expectedPackage: packageValue,
    facts: authorityFacts(),
    evaluatedAt: "2026-08-06T12:00:00.000Z",
  });
  const command = await protectTargetCommand(
    authorityDispatch(packageValue),
    allowed,
  );
  const projection = authorityConsumerProjection(command);
  assertEquals(recipientSafeApprovalPayload(projection), true);
  const notification = approvalNotificationProjection({
    aggregateType: "approval_request",
    id: approvalRequestId("approval_authority-notification"),
    ...authorityScope,
    requesterId: actor("actor_authority-requester"),
    namedApproverId: authorityApprover,
    package: packageValue,
    state: "open",
    version: aggregateVersion(2),
    createdAt: "2026-08-06T12:00:00.000Z",
    updatedAt: "2026-08-06T12:00:00.000Z",
  }, "approval.requested");
  assertEquals(recipientSafeApprovalPayload(notification), true);
  assertEquals(JSON.stringify(notification).includes("mandate"), false);
});

class IdempotentConsumer {
  private readonly seen = new Set<string>();
  dispatches = 0;

  consume(dispatchId: string): void {
    if (this.seen.has(dispatchId)) return;
    this.seen.add(dispatchId);
    this.dispatches += 1;
  }
}
