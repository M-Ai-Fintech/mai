import type {
  ActorId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";
import type {
  DeliverableId,
  DeliverableVersionId,
  ManifestId,
  SourceSnapshotId,
} from "./ids.ts";

export type ConfidentialityLevel =
  | "internal"
  | "internal_restricted"
  | "client_confidential"
  | "counterparty_confidential"
  | "clean_team_restricted"
  | "personal_data_restricted"
  | "external_approved";

export type AudienceType =
  | "internal_team"
  | "internal_committee"
  | "client"
  | "counterparty"
  | "external_counsel"
  | "auditor"
  | "custom_restricted";

export type ReleasePurpose =
  | "internal_review"
  | "committee_review"
  | "client_review"
  | "external_distribution"
  | "audit_review";

export type ExportFormat = "pdf" | "docx" | "xlsx" | "csv" | "zip";

export type DeliverableStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "release_pending"
  | "released"
  | "superseded"
  | "withdrawn"
  | "archived";

export type PreparationState =
  | "draft"
  | "draft_prepared"
  | "review_required"
  | "in_review"
  | "changes_requested";

export type ContentApprovalState =
  | "pending"
  | "approved"
  | "rejected"
  | "invalidated";

export type ReleaseState =
  | "required"
  | "pending"
  | "authorized"
  | "released"
  | "expired"
  | "invalidated"
  | "withdrawn";

export type FreshnessState =
  | "current"
  | "stale"
  | "invalidated"
  | "historical";

export type ContentValue =
  | null
  | boolean
  | number
  | string
  | readonly ContentValue[]
  | { readonly [key: string]: ContentValue };
export type ContentPayload = Readonly<Record<string, ContentValue>>;
export type ContentClassification = Readonly<
  Record<string, "public" | "internal" | "restricted">
>;

export interface DeliverableScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}

export interface SourceReference {
  readonly sourceObjectType: string;
  readonly sourceObjectId: string;
  readonly sourceObjectVersion: number;
  readonly documentId?: string;
  readonly documentVersionId?: string;
  readonly sourceLocation?: string;
  readonly checksum?: string;
  readonly accessLevel: ConfidentialityLevel;
}

