import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type {
  Deliverable,
  DeliverableScope,
  DeliverableVersion,
  RedactionOverlay,
  SourceSnapshot,
  StaleMark,
} from "./model.ts";

export function deliverableInsertSql(): string {
  return `INSERT INTO deliverables.deliverables (
    deliverable_id, tenant_id, workspace_id, deal_id, deliverable_type, title,
    owner_id, default_audience_type, confidentiality, status, aggregate_version,
    current_approved_version_id, latest_draft_version_id, created_by, created_at,
    updated_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`;
}

export function deliverableInsertValues(deliverable: Deliverable): unknown[] {
  return [
    deliverable.deliverableId,
    ...scopeValues(deliverable.scope),
    deliverable.deliverableType,
    deliverable.title,
    deliverable.ownerId,
    deliverable.defaultAudienceType,
    deliverable.confidentiality,
    deliverable.status,
    deliverable.aggregateVersion,
    deliverable.currentApprovedVersionId ?? null,
    deliverable.latestDraftVersionId ?? null,
    deliverable.createdBy,
    deliverable.createdAt,
    deliverable.updatedAt,
  ];
}

export function sourceSnapshotInsertSql(): string {
  return `INSERT INTO deliverables.source_snapshots (
    snapshot_id, tenant_id, workspace_id, deal_id, source_cutoff_at,
    source_references, created_by, created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
}

export function sourceSnapshotInsertValues(
  snapshot: SourceSnapshot,
): unknown[] {
  return [
    snapshot.snapshotId,
    ...scopeValues(snapshot.scope),
    snapshot.sourceCutoffAt,
    JSON.stringify(snapshot.references),
    snapshot.createdBy,
    snapshot.createdAt,
  ];
}

export function versionInsertSql(): string {
  return `INSERT INTO deliverables.deliverable_versions (
    version_id, deliverable_id, tenant_id, workspace_id, deal_id,
    version_number, version_label, source_snapshot_id, content, classifications,
    preparation_state, content_approval_state, release_state, freshness_state,
    aggregate_version, review_submitted_by, created_by, created_at, approved_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`;
}

export function versionInsertValues(version: DeliverableVersion): unknown[] {
  return [
    version.versionId,
    version.deliverableId,
    ...scopeValues(version.scope),
    version.versionNumber,
    version.versionLabel,
    version.sourceSnapshot.snapshotId,
    JSON.stringify(version.content),
    JSON.stringify(version.classifications),
    version.preparationState,
    version.contentApprovalState,
    version.releaseState,
    version.freshnessState,
    version.aggregateVersion,
    version.reviewSubmittedBy ?? null,
    version.createdBy,
    version.createdAt,
    version.approvedAt ?? null,
  ];
}

export function staleMarkInsertSql(): string {
  return `INSERT INTO deliverables.stale_marks (
    stale_mark_id, version_id, tenant_id, workspace_id, deal_id, actor_id,
    reason, changed_source_ids, marked_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
}

export function staleMarkInsertValues(
  mark: StaleMark,
  scope: DeliverableScope,
): unknown[] {
  return [
    mark.staleMarkId,
    mark.versionId,
    ...scopeValues(scope),
    mark.actorId,
    mark.reason,
    JSON.stringify(mark.changedSourceIds),
    mark.markedAt,
  ];
}

export function redactionOverlayInsertSql(): string {
  return `INSERT INTO deliverables.redaction_overlays (
    overlay_id, version_id, tenant_id, workspace_id, deal_id, policy_id,
    audience, fields, applied_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
}

export function redactionOverlayInsertValues(
  overlay: RedactionOverlay,
  versionId: DeliverableVersion["versionId"],
  scope: DeliverableScope,
): unknown[] {
  return [
    overlay.overlayId,
    versionId,
    ...scopeValues(scope),
    overlay.policyId,
    JSON.stringify(overlay.audience),
    JSON.stringify(overlay.fields),
    overlay.appliedAt,
  ];
}

export function approvalInsertSql(): string {
  return `INSERT INTO deliverables.approvals (
    approval_id, version_id, tenant_id, workspace_id, deal_id, actor_id,
    actor_kind, decision, conditions, decided_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
}

export function releaseAuthorizationInsertSql(): string {
  return `INSERT INTO deliverables.release_authorizations (
    authorization_id, version_id, tenant_id, workspace_id, deal_id, actor_id,
    actor_kind, audience, approved_formats, confidentiality, authorized_at,
    expires_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
}

export function exportInsertSql(): string {
  return `INSERT INTO deliverables.exports (
    export_id, version_id, tenant_id, workspace_id, deal_id,
    release_authorization_id, format, filename, state, created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'queued', $9)`;
}

export function manifestInsertSql(): string {
  return `INSERT INTO deliverables.export_manifests (
    manifest_id, export_id, version_id, tenant_id, workspace_id, deal_id,
    source_snapshot_id, artifact_reference, artifact_checksum, audience,
    redacted_fields, content_digest, created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
}

export function receiptInsertSql(): string {
  return `INSERT INTO deliverables.distribution_receipts (
    receipt_id, export_id, tenant_id, workspace_id, deal_id, recipient_id,
    purpose, idempotency_key, state, attempt_count, failure_code,
    next_attempt_at, created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
}

export function deliverableSelectSql(): string {
  return `SELECT deliverable_id AS "deliverableId", tenant_id AS "tenantId",
    workspace_id AS "workspaceId", deal_id AS "dealId",
    deliverable_type AS "deliverableType", title, owner_id AS "ownerId",
    default_audience_type AS "defaultAudienceType", confidentiality, status,
    aggregate_version AS "aggregateVersion",
    current_approved_version_id AS "currentApprovedVersionId",
    latest_draft_version_id AS "latestDraftVersionId",
    created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM deliverables.deliverables`;
}

export function versionSelectSql(): string {
  return `SELECT version.version_id AS "versionId",
    version.deliverable_id AS "deliverableId", version.tenant_id AS "tenantId",
    version.workspace_id AS "workspaceId", version.deal_id AS "dealId",
    version.version_number AS "versionNumber", version.version_label AS "versionLabel",
    version.content, version.classifications,
    version.preparation_state AS "preparationState",
    version.content_approval_state AS "contentApprovalState",
    version.release_state AS "releaseState", version.freshness_state AS "freshnessState",
    version.aggregate_version AS "aggregateVersion", version.review_submitted_by AS "reviewSubmittedBy",
    version.created_by AS "createdBy",
    version.created_at AS "createdAt", version.approved_at AS "approvedAt",
    json_build_object(
      'snapshotId', snapshot.snapshot_id,
      'tenantId', snapshot.tenant_id,
      'workspaceId', snapshot.workspace_id,
      'dealId', snapshot.deal_id,
      'sourceCutoffAt', snapshot.source_cutoff_at,
      'references', snapshot.source_references,
      'createdBy', snapshot.created_by,
      'createdAt', snapshot.created_at
    ) AS "sourceSnapshot"
    FROM deliverables.deliverable_versions AS version
    JOIN deliverables.source_snapshots AS snapshot
      ON snapshot.tenant_id = version.tenant_id
      AND snapshot.workspace_id = version.workspace_id
      AND snapshot.deal_id = version.deal_id
      AND snapshot.snapshot_id = version.source_snapshot_id`;
}

export function releaseAuthorizationSelectSql(): string {
  return `SELECT authorization_id AS "authorizationId", version_id AS "versionId",
    tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId",
    actor_id AS "actorId", actor_kind AS "actorKind", audience,
    approved_formats AS "approvedFormats", confidentiality,
    authorized_at AS "authorizedAt", expires_at AS "expiresAt"
    FROM deliverables.release_authorizations`;
}

export function scopeValues(scope: DeliverableScope): string[] {
  return [scope.tenantId, scope.workspaceId, scope.dealId];
}

export function queryOne<TRow>(
  transaction: TransactionHandle,
  query: string,
  parameters: readonly unknown[],
): Promise<
  { readonly rows: readonly TRow[]; readonly rowCount: number | null }
> {
  return transaction.query<TRow>(query, parameters);
}
