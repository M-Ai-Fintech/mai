import {
  type IntegrationAdapter,
  type IntegrationEnvironment,
  type IntegrationProvider,
  type IntegrationResult,
  type IntegrationScope,
  parseIntegrationScope,
} from "./contracts.ts";
import type { ProviderConfiguration } from "./configuration.ts";
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
  const bindingFailure = validateBinding(input);
  if (bindingFailure !== undefined) {
    return blocked(input, "invalid", bindingFailure);
  }
  if (input.mode === "fixture") return await selectFixture(input);
  return await selectConfigured(input);
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
  request: (
    adapter: IntegrationAdapter,
  ) => Promise<TResult | IntegrationResult<TResult>>,
): Promise<IntegrationResult<TResult>> {
  if (selection.kind === "blocked") {
    return { ok: false, failure: selection.failure };
  }
  try {
    const value = await request(selection.adapter);
    return isIntegrationResult(value) ? value : { ok: true, value };
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

async function selectConfigured(
  input: ProviderSelectionRequest,
): Promise<ProviderSelectionResult> {
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
  const factory = input.factories.papermark;
  if (factory === undefined) {
    return blocked(input, "unconfigured", failure(input, "NOT_CONFIGURED"));
  }
  const adapter = await constructAdapter(input, factory, configuration);
  if (!adapter.ok) return blocked(input, "unavailable", adapter.failure);
  const identity = validateAdapter(adapter.value, input, "configured");
  if (identity !== undefined) return blocked(input, "invalid", identity);
  return Object.freeze({
    kind: "configured",
    status: "selected",
    source: "provider",
    synthetic: false,
    readiness: "not-claimed",
    provider: input.provider,
    environment: configuration.environment,
    scope: input.scope,
    connectorAccountId: input.connectorAccountId,
    providerWorkspaceId: input.providerWorkspaceId,
    adapter: adapter.value,
  });
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
      !sameScope(adapter.scope, input.scope)
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

function sameScope(left: IntegrationScope, right: IntegrationScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
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
    configuration.secretRef !== undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIntegrationResult<TResult>(
  value: TResult | IntegrationResult<TResult>,
): value is IntegrationResult<TResult> {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { readonly ok?: unknown };
  return typeof candidate.ok === "boolean";
}
