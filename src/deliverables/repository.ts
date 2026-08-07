import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import {
  approvalInsertSql,
  deliverableInsertSql,
  deliverableInsertValues,
  deliverableSelectSql,
  exportInsertSql,
  manifestInsertSql,
  queryOne,
  receiptInsertSql,
  redactionOverlayInsertSql,
  redactionOverlayInsertValues,
  releaseAuthorizationInsertSql,
  releaseAuthorizationSelectSql,
  scopeValues,
  sourceSnapshotInsertSql,
  sourceSnapshotInsertValues,
  staleMarkInsertSql,
  staleMarkInsertValues,
  versionInsertSql,
  versionInsertValues,
  versionSelectSql,
} from "./repository_sql.ts";
import {
  rowToDeliverable,
  rowToReleaseAuthorization,
  rowToVersion,
} from "./repository_rows.ts";
import type {
  ContentApproval,
  Deliverable,
  DeliverableScope,
  DeliverableVersion,
  DeliveryReceipt,
  ExportManifest,
  RedactionOverlay,
  ReleaseAuthorization,
  SourceSnapshot,
  StaleMark,
} from "./model.ts";

export interface DeliverableExportInput {
  readonly exportId: string;
  readonly versionId: DeliverableVersion["versionId"];
  readonly scope: DeliverableScope;
  readonly releaseAuthorizationId: ReleaseAuthorization["authorizationId"];
  readonly format: "pdf" | "docx" | "xlsx" | "csv" | "zip";
  readonly filename: string;
  readonly createdAt: Date;
}

export interface DeliverablesRepository {
  insertDeliverable(
    transaction: TransactionHandle,
    deliverable: Deliverable,
  ): Promise<void>;
  insertSourceSnapshot(
    transaction: TransactionHandle,
    snapshot: SourceSnapshot,
  ): Promise<void>;
  insertVersion(
    transaction: TransactionHandle,
    version: DeliverableVersion,
  ): Promise<void>;
  appendStaleMark(
    transaction: TransactionHandle,
    mark: StaleMark,
    scope: DeliverableScope,
  ): Promise<void>;
  appendRedactionOverlay(
    transaction: TransactionHandle,
    overlay: RedactionOverlay,
    versionId: DeliverableVersion["versionId"],
    scope: DeliverableScope,
  ): Promise<void>;
  appendApproval(
    transaction: TransactionHandle,
    approval: ContentApproval,
    scope: DeliverableScope,
  ): Promise<void>;
  appendReleaseAuthorization(
    transaction: TransactionHandle,
    authorization: ReleaseAuthorization,
    scope: DeliverableScope,
  ): Promise<void>;
  insertExport(
    transaction: TransactionHandle,
    input: DeliverableExportInput,
  ): Promise<void>;
  insertManifest(
    transaction: TransactionHandle,
    manifest: ExportManifest,
    scope: DeliverableScope,
  ): Promise<void>;
  insertReceipt(
    transaction: TransactionHandle,
    receipt: DeliveryReceipt,
    scope: DeliverableScope,
    createdAt: Date,
  ): Promise<void>;
  findDeliverable(
    transaction: TransactionHandle,
    scope: DeliverableScope,
    deliverableId: Deliverable["deliverableId"],
  ): Promise<Deliverable | undefined>;
  listDeliverables(
    transaction: TransactionHandle,
    scope: DeliverableScope,
    limit: number,
    afterDeliverableId?: Deliverable["deliverableId"],
  ): Promise<readonly Deliverable[]>;
  findVersion(
    transaction: TransactionHandle,
    scope: DeliverableScope,
    versionId: DeliverableVersion["versionId"],
  ): Promise<DeliverableVersion | undefined>;
  findReleaseAuthorization(
    transaction: TransactionHandle,
    scope: DeliverableScope,
    versionId: DeliverableVersion["versionId"],
    authorizationId: string,
  ): Promise<ReleaseAuthorization | undefined>;
}

export class PostgresDeliverablesRepository implements DeliverablesRepository {
  async insertDeliverable(
    transaction: TransactionHandle,
    deliverable: Deliverable,
  ): Promise<void> {
    await transaction.query(
      deliverableInsertSql(),
      deliverableInsertValues(deliverable),
    );
  }

  async insertSourceSnapshot(
    transaction: TransactionHandle,
    snapshot: SourceSnapshot,
  ): Promise<void> {
    await transaction.query(
      sourceSnapshotInsertSql(),
      sourceSnapshotInsertValues(snapshot),
    );
  }

  async insertVersion(
    transaction: TransactionHandle,
    version: DeliverableVersion,
  ): Promise<void> {
    await transaction.query(versionInsertSql(), versionInsertValues(version));
  }

  async appendStaleMark(
    transaction: TransactionHandle,
    mark: StaleMark,
    scope: DeliverableScope,
  ): Promise<void> {
    await transaction.query(
      staleMarkInsertSql(),
      staleMarkInsertValues(mark, scope),
    );
  }

