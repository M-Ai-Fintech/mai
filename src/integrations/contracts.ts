import {
  type DealId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
  type TenantId,
  type WorkspaceId,
} from "../platform/api/v1.ts";

export const INTEGRATION_PROVIDERS = [
  "papermark",
  "ideals",
  "intralinks",
  "fixture",
] as const;

export type IntegrationProvider = typeof INTEGRATION_PROVIDERS[number];
export type RealIntegrationProvider = Exclude<
  IntegrationProvider,
  "fixture"
>;

export const INTEGRATION_ENVIRONMENTS = [
  "interface-only",
  "fixture",
  "local-development",
  "sandbox-certification",
  "production-candidate",
  "production-verified",
] as const;

export type IntegrationEnvironment = typeof INTEGRATION_ENVIRONMENTS[number];

export const PROVIDER_LIFECYCLES = [
  "enabled",
  "disabled",
  "deferred",
] as const;

export type ProviderLifecycle = typeof PROVIDER_LIFECYCLES[number];

export interface IntegrationScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}

export interface ProviderDocument {
  /** Papermark's dataroom membership row identity, when exposed. */
  readonly providerDataRoomDocumentId?: string;
  readonly providerDocumentId: string;
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes?: number;
  readonly providerFolderId?: string;
  readonly providerVersion?: string;
}

export interface ProviderDocumentPage {
  readonly documents: readonly ProviderDocument[];
  readonly nextCursor?: string;
  readonly providerVersion?: string;
}

export type IntegrationByteSource =
  | Uint8Array
  | AsyncIterable<Uint8Array>
  | ReadableStream<Uint8Array>;

export interface ListDocumentsRequest {
  readonly scope: IntegrationScope;
  readonly providerResourceId: string;
  readonly cursor?: string;
}

export interface DownloadDocumentRequest {
  readonly scope: IntegrationScope;
  readonly providerResourceId: string;
  readonly providerDocumentId: string;
}

export const INTEGRATION_FAILURE_CODES = [
  "AUTHENTICATION_FAILED",
  "AUTHORIZATION_DENIED",
  "NOT_CONFIGURED",
  "DISABLED",
  "DEFERRED",
  "INVALID_REQUEST",
  "MALFORMED_RESPONSE",
  "NOT_FOUND",
  "TIMEOUT",
  "RATE_LIMITED",
  "UNAVAILABLE",
  "RETRY_EXHAUSTED",
  "UNKNOWN",
] as const;

export type IntegrationFailureCode = typeof INTEGRATION_FAILURE_CODES[number];

export interface NormalizedIntegrationFailure {
  readonly code: IntegrationFailureCode;
  readonly provider: IntegrationProvider;
  readonly operation: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly occurredAt: Date;
  readonly providerRequestId?: string;
  readonly providerStatus?: number;
}

export type IntegrationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: NormalizedIntegrationFailure };

export interface ScopedDocumentPort {
  listDocuments(
    request: ListDocumentsRequest,
  ): Promise<IntegrationResult<ProviderDocumentPage>>;
  downloadDocument(
    request: DownloadDocumentRequest,
  ): Promise<IntegrationResult<IntegrationByteSource>>;
}

export interface IntegrationAdapter {
  readonly provider: IntegrationProvider;
  readonly environment: IntegrationEnvironment;
  readonly lifecycle: ProviderLifecycle;
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerResourceId: string;
  readonly providerAccountId?: string;
  readonly providerTeamId?: string;
  readonly providerFolderId?: string;
  readonly documents: ScopedDocumentPort;
  discoverCapabilities(): Promise<CapabilitySnapshot>;
  checkHealth(): Promise<HealthSnapshot>;
}

export type SecretManager = "environment" | "local-secret-store" | "vault";

export interface SecretReference {
  readonly manager: SecretManager;
  readonly name: string;
  readonly version?: string;
}

declare const runtimeSecretBrand: unique symbol;

export type RuntimeSecret = string & {
  readonly [runtimeSecretBrand]: "RuntimeSecret";
};

export interface SecretResolver {
  resolve(
    reference: SecretReference,
    signal?: AbortSignal,
  ): Promise<RuntimeSecret>;
}

