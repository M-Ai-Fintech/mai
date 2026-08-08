import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
import type { GovernanceScope, GovernanceState } from "./model.ts";
import {
  type DeletionApprovalId,
  deletionApprovalId,
  type DeletionRequestId,
  deletionRequestId,
} from "./ids.ts";
import { DealGovernanceError, GovernanceInvariantError } from "./errors.ts";

export type DeletionRequestState =
  | "draft"
  | "impact_assessed"
  | "approval_pending"
  | "waiting_period"
  | "scheduled"
  | "on_hold"
  | "executing"
  | "completed"
  | "rejected"
  | "cancelled";

/**
 * Requester-supplied assessment evidence for human review.
 *
 * The payload records what the requester believes will be affected; it is not
 * authoritative scope or count truth. Retention, legal holds, approved
 * orchestration categories, and downstream erasure proofs remain authoritative.
 */
export interface DeletionImpact {
  readonly categories: readonly string[];
  readonly recordCounts: Readonly<Record<string, number>>;
  readonly retainedCategories: readonly string[];
  readonly excludedRecords: readonly string[];
  readonly irreversibleConsequences: readonly string[];
  readonly assessedAt: string;
}

export interface DeletionApproval {
  readonly id: DeletionApprovalId;
  readonly actorId: ActorId;
  readonly actorKind: "human" | "ai" | "service" | "external";
  readonly role: string;
  readonly decision: "approved" | "rejected";
  readonly decidedAt: string;
  readonly requestVersion: AggregateVersion;
}

