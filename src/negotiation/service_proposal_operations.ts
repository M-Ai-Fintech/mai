import { payloadDigest } from "../platform/persistence/v1.ts";
import { compareProposalToMandate } from "./mandate.ts";
import {
  NEGOTIATION_ACTION,
  NEGOTIATION_RESOURCE,
  negotiationResource,
} from "./authorization.ts";
import {
  createApproval,
  createProposal,
  currentProposalVersion,
  NegotiationError,
} from "./model.ts";
import type {
  NegotiationApprovalRequestInput,
  NegotiationCommandInput,
  NegotiationCommandResult,
  NegotiationProposalDraftInput,
} from "./service.ts";
import { NegotiationServiceDeliveryOperations } from "./service_delivery_operations.ts";
import {
  assertActiveActor,
  assertHumanActor,
  findProposal,
  replaceProposal,
  updateProposalStatus,
  withInternal,
} from "./service_support.ts";
import { approvalId, proposalId } from "./ids.ts";

export class NegotiationServiceProposalOperations
  extends NegotiationServiceDeliveryOperations {
  createProposal(
    input: NegotiationCommandInput,
    proposalInput: NegotiationProposalDraftInput,
  ): Promise<NegotiationCommandResult> {
    assertActiveActor(input.actor, "create a negotiation proposal draft");
    const origin = proposalInput.origin ??
      (input.actor.kind === "human" ? "human" : "agent_recommendation");
    if (input.actor.kind !== "human" && origin === "human") {
      throw new NegotiationError(
        "HUMAN_AUTHORITY_REQUIRED",
        "Only a human actor may create a human-origin proposal.",
      );
    }
    return this.mutate(
      input,
      "negotiation_create_proposal",
      {
        proposalId: proposalInput.proposalId,
        fromParty: proposalInput.fromParty,
        origin,
      },
      NEGOTIATION_ACTION.mutateRound,
      negotiationResource(
        NEGOTIATION_RESOURCE.proposal,
        proposalInput.proposalId,
      ),
      (round) => {
        if (round.status === "closed" || round.status === "cancelled") {
          throw new NegotiationError(
            "INVALID_TRANSITION",
            `Negotiation round "${round.roundId}" cannot receive a proposal in status "${round.status}".`,
          );
        }
        const proposal = createProposal({
          proposalId: proposalInput.proposalId,
          negotiationId: round.negotiationId,
          roundId: round.roundId,
          scope: round.scope,
          fromParty: proposalInput.fromParty,
          terms: proposalInput.terms,
          submittedBy: input.actor.id,
          submittedByKind: input.actor.kind,
          origin,
          now: this.dependencies.clock.now(),
          status: "draft",
          ...(proposalInput.inReplyToProposalId === undefined ? {} : {
            inReplyToProposalId: proposalId(
              proposalInput.inReplyToProposalId,
            ),
          }),
        });
        return {
          proposals: [...round.proposals, proposal],
          currentProposalId: proposal.proposalId,
        };
      },
    );
  }

  submitProposal(
    input: NegotiationCommandInput,
    proposalIdValue: string,
  ): Promise<NegotiationCommandResult> {
    assertHumanActor(input.actor, "submit a negotiation proposal");
    return this.mutate(
      input,
      "negotiation_submit_proposal",
      { proposalId: proposalIdValue },
      NEGOTIATION_ACTION.mutateRound,
      negotiationResource(NEGOTIATION_RESOURCE.proposal, proposalIdValue),
      (round) => ({
        proposals: replaceProposal(
          round,
          proposalIdValue,
          (proposal) =>
            updateProposalStatus(
              proposal,
              "submitted",
              this.dependencies.clock.now(),
            ),
        ),
      }),
    );
  }

  counterProposal(
    input: NegotiationCommandInput,
    proposalInput: NegotiationProposalDraftInput & {
      readonly inReplyToProposalId: string;
    },
  ): Promise<NegotiationCommandResult> {
    assertHumanActor(input.actor, "submit a counterproposal");
    return this.mutate(
      input,
      "negotiation_counter_proposal",
      {
        proposalId: proposalInput.proposalId,
        inReplyToProposalId: proposalInput.inReplyToProposalId,
      },
      NEGOTIATION_ACTION.mutateRound,
      negotiationResource(
        NEGOTIATION_RESOURCE.proposal,
        proposalInput.proposalId,
      ),
      (round) => {
        const repliedTo = findProposal(
          round,
          proposalInput.inReplyToProposalId,
        );
        if (repliedTo.fromParty === proposalInput.fromParty) {
          throw new NegotiationError(
            "INVALID_INPUT",
            "A counterproposal must come from the opposite negotiation party.",
          );
        }
        const proposal = createProposal({
          proposalId: proposalInput.proposalId,
          negotiationId: round.negotiationId,
          roundId: round.roundId,
          scope: round.scope,
          fromParty: proposalInput.fromParty,
          terms: proposalInput.terms,
          submittedBy: input.actor.id,
          submittedByKind: input.actor.kind,
          origin: proposalInput.origin ?? "human",
          now: this.dependencies.clock.now(),
          status: "submitted",
          inReplyToProposalId: repliedTo.proposalId,
        });
        const updatedRepliedTo = updateProposalStatus(
          repliedTo,
          "countered",
          this.dependencies.clock.now(),
        );
        return {
          proposals: replaceProposal(
            round,
            repliedTo.proposalId,
            () => updatedRepliedTo,
          ).concat(proposal),
          currentProposalId: proposal.proposalId,
        };
      },
    );
  }

  requestApproval(
    input: NegotiationCommandInput,
    approvalInput: NegotiationApprovalRequestInput,
  ): Promise<NegotiationCommandResult> {
    assertHumanActor(input.actor, "request human approval");
    return this.mutate(
      input,
      "negotiation_request_approval",
      { ...approvalInput },
      NEGOTIATION_ACTION.requestApproval,
      negotiationResource(
        NEGOTIATION_RESOURCE.approval,
        approvalInput.approvalId,
      ),
      async (round) => {
        const proposal = findProposal(round, approvalInput.proposalId);
        const version = currentProposalVersion(proposal);
        if (
          proposal.status !== "submitted" && proposal.status !== "countered"
        ) {
          throw new NegotiationError(
            "INVALID_TRANSITION",
            `Proposal "${proposal.proposalId}" is "${proposal.status}"; expected a submitted or countered proposal for approval.`,
          );
        }
        const mandate = round.internal?.mandate;
        if (mandate === undefined || mandate.status !== "active") {
          throw new NegotiationError(
            "MANDATE_INDETERMINATE",
            "Approval is blocked; expected an active negotiation mandate.",
          );
        }
        const comparison = compareProposalToMandate({
          mandate,
          proposalVersionId: version.proposalVersionId,
          terms: version.terms,
          comparedAt: this.dependencies.clock.now(),
        });
        if (comparison.outcome === "outside_mandate") {
          throw new NegotiationError(
            "MANDATE_VIOLATION",
            "Approval is blocked; the proposal is outside the active mandate.",
          );
        }
        if (comparison.outcome === "indeterminate") {
          throw new NegotiationError(
            "MANDATE_INDETERMINATE",
            "Approval is blocked; the mandate comparison is indeterminate.",
          );
        }
        if (
          round.approvals.some((approval) =>
            approval.proposalVersionId === version.proposalVersionId &&
            approval.status === "pending"
          )
        ) {
          throw new NegotiationError(
            "IDEMPOTENCY_CONFLICT",
            "A pending approval already exists for this proposal version.",
          );
        }
        const termsDigest = await payloadDigest(version.terms);
        const approval = createApproval({
          approvalId: approvalId(approvalInput.approvalId),
          proposalId: proposal.proposalId,
          proposalVersionId: version.proposalVersionId,
          scope: round.scope,
          requestedBy: input.actor.id,
          namedApproverId: approvalInput.namedApproverId,
          basis: {
            proposalVersionId: version.proposalVersionId,
            proposalAggregateVersion: proposal.version,
            mandateComparisonId: comparison.comparisonId,
            mandateVersion: comparison.mandateVersion,
            termsDigest,
          },
          requestedAt: this.dependencies.clock.now(),
        });
        return {
          internal: withInternal(round.internal, {
            mandateComparison: comparison,
          }),
          approvals: [...round.approvals, approval],
        };
      },
    );
  }
}
