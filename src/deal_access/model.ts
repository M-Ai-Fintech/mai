import {
  type Action,
  action,
  field,
  type FieldName,
  type Purpose,
  purpose,
} from "../platform/authz/v1.ts";
import type {
  ActorId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import {
  type ExternalGrantId,
  type InvitationId,
  type ParticipationId,
  type PortalObjectId,
  type PortalReceiptId,
  type SubmissionId,
} from "./ids.ts";
import { DealAccessInvariantError } from "./errors.ts";

export interface DealAccessScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}

export type ParticipationState =
  | "invited"
  | "active"
  | "revoked"
  | "offboarded"
  | "expired";
export type GrantState = "active" | "revoked" | "offboarded" | "expired";
export type PortalObjectKind = "deal_summary" | "document" | "submission_form";
export type PortalAction = "read" | "submit";

export interface HumanSponsor {
  readonly actorId: ActorId;
  readonly kind: "human";
}

export interface PortalObjectScope {
  readonly objectId: PortalObjectId;
  readonly kind: PortalObjectKind;
  readonly actions: readonly PortalAction[];
}

export interface DealParticipation {
  readonly aggregateType: "deal_participation";
  readonly id: ParticipationId;
  readonly scope: DealAccessScope;
  readonly participantId: string;
  readonly participantKind: "external";
  readonly invitationId: InvitationId;
  readonly invitationTokenDigest: string;
  readonly state: ParticipationState;
  readonly version: AggregateVersion;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ExternalGrant {
  readonly aggregateType: "external_grant";
  readonly id: ExternalGrantId;
  readonly scope: DealAccessScope;
  readonly participationId: ParticipationId;
  readonly purpose: Purpose;
  readonly sponsor: HumanSponsor;
  readonly expiresAt: string;
  readonly objectScopes: readonly PortalObjectScope[];
  readonly actions: readonly Action[];
  readonly fields: readonly FieldName[];
  readonly state: GrantState;
  readonly version: AggregateVersion;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PortalObjectSnapshot {
  readonly internalId: PortalObjectId;
  readonly publicReference: string;
  readonly kind: PortalObjectKind;
  readonly title: string;
  readonly status: string;
  readonly documentVersion?: number;
  readonly submissionPrompt?: string;
  readonly internalFindings?: readonly string[];
  readonly restrictedEvidence?: readonly string[];
  readonly negotiationStrategy?: string;
}

export type SubmissionValue = string | number | boolean | null;
export type SubmissionPayload = Readonly<Record<string, SubmissionValue>>;

export interface PortalSubmission {
  readonly aggregateType: "portal_submission";
  readonly id: SubmissionId;
  readonly scope: DealAccessScope;
  readonly grantId: ExternalGrantId;
  readonly objectId: PortalObjectId;
  readonly payload: SubmissionPayload;
  readonly state: "queued" | "accepted" | "rejected" | "cancelled";
  readonly version: AggregateVersion;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PortalReceipt {
  readonly aggregateType: "portal_receipt";
  readonly id: PortalReceiptId;
  readonly state: "accepted" | "rejected" | "cancelled";
  readonly receivedAt: string;
  readonly submissionReference: string;
}

export function createParticipation(input: {
  readonly id: ParticipationId;
  readonly invitationId: InvitationId;
  readonly scope: DealAccessScope;
  readonly participantId: string;
  readonly invitationTokenDigest: string;
  readonly now: string;
}): DealParticipation {
  assertParticipant(input.participantId);
  assertInstant(input.now, "participation creation time");
  return freezeParticipation({
    aggregateType: "deal_participation",
    id: input.id,
    scope: freezeScope(input.scope),
    participantId: input.participantId.trim(),
    participantKind: "external",
    invitationId: input.invitationId,
    invitationTokenDigest: assertTokenDigest(input.invitationTokenDigest),
    state: "invited",
    version: 1 as AggregateVersion,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function createExternalGrant(input: {
  readonly id: ExternalGrantId;
  readonly participation: DealParticipation;
  readonly purpose: string;
  readonly sponsor: HumanSponsor;
  readonly expiresAt: string;
  readonly objectScopes: readonly PortalObjectScope[];
  readonly actions: readonly string[];
  readonly fields: readonly string[];
  readonly now: string;
}): ExternalGrant {
  assertInstant(input.now, "grant creation time");
  assertFuture(input.expiresAt, input.now, "grant expiry");
  assertHumanSponsor(input.sponsor);
  assertBoundScope(input.objectScopes, input.actions, input.fields);
  assertScopeObjects(input.objectScopes);
  return freezeGrant({
    aggregateType: "external_grant",
    id: input.id,
    scope: freezeScope(input.participation.scope),
    participationId: input.participation.id,
    purpose: purposeValue(input.purpose),
    sponsor: Object.freeze({ ...input.sponsor }),
    expiresAt: input.expiresAt,
    objectScopes: input.objectScopes.map(freezeObjectScope),
    actions: input.actions.map(actionValue),
    fields: input.fields.map(fieldValue),
    state: "active",
    version: 1 as AggregateVersion,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function createPortalSubmission(input: {
  readonly id: SubmissionId;
  readonly grant: ExternalGrant;
  readonly participation: DealParticipation;
  readonly objectId: PortalObjectId;
  readonly payload: SubmissionPayload;
  readonly now: string;
}): PortalSubmission {
  assertInstant(input.now, "submission creation time");
  if (
    input.participation.state !== "active" || input.grant.state !== "active"
  ) {
    throw new DealAccessInvariantError(
      `Submission grant "${input.grant.id}" or participation "${input.participation.id}" is not active; expected both active.`,
    );
  }
  const objectScope = input.grant.objectScopes.find((scope) =>
    scope.objectId === input.objectId
  );
  if (objectScope?.actions.includes("submit") !== true) {
    throw new DealAccessInvariantError(
      `Portal object "${input.objectId}" is not submit-scoped by grant "${input.grant.id}"; expected submit action.`,
    );
  }
  assertPayloadFields(input.payload, input.grant.fields);
  return Object.freeze({
    aggregateType: "portal_submission",
    id: input.id,
    scope: freezeScope(input.grant.scope),
    grantId: input.grant.id,
    objectId: input.objectId,
    payload: Object.freeze({ ...input.payload }),
    state: "queued",
    version: 1 as AggregateVersion,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function createPortalReceipt(input: {
  readonly id: PortalReceiptId;
  readonly submission: PortalSubmission;
  readonly state: PortalReceipt["state"];
  readonly now: string;
}): PortalReceipt {
  assertInstant(input.now, "receipt creation time");
  return Object.freeze({
    aggregateType: "portal_receipt",
    id: input.id,
    state: input.state,
    receivedAt: input.now,
    submissionReference: input.id,
  });
}

export function completePortalSubmission(
  submission: PortalSubmission,
  now: string,
): PortalSubmission {
  assertSubmissionState(submission, "queued");
  return updateSubmission(submission, "accepted", now);
}

export function cancelPortalSubmission(
  submission: PortalSubmission,
  now: string,
): PortalSubmission {
  assertSubmissionState(submission, "queued");
  return updateSubmission(submission, "cancelled", now);
}

function freezeParticipation(value: DealParticipation): DealParticipation {
  return Object.freeze(value);
}

function freezeGrant(value: ExternalGrant): ExternalGrant {
  return Object.freeze({
    ...value,
    actions: Object.freeze([...value.actions]),
    fields: Object.freeze([...value.fields]),
    objectScopes: Object.freeze([...value.objectScopes]),
  });
}

function freezeScope(scope: DealAccessScope): DealAccessScope {
  return Object.freeze({ ...scope });
}

function freezeObjectScope(scope: PortalObjectScope): PortalObjectScope {
  return Object.freeze({
    ...scope,
    actions: Object.freeze([...scope.actions]),
  });
}

function assertParticipant(value: string): void {
  if (value.trim() && value.length <= 255) return;
  throw new DealAccessInvariantError(
    `Participant ID "${value}" is invalid; expected 1-255 non-whitespace characters.`,
  );
}

function assertTokenDigest(value: string): string {
  if (/^[0-9a-f]{64}$/.test(value)) return value;
  throw new DealAccessInvariantError(
    `Invitation token digest "${value}" is invalid; expected 64 lowercase hexadecimal characters.`,
  );
}

function assertHumanSponsor(sponsor: HumanSponsor): void {
  if (sponsor.kind === "human") return;
  throw new DealAccessInvariantError(
    `Grant sponsor "${sponsor.actorId}" has kind "${sponsor.kind}"; expected a human sponsor.`,
  );
}

function assertBoundScope(
  objects: readonly PortalObjectScope[],
  actions: readonly string[],
  fields: readonly string[],
): void {
  if (objects.length > 0 && actions.length > 0 && fields.length > 0) return;
  throw new DealAccessInvariantError(
    "External grant scope is incomplete; expected at least one object, action, and field.",
  );
}

function assertScopeObjects(objects: readonly PortalObjectScope[]): void {
  for (const object of objects) {
    if (object.actions.length > 0) continue;
    throw new DealAccessInvariantError(
      `Portal object "${object.objectId}" has no actions; expected an explicit object action scope.`,
    );
  }
}

function assertPayloadFields(
  payload: SubmissionPayload,
  fields: readonly FieldName[],
): void {
  for (const key of Object.keys(payload)) {
    if (fields.includes(key as FieldName)) continue;
    throw new DealAccessInvariantError(
      `Submission field "${key}" is not grant-scoped; expected one of [${
        fields.join(", ")
      }].`,
    );
  }
}

function assertSubmissionState(
  submission: PortalSubmission,
  expected: PortalSubmission["state"],
): void {
  if (submission.state === expected) return;
  throw new DealAccessInvariantError(
    `Submission "${submission.id}" state "${submission.state}" cannot transition; expected "${expected}".`,
  );
}

function updateSubmission(
  submission: PortalSubmission,
  state: PortalSubmission["state"],
  now: string,
): PortalSubmission {
  assertInstant(now, "submission transition time");
  return Object.freeze({
    ...submission,
    state,
    version: (submission.version + 1) as AggregateVersion,
    updatedAt: now,
  });
}

function assertFuture(value: string, now: string, label: string): void {
  if (
    Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.parse(now)
  ) {
    return;
  }
  throw new DealAccessInvariantError(
    `${label} "${value}" is invalid; expected an instant after "${now}".`,
  );
}

function assertInstant(value: string, label: string): void {
  if (Number.isFinite(Date.parse(value))) return;
  throw new DealAccessInvariantError(
    `${label} "${value}" is invalid; expected an ISO-8601 instant.`,
  );
}

function purposeValue(value: string): Purpose {
  try {
    return purpose(value.trim());
  } catch {
    throw new DealAccessInvariantError(
      `Grant purpose "${value}" is invalid; expected lowercase identifier syntax.`,
    );
  }
}

function actionValue(value: string): Action {
  try {
    return action(value);
  } catch {
    throw new DealAccessInvariantError(
      `Grant action "${value}" is invalid; expected lowercase identifier syntax.`,
    );
  }
}

function fieldValue(value: string): FieldName {
  try {
    return field(value);
  } catch {
    throw new DealAccessInvariantError(
      `Grant field "${value}" is invalid; expected lowercase identifier syntax.`,
    );
  }
}
