import { assertEquals, assertThrows } from "@std/assert";
import {
  createNegotiationDeliveryJob,
  NamedFakeNegotiationTransport,
  sanitizedNegotiationFailure,
} from "../../src/negotiation/jobs.ts";
import { transitionNegotiationReceipt } from "../../src/negotiation/receipts.ts";
import { createDeliveryReceipt } from "../../src/negotiation/model.ts";
import { deriveJobId } from "../../src/negotiation/service_support.ts";
import { scope, terms } from "./support.ts";

const job = {
  jobId: "job_negotiation-test" as never,
  jobType: "negotiation.delivery" as const,
  schemaVersion: 1,
  tenantId: scope.tenantId,
  workspaceId: scope.workspaceId,
  dealId: scope.dealId,
  initiatingActorId: "actor_alice" as never,
  authoritySnapshotReference: "authority_proof_test",
  correlationId: "cor_negotiation-test" as never,
  idempotencyKey: "idem_delivery-test" as never,
  inputVersionReferences: [{
    aggregateType: "negotiation_proposal",
    aggregateId: "proposal_solar",
    version: 2 as never,
    documentId: "proposal_version_solar-1",
  }],
  payload: {},
  timeoutAt: new Date("2026-08-09T12:00:00.000Z"),
  createdAt: new Date("2026-08-08T12:00:00.000Z"),
  roundId: "round_solar",
  deliveryRequestId: "delivery_request_test",
  proposalId: "proposal_solar",
  proposalVersionId: "proposal_version_solar-1",
  approvalId: "negotiation_approval_solar",
  authorityProofId: "authority_proof_test",
  featureGate: "enabled" as const,
  recipientId: "counterparty_buyer",
  purpose: "negotiation_proposal",
  logicalDeliveryId: "delivery_request_test",
};

Deno.test("delivery jobs require exact proposal-version input and an enabled gate", () => {
  const created = createNegotiationDeliveryJob(job);
  assertEquals(created.jobType, "negotiation.delivery");
  assertThrows(
    () =>
      createNegotiationDeliveryJob({
        ...job,
        featureGate: "disabled" as never,
      }),
    Error,
    "disabled",
  );
  assertThrows(
    () => createNegotiationDeliveryJob({ ...job, inputVersionReferences: [] }),
    Error,
    "exactly one",
  );
});

Deno.test("delivery job identity preserves the complete idempotency suffix", () => {
  const first = deriveJobId((`idem_${"a".repeat(58)}a`) as never);
  const second = deriveJobId((`idem_${"a".repeat(58)}b`) as never);
  assertEquals(first === second, false);
  assertEquals(first.length <= 64, true);
  assertEquals(second.length <= 64, true);
});

Deno.test("named fake transport and receipt transitions preserve retry/failure evidence", async () => {
  const transport = new NamedFakeNegotiationTransport({
    providerReference: "fake-reference",
  });
  const sent = await transport.send({
    logicalDeliveryId: "delivery_request_test",
    deliveryRequestId: "delivery_request_test",
    proposalId: "proposal_solar",
    proposalVersionId: "proposal_version_solar-1",
    recipientId: "counterparty_buyer",
    purpose: "negotiation_proposal",
    idempotencyKey: "idem_delivery-test",
    terms: terms as never,
  });
  assertEquals(sent.providerReference, "fake-reference");
  assertEquals(transport.sent.length, 1);
  const receipt = createDeliveryReceipt({
    deliveryReceiptId: "delivery_receipt_test" as never,
    deliveryRequestId: "delivery_request_test" as never,
    scope,
    idempotencyKey: "idem_delivery-test" as never,
    createdAt: "2026-08-08T12:00:00.000Z",
    recipientId: "counterparty_buyer",
    purpose: "negotiation_proposal",
  });
  const retried = transitionNegotiationReceipt(receipt, {
    state: "retry_scheduled",
    failureCode: "provider_timeout",
    nextAttemptAt: "2026-08-08T12:05:00.000Z",
  }, "2026-08-08T12:00:01.000Z");
  assertEquals(retried.state, "retry_scheduled");
  assertEquals(retried.failureCode, "PROVIDER_TIMEOUT");
  assertEquals(retried.attemptCount, 1);
  const sentReceipt = transitionNegotiationReceipt(retried, {
    state: "sent",
    providerReference: sent.providerReference,
  }, "2026-08-08T12:00:02.000Z");
  assertEquals(sentReceipt.state, "sent");
  assertEquals(sentReceipt.providerReference, "fake-reference");
  assertEquals(
    sanitizedNegotiationFailure(new Error("network unavailable")),
    "NETWORK_UNAVAILABLE",
  );
});
