import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
import {
  type LegalHoldId,
  legalHoldId,
  type RetentionAssignmentId,
  retentionAssignmentId,
} from "./ids.ts";
import type { GovernanceScope, GovernanceState } from "./model.ts";
import { DealGovernanceError, GovernanceInvariantError } from "./errors.ts";

export type RetentionStartEvent =
  | "archive"
  | "termination"
  | "legal_completion"
  | "last_external_distribution";
export type RetentionDisposition =
  | "retain_complete_record"
  | "retain_metadata_only"
  | "anonymize_personal_data"
  | "delete_selected_source_copies"
  | "permanently_delete_eligible_records"
  | "manual_review";
export type LegalHoldState = "active" | "released";

export interface RetentionAssignment {
  readonly aggregateType: "retention_assignment";
  readonly id: RetentionAssignmentId;
  readonly scope: GovernanceScope;
  readonly policySource: string;
  readonly policyVersion: string;
  readonly retainedCategories: readonly string[];
  readonly retentionStartEvent: RetentionStartEvent;
  readonly retentionStartAt?: string;
  readonly retentionUntil: string;
  readonly disposition: RetentionDisposition;
  readonly mandatory: boolean;
  readonly version: AggregateVersion;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LegalHold {
  readonly aggregateType: "legal_hold";
  readonly id: LegalHoldId;
  readonly scope: GovernanceScope;
  readonly categories: readonly string[];
  readonly reason: string;
  readonly placedBy: ActorId;
  readonly placedAt: string;
  readonly reviewAt?: string;
  readonly state: LegalHoldState;
  readonly releasedBy?: ActorId;
  readonly releasedAt?: string;
  readonly version: AggregateVersion;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RetentionAssessment {
  readonly eligible: boolean;
  readonly code:
    | "NO_POLICY"
    | "ACTIVE_LIFECYCLE"
    | "RETENTION_WINDOW_OPEN"
    | "LEGAL_HOLD_ACTIVE"
    | "DISPOSITION_REQUIRES_REVIEW"
    | "ELIGIBLE";
  readonly message: string;
  readonly retainedCategories: readonly string[];
}

export function createRetentionAssignment(input: {
  readonly scope: GovernanceScope;
  readonly policySource: string;
  readonly policyVersion: string;
  readonly retainedCategories: readonly string[];
  readonly retentionStartEvent: RetentionStartEvent;
  readonly retentionUntil: string;
  readonly disposition: RetentionDisposition;
  readonly mandatory?: boolean;
  readonly now: string;
  readonly id?: RetentionAssignmentId;
}): RetentionAssignment {
  assertText(input.policySource, "retention policy source", 255);
  assertText(input.policyVersion, "retention policy version", 128);
  assertCategories(input.retainedCategories);
  assertInstant(input.now, "retention assignment time");
  assertInstant(input.retentionUntil, "retention end time");
  if (Date.parse(input.retentionUntil) <= Date.parse(input.now)) {
    throw new GovernanceInvariantError(
      `Retention end "${input.retentionUntil}" is not after assignment time "${input.now}"; expected a future retention window.`,
    );
  }
  return Object.freeze({
    aggregateType: "retention_assignment",
    id: input.id ?? retentionAssignmentId(
      `retention_${input.scope.dealId.slice(5)}-${input.policyVersion}`,
    ),
    scope: Object.freeze({ ...input.scope }),
    policySource: input.policySource,
    policyVersion: input.policyVersion,
    retainedCategories: Object.freeze([...input.retainedCategories]),
    retentionStartEvent: input.retentionStartEvent,
    retentionUntil: input.retentionUntil,
    disposition: input.disposition,
    mandatory: input.mandatory ?? true,
    version: 1 as AggregateVersion,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function startRetentionClock(
  assignment: RetentionAssignment,
  startAt: string,
): RetentionAssignment {
  assertInstant(startAt, "retention start time");
  if (assignment.retentionStartAt !== undefined) return assignment;
  return Object.freeze({
    ...assignment,
    retentionStartAt: startAt,
    version: (assignment.version + 1) as AggregateVersion,
    updatedAt: startAt,
  });
}

export function replaceRetentionAssignment(
  current: RetentionAssignment,
  replacement: RetentionAssignment,
  expectedVersion: number,
): RetentionAssignment {
  if (current.version !== expectedVersion) {
    throw new DealGovernanceError(
      "GOVERNANCE_VERSION_CONFLICT",
      `Retention assignment "${current.id}" version "${current.version}" conflicts with expected version "${expectedVersion}".`,
    );
  }
  if (
    current.mandatory &&
    Date.parse(replacement.retentionUntil) < Date.parse(current.retentionUntil)
  ) {
    throw new DealGovernanceError(
      "RETENTION_BLOCKED",
      `Retention assignment "${current.id}" cannot shorten mandatory retention from "${current.retentionUntil}" to "${replacement.retentionUntil}".`,
    );
  }
  return Object.freeze({
    ...replacement,
    id: current.id,
    version: (current.version + 1) as AggregateVersion,
  });
}

export function createLegalHold(input: {
  readonly scope: GovernanceScope;
  readonly categories: readonly string[];
  readonly reason: string;
  readonly placedBy: ActorId;
  readonly actorKind: "human" | "ai" | "service" | "external";
  readonly placedAt: string;
  readonly reviewAt?: string;
  readonly id?: LegalHoldId;
}): LegalHold {
  if (input.actorKind !== "human") {
    throw new DealGovernanceError(
      "DELETION_AUTHORITY_REQUIRED",
      `Legal hold actor "${input.placedBy}" has kind "${input.actorKind}"; expected a human authority.`,
    );
  }
  assertCategories(input.categories);
  assertText(input.reason, "legal hold reason", 1000);
  assertInstant(input.placedAt, "legal hold placement time");
  if (input.reviewAt !== undefined) {
    assertInstant(input.reviewAt, "legal hold review time");
  }
  return Object.freeze({
    aggregateType: "legal_hold",
    id: input.id ?? legalHoldId(
      `hold_${input.scope.dealId.slice(5)}-${Date.parse(input.placedAt)}`,
    ),
    scope: Object.freeze({ ...input.scope }),
    categories: Object.freeze([...input.categories]),
    reason: input.reason,
    placedBy: input.placedBy,
    placedAt: input.placedAt,
    ...(input.reviewAt === undefined ? {} : { reviewAt: input.reviewAt }),
    state: "active",
    version: 1 as AggregateVersion,
    createdAt: input.placedAt,
    updatedAt: input.placedAt,
  });
}

export function releaseLegalHold(
  hold: LegalHold,
  input: {
    readonly expectedVersion: number;
    readonly releasedBy: ActorId;
    readonly actorKind: "human" | "ai" | "service" | "external";
    readonly releasedAt: string;
  },
): LegalHold {
  if (hold.version !== input.expectedVersion) {
    throw new DealGovernanceError(
      "GOVERNANCE_VERSION_CONFLICT",
      `Legal hold "${hold.id}" version "${hold.version}" conflicts with expected version "${input.expectedVersion}".`,
    );
  }
  if (input.actorKind !== "human") {
    throw new DealGovernanceError(
      "DELETION_AUTHORITY_REQUIRED",
      `Legal hold release actor "${input.releasedBy}" has kind "${input.actorKind}"; expected a human authority.`,
    );
  }
  assertInstant(input.releasedAt, "legal hold release time");
  if (hold.state === "released") return hold;
  return Object.freeze({
    ...hold,
    state: "released",
    releasedBy: input.releasedBy,
    releasedAt: input.releasedAt,
    version: (hold.version + 1) as AggregateVersion,
    updatedAt: input.releasedAt,
  });
}

export function assessRetention(input: {
  readonly state: GovernanceState;
  readonly assignment: RetentionAssignment | undefined;
  readonly holds: readonly LegalHold[];
  readonly category?: string;
  readonly now: string;
}): RetentionAssessment {
  const retainedCategories = input.assignment?.retainedCategories ?? [];
  const activeHold = input.holds.find((hold) =>
    hold.state === "active" &&
    (input.category === undefined || hold.categories.includes("*") ||
      hold.categories.includes(input.category))
  );
  if (activeHold !== undefined) {
    return {
      eligible: false,
      code: "LEGAL_HOLD_ACTIVE",
      message:
        `Legal hold "${activeHold.id}" remains active; expected hold release before eligible disposition.`,
      retainedCategories,
    };
  }
  if (input.assignment === undefined) {
    return {
      eligible: false,
      code: "NO_POLICY",
      message:
        "No retention assignment exists; expected an approved retention policy before disposition.",
      retainedCategories,
    };
  }
  if (input.state !== "archived" && input.state !== "terminated") {
    return {
      eligible: false,
      code: "ACTIVE_LIFECYCLE",
      message:
        `Governance state "${input.state}" is active for disposition; expected archived or terminated state.`,
      retainedCategories,
    };
  }
  if (Date.parse(input.now) < Date.parse(input.assignment.retentionUntil)) {
    return {
      eligible: false,
      code: "RETENTION_WINDOW_OPEN",
      message:
        `Retention remains active until "${input.assignment.retentionUntil}"; expected the policy window to close.`,
      retainedCategories,
    };
  }
  if (input.assignment.disposition === "manual_review") {
    return {
      eligible: false,
      code: "DISPOSITION_REQUIRES_REVIEW",
      message:
        "Retention disposition requires manual review; expected an explicit reviewer outcome.",
      retainedCategories,
    };
  }
  return {
    eligible: true,
    code: "ELIGIBLE",
    message: "Retention and legal-hold gates allow the requested disposition.",
    retainedCategories,
  };
}

export function holdAffectsCategory(
  holds: readonly LegalHold[],
  category: string,
): boolean {
  return holds.some((hold) =>
    hold.state === "active" &&
    (hold.categories.includes("*") || hold.categories.includes(category))
  );
}

function assertCategories(categories: readonly string[]): void {
  if (categories.length === 0) {
    throw new GovernanceInvariantError(
      "Retention categories are empty; expected at least one governed category.",
    );
  }
  for (const category of categories) {
    assertText(category, "retention category", 128);
  }
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
