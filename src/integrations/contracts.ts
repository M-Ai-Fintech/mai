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

export type ProviderLifecycle = "enabled" | "disabled" | "deferred";

export interface IntegrationScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}

export interface ProviderDocument {
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
  readonly providerWorkspaceId: string;
  readonly cursor?: string;
}

export interface DownloadDocumentRequest {
  readonly scope: IntegrationScope;
  readonly providerWorkspaceId: string;
  readonly providerDocumentId: string;
}

export type IntegrationFailureCode =
  | "AUTHENTICATION_FAILED"
  | "AUTHORIZATION_DENIED"
  | "NOT_CONFIGURED"
  | "DISABLED"
  | "DEFERRED"
  | "INVALID_REQUEST"
  | "MALFORMED_RESPONSE"
  | "NOT_FOUND"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "RETRY_EXHAUSTED"
  | "UNKNOWN";

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
  readonly providerWorkspaceId: string;
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

export type CapabilityStatus = "supported" | "denied" | "unavailable";

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

export type HealthCheckState =
  | "passed"
  | "failed"
  | "unavailable"
  | "skipped";

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
      `Integration scope "${
        String(value)
      }" is invalid; expected tenant, workspace, and deal identifiers.`,
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
 * Validates and freezes an explicit capability observation set.
 *
 * @example createCapabilitySnapshot({ provider: "fixture", environment: "fixture", lifecycle: "enabled", configured: true, source: "fixture", scope, requested: ["list_documents"], observations: [{ capability: "list_documents", status: "supported" }], observedAt: new Date() })
 */
export function createCapabilitySnapshot(
  input: CapabilitySnapshotInput,
): CapabilitySnapshot {
  assertProvider(input.provider);
  assertEnvironment(input.environment);
  assertScope(input.scope);
  assertDate(input.observedAt, "Capability observation timestamp");
  assertCapabilitySource(input.source, input.environment);
  const requested = uniqueCapabilities(input.requested);
  const observations = validateObservations(input.observations, requested);
  if (
    (input.lifecycle !== "enabled" || !input.configured) &&
    observations.some(({ status }) => status === "supported")
  ) {
    throw new Error(
      `Provider "${input.provider}" capability snapshot must not claim supported capabilities while disabled or unconfigured.`,
    );
  }
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    requested: Object.freeze(requested),
    observations: Object.freeze(observations),
    observedAt: new Date(input.observedAt),
  });
}

/**
 * Derives fail-closed health from lifecycle, configuration, and checks.
 *
 * @example createHealthSnapshot({ provider: "papermark", environment: "local-development", lifecycle: "enabled", configured: true, scope, checks: [{ name: "endpoint", state: "passed" }], observedAt: new Date() })
 */
export function createHealthSnapshot(
  input: HealthSnapshotInput,
): HealthSnapshot {
  assertProvider(input.provider);
  assertEnvironment(input.environment);
  assertScope(input.scope);
  assertDate(input.observedAt, "Health observation timestamp");
  const checks = validateHealthChecks(input.checks);
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    checks: Object.freeze(checks),
    observedAt: new Date(input.observedAt),
    state: deriveHealthState(input.lifecycle, input.configured, checks),
  });
}

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
    `Integration ${label} ID "${
      String(value)
    }" is invalid; expected a canonical ${label}_ identifier.`,
  );
}

function assertScope(scope: IntegrationScope): void {
  parseIntegrationScope(scope);
}

function assertProvider(provider: IntegrationProvider): void {
  if (INTEGRATION_PROVIDERS.includes(provider)) return;
  throw new Error(
    `Integration provider "${
      String(provider)
    }" is invalid; expected a registered provider marker.`,
  );
}

function assertEnvironment(environment: IntegrationEnvironment): void {
  if (INTEGRATION_ENVIRONMENTS.includes(environment)) return;
  throw new Error(
    `Integration environment "${
      String(environment)
    }" is invalid; expected an approved environment state.`,
  );
}

