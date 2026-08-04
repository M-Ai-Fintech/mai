import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import { VersionConflictError } from "../platform/persistence/v1.ts";
import type {
  DocumentId,
  DocumentSourceId,
  DocumentVersionId,
  ProcessingRunId,
} from "./ids.ts";
import {
  type Document,
  type DocumentScope,
  type ObjectReference,
} from "./model.ts";
import type { DocumentSource } from "./source.ts";
import type { DocumentVersion } from "./version.ts";
import type { ProcessingRun } from "./processing.ts";
import {
  documentSelectColumns,
  objectReferenceSelectColumns,
  processingRunSelectColumns,
  scopeParameters,
  sourceSelectColumns,
  versionSelectColumns,
} from "./repository_sql.ts";
import {
  rowToDocument,
  rowToObjectReference,
  rowToProcessingRun,
  rowToSource,
  rowToVersion,
} from "./repository_rows.ts";

export interface DocumentListOptions {
  readonly limit: number;
  readonly afterDocumentId?: DocumentId;
}

export class DocumentsRepository {
  async insertDocument(
    transaction: TransactionHandle,
    document: Document,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO documents.documents (
        document_id, tenant_id, workspace_id, deal_id, name, mime_type,
        classification, aggregate_version, current_version_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        document.documentId,
        document.scope.tenantId,
        document.scope.workspaceId,
        document.scope.dealId,
        document.name,
        document.mimeType,
        document.classification,
        document.aggregateVersion,
        document.currentVersionId ?? null,
        document.createdAt,
        document.updatedAt,
      ],
    );
  }

  async findDocument(
    transaction: TransactionHandle,
    scope: DocumentScope,
    documentId: DocumentId,
  ): Promise<Document | undefined> {
    const result = await transaction.query(
      `${documentSelectColumns()}
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND document_id = $4`,
      [...scopeParameters(scope), documentId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToDocument(row);
  }

  async listDocuments(
    transaction: TransactionHandle,
    scope: DocumentScope,
    options: DocumentListOptions,
  ): Promise<Document[]> {
    assertLimit(options.limit);
    const after = options.afterDocumentId;
    const result = await transaction.query(
      `${documentSelectColumns()}
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND ($4::text IS NULL OR document_id > $4)
       ORDER BY document_id LIMIT $5`,
      [...scopeParameters(scope), after ?? null, options.limit],
    );
    return result.rows.map(rowToDocument);
  }

  async insertSource(
    transaction: TransactionHandle,
    source: DocumentSource,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO documents.document_sources (
        source_id, tenant_id, workspace_id, deal_id, connector_account_id,
        provider, provider_workspace_id, provider_document_id, provider_folder_id,
        provider_version, cursor, capabilities, aggregate_version, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        source.sourceId,
        source.scope.tenantId,
        source.scope.workspaceId,
        source.scope.dealId,
        source.connectorAccount.connectorAccountId,
        source.provider,
        source.providerWorkspaceId ?? null,
        source.providerDocumentId ?? null,
        source.providerFolderId ?? null,
        source.providerVersion ?? null,
        source.cursor ?? null,
        source.capabilities === undefined
          ? null
          : JSON.stringify(source.capabilities),
        source.aggregateVersion,
        source.createdAt,
        source.updatedAt,
      ],
    );
  }

  async findSource(
    transaction: TransactionHandle,
    scope: DocumentScope,
    sourceId: DocumentSourceId,
  ): Promise<DocumentSource | undefined> {
    const result = await transaction.query(
      `${sourceSelectColumns()}
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND source_id = $4`,
      [...scopeParameters(scope), sourceId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToSource(row);
  }

  async updateSourceCursor(
    transaction: TransactionHandle,
    scope: DocumentScope,
    sourceId: DocumentSourceId,
    expectedVersion: number,
    cursor: string | undefined,
    providerVersion: string | undefined,
    updatedAt: Date,
  ): Promise<DocumentSource> {
    return await this.updateSourceCursorSql(
      transaction,
      scope,
      sourceId,
      expectedVersion,
      cursor,
      providerVersion,
      updatedAt,
    );
  }

  private async updateSourceCursorSql(
    transaction: TransactionHandle,
    scope: DocumentScope,
    sourceId: DocumentSourceId,
    expectedVersion: number,
    cursor: string | undefined,
    providerVersion: string | undefined,
    updatedAt: Date,
  ): Promise<DocumentSource> {
    const result = await transaction.query(
      `UPDATE documents.document_sources
       SET cursor = $6, provider_version = $7,
           aggregate_version = aggregate_version + 1, updated_at = $8
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND source_id = $4 AND aggregate_version = $5
       RETURNING source_id AS "sourceId", tenant_id AS "tenantId",
         workspace_id AS "workspaceId", deal_id AS "dealId",
         connector_account_id AS "connectorAccountId", provider,
         provider_workspace_id AS "providerWorkspaceId",
         provider_document_id AS "providerDocumentId",
         provider_folder_id AS "providerFolderId", provider_version AS "providerVersion",
         cursor, capabilities, aggregate_version::text AS "aggregateVersion",
         created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        ...scopeParameters(scope),
        sourceId,
        expectedVersion,
        cursor ?? null,
        providerVersion ?? null,
        updatedAt,
      ],
    );
    if (result.rowCount === 1) return rowToSource(result.rows[0]);
    throw new VersionConflictError(
      "VERSION_CONFLICT",
      sourceId,
      expectedVersion as AggregateVersion,
    );
  }

  async insertObjectReference(
    transaction: TransactionHandle,
    reference: ObjectReference,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO documents.object_references (
        object_reference_id, tenant_id, workspace_id, deal_id, object_key,
        storage_version, checksum_algorithm, checksum_value, byte_length,
        media_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        reference.objectReferenceId,
        reference.scope.tenantId,
        reference.scope.workspaceId,
        reference.scope.dealId,
        reference.objectKey,
        reference.storageVersion,
        reference.checksum.algorithm,
        reference.checksum.value,
        reference.byteLength,
        reference.mediaType,
        reference.createdAt,
      ],
    );
  }

  async findObjectReference(
    transaction: TransactionHandle,
    scope: DocumentScope,
    objectReferenceId: string,
  ): Promise<ObjectReference | undefined> {
    const result = await transaction.query(
      `${objectReferenceSelectColumns()}
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND object_reference_id = $4`,
      [...scopeParameters(scope), objectReferenceId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToObjectReference(row);
  }

  async appendVersion(
    transaction: TransactionHandle,
    version: DocumentVersion,
  ): Promise<void> {
    const current = await transaction.query<{ aggregateVersion: string }>(
      `SELECT aggregate_version::text AS "aggregateVersion"
       FROM documents.documents
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND document_id = $4 FOR UPDATE`,
      [...scopeParameters(version.scope), version.documentId],
    );
    const row = current.rows[0];
    if (row === undefined) {
      throw new Error(
        `Document "${version.documentId}" was not found in scope; expected a protected-not-found read before append.`,
      );
    }
    const currentVersion = Number(row.aggregateVersion);
    if (version.versionNumber !== currentVersion) {
      throw new Error(
        `Document version "${version.documentVersionId}" is duplicate or stale; expected version "${currentVersion}".`,
      );
    }
    await transaction.query(
      `INSERT INTO documents.document_versions (
        document_version_id, document_id, tenant_id, workspace_id, deal_id,
        version_number, source_id, provider, provider_document_id, provider_version,
        checksum_algorithm, checksum_value, classification, object_reference_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        version.documentVersionId,
        version.documentId,
        version.scope.tenantId,
        version.scope.workspaceId,
        version.scope.dealId,
        version.versionNumber,
        version.source.sourceId,
        version.provider,
        version.source.providerDocumentId ?? null,
        version.source.providerVersion ?? null,
        version.checksum.algorithm,
        version.checksum.value,
        version.classification,
        version.objectReference.objectReferenceId,
        version.createdAt,
      ],
    );
    await transaction.query(
      `UPDATE documents.documents
       SET current_version_id = $5, aggregate_version = aggregate_version + 1,
           updated_at = $6
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND document_id = $4 AND aggregate_version = $7`,
      [
        ...scopeParameters(version.scope),
        version.documentId,
        version.documentVersionId,
        version.createdAt,
        currentVersion,
      ],
    );
  }

  async findVersion(
    transaction: TransactionHandle,
    scope: DocumentScope,
    versionId: DocumentVersionId,
  ): Promise<DocumentVersion | undefined> {
    const result = await transaction.query(
      `${versionSelectColumns()}
       WHERE version.tenant_id = $1 AND version.workspace_id = $2
         AND version.deal_id = $3 AND version.document_version_id = $4`,
      [...scopeParameters(scope), versionId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToVersion(row);
  }

  async listVersions(
    transaction: TransactionHandle,
    scope: DocumentScope,
    documentId: DocumentId,
  ): Promise<DocumentVersion[]> {
    const result = await transaction.query(
      `${versionSelectColumns()}
       WHERE version.tenant_id = $1 AND version.workspace_id = $2
         AND version.deal_id = $3 AND version.document_id = $4
       ORDER BY version.version_number`,
      [...scopeParameters(scope), documentId],
    );
    return result.rows.map(rowToVersion);
  }

  async insertProcessingRun(
    transaction: TransactionHandle,
    run: ProcessingRun,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO documents.processing_runs (
        processing_run_id, tenant_id, workspace_id, deal_id, document_version_id,
        input_checksum_algorithm, input_checksum_value, processor, processor_version,
        state, attempt_count, failure_code, created_at, started_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        run.processingRunId,
        run.scope.tenantId,
        run.scope.workspaceId,
        run.scope.dealId,
        run.documentVersionId,
        run.inputChecksum.algorithm,
        run.inputChecksum.value,
        run.processor,
        run.processorVersion,
        run.state,
        run.attemptCount,
        run.failureCode ?? null,
        run.createdAt,
        run.startedAt ?? null,
        run.completedAt ?? null,
      ],
    );
  }

  async findProcessingRun(
    transaction: TransactionHandle,
    scope: DocumentScope,
    runId: ProcessingRunId,
  ): Promise<ProcessingRun | undefined> {
    const result = await transaction.query(
      `${processingRunSelectColumns()}
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND processing_run_id = $4`,
      [...scopeParameters(scope), runId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToProcessingRun(row);
  }

  async recordIdempotencyKey(
    transaction: TransactionHandle,
    input: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO documents.idempotency_keys (
        tenant_id, workspace_id, deal_id, actor_id, command_type,
        target_type, target_id, idempotency_key, payload_digest, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      [
        input.tenantId,
        input.workspaceId,
        input.dealId,
        input.actorId,
        input.commandType,
        input.targetType,
        input.targetId,
        input.idempotencyKey,
        input.payloadDigest,
        input.createdAt,
      ],
    );
  }
}

function assertLimit(limit: number): void {
  if (Number.isSafeInteger(limit) && limit > 0 && limit <= 100) return;
  throw new Error(`Document list limit "${limit}" is invalid; expected 1-100.`);
}
