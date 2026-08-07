import { action, field, purpose } from "../platform/authz/v1.ts";
import {
  type AggregateVersion,
  isAggregateVersion,
} from "../shared/contracts/aggregate_version.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
import { DealAccessInvariantError } from "./errors.ts";
import { portalObjectId } from "./ids.ts";
import type {
  DealAccessScope,
  DealParticipation,
  ExternalGrant,
  PortalAction,
  PortalObjectKind,
  PortalObjectScope,
  PortalReceipt,
  PortalSubmission,
  SubmissionPayload,
} from "./model.ts";
import type {
  SessionInvalidationReason,
  SessionInvalidationRecord,
  SessionInvalidationState,
} from "./repository.ts";

export interface ParticipationRow {
  participationId: string;
  tenantId: string;
  workspaceId: string;
  dealId: string;
  invitationId: string;
  participantId: string;
  participantKind: "external";
  invitationTokenDigest: string;
  state: DealParticipation["state"];
  version: string | number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GrantRow {
  grantId: string;
  tenantId: string;
  workspaceId: string;
  dealId: string;
  participationId: string;
  purpose: string;
  sponsorActorId: string;
  sponsorKind: "human";
  expiresAt: Date | string;
  state: ExternalGrant["state"];
  objectScopes: unknown;
  actions: unknown;
  fields: unknown;
  version: string | number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SubmissionRow {
  submissionId: string;
  tenantId: string;
  workspaceId: string;
  dealId: string;
  deliveryId: string;
  deliveryAttemptCount: string | number;
  lastDeliveryError: string | null;
  deliveryCompletedAt: Date | string | null;
  grantId: string;
  objectId: string;
  payload: SubmissionPayload;
  state: PortalSubmission["state"];
  version: string | number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ReceiptRow {
  receiptId: string;
  state: PortalReceipt["state"];
  receivedAt: Date | string;
  submissionReference: string;
}

export interface SessionInvalidationRow {
  invalidationId: string;
  tenantId: string;
  workspaceId: string;
  dealId: string;
  grantId: string | null;
  participationId: string | null;
  reason: SessionInvalidationReason;
  state: SessionInvalidationState;
  attemptCount: string | number;
  lastError: string | null;
  completedAt: Date | string | null;
}

export function grantSelect(predicate: string): string {
  return `SELECT grant_id AS "grantId", tenant_id AS "tenantId",
    workspace_id AS "workspaceId", deal_id AS "dealId",
    participation_id AS "participationId", purpose,
    sponsor_actor_id AS "sponsorActorId", sponsor_kind AS "sponsorKind",
    expires_at AS "expiresAt", state, object_scopes AS "objectScopes",
    actions, fields, version, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM deal_access.external_grants
    WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
      AND ${predicate}`;
}

export function toParticipation(row: ParticipationRow): DealParticipation {
  return {
    aggregateType: "deal_participation",
    id: row.participationId as DealParticipation["id"],
    scope: scope(row),
    participantId: row.participantId,
    participantKind: row.participantKind,
    invitationId: row.invitationId as DealParticipation["invitationId"],
    invitationTokenDigest: row.invitationTokenDigest,
    state: row.state,
    version: aggregateVersion(row.version, row.participationId),
    createdAt: instant(row.createdAt),
    updatedAt: instant(row.updatedAt),
  };
}

export function toGrant(row: GrantRow): ExternalGrant {
  return {
    aggregateType: "external_grant",
    id: row.grantId as ExternalGrant["id"],
    scope: scope(row),
    participationId: row.participationId as ExternalGrant["participationId"],
    purpose: authzValue(row.purpose, row.grantId, "purpose", purpose),
    sponsor: { actorId: row.sponsorActorId as ActorId, kind: row.sponsorKind },
    expiresAt: instant(row.expiresAt),
    objectScopes: objectScopes(row.objectScopes, row.grantId),
    actions: authzValues(row.actions, row.grantId, "action", action),
    fields: authzValues(row.fields, row.grantId, "field", field),
    state: row.state,
    version: aggregateVersion(row.version, row.grantId),
    createdAt: instant(row.createdAt),
    updatedAt: instant(row.updatedAt),
  };
}

export function toSubmission(row: SubmissionRow): PortalSubmission {
  const deliveryAttemptCount = Number(row.deliveryAttemptCount);
  if (!Number.isInteger(deliveryAttemptCount) || deliveryAttemptCount < 0) {
    throw new DealAccessInvariantError(
      `Submission "${row.submissionId}" delivery attempt count "${row.deliveryAttemptCount}" is invalid; expected a non-negative integer.`,
    );
  }
  return {
    aggregateType: "portal_submission",
    id: row.submissionId as PortalSubmission["id"],
    scope: scope(row),
    deliveryId: row.deliveryId,
    deliveryAttemptCount,
    ...(row.lastDeliveryError === null
      ? {}
      : { lastDeliveryError: row.lastDeliveryError }),
    ...(row.deliveryCompletedAt === null
      ? {}
      : { deliveryCompletedAt: instant(row.deliveryCompletedAt) }),
    grantId: row.grantId as PortalSubmission["grantId"],
    objectId: row.objectId as PortalSubmission["objectId"],
    payload: row.payload,
    state: row.state,
    version: aggregateVersion(row.version, row.submissionId),
    createdAt: instant(row.createdAt),
    updatedAt: instant(row.updatedAt),
  };
}

export function toReceipt(row: ReceiptRow): PortalReceipt {
  return {
    aggregateType: "portal_receipt",
    id: row.receiptId as PortalReceipt["id"],
    state: row.state,
    receivedAt: instant(row.receivedAt),
    submissionReference: row.submissionReference,
  };
}

export function toSessionInvalidation(
  row: SessionInvalidationRow,
): SessionInvalidationRecord {
  const attemptCount = Number(row.attemptCount);
  if (!Number.isInteger(attemptCount) || attemptCount < 0) {
    throw new DealAccessInvariantError(
      `Session invalidation "${row.invalidationId}" attempt count "${row.attemptCount}" is invalid; expected a non-negative integer.`,
    );
  }
  return {
    invalidationId: row.invalidationId,
    scope: scope(row),
    reason: row.reason,
    state: row.state,
    attemptCount,
    ...(row.grantId === null ? {} : { grantId: row.grantId }),
    ...(row.participationId === null
      ? {}
      : { participationId: row.participationId }),
    ...(row.lastError === null ? {} : { lastError: row.lastError }),
    ...(row.completedAt === null
      ? {}
      : { completedAt: instant(row.completedAt) }),
  };
}

export function participationValues(aggregate: DealParticipation): unknown[] {
  return [
    aggregate.id,
    aggregate.scope.tenantId,
    aggregate.scope.workspaceId,
    aggregate.scope.dealId,
    aggregate.invitationId,
    aggregate.participantId,
    aggregate.participantKind,
    aggregate.invitationTokenDigest,
    aggregate.state,
    aggregate.version,
    aggregate.createdAt,
    aggregate.updatedAt,
  ];
}

export function grantValues(aggregate: ExternalGrant): unknown[] {
  return [
    aggregate.id,
    aggregate.scope.tenantId,
    aggregate.scope.workspaceId,
    aggregate.scope.dealId,
    aggregate.participationId,
    aggregate.purpose,
    aggregate.sponsor.actorId,
    aggregate.sponsor.kind,
    aggregate.expiresAt,
    aggregate.state,
    JSON.stringify(aggregate.objectScopes),
    JSON.stringify(aggregate.actions),
    JSON.stringify(aggregate.fields),
    aggregate.version,
    aggregate.createdAt,
    aggregate.updatedAt,
  ];
}

export function submissionValues(aggregate: PortalSubmission): unknown[] {
  return [
    aggregate.id,
    aggregate.scope.tenantId,
    aggregate.scope.workspaceId,
    aggregate.scope.dealId,
    aggregate.deliveryId,
    aggregate.deliveryAttemptCount,
    aggregate.lastDeliveryError ?? null,
    aggregate.deliveryCompletedAt ?? null,
    aggregate.grantId,
    aggregate.objectId,
    JSON.stringify(aggregate.payload),
    aggregate.state,
    aggregate.version,
    aggregate.createdAt,
    aggregate.updatedAt,
  ];
}

function scope(
  row: { tenantId: string; workspaceId: string; dealId: string },
): DealAccessScope {
  return {
    tenantId: row.tenantId as DealAccessScope["tenantId"],
    workspaceId: row.workspaceId as DealAccessScope["workspaceId"],
    dealId: row.dealId as DealAccessScope["dealId"],
  };
}

function authzValues<T extends string>(
  value: unknown,
  grantId: string,
  label: string,
  create: (value: string) => T,
): readonly T[] {
  return stringValues(value, grantId, label).map((item) => create(item));
}

function authzValue<T extends string>(
  value: unknown,
  grantId: string,
  label: string,
  create: (value: string) => T,
): T {
  if (typeof value === "string") return create(value);
  const values = stringValues(value, grantId, label);
  if (values.length !== 1) {
    throw new DealAccessInvariantError(
      `Deal Access grant "${grantId}" ${label} "${
        JSON.stringify(value)
      }" is invalid; expected one string.`,
    );
  }
  return create(values[0]);
}

function stringValues(
  value: unknown,
  grantId: string,
  label: string,
): string[] {
  const parsed = typeof value === "string"
    ? parseJson(value, grantId, label)
    : value;
  if (
    Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
  ) {
    return parsed as string[];
  }
  if (typeof parsed === "string") return [parsed];
  throw new DealAccessInvariantError(
    `Deal Access grant "${grantId}" ${label} "${
      JSON.stringify(value)
    }" is invalid; expected a string or string array.`,
  );
}

function objectScopes(
  value: unknown,
  grantId: string,
): readonly PortalObjectScope[] {
  const parsed = typeof value === "string"
    ? parseJson(value, grantId, "object scope")
    : value;
  if (!Array.isArray(parsed)) {
    throw new DealAccessInvariantError(
      `Deal Access grant "${grantId}" object scope "${
        JSON.stringify(value)
      }" is invalid; expected an array.`,
    );
  }
  return parsed.map((item) => objectScope(item, grantId));
}

function objectScope(value: unknown, grantId: string): PortalObjectScope {
  if (!isRecord(value)) {
    throw new DealAccessInvariantError(
      `Deal Access grant "${grantId}" object scope "${
        JSON.stringify(value)
      }" is invalid; expected an object.`,
    );
  }
  if (
    typeof value.objectId !== "string" || typeof value.kind !== "string" ||
    !Array.isArray(value.actions)
  ) {
    throw new DealAccessInvariantError(
      `Deal Access grant "${grantId}" object scope "${
        JSON.stringify(value)
      }" is invalid; expected objectId, kind, and actions.`,
    );
  }
  return {
    objectId: portalObjectId(value.objectId),
    kind: portalKind(value.kind, grantId),
    actions: value.actions.map((item) => portalAction(item, grantId)),
  };
}

function portalKind(value: string, grantId: string): PortalObjectKind {
  if (
    value === "deal_summary" || value === "document" ||
    value === "submission_form"
  ) return value;
  throw new DealAccessInvariantError(
    `Deal Access grant "${grantId}" portal kind "${value}" is invalid; expected a supported portal object kind.`,
  );
}

function portalAction(value: unknown, grantId: string): PortalAction {
  if (value === "read" || value === "submit") return value;
  throw new DealAccessInvariantError(
    `Deal Access grant "${grantId}" portal action "${
      JSON.stringify(value)
    }" is invalid; expected read or submit.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(value: string, grantId: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new DealAccessInvariantError(
      `Deal Access grant "${grantId}" ${label} "${value}" is invalid; expected JSON.`,
    );
  }
}

function aggregateVersion(
  value: string | number,
  id: string,
): AggregateVersion {
  const version = Number(value);
  if (isAggregateVersion(version)) return version;
  throw new DealAccessInvariantError(
    `Deal Access aggregate "${id}" version "${value}" is invalid; expected a positive integer.`,
  );
}

function instant(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