export interface SourceSnapshot {
  readonly snapshotId: SourceSnapshotId;
  readonly scope: DeliverableScope;
  readonly sourceCutoffAt: Date;
  readonly references: readonly SourceReference[];
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface Deliverable {
  readonly deliverableId: DeliverableId;
  readonly scope: DeliverableScope;
  readonly deliverableType: string;
  readonly title: string;
  readonly ownerId: ActorId;
  readonly defaultAudienceType: AudienceType;
  readonly confidentiality: ConfidentialityLevel;
  readonly status: DeliverableStatus;
  readonly aggregateVersion: number;
  readonly currentApprovedVersionId?: DeliverableVersionId;
  readonly latestDraftVersionId?: DeliverableVersionId;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DeliverableVersion {
  readonly versionId: DeliverableVersionId;
  readonly deliverableId: DeliverableId;
  readonly scope: DeliverableScope;
  readonly versionNumber: number;
  readonly versionLabel: string;
  readonly sourceSnapshot: SourceSnapshot;
  readonly content: ContentPayload;
  readonly classifications: ContentClassification;
  readonly preparationState: PreparationState;
  readonly contentApprovalState: ContentApprovalState;
  readonly releaseState: ReleaseState;
  readonly freshnessState: FreshnessState;
  readonly aggregateVersion: number;
  readonly reviewSubmittedBy?: ActorId;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
  readonly approvedAt?: Date;
}

export interface ContentApproval {
  readonly approvalId: string;
  readonly versionId: DeliverableVersionId;
  readonly actorId: ActorId;
  readonly actorKind: "human" | "agent" | "system";
  readonly decision: "approved" | "rejected" | "approved_with_conditions";
  readonly conditions?: readonly string[];
  readonly decidedAt: Date;
}

export interface RecipientScope {
  readonly audienceType: AudienceType;
  readonly purpose: ReleasePurpose;
  readonly recipientIds?: readonly string[];
  readonly groupId?: string;
}

export interface ReleaseAuthorization {
  readonly authorizationId: string;
  readonly versionId: DeliverableVersionId;
  readonly actorId: ActorId;
  readonly actorKind: "human" | "agent" | "system";
  readonly audience: RecipientScope;
  readonly approvedFormats: readonly ExportFormat[];
  readonly confidentiality: ConfidentialityLevel;
  readonly authorizedAt: Date;
  readonly expiresAt?: Date;
}

export interface StaleMark {
  readonly staleMarkId: string;
  readonly versionId: DeliverableVersionId;
  readonly actorId: ActorId;
  readonly reason: string;
  readonly changedSourceIds: readonly string[];
  readonly markedAt: Date;
}

export interface RedactionPolicy {
  readonly policyId: string;
  readonly audienceType: AudienceType;
  readonly purpose: ReleasePurpose;
  readonly rules: readonly RedactionRule[];
}

export interface RedactionRule {
  readonly fieldPath: string;
  readonly reason: string;
}

export interface RedactionOverlay {
  readonly overlayId: string;
  readonly policyId: string;
  readonly audience: RecipientScope;
  readonly fields: readonly string[];
  readonly appliedAt: Date;
}

export interface ExportManifest {
  readonly manifestId: ManifestId;
  readonly exportId: string;
  readonly versionId: DeliverableVersionId;
  readonly sourceSnapshotId: SourceSnapshotId;
  readonly artifactReference: string;
  readonly artifactChecksum: string;
  readonly audience: RecipientScope;
  readonly redactedFields: readonly string[];
  readonly contentDigest: string;
  readonly createdAt: Date;
}

export interface DeliveryReceipt {
  readonly receiptId: string;
  readonly exportId: string;
  readonly recipientId: string;
  readonly purpose: ReleasePurpose;
  readonly idempotencyKey: string;
  readonly state:
    | "pending"
    | "retry_scheduled"
    | "sent"
    | "delivered"
    | "failed"
    | "revoked"
    | "expired";
  readonly attemptCount: number;
  readonly failureCode?: string;
  readonly nextAttemptAt?: Date;
}

export function createDeliverable(input: {
  readonly deliverableId: DeliverableId;
  readonly scope: DeliverableScope;
  readonly deliverableType: string;
  readonly title: string;
  readonly ownerId: ActorId;
  readonly defaultAudienceType: AudienceType;
  readonly confidentiality: ConfidentialityLevel;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}): Deliverable {
  assertText(input.deliverableType, "deliverable type", 128);
  assertText(input.title, "deliverable title", 512);
  assertScope(input.scope);
  assertDate(input.createdAt, "deliverable created timestamp");
  assertDate(input.updatedAt, "deliverable updated timestamp");
  return Object.freeze({
    ...input,
    status: "draft" as const,
    aggregateVersion: 1,
    scope: freezeScope(input.scope),
  });
}

export function createSourceSnapshot(input: {
  readonly snapshotId: SourceSnapshot["snapshotId"];
  readonly scope: DeliverableScope;
  readonly sourceCutoffAt: Date;
  readonly references: readonly SourceReference[];
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}): SourceSnapshot {
  assertScope(input.scope);
  if (input.references.length === 0) {
    throw new Error(
      `Source snapshot "${input.snapshotId}" has no references; expected an exact source set.`,
    );
  }
  for (const reference of input.references) assertSourceReference(reference);
  assertDate(input.sourceCutoffAt, "source cutoff timestamp");
  assertDate(input.createdAt, "source snapshot created timestamp");
  return Object.freeze({
    ...input,
    scope: freezeScope(input.scope),
    references: Object.freeze(input.references.map(freezeSourceReference)),
  });
}

export function createDeliverableVersion(input: {
  readonly versionId: DeliverableVersionId;
  readonly deliverable: Deliverable;
  readonly versionNumber: number;
  readonly versionLabel: string;
  readonly sourceSnapshot: SourceSnapshot;
  readonly content: ContentPayload;
  readonly classifications: ContentClassification;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}): DeliverableVersion {
  assertScopeMatch(input.deliverable.scope, input.sourceSnapshot.scope);
  assertPositive(input.versionNumber, "deliverable version number");
  assertText(input.versionLabel, "deliverable version label", 64);
  assertClassifications(input.content, input.classifications);
  assertDate(input.createdAt, "deliverable version created timestamp");
  return Object.freeze({
    versionId: input.versionId,
    deliverableId: input.deliverable.deliverableId,
    scope: freezeScope(input.deliverable.scope),
    versionNumber: input.versionNumber,
    versionLabel: input.versionLabel,
    sourceSnapshot: input.sourceSnapshot,
    content: freezeContent(input.content),
    classifications: Object.freeze({ ...input.classifications }),
    preparationState: "draft" as const,
    contentApprovalState: "pending" as const,
    releaseState: "required" as const,
    freshnessState: "current" as const,
    aggregateVersion: 1,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
  });
}

export function isReleasePurpose(value: unknown): value is ReleasePurpose {
  return value === "internal_review" || value === "committee_review" ||
    value === "client_review" || value === "external_distribution" ||
    value === "audit_review";
}

export function isExportFormat(
  value: unknown,
): value is ExportFormat {
  return value === "pdf" || value === "docx" || value === "xlsx" ||
    value === "csv" || value === "zip";
}

function assertSourceReference(reference: SourceReference): void {
  assertText(reference.sourceObjectType, "source object type", 128);
  assertText(reference.sourceObjectId, "source object ID", 128);
  assertPositive(reference.sourceObjectVersion, "source object version");
  assertText(reference.accessLevel, "source access level", 64);
  if (
    reference.checksum !== undefined &&
    !/^[0-9a-f]{64}$/.test(reference.checksum)
  ) {
    throw new Error(
      `Source reference checksum "${reference.checksum}" is invalid; expected lowercase SHA-256.`,
    );
  }
  if (
    reference.sourceObjectType === "DocumentVersion" &&
    reference.documentVersionId === undefined
  ) {
    throw new Error(
      `Source object "${reference.sourceObjectId}" is a document version without documentVersionId; expected exact document provenance.`,
    );
  }
}

function assertClassifications(
  content: ContentPayload,
  classifications: ContentClassification,
): void {
  for (const field of Object.keys(content)) {
    if (classifications[field] !== undefined) continue;
    throw new Error(
      `Deliverable content field "${field}" has no classification; expected every output field to be access-filterable.`,
    );
  }
}

function assertScope(scope: DeliverableScope): void {
  assertText(scope.tenantId, "deliverable tenant ID", 96);
  assertText(scope.workspaceId, "deliverable workspace ID", 96);
  assertText(scope.dealId, "deliverable deal ID", 96);
}

function assertScopeMatch(
  left: DeliverableScope,
  right: DeliverableScope,
): void {
  if (
    left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId
  ) return;
  throw new Error(
    `Deliverable scope "${
      scopeKey(left)
    }" does not match source snapshot scope "${scopeKey(right)}".`,
  );
}

function freezeScope(scope: DeliverableScope): DeliverableScope {
  return Object.freeze({ ...scope });
}

function freezeSourceReference(reference: SourceReference): SourceReference {
  return Object.freeze({ ...reference });
}

function freezeContent(content: ContentPayload): ContentPayload {
  return Object.freeze({ ...content });
}

function assertText(value: string, label: string, maximum: number): void {
  if (typeof value === "string" && value.trim() && value.length <= maximum) {
    return;
  }
  throw new Error(
    `${label} "${value}" is invalid; expected 1-${maximum} non-whitespace characters.`,
  );
}

function assertPositive(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new Error(
    `${label} "${value}" is invalid; expected a positive integer.`,
  );
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `${label} "${String(value)}" is invalid; expected a valid Date.`,
  );
}

function scopeKey(scope: DeliverableScope): string {
  return `${scope.tenantId}/${scope.workspaceId}/${scope.dealId}`;
}
