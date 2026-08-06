import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type {
  ActorId,
  ApprovalDecisionId,
  ApprovalPackageId,
  ApprovalRequestId,
  WorkScope,
} from "./ids.ts";
import {
  type ApprovalDecision,
  type ApprovalDecisionOutcome,
  type ApprovalPackage,
  type ApprovalRequest,
  assertDifferentActors,
  assertExactPackage,
  assertHumanActor,
  assertScope,
  assertText,
  freezePackage,
  nextVersion,
  stableSerialize,
  WorkManagementError,
} from "./model.ts";
import { approvalRule } from "./transition_tables.ts";

export interface CreateApprovalPackageInput {
  readonly id: ApprovalPackageId;
  readonly version: number;
  readonly target: ApprovalPackage["target"];
  readonly evidence: ApprovalPackage["evidence"];
  readonly authority: ApprovalPackage["authority"];
  readonly authoritySnapshot: ApprovalPackage["authoritySnapshot"];
  readonly payload: Readonly<Record<string, unknown>>;
}

export async function createApprovalPackage(
  input: CreateApprovalPackageInput,
): Promise<ApprovalPackage> {
  const unsigned = {
    ...input,
    contentDigest: "",
  } as ApprovalPackage;
  const contentDigest = await approvalPackageDigest(unsigned);
  return freezePackage({ ...unsigned, contentDigest });
}

export function freezeApprovalPackage(value: ApprovalPackage): ApprovalPackage {
  return freezePackage(value);
}

export async function approvalPackageDigest(
  value: ApprovalPackage,
): Promise<string> {
  const canonical = stableSerialize({ ...value, contentDigest: undefined });
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(digest),
    (item) => item.toString(16).padStart(2, "0"),
  ).join("");
}

export interface CreateApprovalRequestInput extends WorkScope {
  readonly id: ApprovalRequestId;
  readonly requesterId: ActorId;
  readonly namedApproverId: ActorId;
  readonly package: ApprovalPackage;
  readonly now: string;
}

