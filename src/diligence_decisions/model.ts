import type { ActorReference } from "../platform/authz/v1.ts";
import type { EvidenceScope } from "../evidence_knowledge/v1.ts";
import type { ActorId, AggregateVersion } from "../platform/api/v1.ts";
import { decisionRequestRule, proposalRule } from "./transition_tables.ts";
import type {
  DecisionHistoryId,
  DecisionRecordId,
  DecisionRequestId,
  FindingId,
  ImpactId,
} from "./ids.ts";
import type { ExactEvidenceBasis } from "./basis.ts";
import { DiligenceDecisionError } from "./errors.ts";

export type DiligenceScope = EvidenceScope;
export type ProposalState =
  | "proposed"
  | "approved"
  | "superseded"
  | "invalidated";
export type DecisionOutcome = "approved" | "rejected" | "waived";
export type DecisionRequestState =
  | "draft"
  | "requested"
  | "decided"
  | "withdrawn"
  | "expired"
  | "invalidated";
export type DecisionProjectionState = "active" | "superseded" | "invalidated";
export type DecisionHistoryKind = "recorded" | "superseded" | "invalidated";

export interface DecisionAuthoritySnapshot {
  readonly snapshotId: string;
  readonly actorId: ActorId;
  readonly policyVersion: string;
  readonly scope: DiligenceScope;
  readonly capturedAt: Date;
}

