import { NegotiationError, type NegotiationRound } from "./model_types.ts";

/**
 * Validates every cross-record pointer before a round becomes a durable
 * aggregate or enters an external projection.
 */
export function assertRoundReferences(round: NegotiationRound): void {
  const proposalIds = new Set<string>();
  for (const proposal of round.proposals) {
    if (
      proposalIds.has(proposal.proposalId) ||
      proposal.roundId !== round.roundId ||
      proposal.negotiationId !== round.negotiationId ||
      proposal.scope.tenantId !== round.scope.tenantId ||
      proposal.scope.workspaceId !== round.scope.workspaceId ||
      proposal.scope.dealId !== round.scope.dealId
    ) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        `Proposal "${proposal.proposalId}" is not uniquely and exactly bound to round "${round.roundId}".`,
      );
    }
    proposalIds.add(proposal.proposalId);
    const versionNumbers = new Set<number>();
    const versionIds = new Set<string>();
    for (const version of proposal.versions) {
      if (
        version.proposalId !== proposal.proposalId ||
        !Number.isSafeInteger(version.versionNumber) ||
        version.versionNumber <= 0 ||
        versionNumbers.has(version.versionNumber) ||
        versionIds.has(version.proposalVersionId)
      ) {
        throw new NegotiationError(
          "REFERENCE_MISMATCH",
          `Proposal "${proposal.proposalId}" has invalid version lineage.`,
        );
      }
      versionNumbers.add(version.versionNumber);
      versionIds.add(version.proposalVersionId);
    }
    for (const version of proposal.versions) {
      if (
        version.supersedesVersionId !== undefined &&
        (version.supersedesVersionId === version.proposalVersionId ||
          !versionIds.has(version.supersedesVersionId))
      ) {
        throw new NegotiationError(
          "REFERENCE_MISMATCH",
          `Proposal version "${version.proposalVersionId}" supersedes a version outside its own immutable lineage.`,
        );
      }
    }
    const current = proposal.versions.find((version) =>
      version.versionNumber === proposal.currentVersionNumber
    );
    if (current === undefined || current.status !== proposal.status) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        `Proposal "${proposal.proposalId}" current version pointer is inconsistent with its status.`,
      );
    }
  }
  for (const proposal of round.proposals) {
    for (const version of proposal.versions) {
      if (
        version.inReplyToProposalId !== undefined &&
        (version.inReplyToProposalId === proposal.proposalId ||
          !proposalIds.has(version.inReplyToProposalId))
      ) {
        throw new NegotiationError(
          "REFERENCE_MISMATCH",
          `Proposal version "${version.proposalVersionId}" has an invalid counterproposal lineage reference.`,
        );
      }
    }
  }
  for (const pointer of [round.currentProposalId, round.acceptedProposalId]) {
    if (pointer !== undefined && !proposalIds.has(pointer)) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        `Round "${round.roundId}" points to missing proposal "${pointer}".`,
      );
    }
  }
  const internal = round.internal;
  if (internal !== undefined) {
    const positionIds = new Set<string>();
    for (const position of internal.positions) {
      if (
        positionIds.has(position.positionId) ||
        position.scope.tenantId !== round.scope.tenantId ||
        position.scope.workspaceId !== round.scope.workspaceId ||
        position.scope.dealId !== round.scope.dealId
      ) {
        throw new NegotiationError(
          "REFERENCE_MISMATCH",
          `Internal position "${position.positionId}" is not uniquely and exactly bound to round "${round.roundId}".`,
        );
      }
      positionIds.add(position.positionId);
    }
    if (
      internal.mandate !== undefined &&
      (internal.mandate.scope.tenantId !== round.scope.tenantId ||
        internal.mandate.scope.workspaceId !== round.scope.workspaceId ||
        internal.mandate.scope.dealId !== round.scope.dealId)
    ) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        `Mandate "${internal.mandate.mandateId}" is outside round "${round.roundId}" scope.`,
      );
    }
    if (internal.mandateComparison !== undefined) {
      const comparison = internal.mandateComparison;
      const mandate = internal.mandate;
      const comparisonProposal = round.proposals.some((proposal) =>
        proposal.versions.some((version) =>
          version.proposalVersionId === comparison.proposalVersionId
        )
      );
      if (
        mandate === undefined ||
        comparison.mandateId !== mandate.mandateId ||
        comparison.mandateVersion !== mandate.version ||
        !comparisonProposal
      ) {
        throw new NegotiationError(
          "REFERENCE_MISMATCH",
          `Mandate comparison "${comparison.comparisonId}" is not bound to the current round mandate and a historical proposal version.`,
        );
      }
    }
  }
  const approvalIds = new Set<string>();
  for (const approval of round.approvals) {
    if (
      approvalIds.has(approval.approvalId) ||
      approval.scope.tenantId !== round.scope.tenantId ||
      approval.scope.workspaceId !== round.scope.workspaceId ||
      approval.scope.dealId !== round.scope.dealId
    ) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        `Approval "${approval.approvalId}" is not uniquely bound to round "${round.roundId}".`,
      );
    }
    const proposal = round.proposals.find((item) =>
      item.proposalId === approval.proposalId
    );
    if (
      proposal === undefined ||
      !proposal.versions.some((version) =>
        version.proposalVersionId === approval.proposalVersionId
      ) ||
      approval.basis.proposalVersionId !== approval.proposalVersionId
    ) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        `Approval "${approval.approvalId}" has a cross-proposal or cross-version lineage.`,
      );
    }
    if (
      approval.status === "approved" &&
      (approval.authorityProof === undefined ||
        approval.decidedBy === undefined ||
        approval.decidedAt === undefined)
    ) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        `Approved approval "${approval.approvalId}" is missing its immutable human decision proof.`,
      );
    }
    approvalIds.add(approval.approvalId);
  }
  const deliveryRequestIds = new Set<string>();
  for (const request of round.deliveryRequests) {
    if (deliveryRequestIds.has(request.deliveryRequestId)) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        `Delivery request "${request.deliveryRequestId}" is duplicated in round "${round.roundId}".`,
      );
    }
    const proposal = round.proposals.find((item) =>
      item.proposalId === request.proposalId
    );
    const approval = round.approvals.find((item) =>
      item.approvalId === request.approvalId
    );
    if (
      request.scope.tenantId !== round.scope.tenantId ||
      request.scope.workspaceId !== round.scope.workspaceId ||
      request.scope.dealId !== round.scope.dealId ||
      proposal === undefined ||
      !proposal.versions.some((version) =>
        version.proposalVersionId === request.proposalVersionId
      ) ||
      approval === undefined ||
      approval.proposalId !== request.proposalId ||
      approval.proposalVersionId !== request.proposalVersionId ||
      request.authorityProof.proofId !== request.authorityProofId
    ) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        `Delivery request "${request.deliveryRequestId}" is not exactly bound to this round's proposal and approval.`,
      );
    }
    deliveryRequestIds.add(request.deliveryRequestId);
  }
  const deliveryReceiptIds = new Set<string>();
  for (const receipt of round.deliveryReceipts) {
    if (deliveryReceiptIds.has(receipt.deliveryReceiptId)) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        `Delivery receipt "${receipt.deliveryReceiptId}" is duplicated in round "${round.roundId}".`,
      );
    }
    const request = round.deliveryRequests.find((item) =>
      item.deliveryRequestId === receipt.deliveryRequestId
    );
    if (
      receipt.scope.tenantId !== round.scope.tenantId ||
      receipt.scope.workspaceId !== round.scope.workspaceId ||
      receipt.scope.dealId !== round.scope.dealId ||
      request === undefined ||
      receipt.idempotencyKey !== request.idempotencyKey ||
      receipt.recipientId !== request.recipientId ||
      receipt.purpose !== request.purpose
    ) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        `Delivery receipt "${receipt.deliveryReceiptId}" is not exactly bound to this round's delivery request.`,
      );
    }
    deliveryReceiptIds.add(receipt.deliveryReceiptId);
  }
}
