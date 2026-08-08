import {
  NEGOTIATION_ACTION,
  NEGOTIATION_RESOURCE,
  negotiationResource,
} from "./authorization.ts";
import { createNegotiationDeliveryJob } from "./jobs.ts";
import {
  createDeliveryReceipt,
  createDeliveryRequest,
  currentProposalVersion,
  NegotiationError,
} from "./model.ts";
import type {
  NegotiationAuthorityCommandInput,
  NegotiationCommandResult,
  NegotiationDeliveryInput,
} from "./service.ts";
import { NegotiationServiceRuntime } from "./service_runtime.ts";
import {
  assertHumanActor,
  deliveryJob,
  deriveJobId,
  findApproval,
  findProposal,
  parseDeliveryRequestId,
  replaceApproval,
} from "./service_support.ts";
import { deliveryReceiptId } from "./ids.ts";

export class NegotiationServiceDeliveryOperations
  extends NegotiationServiceRuntime {
  approveProposal(
    input: NegotiationAuthorityCommandInput,
    proposalId: string,
    approvalIdValue: string,
  ): Promise<NegotiationCommandResult> {
    assertHumanActor(input.actor, "approve a negotiation proposal");
    const commandType = "negotiation_approve_proposal";
    return this.mutate(
      input,
      commandType,
      { proposalId, approvalId: approvalIdValue },
      NEGOTIATION_ACTION.approveProposal,
      negotiationResource(NEGOTIATION_RESOURCE.approval, approvalIdValue),
      async (round) => {
        const proposal = findProposal(round, proposalId);
        const approval = findApproval(round, approvalIdValue);
        if (approval.proposalId !== proposal.proposalId) {
          throw new NegotiationError(
            "REFERENCE_MISMATCH",
            "Approval does not belong to the requested proposal.",
          );
        }
        if (approval.status !== "pending") {
          throw new NegotiationError(
            "INVALID_TRANSITION",
            `Approval "${approval.approvalId}" is "${approval.status}"; expected pending approval.`,
          );
        }
        if (
          approval.requestedBy === input.actor.id ||
          approval.namedApproverId !== input.actor.id
        ) {
          throw new NegotiationError(
            "SEPARATION_OF_DUTIES",
            "Approval requires the named human approver to be distinct from the requester.",
          );
        }
        const authority = await this.consumeAuthority(
          input,
          commandType,
          "negotiation_proposal",
          proposal.proposalId,
          proposal.version,
        );
        const approved = Object.freeze({
          ...approval,
          status: "approved" as const,
          authorityProof: authority.proof,
          decidedBy: authority.actor.id,
          decidedAt: this.dependencies.clock.now(),
        });
        return {
          approvals: replaceApproval(
            round,
            approvalIdValue,
            () => approved,
          ),
        };
      },
      input.authority.protectedCommand,
    );
  }

  requestDelivery(
    input: NegotiationAuthorityCommandInput,
    deliveryInput: NegotiationDeliveryInput,
  ): Promise<NegotiationCommandResult> {
    assertHumanActor(input.actor, "request negotiation delivery");
    if (!this.featureGate.deliveryEnabled()) {
      throw new NegotiationError(
        "FEATURE_DISABLED",
        "Negotiation delivery is disabled; provider readiness remains a human approval gate.",
      );
    }
    const commandType = "negotiation_request_delivery";
    return this.mutate(
      input,
      commandType,
      { ...deliveryInput },
      NEGOTIATION_ACTION.requestDelivery,
      negotiationResource(
        NEGOTIATION_RESOURCE.delivery,
        deliveryInput.deliveryRequestId ?? input.roundId,
      ),
      async (round, transaction) => {
        const proposal = findProposal(round, deliveryInput.proposalId);
        const approval = findApproval(round, deliveryInput.approvalId);
        const version = currentProposalVersion(proposal);
        if (
          approval.proposalId !== proposal.proposalId ||
          approval.proposalVersionId !== version.proposalVersionId
        ) {
          throw new NegotiationError(
            "REFERENCE_MISMATCH",
            "Delivery approval does not bind the current proposal version.",
          );
        }
        if (approval.status !== "approved") {
          throw new NegotiationError(
            "HUMAN_AUTHORITY_REQUIRED",
            "Delivery requires a separate approved human approval record.",
          );
        }
        const authority = await this.consumeAuthority(
          input,
          commandType,
          "negotiation_proposal",
          proposal.proposalId,
          proposal.version,
        );
        const deliveryRequestId = deliveryInput.deliveryRequestId ??
          `delivery_request_${input.idempotencyKey.slice("idem_".length)}`;
        const requestIdResult = parseDeliveryRequestId(deliveryRequestId);
        const jobId = deriveJobId(input.idempotencyKey);
        const receiptId = `delivery_receipt_${
          input.idempotencyKey.slice("idem_".length)
        }`;
        const now = this.dependencies.clock.now();
        const request = createDeliveryRequest({
          deliveryRequestId: requestIdResult,
          proposalId: proposal.proposalId,
          proposalVersionId: version.proposalVersionId,
          approvalId: approval.approvalId,
          scope: round.scope,
          jobId,
          idempotencyKey: input.idempotencyKey,
          authorityProofId: authority.proof.proofId,
          requestedBy: authority.actor.id,
          requestedAt: now,
          featureGate: "enabled",
        });
        const receipt = createDeliveryReceipt({
          deliveryReceiptId: deliveryReceiptId(receiptId),
          deliveryRequestId: request.deliveryRequestId,
          scope: round.scope,
          idempotencyKey: input.idempotencyKey,
          createdAt: now,
        });
        const job = createNegotiationDeliveryJob(deliveryJob({
          jobId,
          input,
          request,
          proposal,
          version,
          approval,
          authority,
          now,
        }));
        if (this.dependencies.jobScheduler !== undefined) {
          await this.dependencies.jobScheduler.enqueue(transaction, job);
        }
        return {
          deliveryRequests: [...round.deliveryRequests, request],
          deliveryReceipts: [...round.deliveryReceipts, receipt],
        };
      },
      input.authority.protectedCommand,
      true,
    );
  }
}