export interface Finding {
  readonly aggregateType: "finding";
  readonly id: FindingId;
  readonly scope: DiligenceScope;
  readonly title: string;
  readonly statement: string;
  readonly basis: ExactEvidenceBasis;
  readonly state: ProposalState;
  readonly proposedBy: ActorReference;
  readonly version: AggregateVersion;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Impact {
  readonly aggregateType: "impact";
  readonly id: ImpactId;
  readonly findingId: FindingId;
  readonly scope: DiligenceScope;
  readonly statement: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly basis: ExactEvidenceBasis;
  readonly state: ProposalState;
  readonly proposedBy: ActorReference;
  readonly version: AggregateVersion;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type DecisionSubject =
  | { readonly kind: "finding"; readonly id: FindingId }
  | { readonly kind: "impact"; readonly id: ImpactId };

export interface DecisionRequest {
  readonly aggregateType: "decision_request";
  readonly id: DecisionRequestId;
  readonly scope: DiligenceScope;
  readonly subject: DecisionSubject;
  readonly question: string;
  readonly basis: ExactEvidenceBasis;
  readonly requester: ActorReference;
  readonly namedApproverId: ActorId;
  readonly state: DecisionRequestState;
  readonly decisionRecordId?: DecisionRecordId;
  readonly version: AggregateVersion;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DecisionRecord {
  readonly id: DecisionRecordId;
  readonly requestId: DecisionRequestId;
  readonly scope: DiligenceScope;
  readonly outcome: DecisionOutcome;
  readonly actor: ActorReference;
  readonly requestVersion: AggregateVersion;
  readonly basis: ExactEvidenceBasis;
  readonly authority: DecisionAuthoritySnapshot;
  readonly supersedesRecordId?: DecisionRecordId;
  readonly recordedAt: Date;
}

export interface DecisionProjection {
  readonly requestId: DecisionRequestId;
  readonly currentRecordId: DecisionRecordId;
  readonly state: DecisionProjectionState;
  readonly version: AggregateVersion;
  readonly updatedAt: Date;
}

export interface DecisionHistoryEntry {
  readonly id: DecisionHistoryId;
  readonly requestId: DecisionRequestId;
  readonly recordId: DecisionRecordId;
  readonly replacementRecordId?: DecisionRecordId;
  readonly kind: DecisionHistoryKind;
  readonly scope: DiligenceScope;
  readonly actor: ActorReference;
  readonly authority: DecisionAuthoritySnapshot;
  readonly basisDigest: string;
  readonly expectedProjectionVersion: AggregateVersion | 0;
  readonly reason?: string;
  readonly createdAt: Date;
}

export function createFinding(input: {
  readonly id: FindingId;
  readonly scope: DiligenceScope;
  readonly title: string;
  readonly statement: string;
  readonly basis: ExactEvidenceBasis;
  readonly proposedBy: ActorReference;
  readonly now: Date;
}): Finding {
  assertProposalInput(input.scope, input.basis, input.title, input.now);
  assertText(input.statement, "Finding statement");
  return Object.freeze({
    aggregateType: "finding",
    id: input.id,
    scope: Object.freeze({ ...input.scope }),
    title: input.title.trim(),
    statement: input.statement.trim(),
    basis: input.basis,
    state: "proposed",
    proposedBy: Object.freeze({ ...input.proposedBy }),
    version: 1 as AggregateVersion,
    createdAt: new Date(input.now),
    updatedAt: new Date(input.now),
  });
}

export function createImpact(input: {
  readonly id: ImpactId;
  readonly findingId: FindingId;
  readonly scope: DiligenceScope;
  readonly statement: string;
  readonly severity: Impact["severity"];
  readonly basis: ExactEvidenceBasis;
  readonly proposedBy: ActorReference;
  readonly now: Date;
}): Impact {
  assertProposalInput(input.scope, input.basis, input.statement, input.now);
  return Object.freeze({
    aggregateType: "impact",
    id: input.id,
    findingId: input.findingId,
    scope: Object.freeze({ ...input.scope }),
    statement: input.statement.trim(),
    severity: input.severity,
    basis: input.basis,
    state: "proposed",
    proposedBy: Object.freeze({ ...input.proposedBy }),
    version: 1 as AggregateVersion,
    createdAt: new Date(input.now),
    updatedAt: new Date(input.now),
  });
}

export function createDecisionRequest(input: {
  readonly id: DecisionRequestId;
  readonly scope: DiligenceScope;
  readonly subject: DecisionSubject;
  readonly question: string;
  readonly basis: ExactEvidenceBasis;
  readonly requester: ActorReference;
  readonly namedApproverId: ActorId;
  readonly now: Date;
}): DecisionRequest {
  assertProposalInput(input.scope, input.basis, input.question, input.now);
  if (input.requester.id === input.namedApproverId) {
    throw new DiligenceDecisionError(
      "SEPARATION_OF_DUTIES",
      `Requester "${input.requester.id}" cannot also be the named approver; expected distinct human actors.`,
    );
  }
  return Object.freeze({
    aggregateType: "decision_request",
    id: input.id,
    scope: Object.freeze({ ...input.scope }),
    subject: Object.freeze({ ...input.subject }),
    question: input.question.trim(),
    basis: input.basis,
    requester: Object.freeze({ ...input.requester }),
    namedApproverId: input.namedApproverId,
    state: "draft",
    version: 1 as AggregateVersion,
    createdAt: new Date(input.now),
    updatedAt: new Date(input.now),
  });
}

export function createDecisionRecord(input: {
  readonly id: DecisionRecordId;
  readonly requestId: DecisionRequestId;
  readonly scope: DiligenceScope;
  readonly outcome: DecisionOutcome;
  readonly actor: ActorReference;
  readonly requestVersion: AggregateVersion;
  readonly basis: ExactEvidenceBasis;
  readonly authority: DecisionAuthoritySnapshot;
  readonly supersedesRecordId?: DecisionRecordId;
  readonly recordedAt: Date;
}): DecisionRecord {
  assertHumanActor(input.actor, "record a decision");
  assertScopeMatch(input.scope, input.basis.scope, "Decision record basis");
  assertVersion(input.requestVersion, "Decision request version");
  assertAuthority(input.authority, input.actor, input.scope);
  assertDate(input.recordedAt, "Decision record time");
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    actor: Object.freeze({ ...input.actor }),
    basis: input.basis,
    authority: freezeAuthority(input.authority),
    recordedAt: new Date(input.recordedAt),
  });
}

export function createDecisionProjection(
  input: DecisionProjection,
): DecisionProjection {
  assertVersion(input.version, "Decision projection version");
  assertDate(input.updatedAt, "Decision projection time");
  return Object.freeze({ ...input, updatedAt: new Date(input.updatedAt) });
}

export function createDecisionHistoryEntry(
  input: DecisionHistoryEntry,
): DecisionHistoryEntry {
  assertHumanActor(input.actor, `${input.kind} a decision`);
  assertAuthority(input.authority, input.actor, input.scope);
  assertDigest(input.basisDigest);
  assertNonNegativeVersion(
    input.expectedProjectionVersion,
    "Expected projection version",
  );
  assertDate(input.createdAt, "Decision history time");
  if (input.kind === "superseded" && input.replacementRecordId === undefined) {
    throw new DiligenceDecisionError(
      "INVALID_INPUT",
      `Decision history "${input.id}" is superseded without a replacement record; expected an immutable successor ID.`,
    );
  }
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    actor: Object.freeze({ ...input.actor }),
    authority: freezeAuthority(input.authority),
    createdAt: new Date(input.createdAt),
  });
}