  async appendRedactionOverlay(
    transaction: TransactionHandle,
    overlay: RedactionOverlay,
    versionId: DeliverableVersion["versionId"],
    scope: DeliverableScope,
  ): Promise<void> {
    await transaction.query(
      redactionOverlayInsertSql(),
      redactionOverlayInsertValues(overlay, versionId, scope),
    );
  }

  async appendApproval(
    transaction: TransactionHandle,
    approval: ContentApproval,
    scope: DeliverableScope,
  ): Promise<void> {
    await transaction.query(approvalInsertSql(), [
      approval.approvalId,
      approval.versionId,
      ...scopeValues(scope),
      approval.actorId,
      approval.actorKind,
      approval.decision,
      JSON.stringify(approval.conditions ?? []),
      approval.decidedAt,
    ]);
  }

  async appendReleaseAuthorization(
    transaction: TransactionHandle,
    authorization: ReleaseAuthorization,
    scope: DeliverableScope,
  ): Promise<void> {
    await transaction.query(releaseAuthorizationInsertSql(), [
      authorization.authorizationId,
      authorization.versionId,
      ...scopeValues(scope),
      authorization.actorId,
      authorization.actorKind,
      JSON.stringify(authorization.audience),
      JSON.stringify(authorization.approvedFormats),
      authorization.confidentiality,
      authorization.authorizedAt,
      authorization.expiresAt ?? null,
    ]);
  }

  async insertExport(
    transaction: TransactionHandle,
    input: DeliverableExportInput,
  ): Promise<void> {
    await transaction.query(
      exportInsertSql(),
      [
        input.exportId,
        input.versionId,
        ...scopeValues(input.scope),
        input.releaseAuthorizationId,
        input.format,
        input.filename,
        input.createdAt,
      ],
    );
  }

  async insertManifest(
    transaction: TransactionHandle,
    manifest: ExportManifest,
    scope: DeliverableScope,
  ): Promise<void> {
    await transaction.query(manifestInsertSql(), [
      manifest.manifestId,
      manifest.exportId,
      manifest.versionId,
      ...scopeValues(scope),
      manifest.sourceSnapshotId,
      manifest.artifactReference,
      manifest.artifactChecksum,
      JSON.stringify(manifest.audience),
      JSON.stringify(manifest.redactedFields),
      manifest.contentDigest,
      manifest.createdAt,
    ]);
  }

  async insertReceipt(
    transaction: TransactionHandle,
    receipt: DeliveryReceipt,
    scope: DeliverableScope,
    createdAt: Date,
  ): Promise<void> {
    await transaction.query(receiptInsertSql(), [
      receipt.receiptId,
      receipt.exportId,
      ...scopeValues(scope),
      receipt.recipientId,
      receipt.purpose,
      receipt.idempotencyKey,
      receipt.state,
      receipt.attemptCount,
      receipt.failureCode ?? null,
      receipt.nextAttemptAt ?? null,
      createdAt,
    ]);
  }

  async findDeliverable(
    transaction: TransactionHandle,
    scope: DeliverableScope,
    deliverableId: Deliverable["deliverableId"],
  ): Promise<Deliverable | undefined> {
    const result = await queryOne<Record<string, unknown>>(
      transaction,
      `${deliverableSelectSql()} WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND deliverable_id = $4`,
      [...scopeValues(scope), deliverableId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToDeliverable(row);
  }

  async listDeliverables(
    transaction: TransactionHandle,
    scope: DeliverableScope,
    limit: number,
    afterDeliverableId?: Deliverable["deliverableId"],
  ): Promise<readonly Deliverable[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new Error(
        `Deliverable list limit "${limit}" is invalid; expected an integer from 1 to 100.`,
      );
    }
    const result = await transaction.query<Record<string, unknown>>(
      `${deliverableSelectSql()} WHERE tenant_id = $1 AND workspace_id = $2
       AND deal_id = $3 AND ($4::text IS NULL OR deliverable_id > $4)
       ORDER BY deliverable_id LIMIT $5`,
      [...scopeValues(scope), afterDeliverableId ?? null, limit],
    );
    return result.rows.map(rowToDeliverable);
  }

  async findVersion(
    transaction: TransactionHandle,
    scope: DeliverableScope,
    versionId: DeliverableVersion["versionId"],
  ): Promise<DeliverableVersion | undefined> {
    const result = await queryOne<Record<string, unknown>>(
      transaction,
      `${versionSelectSql()} WHERE version.tenant_id = $1 AND version.workspace_id = $2 AND version.deal_id = $3 AND version.version_id = $4`,
      [...scopeValues(scope), versionId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToVersion(row);
  }

  async findReleaseAuthorization(
    transaction: TransactionHandle,
    scope: DeliverableScope,
    versionId: DeliverableVersion["versionId"],
    authorizationId: string,
  ): Promise<ReleaseAuthorization | undefined> {
    const result = await queryOne<Record<string, unknown>>(
      transaction,
      `${releaseAuthorizationSelectSql()}
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND version_id = $4 AND authorization_id = $5`,
      [...scopeValues(scope), versionId, authorizationId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToReleaseAuthorization(row);
  }
}