export interface DeletionRequest {
  readonly aggregateType: "deletion_request";
  readonly id: DeletionRequestId;
  readonly scope: GovernanceScope;
  readonly requestedBy: ActorId;
  readonly requesterKind: "human" | "ai" | "service" | "external";
  readonly reason: string;
  readonly requestedGovernanceVersion: AggregateVersion;
  readonly confirmationDigest: string;
  readonly requiredApprovalCount: number;
  readonly approvals: readonly DeletionApproval[];
  readonly impact?: DeletionImpact;
  readonly state: DeletionRequestState;
  readonly waitingUntil?: string;
  readonly resumeState?: "waiting_period" | "scheduled";
  readonly version: AggregateVersion;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function createDeletionRequest(input: {
  readonly scope: GovernanceScope;
  readonly requestedBy: ActorId;
  readonly requesterKind: DeletionRequest["requesterKind"];
  readonly governanceState: GovernanceState;
  readonly requestedGovernanceVersion: AggregateVersion;
  readonly reason: string;
  readonly typedConfirmation: string;
  readonly expectedConfirmation: string;
  readonly requiredApprovalCount?: number;
  readonly now: string;
  readonly id?: DeletionRequestId;
}): Promise<DeletionRequest> {
  if (input.requesterKind !== "human") {
    throw new DealGovernanceError(
      "DELETION_AUTHORITY_REQUIRED",
      `Deletion requester "${input.requestedBy}" has kind "${input.requesterKind}"; expected a human requester.`,
    );
  }
  if (
    input.governanceState !== "archived" &&
    input.governanceState !== "terminated"
  ) {
    throw new DealGovernanceError(
      "DELETION_REQUEST_BLOCKED",
      `Deletion request for deal "${input.scope.dealId}" requires archived or terminated governance state; received "${input.governanceState}".`,
    );
  }
  assertText(input.reason, "deletion request reason", 2000);
  assertInstant(input.now, "deletion request time");
  if (
    normalizeConfirmation(input.typedConfirmation) !==
      normalizeConfirmation(input.expectedConfirmation)
  ) {
    throw new GovernanceInvariantError(
      `Deletion confirmation "${input.typedConfirmation}" does not match expected confirmation; expected the exact deal confirmation phrase.`,
    );
  }
  const requiredApprovalCount = input.requiredApprovalCount ?? 2;
  if (
    !Number.isSafeInteger(requiredApprovalCount) || requiredApprovalCount < 1
  ) {
    throw new GovernanceInvariantError(
      `Deletion approval count "${requiredApprovalCount}" is invalid; expected a positive integer.`,
    );
  }
  const confirmationDigest = await digestConfirmation(input.typedConfirmation);
  return Object.freeze({
    aggregateType: "deletion_request",
    id: input.id ?? deletionRequestId(
      `deletion_${
        input.scope.dealId.slice(5)
      }-${input.requestedGovernanceVersion}`,
    ),
    scope: Object.freeze({ ...input.scope }),
    requestedBy: input.requestedBy,
    requesterKind: input.requesterKind,
    reason: input.reason,
    requestedGovernanceVersion: input.requestedGovernanceVersion,
    confirmationDigest,
    requiredApprovalCount,
    approvals: [],
    state: "draft",
    version: 1 as AggregateVersion,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function assessDeletionImpact(
  request: DeletionRequest,
  impact: DeletionImpact,
  now: string,
  expectedVersion: number,
): DeletionRequest {
  assertRequestVersion(request, expectedVersion);
  if (request.state !== "draft") {
    throw invalidRequestState(request, "impact assessment", "draft");
  }
  assertImpact(impact);
  return updateRequest(request, {
    impact,
    state: "impact_assessed",
    now,
  });
}

export function submitDeletionRequest(
  request: DeletionRequest,
  expectedVersion: number,
  now: string,
): DeletionRequest {
  assertRequestVersion(request, expectedVersion);
  if (request.state !== "impact_assessed") {
    throw invalidRequestState(request, "submission", "impact_assessed");
  }
  return updateRequest(request, { state: "approval_pending", now });
}

export function approveDeletionRequest(
  request: DeletionRequest,
  input: {
    readonly expectedVersion: number;
    readonly actorId: ActorId;
    readonly actorKind: DeletionApproval["actorKind"];
    readonly role: string;
    readonly now: string;
    readonly waitingPeriodMs?: number;
    readonly approvalId?: DeletionApprovalId;
  },
): DeletionRequest {
  assertRequestVersion(request, input.expectedVersion);
  if (request.state !== "approval_pending") {
    throw invalidRequestState(request, "approval", "approval_pending");
  }
  assertHumanApproval(request, input.actorId, input.actorKind);
  assertText(input.role, "deletion approval role", 128);
  assertInstant(input.now, "deletion approval time");
  if (
    request.approvals.some((approval) => approval.actorId === input.actorId)
  ) {
    throw new DealGovernanceError(
      "DELETION_AUTHORITY_REQUIRED",
      `Deletion approval actor "${input.actorId}" already approved request "${request.id}"; expected one approval per human authority.`,
    );
  }
  const approval: DeletionApproval = Object.freeze({
    id: input.approvalId ?? deletionApprovalId(
      `approval_${request.id.slice(9)}-${request.approvals.length + 1}`,
    ),
    actorId: input.actorId,
    actorKind: input.actorKind,
    role: input.role,
    decision: "approved",
    decidedAt: input.now,
    requestVersion: request.version,
  });
  const approvals = [...request.approvals, approval];
  const state = approvals.length >= request.requiredApprovalCount
    ? "waiting_period"
    : "approval_pending";
  const waitingUntil = state === "waiting_period"
    ? new Date(
      Date.parse(input.now) + (input.waitingPeriodMs ?? 24 * 60 * 60 * 1000),
    ).toISOString()
    : undefined;
  return updateRequest(request, {
    approvals,
    state,
    now: input.now,
    ...(waitingUntil === undefined ? {} : { waitingUntil }),
  });
}

export function rejectDeletionRequest(
  request: DeletionRequest,
  input: {
    readonly expectedVersion: number;
    readonly actorId: ActorId;
    readonly actorKind: DeletionApproval["actorKind"];
    readonly role: string;
    readonly now: string;
    readonly approvalId?: DeletionApprovalId;
  },
): DeletionRequest {
  assertRequestVersion(request, input.expectedVersion);
  if (request.state !== "approval_pending") {
    throw invalidRequestState(request, "rejection", "approval_pending");
  }
  assertHumanApproval(request, input.actorId, input.actorKind);
  assertText(input.role, "deletion rejection role", 128);
  assertInstant(input.now, "deletion rejection time");
  const approval: DeletionApproval = Object.freeze({
    id: input.approvalId ?? deletionApprovalId(
      `approval_${request.id.slice(9)}-rejection-${
        request.approvals.length + 1
      }`,
    ),
    actorId: input.actorId,
    actorKind: input.actorKind,
    role: input.role,
    decision: "rejected",
    decidedAt: input.now,
    requestVersion: request.version,
  });
  return updateRequest(request, {
    approvals: [...request.approvals, approval],
    state: "rejected",
    now: input.now,
  });
}

export function scheduleDeletionRequest(
  request: DeletionRequest,
  expectedVersion: number,
  now: string,
): DeletionRequest {
  assertRequestVersion(request, expectedVersion);
  if (request.state !== "waiting_period") {
    throw invalidRequestState(request, "scheduling", "waiting_period");
  }
  if (
    request.waitingUntil === undefined ||
    Date.parse(now) < Date.parse(request.waitingUntil)
  ) {
    throw new DealGovernanceError(
      "DELETION_REQUEST_BLOCKED",
      `Deletion request "${request.id}" waiting period has not elapsed; expected after "${
        request.waitingUntil ?? "an approval"
      }".`,
    );
  }
  return updateRequest(request, { state: "scheduled", now });
}

export function cancelDeletionRequest(
  request: DeletionRequest,
  expectedVersion: number,
  now: string,
): DeletionRequest {
  assertRequestVersion(request, expectedVersion);
  if (
    ["executing", "completed", "rejected", "cancelled"].includes(request.state)
  ) {
    throw new DealGovernanceError(
      "DELETION_REQUEST_BLOCKED",
      `Deletion request "${request.id}" state "${request.state}" cannot be cancelled; expected a pre-execution state.`,
    );
  }
  return updateRequest(request, { state: "cancelled", now });
}

export function placeDeletionRequestOnHold(
  request: DeletionRequest,
  expectedVersion: number,
  now: string,
): DeletionRequest {
  assertRequestVersion(request, expectedVersion);
  if (request.state !== "waiting_period" && request.state !== "scheduled") {
    throw invalidRequestState(
      request,
      "legal-hold blocking",
      "waiting_period or scheduled",
    );
  }
  return updateRequest(request, {
    state: "on_hold",
    resumeState: request.state,
    now,
  });
}

export function releaseDeletionRequestHold(
  request: DeletionRequest,
  expectedVersion: number,
  now: string,
): DeletionRequest {
  assertRequestVersion(request, expectedVersion);
  if (request.state !== "on_hold" || request.resumeState === undefined) {
    throw invalidRequestState(
      request,
      "legal-hold release",
      "on_hold with a resume state",
    );
  }
  return updateRequest(request, {
    state: request.resumeState,
    clearResumeState: true,
    now,
  });
}

export function startDeletionExecution(
  request: DeletionRequest,
  expectedVersion: number,
  now: string,
): DeletionRequest {
  assertRequestVersion(request, expectedVersion);
  if (request.state !== "scheduled") {
    throw invalidRequestState(request, "execution", "scheduled");
  }
  return updateRequest(request, { state: "executing", now });
}

export function completeDeletionRequest(
  request: DeletionRequest,
  expectedVersion: number,
  now: string,
  manifestVerified: boolean,
): DeletionRequest {
  assertRequestVersion(request, expectedVersion);
  if (request.state !== "executing") {
    throw invalidRequestState(request, "completion", "executing");
  }
  if (!manifestVerified) {
    throw new DealGovernanceError(
      "ERASURE_PROOF_REQUIRED",
      `Deletion request "${request.id}" cannot complete; expected a verified erasure or retention manifest.`,
    );
  }
  return updateRequest(request, { state: "completed", now });
}

function assertHumanApproval(
  request: DeletionRequest,
  actorId: ActorId,
  actorKind: DeletionApproval["actorKind"],
): void {
  if (actorKind !== "human") {
    throw new DealGovernanceError(
      "DELETION_AUTHORITY_REQUIRED",
      `Deletion approval actor "${actorId}" has kind "${actorKind}"; expected a human approver.`,
    );
  }
  if (actorId === request.requestedBy) {
    throw new DealGovernanceError(
      "DELETION_AUTHORITY_REQUIRED",
      `Deletion requester "${actorId}" cannot approve request "${request.id}"; expected a separate human approver.`,
    );
  }
}

function updateRequest(
  request: DeletionRequest,
  input: {
    readonly now: string;
    readonly state: DeletionRequestState;
    readonly approvals?: readonly DeletionApproval[];
    readonly impact?: DeletionImpact;
    readonly waitingUntil?: string;
    readonly resumeState?: "waiting_period" | "scheduled";
    readonly clearResumeState?: boolean;
  },
): DeletionRequest {
  assertInstant(input.now, "deletion request update time");
  return Object.freeze({
    ...request,
    state: input.state,
    version: (request.version + 1) as AggregateVersion,
    updatedAt: input.now,
    ...(input.approvals === undefined
      ? {}
      : { approvals: Object.freeze([...input.approvals]) }),
    ...(input.impact === undefined ? {} : { impact: input.impact }),
    ...(input.waitingUntil === undefined
      ? {}
      : { waitingUntil: input.waitingUntil }),
    ...(input.resumeState === undefined
      ? {}
      : { resumeState: input.resumeState }),
    ...(input.clearResumeState ? { resumeState: undefined } : {}),
  });
}

function assertRequestVersion(
  request: DeletionRequest,
  expectedVersion: number,
): void {
  if (request.version === expectedVersion) return;
  throw new DealGovernanceError(
    "GOVERNANCE_VERSION_CONFLICT",
    `Deletion request "${request.id}" version "${request.version}" conflicts with expected version "${expectedVersion}".`,
  );
}

function invalidRequestState(
  request: DeletionRequest,
  operation: string,
  expected: string,
): DealGovernanceError {
  return new DealGovernanceError(
    "DELETION_REQUEST_BLOCKED",
    `Deletion request "${request.id}" cannot perform "${operation}" from state "${request.state}"; expected ${expected}.`,
  );
}

function assertImpact(impact: DeletionImpact): void {
  if (impact.categories.length === 0) {
    throw new GovernanceInvariantError(
      "Deletion impact has no categories; expected every affected category to be explicit.",
    );
  }
  for (const [category, count] of Object.entries(impact.recordCounts)) {
    if (Number.isSafeInteger(count) && count >= 0) continue;
    throw new GovernanceInvariantError(
      `Deletion impact count "${count}" for category "${category}" is invalid; expected a non-negative integer.`,
    );
  }
  assertInstant(impact.assessedAt, "deletion impact assessment time");
}

function normalizeConfirmation(value: string): string {
  return value.trim().toUpperCase();
}

function assertText(value: string, label: string, maximum: number): void {
  if (value.trim().length > 0 && value.length <= maximum) return;
  throw new GovernanceInvariantError(
    `${label} "${value}" is invalid; expected 1-${maximum} non-whitespace characters.`,
  );
}

function assertInstant(value: string, label: string): void {
  if (Number.isFinite(Date.parse(value))) return;
  throw new GovernanceInvariantError(
    `${label} "${value}" is invalid; expected an ISO timestamp.`,
  );
}

async function digestConfirmation(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeConfirmation(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(digest),
    (part) => part.toString(16).padStart(2, "0"),
  ).join("");
}