export function decisionRequestToRequested(
  request: DecisionRequest,
  now: Date,
): DecisionRequest {
  assertRequestTransition(request.state, "requested");
  return updateRequest(request, "requested", now);
}

export function decisionRequestToDecided(
  request: DecisionRequest,
  recordId: DecisionRecordId,
  now: Date,
): DecisionRequest {
  assertRequestTransition(request.state, "decided");
  return updateRequest(request, "decided", now, recordId);
}

export function decisionRequestToInvalidated(
  request: DecisionRequest,
  now: Date,
): DecisionRequest {
  assertRequestTransition(request.state, "invalidated");
  return updateRequest(request, "invalidated", now);
}

export function transitionProposal(
  proposal: Finding | Impact,
  next: ProposalState,
  now: Date,
): Finding | Impact {
  if (!proposalTransitionAllowed(proposal.state, next)) {
    throw new DiligenceDecisionError(
      "INVALID_TRANSITION",
      `Proposal "${proposal.id}" state "${proposal.state}" cannot transition to "${next}"; expected an allowed monotonic review transition.`,
    );
  }
  return Object.freeze({
    ...proposal,
    state: next,
    version: (Number(proposal.version) + 1) as AggregateVersion,
    updatedAt: new Date(now),
  });
}

export function applyDecisionHistory(
  projection: DecisionProjection,
  entry: DecisionHistoryEntry,
  now: Date,
): DecisionProjection {
  if (entry.expectedProjectionVersion !== projection.version) {
    const code = entry.kind === "invalidated"
      ? "STALE_INVALIDATION"
      : "VERSION_CONFLICT";
    throw new DiligenceDecisionError(
      code,
      `Decision projection for request "${projection.requestId}" is at version "${projection.version}"; expected "${entry.expectedProjectionVersion}".`,
    );
  }
  if (projection.currentRecordId !== entry.recordId) {
    throw new DiligenceDecisionError(
      "REFERENCE_MISMATCH",
      `Decision history "${entry.id}" targets record "${entry.recordId}"; expected current record "${projection.currentRecordId}".`,
    );
  }
  const state = entry.kind === "invalidated" ? "invalidated" : "superseded";
  if (projection.state !== "active") {
    throw new DiligenceDecisionError(
      "IMMUTABLE_DECISION",
      `Decision record "${projection.currentRecordId}" is already "${projection.state}"; expected an active projection.`,
    );
  }
  return createDecisionProjection({
    ...projection,
    currentRecordId: entry.replacementRecordId ?? projection.currentRecordId,
    state,
    version: (Number(projection.version) + 1) as AggregateVersion,
    updatedAt: now,
  });
}

function updateRequest(
  request: DecisionRequest,
  state: DecisionRequestState,
  now: Date,
  decisionRecordId?: DecisionRecordId,
): DecisionRequest {
  return Object.freeze({
    ...request,
    state,
    ...(decisionRecordId === undefined ? {} : { decisionRecordId }),
    version: (Number(request.version) + 1) as AggregateVersion,
    updatedAt: new Date(now),
  });
}

