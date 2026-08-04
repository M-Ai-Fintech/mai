import type { DocumentSource } from "./source.ts";
import { createProviderMarker, type ProviderCapabilities } from "./source.ts";
import {
  createDocument,
  createObjectReference,
  type Document,
  type DocumentClassification,
  type DocumentScope,
  type ObjectReference,
} from "./model.ts";
import { createDocumentVersion, type DocumentVersion } from "./version.ts";
import { createDocumentSource } from "./source.ts";
import {
  createProcessingRun,
  type ProcessingRun,
  type ProcessingState,
} from "./processing.ts";
import {
  parseConnectorAccountId,
  parseDocumentId,
  parseDocumentSourceId,
  parseDocumentVersionId,
  parseObjectReferenceId,
  parseProcessingRunId,
} from "./ids.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../platform/api/v1.ts";

export function rowToDocument(row: Record<string, unknown>): Document {
  return createDocument({
    documentId: identifier(row, "documentId", parseDocumentId),
    scope: rowScope(row),
    name: text(row, "name"),
    mimeType: text(row, "mimeType"),
    classification: classification(row, "classification"),
    aggregateVersion: positiveNumber(row, "aggregateVersion"),
    currentVersionId: optionalIdentifier(
      row,
      "currentVersionId",
      parseDocumentVersionId,
    ),
    createdAt: date(row, "createdAt"),
    updatedAt: date(row, "updatedAt"),
  });
}

export function rowToSource(row: Record<string, unknown>): DocumentSource {
  const provider = createProviderMarker(text(row, "provider"));
  return createDocumentSource({
    sourceId: identifier(row, "sourceId", parseDocumentSourceId),
    scope: rowScope(row),
    connectorAccount: {
      connectorAccountId: identifier(
        row,
        "connectorAccountId",
        parseConnectorAccountId,
      ),
      tenantId: rowScope(row).tenantId,
      provider,
    },
    provider,
    providerWorkspaceId: optionalText(row, "providerWorkspaceId"),
    providerDocumentId: optionalText(row, "providerDocumentId"),
    providerFolderId: optionalText(row, "providerFolderId"),
    providerVersion: optionalText(row, "providerVersion"),
    cursor: optionalText(row, "cursor"),
    capabilities: capabilities(row.capabilities, provider),
    aggregateVersion: positiveNumber(row, "aggregateVersion"),
    createdAt: date(row, "createdAt"),
    updatedAt: date(row, "updatedAt"),
  });
}

export function rowToObjectReference(
  row: Record<string, unknown>,
): ObjectReference {
  return createObjectReference({
    objectReferenceId: identifier(
      row,
      "objectReferenceId",
      parseObjectReferenceId,
    ),
    scope: rowScope(row),
    objectKey: text(row, "objectKey"),
    storageVersion: text(row, "storageVersion"),
    checksum: {
      algorithm: "sha256",
      value: text(row, "checksumValue"),
    },
    byteLength: positiveNumber(row, "byteLength", true),
    mediaType: text(row, "mediaType"),
    createdAt: date(row, "createdAt"),
  });
}

export function rowToVersion(row: Record<string, unknown>): DocumentVersion {
  const source = rowToVersionSource(row);
  const objectReference = rowToVersionObject(row);
  return createDocumentVersion({
    documentVersionId: identifier(
      row,
      "documentVersionId",
      parseDocumentVersionId,
    ),
    documentId: identifier(row, "documentId", parseDocumentId),
    scope: rowScope(row),
    versionNumber: positiveNumber(row, "versionNumber"),
    source,
    provider: createProviderMarker(text(row, "provider")),
    checksum: {
      algorithm: "sha256",
      value: text(row, "checksumValue"),
    },
    classification: classification(row, "classification"),
    objectReference,
    createdAt: date(row, "createdAt"),
  });
}

export function rowToProcessingRun(
  row: Record<string, unknown>,
): ProcessingRun {
  return createProcessingRun({
    processingRunId: identifier(row, "processingRunId", parseProcessingRunId),
    scope: rowScope(row),
    documentVersionId: identifier(
      row,
      "documentVersionId",
      parseDocumentVersionId,
    ),
    inputChecksum: {
      algorithm: "sha256",
      value: text(row, "inputChecksumValue"),
    },
    processor: text(row, "processor"),
    processorVersion: text(row, "processorVersion"),
    state: processingState(row, "state"),
    attemptCount: positiveNumber(row, "attemptCount", true),
    failureCode: optionalText(row, "failureCode"),
    derivedArtifacts: [],
    createdAt: date(row, "createdAt"),
    startedAt: optionalDate(row, "startedAt"),
    completedAt: optionalDate(row, "completedAt"),
  });
}