export type IntegrationCapability =
  | "list_documents"
  | "download_document"
  | "upload_document"
  | "list_folders"
  | "create_folder"
  | "delete_document"
  | "permissions"
  | "pagination"
  | "room_lifecycle"
  | "folder_lifecycle"
  | "document_lifecycle";

export const INTEGRATION_CAPABILITIES: readonly IntegrationCapability[] = [
  "list_documents",
  "download_document",
  "upload_document",
  "list_folders",
  "create_folder",
  "delete_document",
  "permissions",
  "pagination",
  "room_lifecycle",
  "folder_lifecycle",
  "document_lifecycle",
];

export const CAPABILITY_STATUSES = [
  "supported",
  "denied",
  "unavailable",
] as const;

export type CapabilityStatus = typeof CAPABILITY_STATUSES[number];

export type CapabilityObservationSource =
  | "provider"
  | "implementation"
  | "fixture";

export interface CapabilityObservation {
  readonly capability: IntegrationCapability;
  readonly status: CapabilityStatus;
  readonly reasonCode?: IntegrationFailureCode;
}

export interface CapabilitySnapshot {
  readonly provider: IntegrationProvider;
  readonly environment: IntegrationEnvironment;
  readonly lifecycle: ProviderLifecycle;
  readonly configured: boolean;
  readonly source: CapabilityObservationSource;
  readonly scope: IntegrationScope;
  readonly requested: readonly IntegrationCapability[];
  readonly observations: readonly CapabilityObservation[];
  readonly observedAt: Date;
}

export interface CapabilitySnapshotInput {
  readonly provider: IntegrationProvider;
  readonly environment: IntegrationEnvironment;
  readonly lifecycle: ProviderLifecycle;
  readonly configured: boolean;
  readonly source: CapabilityObservationSource;
  readonly scope: IntegrationScope;
  readonly requested: readonly IntegrationCapability[];
  readonly observations: readonly CapabilityObservation[];
  readonly observedAt: Date;
}

export const HEALTH_CHECK_STATES = [
  "passed",
  "failed",
  "unavailable",
  "skipped",
] as const;

export type HealthCheckState = typeof HEALTH_CHECK_STATES[number];

export interface HealthCheck {
  readonly name: string;
  readonly state: HealthCheckState;
}

export type HealthState =
  | "healthy"
  | "degraded"
  | "unavailable"
  | "disabled"
  | "deferred";

export interface HealthSnapshotInput {
  readonly provider: IntegrationProvider;
  readonly environment: IntegrationEnvironment;
  readonly lifecycle: ProviderLifecycle;
  readonly configured: boolean;
  readonly scope: IntegrationScope;
  readonly checks: readonly HealthCheck[];
  readonly observedAt: Date;
}

export interface HealthSnapshot extends Omit<HealthSnapshotInput, "checks"> {
  readonly state: HealthState;
  readonly checks: readonly HealthCheck[];
}

/**
 * Parses and validates a complete integration scope.
 *
 * @example parseIntegrationScope({ tenantId: "tenant_acme", workspaceId: "workspace_room", dealId: "deal_horizon" })
 */
export function parseIntegrationScope(value: unknown): IntegrationScope {
  if (!isRecord(value)) {
    throw new Error(
      "Integration scope is invalid; expected tenant, workspace, and deal identifiers; value=<redacted>.",
    );
  }
  return {
    tenantId: requiredIdentifier(value.tenantId, parseTenantId, "tenant"),
    workspaceId: requiredIdentifier(
      value.workspaceId,
      parseWorkspaceId,
      "workspace",
    ),
    dealId: requiredIdentifier(value.dealId, parseDealId, "deal"),
  };
}

/**
 * Compares the complete tenant, workspace, and deal scope exactly.
 *
 * @example sameIntegrationScope(leftScope, rightScope)
 */
export function sameIntegrationScope(
  left: IntegrationScope,
  right: IntegrationScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId &&
    left.dealId === right.dealId;
}

export {
  createCapabilitySnapshot,
  createHealthSnapshot,
} from "./snapshot_contracts.ts";

function requiredIdentifier<T>(
  value: unknown,
  parser: (value: unknown) =>
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false },
  label: string,
): T {
  const parsed = parser(value);
  if (parsed.ok) return parsed.value;
  throw new Error(
    `Integration ${label} ID is invalid; expected a canonical ${label}_ identifier; value=<redacted>.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