function assertRequestTransition(
  from: DecisionRequestState,
  to: DecisionRequestState,
): void {
  if (decisionRequestRule(from, to) !== undefined) return;
  throw new DiligenceDecisionError(
    "INVALID_TRANSITION",
    `Decision request transition "${from}" to "${to}" is invalid; expected a governed lifecycle transition.`,
  );
}

function proposalTransitionAllowed(
  from: ProposalState,
  to: ProposalState,
): boolean {
  return proposalRule(from, to) !== undefined;
}

function assertProposalInput(
  scope: DiligenceScope,
  basis: ExactEvidenceBasis,
  text: string,
  now: Date,
): void {
  assertScopeMatch(scope, basis.scope, "Proposal basis");
  assertText(text, "Proposal text");
  assertDate(now, "Proposal time");
}

function assertHumanActor(actor: ActorReference, action: string): void {
  if (actor.kind === "human" && actor.state === "active") return;
  throw new DiligenceDecisionError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Actor "${actor.id}" cannot ${action}; expected an active human actor.`,
  );
}

function assertAuthority(
  authority: DecisionAuthoritySnapshot,
  actor: ActorReference,
  scope: DiligenceScope,
): void {
  if (authority.actorId !== actor.id) {
    throw new DiligenceDecisionError(
      "REFERENCE_MISMATCH",
      `Authority snapshot "${authority.snapshotId}" belongs to actor "${authority.actorId}"; expected decision actor "${actor.id}".`,
    );
  }
  if (!authority.snapshotId.trim() || !authority.policyVersion.trim()) {
    throw new DiligenceDecisionError(
      "INVALID_INPUT",
      `Authority snapshot "${authority.snapshotId}" is incomplete; expected snapshot and policy identifiers.`,
    );
  }
  if (
    authority.capturedAt instanceof Date &&
    !Number.isNaN(authority.capturedAt.getTime())
  ) {
    assertScopeMatch(scope, authority.scope, "Decision authority");
    return;
  }
  throw new DiligenceDecisionError(
    "INVALID_INPUT",
    `Authority snapshot "${authority.snapshotId}" has invalid capture time; expected a valid Date.`,
  );
}

function freezeAuthority(
  authority: DecisionAuthoritySnapshot,
): DecisionAuthoritySnapshot {
  return Object.freeze({
    ...authority,
    scope: Object.freeze({ ...authority.scope }),
    capturedAt: new Date(authority.capturedAt),
  });
}

function assertScopeMatch(
  expected: DiligenceScope,
  actual: DiligenceScope,
  subject: string,
): void {
  if (
    expected.tenantId === actual.tenantId &&
    expected.workspaceId === actual.workspaceId &&
    expected.dealId === actual.dealId
  ) return;
  throw new DiligenceDecisionError(
    "SCOPE_MISMATCH",
    `${subject} scope does not match tenant "${expected.tenantId}", workspace "${expected.workspaceId}", and deal "${expected.dealId}".`,
  );
}

function assertText(value: string, label: string): void {
  if (value.trim() && value.length <= 4096) return;
  throw new DiligenceDecisionError(
    "INVALID_INPUT",
    `${label} "${value}" is invalid; expected 1-4096 non-whitespace characters.`,
  );
}

function assertVersion(value: AggregateVersion, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new DiligenceDecisionError(
    "INVALID_INPUT",
    `${label} "${value}" is invalid; expected a positive aggregate version.`,
  );
}

function assertNonNegativeVersion(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value >= 0) return;
  throw new DiligenceDecisionError(
    "INVALID_INPUT",
    `${label} "${value}" is invalid; expected zero or a positive aggregate version.`,
  );
}

function assertDigest(value: string): void {
  if (/^[0-9a-f]{64}$/.test(value)) return;
  throw new DiligenceDecisionError(
    "INVALID_INPUT",
    `Decision basis digest "${value}" is invalid; expected lowercase SHA-256 hex.`,
  );
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new DiligenceDecisionError(
    "INVALID_INPUT",
    `${label} "${String(value)}" is invalid; expected a valid Date.`,
  );
}
