import type { ConnectorAccountId, DocumentSourceId } from "./ids.ts";
import { assertDocumentScope, type DocumentScope } from "./model.ts";

const providerMarkerBrand: unique symbol = Symbol("provider-marker");

export type ProviderMarker = string & {
  readonly [providerMarkerBrand]: "ProviderMarker";
};

export type ProviderCapability =
  | "list_documents"
  | "download_document"
  | "upload_document"
  | "event_delivery";

export interface ProviderCapabilities {
  readonly provider: ProviderMarker;
  readonly capabilities: readonly ProviderCapability[];
  readonly discoveredAt?: Date;
}

export type NormalizedProviderErrorCode =
  | "AUTHENTICATION_FAILED"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "INVALID_REQUEST"
  | "INVALID_PROVIDER_METADATA"
  | "UNAVAILABLE"
  | "UNKNOWN";

export interface NormalizedProviderError {
  readonly code: NormalizedProviderErrorCode;
  readonly provider: ProviderMarker;
  readonly operation: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly providerRequestId?: string;
}

export interface ConnectorAccountReference {
  readonly connectorAccountId: ConnectorAccountId;
  readonly tenantId: DocumentScope["tenantId"];
  readonly provider: ProviderMarker;
}

export interface DocumentSource {
  readonly sourceId: DocumentSourceId;
  readonly scope: DocumentScope;
  readonly connectorAccount: ConnectorAccountReference;
  readonly provider: ProviderMarker;
  readonly providerWorkspaceId?: string;
  readonly providerDocumentId?: string;
  readonly providerFolderId?: string;
  readonly providerVersion?: string;
  readonly cursor?: string;
  readonly aggregateVersion: number;
  readonly capabilities?: ProviderCapabilities;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DocumentSourceInput extends DocumentSource {}

export function createProviderMarker(value: string): ProviderMarker {
  if (/^[a-z][a-z0-9_-]{1,63}$/.test(value)) return value as ProviderMarker;
  throw new Error(
    `Provider marker "${value}" is invalid; expected 2-64 lowercase provider characters.`,
  );
}

export function createProviderCapabilities(
  input: ProviderCapabilities,
): ProviderCapabilities {
  assertProviderCapabilities(input);
  return Object.freeze({
    ...input,
    capabilities: Object.freeze([...input.capabilities]),
  });
}

export function createDocumentSource(
  input: DocumentSourceInput,
): DocumentSource {
  assertText(input.sourceId, "Document source ID", 96);
  assertDocumentScope(input.scope, input.scope);
  assertText(
    input.connectorAccount.connectorAccountId,
    "Connector account ID",
    96,
  );
  if (input.connectorAccount.tenantId !== input.scope.tenantId) {
    throw new Error(
      `Connector account tenant "${input.connectorAccount.tenantId}" does not match source tenant "${input.scope.tenantId}".`,
    );
  }
  assertProvider(input.provider);
  if (input.connectorAccount.provider !== input.provider) {
    throw new Error(
      `Connector account provider "${input.connectorAccount.provider}" does not match source provider "${input.provider}".`,
    );
  }
  assertOptionalText(input.providerWorkspaceId, "Provider workspace ID", 255);
  assertOptionalText(input.providerDocumentId, "Provider document ID", 255);
  assertOptionalText(input.providerFolderId, "Provider folder ID", 255);
  assertOptionalText(input.providerVersion, "Provider version", 255);
  assertOptionalText(input.cursor, "Document source cursor", 2048);
  if (
    !Number.isSafeInteger(input.aggregateVersion) || input.aggregateVersion < 1
  ) {
    throw new Error(
      `Document source aggregate version "${input.aggregateVersion}" is invalid; expected a positive safe integer.`,
    );
  }
  assertDate(input.createdAt, "Document source created timestamp");
  assertDate(input.updatedAt, "Document source updated timestamp");
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    connectorAccount: Object.freeze({ ...input.connectorAccount }),
    capabilities: input.capabilities === undefined ? undefined : Object.freeze({
      ...input.capabilities,
      capabilities: Object.freeze([...input.capabilities.capabilities]),
    }),
  });
}

export function assertProviderCapabilities(
  capabilities: ProviderCapabilities,
): void {
  assertProvider(capabilities.provider);
  if (capabilities.capabilities.length === 0) {
    throw new Error(
      `Provider "${capabilities.provider}" capabilities are empty; expected an explicit capability list.`,
    );
  }
  if (capabilities.discoveredAt !== undefined) {
    assertDate(
      capabilities.discoveredAt,
      "Provider capability discovery timestamp",
    );
  }
}

export function normalizedProviderError(
  input: NormalizedProviderError,
): NormalizedProviderError {
  assertProvider(input.provider);
  assertText(input.operation, "Provider operation", 128);
  assertText(input.message, "Provider error message", 512);
  assertOptionalText(input.providerRequestId, "Provider request ID", 255);
  return Object.freeze({ ...input });
}

function assertProvider(provider: ProviderMarker): void {
  if (/^[a-z][a-z0-9_-]{1,63}$/.test(provider)) return;
  throw new Error(
    `Provider marker "${provider}" is invalid; expected a normalized provider marker.`,
  );
}

function assertOptionalText(
  value: string | undefined,
  label: string,
  maximum: number,
): void {
  if (value === undefined) return;
  assertText(value, label, maximum);
}

function assertText(value: string, label: string, maximum: number): void {
  if (typeof value === "string" && value.trim() && value.length <= maximum) {
    return;
  }
  throw new Error(
    `${label} "${value}" is invalid; expected 1-${maximum} characters.`,
  );
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `${label} "${
      String(value)
    }" is invalid; expected a valid Date supplied by the caller.`,
  );
}
