import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import {
  type ConsequencePreviewId,
  consequencePreviewId,
  type GovernanceId,
  governanceId,
} from "./ids.ts";
import { DealGovernanceError, GovernanceInvariantError } from "./errors.ts";

export interface GovernanceScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}

export type GovernanceState = "active" | "paused" | "terminated" | "archived";
export type GovernanceAction = "pause" | "archive" | "restore" | "terminate";

export interface DealGovernanceAggregate {
  readonly aggregateType: "deal_governance";
  readonly id: GovernanceId;
  readonly scope: GovernanceScope;
  readonly version: AggregateVersion;
  readonly state: GovernanceState;
  readonly retentionAssignmentId?: string;
  readonly activeLegalHoldIds: readonly string[];
  readonly deletionRequestId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ConsequenceEffect {
  readonly code:
    | "stop_active_work"
    | "stop_source_sync"
    | "retain_evidence"
    | "start_retention_clock"
    | "revoke_external_access"
    | "preserve_audit_history"
    | "do_not_restore_external_access";
  readonly reversible: boolean;
  readonly description: string;
}

export interface ConsequenceBlocker {
  readonly code:
    | "INVALID_TRANSITION"
    | "ACTIVE_LEGAL_HOLD"
    | "MANDATORY_RETENTION"
    | "APPROVAL_REQUIRED"
    | "PREVIEW_EXPIRED";
  readonly message: string;
}

export interface ConsequencePreview {
  readonly previewId: ConsequencePreviewId;
  readonly scope: GovernanceScope;
  readonly action: GovernanceAction;
  readonly aggregateVersion: AggregateVersion;
  readonly fromState: GovernanceState;
  readonly toState?: GovernanceState;
  readonly outcome: "allowed" | "blocked";
  readonly effects: readonly ConsequenceEffect[];
  readonly blockers: readonly ConsequenceBlocker[];
  readonly requiresHumanAuthority: true;
  readonly reversible: boolean;
  readonly physicalErasureEnabled: false;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface GovernanceEvent {
  readonly eventId: string;
  readonly scope: GovernanceScope;
  readonly actorId: ActorId;
  readonly actorKind: ActorReference["kind"];
  readonly correlationId: string;
  readonly aggregateVersion: AggregateVersion;
  readonly eventType: string;
  readonly schemaVersion: 1;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: string;
}

export interface GovernanceTransition {
  readonly aggregate: DealGovernanceAggregate;
  readonly preview: ConsequencePreview;
  readonly previousState: GovernanceState;
  readonly nextState: GovernanceState;
}

const TRANSITIONS: readonly {
  readonly action: GovernanceAction;
  readonly from: GovernanceState;
  readonly to: GovernanceState;
  readonly reversible: boolean;
}[] = Object.freeze([
  { action: "pause", from: "active", to: "paused", reversible: true },
  { action: "restore", from: "paused", to: "active", reversible: true },
  { action: "restore", from: "archived", to: "active", reversible: true },
  { action: "archive", from: "paused", to: "archived", reversible: true },
  { action: "archive", from: "terminated", to: "archived", reversible: true },
  { action: "terminate", from: "active", to: "terminated", reversible: false },
  { action: "terminate", from: "paused", to: "terminated", reversible: false },
]);

export function createInitialGovernance(input: {
  readonly scope: GovernanceScope;
  readonly now: string;
  readonly id?: GovernanceId;
}): DealGovernanceAggregate {
  assertInstant(input.now, "governance creation time");
  return freezeGovernance({
    aggregateType: "deal_governance",
    id: input.id ?? governanceId(`governance_${input.scope.dealId.slice(5)}`),
    scope: freezeScope(input.scope),
    version: 1 as AggregateVersion,
    state: "active",
    activeLegalHoldIds: [],
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function previewGovernanceTransition(input: {
  readonly aggregate: DealGovernanceAggregate;
  readonly action: GovernanceAction;
  readonly previewId?: ConsequencePreviewId;
  readonly now: string;
  readonly expiresAt?: string;
  readonly activeLegalHold?: boolean;
  readonly retentionBlocked?: boolean;
}): ConsequencePreview {
  assertInstant(input.now, "consequence preview creation time");
  const transition = transitionFor(input.aggregate.state, input.action);
  const blockers = transition === undefined
    ? [{
      code: "INVALID_TRANSITION" as const,
      message:
        `Governance state "${input.aggregate.state}" cannot perform action "${input.action}"; expected an allowed lifecycle transition.`,
    }]
    : input.activeLegalHold && input.action === "terminate"
    ? [{
      code: "ACTIVE_LEGAL_HOLD" as const,
      message:
        `Governance deal "${input.aggregate.scope.dealId}" has an active legal hold; expected the hold to remain dominant over termination effects.`,
    }]
    : input.retentionBlocked && input.action === "archive"
    ? [{
      code: "MANDATORY_RETENTION" as const,
      message:
        `Governance deal "${input.aggregate.scope.dealId}" is blocked by mandatory retention; expected policy review before archive disposition.`,
    }]
    : [];
  const effects = effectsFor(input.action);
  return Object.freeze({
    previewId: input.previewId ?? consequencePreviewId(
      `preview_${
        input.aggregate.scope.dealId.slice(5)
      }-${input.aggregate.version}-${input.action}`,
    ),
    scope: freezeScope(input.aggregate.scope),
    action: input.action,
    aggregateVersion: input.aggregate.version,
    fromState: input.aggregate.state,
    ...(transition === undefined ? {} : { toState: transition.to }),
    outcome: blockers.length === 0 ? "allowed" : "blocked",
    effects,
    blockers,
    requiresHumanAuthority: true,
    reversible: transition?.reversible ?? false,
    physicalErasureEnabled: false,
    createdAt: input.now,
    expiresAt: input.expiresAt ?? new Date(
      Date.parse(input.now) + 15 * 60 * 1000,
    ).toISOString(),
  });
}

export function applyGovernanceTransition(
  aggregate: DealGovernanceAggregate,
  preview: ConsequencePreview,
  now: string,
): GovernanceTransition {
  assertInstant(now, "governance transition time");
  assertPreviewCurrent(aggregate, preview, now);
  const transition = transitionFor(aggregate.state, preview.action);
  if (transition === undefined || preview.toState !== transition.to) {
    throw new DealGovernanceError(
      "INVALID_STATE_TRANSITION",
      `Governance preview "${preview.previewId}" does not describe a valid transition from "${aggregate.state}".`,
    );
  }
  const next = freezeGovernance({
    ...aggregate,
    version: (aggregate.version + 1) as AggregateVersion,
    state: transition.to,
    updatedAt: now,
  });
  return {
    aggregate: next,
    preview,
    previousState: aggregate.state,
    nextState: transition.to,
  };
}

export function attachLegalHold(
  aggregate: DealGovernanceAggregate,
  holdId: string,
  now: string,
): DealGovernanceAggregate {
  if (aggregate.activeLegalHoldIds.includes(holdId)) return aggregate;
  return freezeGovernance({
    ...aggregate,
    activeLegalHoldIds: [...aggregate.activeLegalHoldIds, holdId],
    version: (aggregate.version + 1) as AggregateVersion,
    updatedAt: now,
  });
}

export function detachLegalHold(
  aggregate: DealGovernanceAggregate,
  holdId: string,
  now: string,
): DealGovernanceAggregate {
  if (!aggregate.activeLegalHoldIds.includes(holdId)) return aggregate;
  return freezeGovernance({
    ...aggregate,
    activeLegalHoldIds: aggregate.activeLegalHoldIds.filter((id) =>
      id !== holdId
    ),
    version: (aggregate.version + 1) as AggregateVersion,
    updatedAt: now,
  });
}

export function attachDeletionRequest(
  aggregate: DealGovernanceAggregate,
  requestId: string,
  now: string,
): DealGovernanceAggregate {
  return freezeGovernance({
    ...aggregate,
    deletionRequestId: requestId,
    version: (aggregate.version + 1) as AggregateVersion,
    updatedAt: now,
  });
}

export function attachRetentionAssignment(
  aggregate: DealGovernanceAggregate,
  retentionAssignmentId: string,
  now: string,
): DealGovernanceAggregate {
  if (aggregate.retentionAssignmentId === retentionAssignmentId) {
    return aggregate;
  }
  return freezeGovernance({
    ...aggregate,
    retentionAssignmentId,
    version: (aggregate.version + 1) as AggregateVersion,
    updatedAt: now,
  });
}

export function assertPreviewCurrent(
  aggregate: DealGovernanceAggregate,
  preview: ConsequencePreview,
  now: string,
  options: { readonly requireAllowed?: boolean } = {},
): void {
  if (!sameScope(preview.scope, aggregate.scope)) {
    throw new DealGovernanceError(
      "PREVIEW_STALE",
      `Consequence preview "${preview.previewId}" targets deal "${preview.scope.dealId}"; expected current deal "${aggregate.scope.dealId}".`,
    );
  }
  if (preview.aggregateVersion !== aggregate.version) {
    throw new DealGovernanceError(
      "PREVIEW_STALE",
      `Consequence preview "${preview.previewId}" targets version "${preview.aggregateVersion}"; expected current version "${aggregate.version}".`,
    );
  }
  const expiresAt = Date.parse(preview.expiresAt);
  const currentTime = Date.parse(now);
  if (
    !Number.isFinite(expiresAt) || !Number.isFinite(currentTime) ||
    currentTime >= expiresAt
  ) {
    throw new DealGovernanceError(
      "PREVIEW_STALE",
      `Consequence preview "${preview.previewId}" expired at "${preview.expiresAt}"; expected a current preview.`,
    );
  }
  if (options.requireAllowed !== false && preview.outcome !== "allowed") {
    throw new DealGovernanceError(
      "INVALID_STATE_TRANSITION",
      `Consequence preview "${preview.previewId}" is blocked; expected an allowed preview before transition.`,
    );
  }
}

export function parseStoredGovernance(value: unknown): DealGovernanceAggregate {
  const record = objectValue(value, "stored governance aggregate");
  const scope = {
    tenantId: text(record.tenantId, "governance tenant ID") as TenantId,
    workspaceId: text(
      record.workspaceId,
      "governance workspace ID",
    ) as WorkspaceId,
    dealId: text(record.dealId, "governance deal ID") as DealId,
  };
  return freezeGovernance({
    aggregateType: "deal_governance",
    id: governanceId(text(record.id, "governance ID")),
    scope: freezeScope(scope),
    version: positiveVersion(record.version),
    state: governanceState(record.state),
    ...(record.retentionAssignmentId === undefined ? {} : {
      retentionAssignmentId: text(
        record.retentionAssignmentId,
        "retention assignment ID",
      ),
    }),
    activeLegalHoldIds: arrayValue(
      record.activeLegalHoldIds,
      "active legal hold IDs",
    )
      .map((item) => text(item, "active legal hold ID")),
    ...(record.deletionRequestId === undefined ? {} : {
      deletionRequestId: text(
        record.deletionRequestId,
        "deletion request ID",
      ),
    }),
    createdAt: instant(text(record.createdAt, "governance creation time")),
    updatedAt: instant(text(record.updatedAt, "governance update time")),
  });
}

export function freezeGovernance(
  aggregate: DealGovernanceAggregate,
): DealGovernanceAggregate {
  return Object.freeze({
    ...aggregate,
    scope: freezeScope(aggregate.scope),
    activeLegalHoldIds: Object.freeze([...aggregate.activeLegalHoldIds]),
  });
}

function transitionFor(
  state: GovernanceState,
  action: GovernanceAction,
) {
  return TRANSITIONS.find((candidate) =>
    candidate.from === state && candidate.action === action
  );
}

function sameScope(left: GovernanceScope, right: GovernanceScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId &&
    left.dealId === right.dealId;
}

function effectsFor(action: GovernanceAction): readonly ConsequenceEffect[] {
  const common: ConsequenceEffect[] = [
    {
      code: "preserve_audit_history",
      reversible: false,
      description:
        "Append governance evidence without rewriting historical audit records.",
    },
  ];
  if (action === "pause") {
    return Object.freeze([
      ...common,
      {
        code: "stop_active_work",
        reversible: true,
        description:
          "Stop new deal work while retaining current records and evidence.",
      },
      {
        code: "stop_source_sync",
        reversible: true,
        description:
          "Stop source synchronization without deleting imported versions.",
      },
    ]);
  }
  if (action === "archive") {
    return Object.freeze([
      ...common,
      {
        code: "stop_source_sync",
        reversible: true,
        description:
          "Preserve imported versions and stop source synchronization.",
      },
      {
        code: "start_retention_clock",
        reversible: false,
        description:
          "Start the configured retention clock without authorizing erasure.",
      },
    ]);
  }
  if (action === "restore") {
    return Object.freeze([
      ...common,
      {
        code: "do_not_restore_external_access",
        reversible: false,
        description:
          "Restore internal governance state without restoring external access.",
      },
    ]);
  }
  return Object.freeze([
    ...common,
    {
      code: "stop_active_work",
      reversible: false,
      description:
        "Terminate new deal work while preserving history and proof.",
    },
    {
      code: "revoke_external_access",
      reversible: false,
      description:
        "Request downstream external-access revocation through an auditable effect.",
    },
    {
      code: "start_retention_clock",
      reversible: false,
      description:
        "Begin retention handling; physical erasure remains disabled by default.",
    },
  ]);
}

function freezeScope(scope: GovernanceScope): GovernanceScope {
  return Object.freeze({ ...scope });
}

function governanceState(value: unknown): GovernanceState {
  if (
    value === "active" || value === "paused" || value === "terminated" ||
    value === "archived"
  ) return value;
  throw new GovernanceInvariantError(
    `Governance state "${
      String(value)
    }" is invalid; expected active, paused, terminated, or archived.`,
  );
}

function positiveVersion(value: unknown): AggregateVersion {
  if (typeof value === "string") value = Number(value);
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value as AggregateVersion;
  }
  throw new GovernanceInvariantError(
    `Governance version "${
      String(value)
    }" is invalid; expected a positive safe integer.`,
  );
}

function assertInstant(value: string, label: string): void {
  if (Number.isFinite(Date.parse(value))) return;
  throw new GovernanceInvariantError(
    `${label} "${value}" is invalid; expected an ISO timestamp.`,
  );
}

function instant(value: string): string {
  assertInstant(value, "Governance timestamp");
  return value;
}

function text(value: unknown, label: string): string {
  if (typeof value === "string" && value.trim().length > 0) return value;
  throw new GovernanceInvariantError(
    `${label} "${String(value)}" is invalid; expected non-empty text.`,
  );
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new GovernanceInvariantError(
    `${label} is invalid; expected a JSON object.`,
  );
}

function arrayValue(value: unknown, label: string): unknown[] {
  if (Array.isArray(value)) return value;
  throw new GovernanceInvariantError(
    `${label} is invalid; expected a JSON array.`,
  );
}
