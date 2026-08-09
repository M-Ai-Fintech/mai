import {
  type IntegrationAdapter,
  type IntegrationEnvironment,
  type IntegrationProvider,
  type IntegrationResult,
  type IntegrationScope,
  parseIntegrationScope,
  sameIntegrationScope,
} from "./contracts.ts";
import {
  assertPapermarkEndpointForEnvironment,
  parseOwnerApprovedActivation,
  parseProviderConfiguration,
  type ProviderConfiguration,
} from "./configuration.ts";
import {
  createNormalizedIntegrationFailure,
  normalizeIntegrationFailure,
} from "./failures.ts";

export type ProviderSelectionMode = "configured" | "fixture";

export interface ProviderSelectionFactoryContext {
  readonly provider: IntegrationProvider;
  readonly configuration?: ProviderConfiguration;
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;
}

export type ProviderSelectionFactory = (
  context: ProviderSelectionFactoryContext,
) => IntegrationAdapter | Promise<IntegrationAdapter>;

export interface ProviderSelectionFactories {
  readonly papermark?: ProviderSelectionFactory;
  readonly ideals?: ProviderSelectionFactory;
  readonly intralinks?: ProviderSelectionFactory;
  readonly fixture?: ProviderSelectionFactory;
}

export interface ProviderSelectionRequest {
  readonly mode: ProviderSelectionMode;
  readonly provider: IntegrationProvider;
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;
  readonly configuration?: ProviderConfiguration;
  readonly factories: ProviderSelectionFactories;
}

export type ProviderSelectionBlockedReason =
  | "disabled"
  | "deferred"
  | "unconfigured"
  | "unavailable"
  | "unauthorized"
  | "invalid";

export interface ConfiguredProviderSelection {
  readonly kind: "configured";
  readonly status: "selected";
  readonly source: "provider";
  readonly synthetic: false;
  readonly readiness: "not-claimed";
  readonly provider: Exclude<IntegrationProvider, "fixture">;
  readonly environment: IntegrationEnvironment;
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;
  readonly adapter: IntegrationAdapter;
}

export interface FixtureProviderSelection {
  readonly kind: "fixture";
  readonly status: "selected";
  readonly source: "fixture";
  readonly synthetic: true;
  readonly readiness: "fixture-only";
  readonly provider: "fixture";
  readonly environment: "fixture";
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;
  readonly adapter: IntegrationAdapter;
}

export interface BlockedProviderSelection {
  readonly kind: "blocked";
  readonly status: "blocked";
  readonly provider: IntegrationProvider;
  readonly reason: ProviderSelectionBlockedReason;
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;
  readonly failure: ReturnType<typeof createNormalizedIntegrationFailure>;
}

export type ProviderSelectionResult =
  | ConfiguredProviderSelection
  | FixtureProviderSelection
  | BlockedProviderSelection;

/**
 * Selects one explicitly requested provider path without fixture fallback.
 *
 * @example await selectProvider({ mode: "fixture", provider: "fixture", scope, connectorAccountId: "connector_fixture", providerWorkspaceId: "room_fixture", factories: { fixture: () => fixtureAdapter } })
 */
export async function selectProvider(
  input: ProviderSelectionRequest,
): Promise<ProviderSelectionResult> {
  const canonical = canonicalizeConfiguration(input);
  if (!canonical.ok) return canonical.result;
  const request = canonical.configuration === undefined
    ? input
    : canonicalRequest(input, canonical.configuration);
  const bindingFailure = validateBinding(request);
  if (bindingFailure !== undefined) {
    return blocked(request, "invalid", bindingFailure);
  }
  if (request.mode === "fixture") return await selectFixture(request);
  return await selectConfigured(request);
}

/**
 * Names the provider-selection seam explicitly for composition callers.
 *
 * @example const selected = await selectIntegrationProvider(request)
 */
export async function selectIntegrationProvider(
  input: ProviderSelectionRequest,
): Promise<ProviderSelectionResult> {
  return await selectProvider(input);
}