export function createApprovalRequest(
  input: CreateApprovalRequestInput,
): ApprovalRequest {
  assertDifferentActors(input.requesterId, input.namedApproverId);
  assertScope(
    input,
    input.package.target.scope,
    `Approval request "${input.id}" package`,
  );
  if (input.package.authority.namedApproverId !== input.namedApproverId) {
    throw new WorkManagementError(
      "NAMED_APPROVER_REQUIRED",
      `Approval request "${input.id}" named approver "${input.namedApproverId}" differs from package approver "${input.package.authority.namedApproverId}"; expected an exact named authority.`,
    );
  }
  assertText(input.requesterId, "Approval requester ID", 128);
  assertText(input.now, "Approval request creation time", 64);
  return Object.freeze({
    aggregateType: "approval_request",
    id: input.id,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    dealId: input.dealId,
    requesterId: input.requesterId,
    namedApproverId: input.namedApproverId,
    package: freezePackage(input.package),
    state: "draft",
    version: 1 as AggregateVersion,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function openApprovalRequest(
  request: ApprovalRequest,
  input: { readonly actor: ActorReference; readonly now: string },
): ApprovalRequest {
  assertApprovalTransition(request, "open");
  assertHumanActor(input.actor, `open Approval Request "${request.id}"`);
  if (input.actor.id !== request.requesterId) {
    throw new WorkManagementError(
      "NAMED_APPROVER_REQUIRED",
      `Actor "${input.actor.id}" cannot open Approval Request "${request.id}"; expected requester "${request.requesterId}".`,
    );
  }
  return changed(request, { state: "open", updatedAt: input.now });
}

export interface DecideApprovalInput {
  readonly actor: ActorReference;
  readonly expectedPackage: ApprovalPackage;
  readonly outcome: ApprovalDecisionOutcome;
  readonly decisionId: ApprovalDecisionId;
  readonly reason?: string;
  readonly now: string;
  readonly currentTargetVersion?: AggregateVersion;
}

export function decideApprovalRequest(
  request: ApprovalRequest,
  input: DecideApprovalInput,
): ApprovalRequest {
  assertApprovalTransition(request, "decided");
  assertHumanActor(input.actor, `decide Approval Request "${request.id}"`);
  if (input.actor.id !== request.namedApproverId) {
    throw new WorkManagementError(
      "NAMED_APPROVER_REQUIRED",
      `Actor "${input.actor.id}" cannot decide Approval Request "${request.id}"; expected named approver "${request.namedApproverId}".`,
    );
  }
  if (input.actor.id === request.requesterId) {
    throw new WorkManagementError(
      "SEPARATION_OF_DUTIES",
      `Requester "${request.requesterId}" cannot decide Approval Request "${request.id}"; expected a distinct named approver.`,
    );
  }
  if (input.reason !== undefined) {
    assertText(input.reason, "Approval decision reason", 500);
  }
  assertExactPackage(request.package, input.expectedPackage);
  if (
    input.currentTargetVersion !== undefined &&
    input.currentTargetVersion !== request.package.target.expectedVersion
  ) {
    throw new WorkManagementError(
      "STALE_APPROVAL_PACKAGE",
      `Approval Request "${request.id}" target version "${input.currentTargetVersion}" differs from package version "${request.package.target.expectedVersion}"; expected the exact referenced version.`,
    );
  }
  const decision: ApprovalDecision = Object.freeze({
    id: input.decisionId,
    outcome: input.outcome,
    approverId: input.actor.id,
    ...(input.reason === undefined ? {} : { reason: input.reason }),
    packageId: request.package.id,
    packageVersion: request.package.version,
    recordedAt: input.now,
  });
  return changed(request, { state: "decided", decision, updatedAt: input.now });
}

export function approveApprovalRequest(
  request: ApprovalRequest,
  input: Omit<DecideApprovalInput, "outcome">,
): ApprovalRequest {
  return decideApprovalRequest(request, { ...input, outcome: "approved" });
}

export function rejectApprovalRequest(
  request: ApprovalRequest,
  input: Omit<DecideApprovalInput, "outcome">,
): ApprovalRequest {
  return decideApprovalRequest(request, { ...input, outcome: "rejected" });
}

export function withdrawApprovalRequest(
  request: ApprovalRequest,
  input: { readonly actor: ActorReference; readonly now: string },
): ApprovalRequest {
  assertApprovalTransition(request, "withdrawn");
  assertHumanActor(input.actor, `withdraw Approval Request "${request.id}"`);
  if (input.actor.id !== request.requesterId) {
    throw new WorkManagementError(
      "SEPARATION_OF_DUTIES",
      `Actor "${input.actor.id}" cannot withdraw Approval Request "${request.id}"; expected requester "${request.requesterId}".`,
    );
  }
  return changed(request, { state: "withdrawn", updatedAt: input.now });
}

export function invalidateApprovalRequest(
  request: ApprovalRequest,
  input: { readonly reason: string; readonly now: string },
): ApprovalRequest {
  assertApprovalTransition(request, "invalidated");
  assertText(input.reason, "Approval invalidation reason", 500);
  return changed(request, { state: "invalidated", updatedAt: input.now });
}

export function expireApprovalRequest(
  request: ApprovalRequest,
  input: { readonly now: string },
): ApprovalRequest {
  assertApprovalTransition(request, "expired");
  return changed(request, { state: "expired", updatedAt: input.now });
}

function assertApprovalTransition(
  request: ApprovalRequest,
  toState: ApprovalRequest["state"],
): void {
  if (approvalRule(request.state, toState) !== undefined) return;
  if (request.state === "decided") {
    throw new WorkManagementError(
      "DECISION_ALREADY_RECORDED",
      `Approval Request "${request.id}" already has an immutable decision; expected a new request for another decision.`,
    );
  }
  throw new WorkManagementError(
    "INVALID_TRANSITION",
    `Approval Request transition "${request.state}" to "${toState}" is invalid; expected an explicit state-machine edge.`,
  );
}

function changed(
  request: ApprovalRequest,
  changes: Partial<Pick<ApprovalRequest, "state" | "decision" | "updatedAt">>,
): ApprovalRequest {
  return Object.freeze({
    ...request,
    ...changes,
    package: freezePackage(request.package),
    version: nextVersion(request.version),
  });
}
