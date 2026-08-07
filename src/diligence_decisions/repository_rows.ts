import {
  parseActorId,
  parseAggregateVersion,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../platform/api/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import {
  createExactEvidenceBasis,
  type EvidenceBasisReference,
  type ExactEvidenceBasis,
} from "./basis.ts";
import {
  type DecisionAuthoritySnapshot,
  type DecisionHistoryEntry,
  type DecisionProjection,
  type DecisionRecord,
  type DecisionRequest,
  type DiligenceScope,
  type Finding,
  type Impact,
} from "./model.ts";
import {
  parseDecisionHistoryId,
  parseDecisionRecordId,
  parseDecisionRequestId,
  parseFindingId,
  parseImpactId,
} from "./ids.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";

export function rowFinding(value: unknown): Finding {
  const payload = object(value, "finding payload");
  return Object.freeze({
    aggregateType: "finding",
    id: required(payload.id, parseFindingId, "finding ID"),
    scope: rowScope(payload.scope),
    title: requiredText(payload.title, "finding title"),
    statement: requiredText(payload.statement, "finding statement"),
    basis: rowBasis(payload.basis),
    state: enumValue(payload.state, [
      "proposed",
      "approved",
      "superseded",
      "invalidated",
    ], "finding state"),
    proposedBy: rowActor(payload.proposedBy),
    version: rowVersion(payload.version, "finding version"),
    createdAt: rowDate(payload.createdAt, "finding createdAt"),
    updatedAt: rowDate(payload.updatedAt, "finding updatedAt"),
  });
}

export function rowImpact(value: unknown): Impact {
  const payload = object(value, "impact payload");
  return Object.freeze({
    aggregateType: "impact",
    id: required(payload.id, parseImpactId, "impact ID"),
    findingId: required(payload.findingId, parseFindingId, "impact finding ID"),
    scope: rowScope(payload.scope),
    statement: requiredText(payload.statement, "impact statement"),
    severity: enumValue(
      payload.severity,
      ["low", "medium", "high", "critical"],
      "impact severity",
    ),
    basis: rowBasis(payload.basis),
    state: enumValue(payload.state, [
      "proposed",
      "approved",
      "superseded",
      "invalidated",
    ], "impact state"),
    proposedBy: rowActor(payload.proposedBy),
    version: rowVersion(payload.version, "impact version"),
    createdAt: rowDate(payload.createdAt, "impact createdAt"),
    updatedAt: rowDate(payload.updatedAt, "impact updatedAt"),
  });
}

export function rowDecisionRequest(value: unknown): DecisionRequest {
  const payload = object(value, "decision request payload");
  const subject = object(payload.subject, "decision request subject");
  return Object.freeze({
    aggregateType: "decision_request",
    id: required(payload.id, parseDecisionRequestId, "decision request ID"),
    scope: rowScope(payload.scope),
    subject: rowSubject(subject),
    question: requiredText(payload.question, "decision question"),
    basis: rowBasis(payload.basis),
    requester: rowActor(payload.requester),
    namedApproverId: required(
      payload.namedApproverId,
      parseActorId,
      "named approver ID",
    ),
    state: enumValue(payload.state, [
      "draft",
      "requested",
      "decided",
      "withdrawn",
      "expired",
      "invalidated",
    ], "decision request state"),
    decisionRecordId: payload.decisionRecordId === undefined
      ? undefined
      : required(
        payload.decisionRecordId,
        parseDecisionRecordId,
        "decision record ID",
      ),
    version: rowVersion(payload.version, "decision request version"),
    createdAt: rowDate(payload.createdAt, "decision request createdAt"),
    updatedAt: rowDate(payload.updatedAt, "decision request updatedAt"),
  });
}

export function rowDecisionRecord(value: unknown): DecisionRecord {
  const payload = object(value, "decision record payload");
  return Object.freeze({
    id: required(payload.id, parseDecisionRecordId, "decision record ID"),
    requestId: required(
      payload.requestId,
      parseDecisionRequestId,
      "decision request ID",
    ),
    scope: rowScope(payload.scope),
    outcome: enumValue(
      payload.outcome,
      ["approved", "rejected", "waived"],
      "decision outcome",
    ),
    actor: rowActor(payload.actor),
    requestVersion: rowVersion(
      payload.requestVersion,
      "decision request version",
    ),
    basis: rowBasis(payload.basis),
    authority: rowAuthority(payload.authority),
    supersedesRecordId: payload.supersedesRecordId === undefined
      ? undefined
      : required(
        payload.supersedesRecordId,
        parseDecisionRecordId,
        "superseded decision record ID",
      ),
    recordedAt: rowDate(payload.recordedAt, "decision recordedAt"),
  });
}

export function rowProjection(
  row: Record<string, unknown>,
): DecisionProjection {
  return Object.freeze({
    requestId: required(
      row.requestId,
      parseDecisionRequestId,
      "projection request ID",
    ),
    currentRecordId: required(
      row.currentRecordId,
      parseDecisionRecordId,
      "projection record ID",
    ),
    state: enumValue(
      row.state,
      ["active", "superseded", "invalidated"],
      "projection state",
    ),
    version: rowVersion(row.version, "projection version"),
    updatedAt: rowDate(row.updatedAt, "projection updatedAt"),
  });
}

export function rowHistory(value: unknown): DecisionHistoryEntry {
  const payload = object(value, "decision history payload");
  return Object.freeze({
    id: required(payload.id, parseDecisionHistoryId, "decision history ID"),
    requestId: required(
      payload.requestId,
      parseDecisionRequestId,
      "history request ID",
    ),
    recordId: required(
      payload.recordId,
      parseDecisionRecordId,
      "history record ID",
    ),
    replacementRecordId: payload.replacementRecordId === undefined
      ? undefined
      : required(
        payload.replacementRecordId,
        parseDecisionRecordId,
        "replacement decision record ID",
      ),
    kind: enumValue(
      payload.kind,
      ["recorded", "superseded", "invalidated"],
      "history kind",
    ),
    scope: rowScope(payload.scope),
    actor: rowActor(payload.actor),
    authority: rowAuthority(payload.authority),
    basisDigest: requiredText(payload.basisDigest, "history basis digest"),
    expectedProjectionVersion: nonNegativeVersion(
      payload.expectedProjectionVersion,
    ),
    reason: payload.reason === undefined
      ? undefined
      : requiredText(payload.reason, "history reason"),
    createdAt: rowDate(payload.createdAt, "history createdAt"),
  });
}

function rowBasis(value: unknown): ExactEvidenceBasis {
  const basis = object(value, "evidence basis");
  return createExactEvidenceBasis({
    scope: rowScope(basis.scope),
    references: basis.references as readonly EvidenceBasisReference[],
    basisDigest: requiredText(basis.basisDigest, "basis digest"),
    capturedAt: rowDate(basis.capturedAt, "basis capturedAt"),
  });
}

function rowScope(value: unknown): DiligenceScope {
  const scope = object(value, "scope");
  return {
    tenantId: required(scope.tenantId, parseTenantId, "tenant ID"),
    workspaceId: required(scope.workspaceId, parseWorkspaceId, "workspace ID"),
    dealId: required(scope.dealId, parseDealId, "deal ID"),
  };
}

function rowActor(value: unknown): ActorReference {
  const actor = object(value, "actor");
  return {
    id: required(actor.id, parseActorId, "actor ID"),
    kind: enumValue(
      actor.kind,
      ["human", "ai", "service", "external"],
      "actor kind",
    ),
    state: enumValue(
      actor.state,
      ["active", "inactive", "revoked"],
      "actor state",
    ),
  };
}

function rowAuthority(value: unknown): DecisionAuthoritySnapshot {
  const authority = object(value, "authority snapshot");
  return {
    snapshotId: requiredText(authority.snapshotId, "authority snapshot ID"),
    actorId: required(authority.actorId, parseActorId, "authority actor ID"),
    policyVersion: requiredText(
      authority.policyVersion,
      "authority policy version",
    ),
    scope: rowScope(authority.scope),
    capturedAt: rowDate(authority.capturedAt, "authority capturedAt"),
  };
}

function rowSubject(
  value: Record<string, unknown>,
): DecisionRequest["subject"] {
  if (value.kind === "finding") {
    return {
      kind: "finding",
      id: required(value.id, parseFindingId, "subject finding ID"),
    };
  }
  if (value.kind === "impact") {
    return {
      kind: "impact",
      id: required(value.id, parseImpactId, "subject impact ID"),
    };
  }
  throw invalid(value.kind, "decision subject kind");
}

function rowVersion(value: unknown, label: string): AggregateVersion {
  if (typeof value === "string") value = Number(value);
  return required(value, parseAggregateVersion, label);
}

function nonNegativeVersion(value: unknown): AggregateVersion | 0 {
  if (value === 0 || value === "0") return 0;
  return rowVersion(value, "expected projection version");
}

function rowDate(value: unknown, label: string): Date {
  const date = new Date(String(value));
  if (!Number.isNaN(date.getTime())) return date;
  throw invalid(value, label);
}

function required<T>(
  value: unknown,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
  label: string,
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw invalid(value, label);
}

function requiredText(value: unknown, label: string): string {
  if (typeof value === "string" && value.trim()) return value;
  throw invalid(value, label);
}

function enumValue<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (typeof value === "string" && values.includes(value as T)) {
    return value as T;
  }
  throw invalid(value, label);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw invalid(value, label);
}

function invalid(value: unknown, label: string): Error {
  return new Error(
    `Stored ${label} "${
      String(value)
    }" is invalid; expected a versioned Diligence and Decisions record.`,
  );
}