/**
 * Runs one selected adapter operation and normalizes failure without reselection.
 *
 * @example await executeSelectedOperation(selection, "list_documents", adapter => adapter.documents.listDocuments(request))
 */
export async function executeSelectedOperation<TResult>(
  selection: ProviderSelectionResult,
  operation: string,
  request: (adapter: IntegrationAdapter) => Promise<IntegrationResult<TResult>>,
): Promise<IntegrationResult<TResult>> {
  if (selection.kind === "blocked") {
    return { ok: false, failure: selection.failure };
  }
  try {
    return await request(selection.adapter);
  } catch (error: unknown) {
    return {
      ok: false,
      failure: normalizeIntegrationFailure({
        provider: selection.provider,
        operation,
        error,
      }),
    };
  }
}

async function selectFixture(
  input: ProviderSelectionRequest,
): Promise<ProviderSelectionResult> {
  if (input.provider !== "fixture") {
    return blocked(input, "invalid", failure(input, "INVALID_REQUEST"));
  }
  if (input.configuration !== undefined) {
    return blocked(input, "invalid", failure(input, "INVALID_REQUEST"));
  }
  const factory = input.factories.fixture;
  if (factory === undefined) {
    return blocked(input, "unconfigured", failure(input, "NOT_CONFIGURED"));
  }
  const adapter = await constructAdapter(input, factory);
  if (!adapter.ok) return blocked(input, "unavailable", adapter.failure);
  const identity = validateAdapter(adapter.value, input, "fixture");
  if (identity !== undefined) return blocked(input, "invalid", identity);
  return Object.freeze({
    kind: "fixture",
    status: "selected",
    source: "fixture",
    synthetic: true,
    readiness: "fixture-only",
    provider: "fixture",
    environment: "fixture",
    scope: input.scope,
    connectorAccountId: input.connectorAccountId,
    providerWorkspaceId: input.providerWorkspaceId,
    adapter: adapter.value,
  });
}

function selectConfigured(
  input: ProviderSelectionRequest,
): ProviderSelectionResult {
  if (input.provider === "fixture") {
    return blocked(input, "invalid", failure(input, "INVALID_REQUEST"));
  }
  if (input.provider === "ideals" || input.provider === "intralinks") {
    return blocked(input, "deferred", failure(input, "DEFERRED"));
  }
  const configuration = input.configuration;
  if (configuration === undefined) {
    return blocked(input, "unconfigured", failure(input, "NOT_CONFIGURED"));
  }
  if (configuration.provider !== input.provider) {
    return blocked(input, "invalid", failure(input, "INVALID_REQUEST"));
  }
  if (configuration.lifecycle === "disabled") {
    return blocked(input, "disabled", failure(input, "DISABLED"));
  }
  if (configuration.lifecycle === "deferred") {
    return blocked(input, "deferred", failure(input, "DEFERRED"));
  }
  if (!validPapermarkEnvironment(configuration)) {
    return blocked(input, "invalid", failure(input, "INVALID_REQUEST"));
  }
  // Activation metadata is descriptive only. Future coordinator composition
  // must supply claim-bound authority before this seam can construct a real adapter.
  return blocked(input, "unauthorized", failure(input, "AUTHORIZATION_DENIED"));
}

function canonicalizeConfiguration(
  input: ProviderSelectionRequest,
):
  | { readonly ok: true; readonly configuration?: ProviderConfiguration }
  | { readonly ok: false; readonly result: BlockedProviderSelection } {
  if (input.configuration === undefined) {
    return { ok: true };
  }
  try {
    return {
      ok: true,
      configuration: parseProviderConfiguration(input.configuration),
    };
  } catch {
    return {
      ok: false,
      result: blocked(input, "invalid", failure(input, "INVALID_REQUEST")),
    };
  }
}

function canonicalRequest(
  input: ProviderSelectionRequest,
  configuration: ProviderConfiguration,
): ProviderSelectionRequest {
  return {
    mode: input.mode,
    provider: input.provider,
    scope: input.scope,
    connectorAccountId: input.connectorAccountId,
    providerWorkspaceId: input.providerWorkspaceId,
    configuration,
    factories: input.factories,
  };
}

