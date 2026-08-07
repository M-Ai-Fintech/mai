import type { AggregateVersion } from "../platform/api/v1.ts";
import { type ReadinessApprovalId, readinessApprovalId } from "./ids.ts";
import {
  ClosingError,
  type ClosingWorkspace,
  evaluateReadiness,
  type ReadinessApproval,
} from "./model.ts";
import { assertClosingTransition } from "./transitions.ts";

export function approveClosingReadiness(input: {
  readonly workspace: ClosingWorkspace;
  readonly readinessApprovalId: string;
  readonly actorId: string;
  readonly authorityProofId: string;
  readonly now: string;
}): ClosingWorkspace {
  const report = evaluateReadiness(input.workspace);
  if (!report.ready) throw readinessBlocked(report.reasons);
  if (input.workspace.status !== "closing_review") {
    throw new ClosingError(
      "INVALID_TRANSITION",
      `Closing workspace "${input.workspace.closingWorkspaceId}" cannot approve readiness from state "${input.workspace.status}"; expected closing_review.`,
    );
  }
  assertClosingTransition(input.workspace.status, "authorized_to_close");
  const readiness = readinessApproval({
    readinessApprovalId: input.readinessApprovalId,
    workspaceVersion: input.workspace.version,
    actorId: input.actorId,
    authorityProofId: input.authorityProofId,
    now: input.now,
  });
  return Object.freeze({
    ...input.workspace,
    status: "authorized_to_close",
    readiness,
    updatedAt: input.now,
  });
}

export function invalidateClosingReadiness(
  workspace: ClosingWorkspace,
  reason: string,
  now: string,
): ClosingWorkspace {
  if (workspace.readiness?.status !== "approved") return workspace;
  const readiness: ReadinessApproval = Object.freeze({
    ...workspace.readiness,
    status: "invalidated",
    invalidatedAt: now,
    invalidationReason: reason,
  });
  return Object.freeze({
    ...workspace,
    readiness,
    status: "closing_review",
    updatedAt: now,
  });
}

function readinessApproval(input: {
  readonly readinessApprovalId: string;
  readonly workspaceVersion: AggregateVersion;
  readonly actorId: string;
  readonly authorityProofId: string;
  readonly now: string;
}): ReadinessApproval {
  return Object.freeze({
    readinessApprovalId: readinessApprovalId(input.readinessApprovalId),
    workspaceVersion: input.workspaceVersion,
    status: "approved",
    approvedBy: input.actorId,
    authorityProofId: input.authorityProofId,
    approvedAt: input.now,
  });
}

function readinessBlocked(
  reasons: ReadonlyArray<{ readonly code: string }>,
): ClosingError {
  const codes = reasons.map((reason) => reason.code).join(", ");
  return new ClosingError(
    "PREREQUISITE_BLOCKED",
    `Closing readiness is blocked by ${codes}; expected every prerequisite to be resolved.`,
  );
}

export type { ReadinessApprovalId };
