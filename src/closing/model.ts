import type { ActorReference } from "../platform/authz/v1.ts";
import type {
  AggregateVersion,
  DealId,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";
import type {
  ClosingBlockerId,
  ClosingWorkspaceId,
  CompletionRecordId,
  ConditionId,
  ReadinessApprovalId,
  SignatureEvidenceId,
  SignaturePackageId,
  WaiverId,
} from "./ids.ts";
import {
  checklistRequirementId,
  closingWorkspaceId,
  conditionId,
} from "./ids.ts";
import type { ClosingCondition } from "./conditions.ts";
import type { ClosingStatus } from "./transitions.ts";

export type ClosingScope = {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
};

export type ChecklistItemState =
  | "not_started"
  | "drafting"
  | "requested"
  | "submitted"
  | "under_review"
  | "clarification_required"
  | "conditionally_accepted"
  | "accepted"
  | "satisfied"
  | "waived"
  | "rejected"
  | "overdue"
  | "blocked"
  | "not_applicable"
  | "superseded"
  | "post_closing"
  | "restricted";

export interface ChecklistRequirement {
  readonly requirementId: string;
  readonly title: string;
  readonly category: string;
  readonly criticality: "critical" | "high" | "medium" | "low";
  readonly blocking: boolean;
  readonly state: ChecklistItemState;
  readonly conditionId?: ConditionId;
  readonly ownerId: string;
  readonly reviewerId: string;
  readonly dueAt?: string;
}

export function createChecklistRequirement(
  input: ChecklistRequirement,
): ChecklistRequirement {
  assertText(input.title, "checklist requirement title", 256);
  assertText(input.category, "checklist requirement category", 128);
  assertText(input.ownerId, "checklist requirement owner", 128);
  assertText(input.reviewerId, "checklist requirement reviewer", 128);
  return Object.freeze({
    ...input,
    requirementId: checklistRequirementId(input.requirementId),
    ...(input.conditionId === undefined
      ? {}
      : { conditionId: conditionId(input.conditionId) }),
  });
}

export type WaiverStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "expired"
  | "superseded";

export interface ClosingWaiver {
  readonly waiverId: WaiverId;
  readonly conditionId: ConditionId;
  readonly scope: "full" | "temporary" | "post_closing";
  readonly proposedBy: string;
  readonly beneficiary: string;
  readonly reason: string;
  readonly residualRisk: string;
  readonly legalReviewState: "pending" | "confirmed" | "rejected";
  readonly requiredApprovalIds: readonly string[];
  readonly approvalAuthority: string;
  readonly status: WaiverStatus;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly effectiveAt?: string;
  readonly sourceDocumentId?: string;
}

export type ReadinessStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "invalidated";

export interface ReadinessApproval {
  readonly readinessApprovalId: ReadinessApprovalId;
  readonly workspaceVersion: AggregateVersion;
  readonly status: ReadinessStatus;
  readonly approvedBy?: string;
  readonly authorityProofId?: string;
  readonly approvedAt?: string;
  readonly invalidatedAt?: string;
  readonly invalidationReason?: string;
}

export type SignatureEvidenceState =
  | "missing"
  | "received"
  | "accepted"
  | "rejected"
  | "superseded";

export interface SignatureEvidence {
  readonly signatureEvidenceId: SignatureEvidenceId;
  readonly documentVersionId: string;
  readonly signatoryId: string;
  readonly authorityEvidenceId?: string;
  readonly signatureMethod: "manual" | "provider_reference" | "certificate";
  readonly state: SignatureEvidenceState;
  readonly signedAt?: string;
  readonly evidenceReference?: string;
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
}

export type SignaturePackageStatus =
  | "draft"
  | "review"
  | "approved"
  | "sent"
  | "viewed"
  | "partially_signed"
  | "complete"
  | "declined"
  | "expired"
  | "voided"
  | "superseded";

export interface SignaturePackage {
  readonly signaturePackageId: SignaturePackageId;
  readonly documentVersionIds: readonly string[];
  readonly requiredSignatoryIds: readonly string[];
  readonly signatureEvidenceIds: readonly SignatureEvidenceId[];
  readonly status: SignaturePackageStatus;
  readonly version: number;
  readonly approvedBy?: string;
  readonly sentAt?: string;
  readonly completedAt?: string;
}

export interface ClosingBlocker {
  readonly blockerId: ClosingBlockerId;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly title: string;
  readonly consequence: string;
  readonly severity: "critical" | "high" | "medium" | "low";
  readonly ownerId: string;
  readonly state: "open" | "resolved" | "reopened";
  readonly resolution?: string;
  readonly resolvedBy?: string;
  readonly resolvedAt?: string;
}

export interface CompletionRecord {
  readonly completionRecordId: CompletionRecordId;
  readonly confirmedBy: string;
  readonly authorityProofId: string;
  readonly paymentsEvidence: readonly string[];
  readonly transferEvidence: readonly string[];
  readonly finalExceptions: readonly string[];
  readonly pendingEvidence: readonly string[];
  readonly confirmedAt: string;
  readonly effectiveAt: string;
  readonly irreversible: true;
}

export interface ClosingHistoryEvent {
  readonly eventId: string;
  readonly version: AggregateVersion;
  readonly type: string;
  readonly actor: ActorReference;
  readonly authorityProofId?: string;
  readonly occurredAt: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface ClosingWorkspace {
  readonly aggregateType: "closing_workspace";
  readonly closingWorkspaceId: ClosingWorkspaceId;
  readonly scope: ClosingScope;
  readonly version: AggregateVersion;
  readonly status: ClosingStatus;
  readonly confirmationEnabled: boolean;
  readonly requirements: readonly ChecklistRequirement[];
  readonly conditions: readonly ClosingCondition[];
  readonly waivers: readonly ClosingWaiver[];
  readonly readiness?: ReadinessApproval;
  readonly signatures: readonly SignatureEvidence[];
  readonly signaturePackages: readonly SignaturePackage[];
  readonly blockers: readonly ClosingBlocker[];
  readonly completion?: CompletionRecord;
  readonly history: readonly ClosingHistoryEvent[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReadinessReport {
  readonly ready: boolean;
  readonly reasons: readonly ReadinessBlocker[];
}

export type ReadinessBlocker =
  | { readonly code: "UNSATISFIED_CONDITION"; readonly conditionId: string }
  | {
    readonly code: "UNSATISFIED_REQUIREMENT";
    readonly requirementId: string;
  }
  | { readonly code: "OPEN_CRITICAL_BLOCKER"; readonly blockerId: string }
  | {
    readonly code: "INCOMPLETE_SIGNATURE_PACKAGE";
    readonly packageId: string;
  }
  | { readonly code: "READINESS_FEATURE_DISABLED" };

export type ClosingErrorCode =
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "SCOPE_MISMATCH"
  | "AUTHORIZATION_DENIED"
  | "HUMAN_AUTHORITY_REQUIRED"
  | "SEPARATION_OF_DUTIES"
  | "STALE_VERSION"
  | "IDEMPOTENCY_CONFLICT"
  | "PREREQUISITE_BLOCKED"
  | "IRREVERSIBLE_CONFIRMATION"
  | "PROTECTED_NOT_FOUND";

export class ClosingError extends Error {
  constructor(readonly code: ClosingErrorCode, message: string) {
    super(message);
    this.name = "ClosingError";
  }
}

export function createClosingWorkspace(input: {
  readonly closingWorkspaceId: string;
  readonly scope: ClosingScope;
  readonly confirmationEnabled?: boolean;
  readonly now: string;
}): ClosingWorkspace {
  return freezeWorkspace({
    aggregateType: "closing_workspace",
    closingWorkspaceId: closingWorkspaceId(input.closingWorkspaceId),
    scope: Object.freeze({ ...input.scope }),
    version: 1 as AggregateVersion,
    status: "setup",
    confirmationEnabled: input.confirmationEnabled ?? false,
    requirements: [],
    conditions: [],
    waivers: [],
    signatures: [],
    signaturePackages: [],
    blockers: [],
    history: [],
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function evaluateReadiness(
  workspace: ClosingWorkspace,
): ReadinessReport {
  const reasons: ReadinessBlocker[] = [
    ...workspace.requirements
      .filter((requirement) =>
        requirement.blocking &&
        ![
          "accepted",
          "satisfied",
          "waived",
          "not_applicable",
          "post_closing",
        ].includes(requirement.state)
      )
      .map((requirement) => ({
        code: "UNSATISFIED_REQUIREMENT" as const,
        requirementId: requirement.requirementId,
      })),
    ...workspace.conditions
      .filter((condition) => !["satisfied", "waived"].includes(condition.state))
      .map((condition) => ({
        code: "UNSATISFIED_CONDITION" as const,
        conditionId: condition.conditionId,
      })),
    ...workspace.blockers
      .filter((blocker) =>
        blocker.severity === "critical" && blocker.state !== "resolved"
      )
      .map((blocker) => ({
        code: "OPEN_CRITICAL_BLOCKER" as const,
        blockerId: blocker.blockerId,
      })),
    ...workspace.signaturePackages
      .filter((signaturePackage) => signaturePackage.status !== "complete")
      .map((signaturePackage) => ({
        code: "INCOMPLETE_SIGNATURE_PACKAGE" as const,
        packageId: signaturePackage.signaturePackageId,
      })),
  ];
  return Object.freeze({
    ready: reasons.length === 0,
    reasons: Object.freeze(reasons),
  });
}

export function freezeWorkspace(workspace: ClosingWorkspace): ClosingWorkspace {
  return Object.freeze({
    ...workspace,
    scope: Object.freeze({ ...workspace.scope }),
    requirements: Object.freeze(
      workspace.requirements.map((item) => Object.freeze({ ...item })),
    ),
    conditions: Object.freeze([...workspace.conditions]),
    waivers: Object.freeze(
      workspace.waivers.map((item) =>
        Object.freeze({
          ...item,
          requiredApprovalIds: Object.freeze([...item.requiredApprovalIds]),
        })
      ),
    ),
    signatures: Object.freeze(
      workspace.signatures.map((item) => Object.freeze({ ...item })),
    ),
    signaturePackages: Object.freeze(
      workspace.signaturePackages.map((item) =>
        Object.freeze({
          ...item,
          documentVersionIds: Object.freeze([...item.documentVersionIds]),
          requiredSignatoryIds: Object.freeze([...item.requiredSignatoryIds]),
          signatureEvidenceIds: Object.freeze([...item.signatureEvidenceIds]),
        })
      ),
    ),
    blockers: Object.freeze(
      workspace.blockers.map((item) => Object.freeze({ ...item })),
    ),
    history: Object.freeze(
      workspace.history.map((item) =>
        Object.freeze({
          ...item,
          actor: Object.freeze({ ...item.actor }),
          payload: Object.freeze({ ...item.payload }),
        })
      ),
    ),
  });
}

function assertText(value: string, label: string, maxLength: number): void {
  if (value.trim().length > 0 && value.length <= maxLength) return;
  throw new ClosingError(
    "INVALID_INPUT",
    `${label} "${value}" is invalid; expected 1-${maxLength} non-whitespace characters.`,
  );
}
