import type {
  ActorId,
  CorrelationId,
} from "../shared/contracts/identifiers.ts";
import type { GovernanceCommandContext } from "./service_contracts.ts";
import type { DeletionRequestId } from "./ids.ts";
import type { GovernanceScope } from "./model.ts";
import type { ErasureGate } from "./orchestration.ts";

export interface TrustedApprovalEvidence {
  readonly approved: boolean;
  readonly reference: string;
  readonly version: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export interface TrustedFeatureEvidence {
  readonly enabled: boolean;
  readonly reference: string;
  readonly version: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export interface TrustedErasureGateEvidence {
  readonly evidenceId: string;
  readonly scope: GovernanceScope;
  readonly requestId: DeletionRequestId;
  readonly categories: readonly string[];
  readonly execution: {
    readonly actorId: ActorId;
    readonly correlationId: CorrelationId;
  };
  readonly policy: TrustedApprovalEvidence;
  readonly infrastructure: TrustedApprovalEvidence;
  readonly feature: TrustedFeatureEvidence;
}

export interface ErasureGateEvidencePort {
  resolve(input: {
    readonly context: GovernanceCommandContext;
    readonly scope: GovernanceScope;
    readonly requestId: DeletionRequestId;
    readonly categories: readonly string[];
  }):
    | Promise<TrustedErasureGateEvidence | undefined>
    | TrustedErasureGateEvidence
    | undefined;
}

export function defaultDeniedErasureGate(
  evaluatedAt: string,
  reason: string,
): ErasureGate {
  return Object.freeze({
    policyApproved: false,
    infrastructureApproved: false,
    physicalErasureEnabled: false,
    resolutionReason: reason,
    evidence: Object.freeze({
      source: "default_denied" as const,
      evaluatedAt,
    }),
  });
}

export function resolveTrustedErasureGate(input: {
  readonly evidence: TrustedErasureGateEvidence | undefined;
  readonly context: GovernanceCommandContext;
  readonly scope: GovernanceScope;
  readonly requestId: DeletionRequestId;
  readonly categories: readonly string[];
  readonly now: string;
}): ErasureGate {
  const evidence = input.evidence;
  if (evidence === undefined) {
    return defaultDeniedErasureGate(
      input.now,
      "TRUSTED_ERASURE_GATE_UNAVAILABLE_PHYSICAL_ERASURE_DISABLED",
    );
  }
  const failure = validateEvidence(evidence, input);
  if (failure !== undefined) {
    return defaultDeniedErasureGate(input.now, failure);
  }
  const physicalErasureEnabled = evidence.policy.approved &&
    evidence.infrastructure.approved && evidence.feature.enabled;
  const resolutionReason = physicalErasureEnabled
    ? "TRUSTED_ERASURE_GATES_APPROVED"
    : !evidence.policy.approved
    ? "TRUSTED_POLICY_NOT_APPROVED_PHYSICAL_ERASURE_DISABLED"
    : !evidence.infrastructure.approved
    ? "TRUSTED_INFRASTRUCTURE_NOT_APPROVED_PHYSICAL_ERASURE_DISABLED"
    : "TRUSTED_ERASURE_FEATURE_DISABLED";
  return Object.freeze({
    policyApproved: evidence.policy.approved,
    infrastructureApproved: evidence.infrastructure.approved,
    physicalErasureEnabled,
    resolutionReason,
    evidence: Object.freeze({
      source: "trusted_server_evidence" as const,
      evidenceId: evidence.evidenceId,
      policyReference: evidence.policy.reference,
      infrastructureReference: evidence.infrastructure.reference,
      featureReference: evidence.feature.reference,
      evaluatedAt: input.now,
    }),
  });
}

function validateEvidence(
  evidence: TrustedErasureGateEvidence,
  input: {
    readonly context: GovernanceCommandContext;
    readonly scope: GovernanceScope;
    readonly requestId: DeletionRequestId;
    readonly categories: readonly string[];
    readonly now: string;
  },
): string | undefined {
  if (!sameScope(evidence.scope, input.scope)) {
    return "TRUSTED_ERASURE_GATE_SCOPE_MISMATCH_PHYSICAL_ERASURE_DISABLED";
  }
  if (evidence.requestId !== input.requestId) {
    return "TRUSTED_ERASURE_GATE_REQUEST_MISMATCH_PHYSICAL_ERASURE_DISABLED";
  }
  if (!sameCategories(evidence.categories, input.categories)) {
    return "TRUSTED_ERASURE_GATE_CATEGORY_MISMATCH_PHYSICAL_ERASURE_DISABLED";
  }
  if (
    evidence.execution.actorId !== input.context.actor.id ||
    evidence.execution.correlationId !== input.context.request.correlationId
  ) {
    return "TRUSTED_ERASURE_GATE_EXECUTION_MISMATCH_PHYSICAL_ERASURE_DISABLED";
  }
  if (evidence.evidenceId.trim().length === 0) {
    return "TRUSTED_ERASURE_GATE_ID_MISSING_PHYSICAL_ERASURE_DISABLED";
  }
  for (
    const item of [evidence.policy, evidence.infrastructure, evidence.feature]
  ) {
    if (
      item.reference.trim().length === 0 || item.version.trim().length === 0 ||
      !validWindow(item.issuedAt, item.expiresAt, input.now)
    ) {
      return "TRUSTED_ERASURE_GATE_STALE_OR_INVALID_PHYSICAL_ERASURE_DISABLED";
    }
  }
  return undefined;
}

function validWindow(
  issuedAt: string,
  expiresAt: string,
  now: string,
): boolean {
  const issued = Date.parse(issuedAt);
  const expires = Date.parse(expiresAt);
  const current = Date.parse(now);
  return Number.isFinite(issued) && Number.isFinite(expires) &&
    Number.isFinite(current) && issued <= current && current < expires;
}

function sameScope(left: GovernanceScope, right: GovernanceScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function sameCategories(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return normalizeCategories(left).join("|") ===
    normalizeCategories(right).join("|");
}

function normalizeCategories(categories: readonly string[]): string[] {
  return [...new Set(categories.map((category) => category.trim()))].sort();
}
