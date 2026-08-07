declare const closingIdBrand: unique symbol;
type ClosingId<Kind extends string> = string & {
  readonly [closingIdBrand]: Kind;
};

export type ClosingWorkspaceId = ClosingId<"ClosingWorkspaceId">;
export type ChecklistRequirementId = ClosingId<"ChecklistRequirementId">;
export type ConditionId = ClosingId<"ConditionId">;
export type ConditionEvidenceId = ClosingId<"ConditionEvidenceId">;
export type WaiverId = ClosingId<"WaiverId">;
export type ReadinessApprovalId = ClosingId<"ReadinessApprovalId">;
export type SignatureEvidenceId = ClosingId<"SignatureEvidenceId">;
export type SignaturePackageId = ClosingId<"SignaturePackageId">;
export type ClosingBlockerId = ClosingId<"ClosingBlockerId">;
export type CompletionRecordId = ClosingId<"CompletionRecordId">;
export type ClosingEventId = ClosingId<"ClosingEventId">;

export function closingWorkspaceId(value: string): ClosingWorkspaceId {
  return prefixed(value, "closing_", "closing workspace ID");
}

export function checklistRequirementId(value: string): ChecklistRequirementId {
  return prefixed(value, "requirement_", "checklist requirement ID");
}

export function conditionId(value: string): ConditionId {
  return prefixed(value, "condition_", "condition ID");
}

export function conditionEvidenceId(value: string): ConditionEvidenceId {
  return prefixed(value, "evidence_", "condition evidence ID");
}

export function waiverId(value: string): WaiverId {
  return prefixed(value, "waiver_", "waiver ID");
}

export function readinessApprovalId(value: string): ReadinessApprovalId {
  return prefixed(value, "readiness_", "readiness approval ID");
}

export function signatureEvidenceId(value: string): SignatureEvidenceId {
  return prefixed(value, "signature_", "signature evidence ID");
}

export function signaturePackageId(value: string): SignaturePackageId {
  return prefixed(value, "package_", "signature package ID");
}

export function closingBlockerId(value: string): ClosingBlockerId {
  return prefixed(value, "blocker_", "closing blocker ID");
}

export function completionRecordId(value: string): CompletionRecordId {
  return prefixed(value, "completion_", "completion record ID");
}

export function closingEventId(value: string): ClosingEventId {
  return prefixed(value, "closing_event_", "closing event ID");
}

function prefixed<T extends string>(
  value: string,
  prefix: string,
  label: string,
): T {
  const suffix = value.slice(prefix.length);
  if (
    value.length <= 96 && value.startsWith(prefix) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suffix)
  ) return value as T;
  throw new Error(
    `Invalid ${label} "${value}"; expected prefix "${prefix}" and slug characters.`,
  );
}