function rowToVersionSource(row: Record<string, unknown>): DocumentSource {
  const provider = createProviderMarker(text(row, "provider"));
  return createDocumentSource({
    sourceId: identifier(row, "sourceId", parseDocumentSourceId),
    scope: rowScope(row),
    connectorAccount: {
      connectorAccountId: identifier(
        row,
        "sourceConnectorAccountId",
        parseConnectorAccountId,
      ),
      tenantId: rowScope(row).tenantId,
      provider,
    },
    provider,
    providerWorkspaceId: optionalText(row, "sourceProviderWorkspaceId"),
    providerDocumentId: optionalText(row, "sourceProviderDocumentId"),
    providerFolderId: optionalText(row, "sourceProviderFolderId"),
    providerVersion: optionalText(row, "sourceProviderVersion"),
    cursor: optionalText(row, "sourceCursor"),
    capabilities: capabilities(row.sourceCapabilities, provider),
    aggregateVersion: positiveNumber(row, "sourceAggregateVersion"),
    createdAt: date(row, "sourceCreatedAt"),
    updatedAt: date(row, "sourceUpdatedAt"),
  });
}

function rowToVersionObject(row: Record<string, unknown>): ObjectReference {
  return createObjectReference({
    objectReferenceId: identifier(
      row,
      "objectReferenceId",
      parseObjectReferenceId,
    ),
    scope: rowScope(row),
    objectKey: text(row, "objectKey"),
    storageVersion: text(row, "storageVersion"),
    checksum: {
      algorithm: "sha256",
      value: text(row, "objectChecksumValue"),
    },
    byteLength: positiveNumber(row, "objectByteLength", true),
    mediaType: text(row, "objectMediaType"),
    createdAt: date(row, "objectCreatedAt"),
  });
}

function rowScope(row: Record<string, unknown>): DocumentScope {
  return {
    tenantId: identifier(row, "tenantId", parseTenantId),
    workspaceId: identifier(row, "workspaceId", parseWorkspaceId),
    dealId: identifier(row, "dealId", parseDealId),
  };
}

function identifier<T>(
  row: Record<string, unknown>,
  key: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parser(row[key]);
  if (result.ok) return result.value;
  throw new Error(
    `Document row field "${key}" value "${
      String(row[key])
    }" is invalid; expected a branded identifier.`,
  );
}

function optionalIdentifier<T>(
  row: Record<string, unknown>,
  key: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T | undefined {
  if (row[key] === null || row[key] === undefined) return undefined;
  return identifier(row, key, parser);
}

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value === "string") return value;
  throw new Error(
    `Document row field "${key}" value "${
      String(value)
    }" is invalid; expected text.`,
  );
}

function optionalText(
  row: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = row[key];
  if (value === null || value === undefined) return undefined;
  return text(row, key);
}

function positiveNumber(
  row: Record<string, unknown>,
  key: string,
  allowZero = false,
): number {
  const value = typeof row[key] === "string" ? Number(row[key]) : row[key];
  if (
    typeof value === "number" && Number.isSafeInteger(value) &&
    (allowZero ? value >= 0 : value > 0)
  ) return value;
  throw new Error(
    `Document row field "${key}" value "${
      String(row[key])
    }" is invalid; expected a safe integer.`,
  );
}

function date(row: Record<string, unknown>, key: string): Date {
  const value = row[key] instanceof Date
    ? row[key]
    : new Date(String(row[key]));
  if (!Number.isNaN(value.getTime())) return value;
  throw new Error(
    `Document row field "${key}" value "${
      String(row[key])
    }" is invalid; expected a timestamp.`,
  );
}

function optionalDate(
  row: Record<string, unknown>,
  key: string,
): Date | undefined {
  if (row[key] === null || row[key] === undefined) return undefined;
  return date(row, key);
}

function classification(
  row: Record<string, unknown>,
  key: string,
): DocumentClassification {
  const value = text(row, key);
  if (["legal", "financial", "tax", "operational", "other"].includes(value)) {
    return value as DocumentClassification;
  }
  throw new Error(
    `Document row field "${key}" value "${value}" is invalid; expected a supported classification.`,
  );
}

function processingState(
  row: Record<string, unknown>,
  key: string,
): ProcessingState {
  const value = text(row, key);
  if (
    [
      "queued",
      "running",
      "succeeded",
      "failed",
      "retry_scheduled",
      "cancelled",
      "timed_out",
      "dead_lettered",
    ].includes(value)
  ) return value as ProcessingState;
  throw new Error(
    `Processing row field "${key}" value "${value}" is invalid; expected a durable processing state.`,
  );
}

function capabilities(
  value: unknown,
  provider: ReturnType<typeof createProviderMarker>,
): ProviderCapabilities | undefined {
  if (value === null || value === undefined) return undefined;
  if (!isRecord(value) || !Array.isArray(value.capabilities)) {
    throw new Error(
      `Provider capabilities "${
        String(value)
      }" are invalid; expected an object with a capability array.`,
    );
  }
  return {
    provider,
    capabilities: value.capabilities as ProviderCapabilities["capabilities"],
    discoveredAt: value.discoveredAt === undefined
      ? undefined
      : new Date(String(value.discoveredAt)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