async function constructAdapter(
  input: ProviderSelectionRequest,
  factory: ProviderSelectionFactory,
  configuration = input.configuration,
): Promise<
  | { readonly ok: true; readonly value: IntegrationAdapter }
  | {
    readonly ok: false;
    readonly failure: ReturnType<typeof createNormalizedIntegrationFailure>;
  }
> {
  try {
    const value = await factory({
      provider: input.provider,
      ...(configuration === undefined ? {} : { configuration }),
      scope: input.scope,
      connectorAccountId: input.connectorAccountId,
      providerWorkspaceId: input.providerWorkspaceId,
    });
    return { ok: true, value };
  } catch (error: unknown) {
    return {
      ok: false,
      failure: normalizeIntegrationFailure({
        provider: input.provider,
        operation: "construct_adapter",
        error,
      }),
    };
  }
}

function validateBinding(
  input: ProviderSelectionRequest,
): ReturnType<typeof createNormalizedIntegrationFailure> | undefined {
  try {
    parseIntegrationScope(input.scope);
  } catch {
    return failure(input, "INVALID_REQUEST");
  }
  if (!safeBindingText(input.connectorAccountId)) {
    return failure(input, "INVALID_REQUEST");
  }
  if (!safeBindingText(input.providerWorkspaceId)) {
    return failure(input, "INVALID_REQUEST");
  }
  return undefined;
}

function validateAdapter(
  adapter: IntegrationAdapter,
  input: ProviderSelectionRequest,
  mode: ProviderSelectionMode,
): ReturnType<typeof createNormalizedIntegrationFailure> | undefined {
  if (!isRecord(adapter)) return failure(input, "INVALID_REQUEST");
  const expectedProvider = mode === "fixture" ? "fixture" : input.provider;
  const expectedEnvironment = mode === "fixture"
    ? "fixture"
    : input.configuration?.environment;
  try {
    if (
      adapter.provider !== expectedProvider ||
      adapter.environment !== expectedEnvironment ||
      adapter.lifecycle !== "enabled" ||
      !sameIntegrationScope(adapter.scope, input.scope) ||
      adapter.connectorAccountId !== input.connectorAccountId ||
      adapter.providerWorkspaceId !== input.providerWorkspaceId
    ) return failure(input, "INVALID_REQUEST");
  } catch {
    return failure(input, "INVALID_REQUEST");
  }
  return undefined;
}

function blocked(
  input: ProviderSelectionRequest,
  reason: ProviderSelectionBlockedReason,
  normalized: ReturnType<typeof createNormalizedIntegrationFailure>,
): BlockedProviderSelection {
  return Object.freeze({
    kind: "blocked",
    status: "blocked",
    provider: input.provider,
    reason,
    scope: input.scope,
    connectorAccountId: input.connectorAccountId,
    providerWorkspaceId: input.providerWorkspaceId,
    failure: normalized,
  });
}

function failure(
  input: ProviderSelectionRequest,
  code: Parameters<typeof createNormalizedIntegrationFailure>[0]["code"],
): ReturnType<typeof createNormalizedIntegrationFailure> {
  return createNormalizedIntegrationFailure({
    provider: input.provider,
    operation: "select_provider",
    code,
  });
}

function safeBindingText(value: string): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 255 &&
    value.trim() === value && !/[\r\n]/.test(value);
}

function validPapermarkEnvironment(
  configuration: ProviderConfiguration,
): boolean {
  return (configuration.environment === "local-development" ||
    configuration.environment === "sandbox-certification") &&
    configuration.endpoint !== undefined &&
    configuration.secretRef !== undefined &&
    configuration.activation !== undefined &&
    hasApprovedPapermarkMetadata(configuration);
}

function hasApprovedPapermarkMetadata(
  configuration: ProviderConfiguration,
): boolean {
  try {
    parseOwnerApprovedActivation(configuration.activation);
    assertPapermarkEndpointForEnvironment(
      configuration.endpoint!,
      configuration.environment,
    );
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
