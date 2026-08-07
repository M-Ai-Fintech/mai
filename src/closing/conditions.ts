import {
  checklistRequirementId,
  type ConditionEvidenceId,
  conditionEvidenceId,
  type ConditionId,
  conditionId,
} from "./ids.ts";

export type ConditionState =
  | "active"
  | "evidence_submitted"
  | "satisfied"
  | "waiver_proposed"
  | "waived"
  | "disputed"
  | "failed"
  | "expired"
  | "post_closing"
  | "not_applicable"
  | "restricted";

export type ConditionEvidenceState =
  | "submitted"
  | "accepted"
  | "insufficient"
  | "expired"
  | "contradictory"
  | "restricted";

export interface ConditionEvidence {
  readonly evidenceId: ConditionEvidenceId;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly submittedBy: string;
  readonly submittedAt: string;
  readonly state: ConditionEvidenceState;
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
}

export interface ClosingCondition {
  readonly conditionId: ConditionId;
  readonly requirementId: string;
  readonly title: string;
  readonly category: string;
  readonly responsiblePartyId: string;
  readonly reviewerId: string;
  readonly state: ConditionState;
  readonly evidence: readonly ConditionEvidence[];
  readonly satisfiedBy?: string;
  readonly satisfiedAt?: string;
}

export function createCondition(input: {
  readonly conditionId: string;
  readonly requirementId: string;
  readonly title: string;
  readonly category: string;
  readonly responsiblePartyId: string;
  readonly reviewerId: string;
  readonly now: string;
}): ClosingCondition {
  assertText(input.title, "condition title");
  assertText(input.category, "condition category");
  assertText(input.responsiblePartyId, "condition responsible party");
  assertText(input.reviewerId, "condition reviewer");
  return Object.freeze({
    conditionId: conditionId(input.conditionId),
    requirementId: checklistRequirementId(input.requirementId),
    title: input.title,
    category: input.category,
    responsiblePartyId: input.responsiblePartyId,
    reviewerId: input.reviewerId,
    state: "active",
    evidence: Object.freeze([]),
  });
}

export function submitConditionEvidence(
  condition: ClosingCondition,
  input: Omit<ConditionEvidence, "evidenceId" | "state"> & {
    readonly evidenceId: string;
  },
): ClosingCondition {
  assertMutable(condition, "submit evidence");
  const evidence: ConditionEvidence = Object.freeze({
    ...input,
    evidenceId: conditionEvidenceId(input.evidenceId),
    state: "submitted",
  });
  return freezeCondition({
    ...condition,
    state: "evidence_submitted",
    evidence: [...condition.evidence, evidence],
  });
}

export function acceptConditionEvidence(
  condition: ClosingCondition,
  evidenceId: string,
  reviewerId: string,
  reviewedAt: string,
): ClosingCondition {
  assertMutable(condition, "accept evidence");
  if (reviewerId !== condition.reviewerId) {
    throw new Error(
      `Condition "${condition.conditionId}" reviewer "${reviewerId}" is not authorized to accept evidence; expected "${condition.reviewerId}".`,
    );
  }
  const parsedId = conditionEvidenceId(evidenceId);
  const evidence = condition.evidence.find((item) =>
    item.evidenceId === parsedId
  );
  if (evidence === undefined) throw missingEvidence(parsedId);
  const updated = condition.evidence.map((item) =>
    item.evidenceId === parsedId
      ? {
        ...item,
        state: "accepted" as const,
        reviewedBy: reviewerId,
        reviewedAt,
      }
      : item
  );
  return freezeCondition({ ...condition, evidence: updated });
}

export function satisfyCondition(
  condition: ClosingCondition,
  reviewerId: string,
  satisfiedAt: string,
): ClosingCondition {
  assertMutable(condition, "satisfy condition");
  if (reviewerId !== condition.reviewerId) {
    throw new Error(
      `Condition "${condition.conditionId}" reviewer "${reviewerId}" is not authorized; expected "${condition.reviewerId}".`,
    );
  }
  if (!condition.evidence.some((item) => item.state === "accepted")) {
    throw new Error(
      `Condition "${condition.conditionId}" cannot be satisfied; expected accepted evidence.`,
    );
  }
  return freezeCondition({
    ...condition,
    state: "satisfied",
    satisfiedBy: reviewerId,
    satisfiedAt,
  });
}

function assertMutable(condition: ClosingCondition, action: string): void {
  if (["satisfied", "waived", "not_applicable"].includes(condition.state)) {
    throw new Error(
      `Condition "${condition.conditionId}" cannot ${action} from state "${condition.state}"; expected an active condition.`,
    );
  }
}

function freezeCondition(condition: ClosingCondition): ClosingCondition {
  return Object.freeze({
    ...condition,
    evidence: Object.freeze(
      condition.evidence.map((item) => Object.freeze({ ...item })),
    ),
  });
}

function assertText(value: string, label: string): void {
  if (value.trim().length > 0 && value.length <= 256) return;
  throw new Error(
    `${label} "${value}" is invalid; expected 1-256 non-whitespace characters.`,
  );
}

function missingEvidence(evidenceId: ConditionEvidenceId): Error {
  return new Error(
    `Condition evidence "${evidenceId}" was not found; expected evidence belonging to the condition.`,
  );
}
