const MAX_IDENTIFIER_LENGTH = 96;
const governanceIdentifierBrand: unique symbol = Symbol(
  "governance-identifier",
);

type GovernanceIdentifier<Kind extends string> = string & {
  readonly [governanceIdentifierBrand]: Kind;
};

export type GovernanceId = GovernanceIdentifier<"GovernanceId">;
export type ConsequencePreviewId = GovernanceIdentifier<"ConsequencePreviewId">;
export type RetentionAssignmentId = GovernanceIdentifier<
  "RetentionAssignmentId"
>;
export type LegalHoldId = GovernanceIdentifier<"LegalHoldId">;
export type DeletionRequestId = GovernanceIdentifier<"DeletionRequestId">;
export type DeletionApprovalId = GovernanceIdentifier<"DeletionApprovalId">;
export type OrchestrationId = GovernanceIdentifier<"OrchestrationId">;
export type CheckpointId = GovernanceIdentifier<"CheckpointId">;
export type ErasureManifestId = GovernanceIdentifier<"ErasureManifestId">;
export type GovernanceEventId = GovernanceIdentifier<"GovernanceEventId">;

export function governanceId(value: string): GovernanceId {
  return parseGovernanceId(value, "governance_", "governance ID");
}

export function consequencePreviewId(value: string): ConsequencePreviewId {
  return parseGovernanceId(value, "preview_", "consequence preview ID");
}

export function retentionAssignmentId(value: string): RetentionAssignmentId {
  return parseGovernanceId(value, "retention_", "retention assignment ID");
}

export function legalHoldId(value: string): LegalHoldId {
  return parseGovernanceId(value, "hold_", "legal hold ID");
}

export function deletionRequestId(value: string): DeletionRequestId {
  return parseGovernanceId(value, "deletion_", "deletion request ID");
}

export function deletionApprovalId(value: string): DeletionApprovalId {
  return parseGovernanceId(value, "approval_", "deletion approval ID");
}

export function orchestrationId(value: string): OrchestrationId {
  return parseGovernanceId(value, "orchestration_", "orchestration ID");
}

export function checkpointId(value: string): CheckpointId {
  return parseGovernanceId(value, "checkpoint_", "checkpoint ID");
}

export function erasureManifestId(value: string): ErasureManifestId {
  return parseGovernanceId(value, "manifest_", "erasure manifest ID");
}

export function governanceEventId(value: string): GovernanceEventId {
  return parseGovernanceId(value, "event_", "governance event ID");
}

function parseGovernanceId<T extends string>(
  value: string,
  prefix: string,
  label: string,
): GovernanceIdentifier<T> {
  if (
    value.length > prefix.length &&
    value.length <= MAX_IDENTIFIER_LENGTH &&
    value.startsWith(prefix) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length))
  ) {
    return value as GovernanceIdentifier<T>;
  }
  throw new Error(
    `Deal Governance ${label} "${value}" is invalid; expected ${prefix}<lowercase-slug>.`,
  );
}
