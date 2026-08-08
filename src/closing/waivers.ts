import { type ConditionId, type WaiverId, waiverId } from "./ids.ts";
import type { ClosingWaiver } from "./model.ts";

export function createWaiver(input: {
  readonly waiverId: string;
  readonly conditionId: ConditionId;
  readonly scope: ClosingWaiver["scope"];
  readonly proposedBy: string;
  readonly beneficiary: string;
  readonly reason: string;
  readonly residualRisk: string;
  readonly legalReviewState?: ClosingWaiver["legalReviewState"];
  readonly requiredApprovalIds: readonly string[];
  readonly approvalAuthority: string;
  readonly sourceDocumentId?: string;
}): ClosingWaiver {
  if (input.proposedBy === input.beneficiary) {
    throw new Error(
      `Waiver proposer "${input.proposedBy}" cannot be its beneficiary; expected distinct actors.`,
    );
  }
  if (input.requiredApprovalIds.length === 0) {
    throw new Error(
      `Waiver "${input.waiverId}" has no required approvals; expected at least one distinct human approval.`,
    );
  }
  assertText(input.reason, "waiver reason");
  assertText(input.residualRisk, "waiver residual risk");
  assertText(input.approvalAuthority, "waiver approval authority");
  return Object.freeze({
    waiverId: waiverId(input.waiverId),
    conditionId: input.conditionId,
    scope: input.scope,
    proposedBy: input.proposedBy,
    beneficiary: input.beneficiary,
    reason: input.reason,
    residualRisk: input.residualRisk,
    legalReviewState: input.legalReviewState ?? "pending",
    requiredApprovalIds: Object.freeze([...input.requiredApprovalIds]),
    approvalAuthority: input.approvalAuthority,
    status: "proposed",
    ...(input.sourceDocumentId === undefined
      ? {}
      : { sourceDocumentId: input.sourceDocumentId }),
  });
}

export function confirmWaiverLegalReview(
  waiver: ClosingWaiver,
): ClosingWaiver {
  if (waiver.status !== "proposed") {
    throw new Error(
      `Waiver "${waiver.waiverId}" cannot receive legal review from state "${waiver.status}"; expected proposed.`,
    );
  }
  return Object.freeze({ ...waiver, legalReviewState: "confirmed" });
}

export function approveWaiver(
  waiver: ClosingWaiver,
  approverId: string,
  approvedAt: string,
): ClosingWaiver {
  if (waiver.status !== "proposed" || waiver.legalReviewState !== "confirmed") {
    throw new Error(
      `Waiver "${waiver.waiverId}" cannot be approved; expected proposed status and confirmed legal review.`,
    );
  }
  if (approverId === waiver.proposedBy) {
    throw new Error(
      `Waiver proposer "${approverId}" cannot approve waiver "${waiver.waiverId}"; expected separation of duties.`,
    );
  }
  return Object.freeze({
    ...waiver,
    status: "approved",
    approvedBy: approverId,
    approvedAt,
    effectiveAt: approvedAt,
  });
}

function assertText(value: string, label: string): void {
  if (value.trim().length > 0 && value.length <= 512) return;
  throw new Error(
    `${label} "${value}" is invalid; expected 1-512 non-whitespace characters.`,
  );
}

export type { WaiverId };
