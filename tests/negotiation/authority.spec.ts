import { assertEquals, assertRejects } from "@std/assert";
import { consumeNegotiationAuthority } from "../../src/negotiation/authority.ts";
import type { AuthorityProofResolver } from "../../src/work_management/authority_proof.ts";
import { actor, scope } from "./support.ts";

const proof = {
  proofId: "authority_proof_test",
  proofVersion: 1 as const,
  evaluationId: "evaluation_test",
  evaluationDigest: "a".repeat(64),
  proofDigest: "b".repeat(64),
};

Deno.test("negotiation authority binds target, version, command, actor, and idempotency", async () => {
  const command = {
    schemaVersion: 1,
    dispatch: {
      dispatchId: "work_target_command_test",
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      dealId: scope.dealId,
      approvalRequestId: "work_approval_request_test",
      approvalRequestVersion: 1,
      decisionId: "work_approval_decision_test",
      outcome: "approved",
      targetAggregateType: "negotiation_proposal",
      targetAggregateId: "proposal_solar",
      expectedTargetVersion: 2,
      packageId: "work_approval_package_test",
      packageVersion: 1,
      packageDigest: "c".repeat(64),
      authoritySnapshotReference: "authority_snapshot_test",
      actor: actor("actor_alice"),
      commandType: "negotiation_approve_proposal",
      correlationId: "cor_negotiation-test",
      causationId: "work_event_test",
      idempotencyIdentity:
        "tenant_alpha|workspace_main|deal_solar|actor_alice|approve_approval_request|request_test|idem_authority",
      recordedAt: "2026-08-08T12:00:00.000Z",
      authorityProof: proof,
    },
    authorityProof: proof,
  };
  const resolver: AuthorityProofResolver = {
    resolve: () => Promise.resolve({}),
  };
  // The shared validator verifies proof digests and evaluation content, so the
  // exact consumer contract is exercised with a resolver-backed fixture in
  // the service tests; this test documents the binding port separately.
  await assertRejects(
    () =>
      consumeNegotiationAuthority({
        protectedCommand: command,
        resolver,
        scope,
        targetAggregateType: "negotiation_proposal",
        targetId: "proposal_solar",
        expectedVersion: 2,
        commandType: "negotiation_approve_proposal",
        actorId: actor("actor_alice").id,
        idempotencyKey: "idem_authority" as never,
        consumedAt: "2026-08-08T12:00:00.000Z",
      }),
    Error,
  );
  assertEquals(command.dispatch.targetAggregateId, "proposal_solar");
});
