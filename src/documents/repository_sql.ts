import type { DocumentScope } from "./model.ts";

export function documentSelectColumns(): string {
  return `SELECT document_id AS "documentId", tenant_id AS "tenantId",
    workspace_id AS "workspaceId", deal_id AS "dealId", name,
    mime_type AS "mimeType", classification, aggregate_version::text AS "aggregateVersion",
    current_version_id AS "currentVersionId", created_at AS "createdAt",
    updated_at AS "updatedAt" FROM documents.documents`;
}

export function sourceSelectColumns(): string {
  return `SELECT source_id AS "sourceId", tenant_id AS "tenantId",
    workspace_id AS "workspaceId", deal_id AS "dealId",
    connector_account_id AS "connectorAccountId", provider,
    provider_workspace_id AS "providerWorkspaceId",
    provider_document_id AS "providerDocumentId",
    provider_folder_id AS "providerFolderId",
    provider_version AS "providerVersion", cursor, capabilities,
    aggregate_version::text AS "aggregateVersion", created_at AS "createdAt",
    updated_at AS "updatedAt" FROM documents.document_sources`;
}

export function objectReferenceSelectColumns(): string {
  return `SELECT object_reference_id AS "objectReferenceId",
    tenant_id AS "tenantId", workspace_id AS "workspaceId",
    deal_id AS "dealId", object_key AS "objectKey",
    storage_version AS "storageVersion", checksum_algorithm AS "checksumAlgorithm",
    checksum_value AS "checksumValue", byte_length::text AS "byteLength",
    media_type AS "mediaType", created_at AS "createdAt"
    FROM documents.object_references`;
}

export function versionSelectColumns(): string {
  return `SELECT version.document_version_id AS "documentVersionId",
    version.document_id AS "documentId", version.tenant_id AS "tenantId",
    version.workspace_id AS "workspaceId", version.deal_id AS "dealId",
    version.version_number::text AS "versionNumber", version.source_id AS "sourceId",
    version.provider, version.provider_document_id AS "providerDocumentId",
    version.provider_version AS "providerVersion",
    version.checksum_algorithm AS "checksumAlgorithm",
    version.checksum_value AS "checksumValue", version.classification,
    version.object_reference_id AS "objectReferenceId",
    version.created_at AS "createdAt",
    source.connector_account_id AS "sourceConnectorAccountId",
    source.provider_workspace_id AS "sourceProviderWorkspaceId",
    source.provider_document_id AS "sourceProviderDocumentId",
    source.provider_folder_id AS "sourceProviderFolderId",
    source.provider_version AS "sourceProviderVersion", source.cursor AS "sourceCursor",
    source.capabilities AS "sourceCapabilities",
    source.aggregate_version::text AS "sourceAggregateVersion",
    source.created_at AS "sourceCreatedAt", source.updated_at AS "sourceUpdatedAt",
    object.object_key AS "objectKey", object.storage_version AS "storageVersion",
    object.checksum_algorithm AS "objectChecksumAlgorithm",
    object.checksum_value AS "objectChecksumValue", object.byte_length::text AS "objectByteLength",
    object.media_type AS "objectMediaType", object.created_at AS "objectCreatedAt"
    FROM documents.document_versions AS version
    JOIN documents.document_sources AS source ON source.source_id = version.source_id
    JOIN documents.object_references AS object
      ON object.object_reference_id = version.object_reference_id`;
}

export function processingRunSelectColumns(): string {
  return `SELECT processing_run_id AS "processingRunId", tenant_id AS "tenantId",
    workspace_id AS "workspaceId", deal_id AS "dealId",
    document_version_id AS "documentVersionId",
    input_checksum_algorithm AS "inputChecksumAlgorithm",
    input_checksum_value AS "inputChecksumValue", processor,
    processor_version AS "processorVersion", state,
    attempt_count AS "attemptCount", failure_code AS "failureCode",
    created_at AS "createdAt", started_at AS "startedAt",
    completed_at AS "completedAt" FROM documents.processing_runs`;
}

export function scopeParameters(scope: DocumentScope): string[] {
  return [scope.tenantId, scope.workspaceId, scope.dealId];
}