function assertCapabilitySource(
  source: CapabilityObservationSource,
  environment: IntegrationEnvironment,
): void {
  if (source === "fixture" && environment !== "fixture") {
    throw new Error(
      `Fixture capability evidence uses environment "${environment}"; expected fixture environment.`,
    );
  }
  if (source !== "fixture" && environment === "fixture") {
    throw new Error(
      `Capability evidence source "${source}" uses fixture environment; expected a real provider environment.`,
    );
  }
}

function uniqueCapabilities(
  capabilities: readonly IntegrationCapability[],
): IntegrationCapability[] {
  if (capabilities.length === 0) {
    throw new Error(
      "Capability request is empty; expected at least one explicit capability.",
    );
  }
  const unique = new Set<IntegrationCapability>();
  for (const capability of capabilities) {
    assertCapability(capability);
    if (unique.has(capability)) {
      throw new Error(
        `Capability "${capability}" is duplicated; expected one observation per requested capability.`,
      );
    }
    unique.add(capability);
  }
  return [...unique];
}

function validateObservations(
  observations: readonly CapabilityObservation[],
  requested: readonly IntegrationCapability[],
): CapabilityObservation[] {
  const values = observations.map((observation) => ({ ...observation }));
  const observed = new Set<IntegrationCapability>();
  for (const observation of values) {
    assertCapability(observation.capability);
    if (observed.has(observation.capability)) {
      throw new Error(
        `Capability "${observation.capability}" is observed more than once; expected one status.`,
      );
    }
    observed.add(observation.capability);
    if (
      observation.status === "supported" &&
      observation.reasonCode !== undefined
    ) {
      throw new Error(
        `Capability "${observation.capability}" has reason "${observation.reasonCode}"; supported capabilities must not carry a failure reason.`,
      );
    }
    if (
      observation.status !== "supported" &&
      observation.reasonCode === undefined
    ) {
      throw new Error(
        `Capability "${observation.capability}" is ${observation.status}; expected an explicit normalized failure reason.`,
      );
    }
  }
  const missing = requested.filter((capability) => !observed.has(capability));
  if (missing.length > 0) {
    throw new Error(
      `Capability observations omit "${
        missing.join(",")
      }"; expected every requested capability explicitly.`,
    );
  }
  return values;
}

function assertCapability(capability: IntegrationCapability): void {
  if (INTEGRATION_CAPABILITIES.includes(capability)) return;
  throw new Error(
    `Integration capability "${
      String(capability)
    }" is invalid; expected a registered capability.`,
  );
}

function validateHealthChecks(checks: readonly HealthCheck[]): HealthCheck[] {
  if (checks.length === 0) {
    throw new Error(
      "Provider health checks are empty; expected explicit dependency checks.",
    );
  }
  const names = new Set<string>();
  return checks.map((check) => {
    if (!check.name.trim() || check.name.length > 128) {
      throw new Error(
        `Provider health check name "${check.name}" is invalid; expected 1-128 non-whitespace characters.`,
      );
    }
    if (names.has(check.name)) {
      throw new Error(
        `Provider health check "${check.name}" is duplicated; expected one result per check.`,
      );
    }
    names.add(check.name);
    return Object.freeze({ ...check });
  });
}

function deriveHealthState(
  lifecycle: ProviderLifecycle,
  configured: boolean,
  checks: readonly HealthCheck[],
): HealthState {
  if (lifecycle === "disabled") return "disabled";
  if (lifecycle === "deferred") return "deferred";
  if (!configured) return "unavailable";
  if (
    checks.some(({ state }) => state === "unavailable" || state === "skipped")
  ) {
    return "unavailable";
  }
  if (checks.some(({ state }) => state === "failed")) return "degraded";
  return "healthy";
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `${label} "${
      String(value)
    }" is invalid; expected a valid Date supplied by the caller.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
