import {
  INTEGRATION_PROVIDERS,
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
import { freezeSelectedAdapter } from "./selected_adapter.ts";

export type ProviderSelectionMode = "configured" | "fixture";

export interface ProviderSelectionFactoryContext {
  readonly provider: IntegrationProvider;
  readonly configuration?: ProviderConfiguration;
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerResourceId: string;
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
  readonly providerResourceId: string;
  readonly providerAccountId?: string;
  readonly providerTeamId?: string;
  readonly dataRoomId?: string;
  readonly dataRoomFolderId?: string;
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
  readonly providerResourceId: string;
  readonly providerAccountId?: string;
  readonly providerTeamId?: string;
  readonly providerFolderId?: string;
  readonly dataRoomId?: string;
  readonly dataRoomFolderId?: string;
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
  readonly providerResourceId: string;
  readonly adapter: IntegrationAdapter;
}

export interface BlockedProviderSelection {
  readonly kind: "blocked";
  readonly status: "blocked";
  readonly provider: IntegrationProvider;
  readonly reason: ProviderSelectionBlockedReason;
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerResourceId: string;
  readonly failure: ReturnType<typeof createNormalizedIntegrationFailure>;
}

export type ProviderSelectionResult =
  | ConfiguredProviderSelection
  | FixtureProviderSelection
  | BlockedProviderSelection;

/**
 * Selects one explicitly requested provider path without fixture fallback.
 *
 * @example await selectProvider({ mode: "fixture", provider: "fixture", scope, connectorAccountId: "connector_fixture", providerResourceId: "room_fixture", factories: { fixture: () => fixtureAdapter } })
 */
export async function selectProvider(
  input: ProviderSelectionRequest,
): Promise<ProviderSelectionResult> {
  const canonical = canonicalizeRequest(input);
  if (!canonical.ok) return canonical.result;
  const request = canonical.request;
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
  const selectedAdapter = freezeSelectedAdapter(adapter.value);
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
    providerResourceId: input.providerResourceId,
    adapter: selectedAdapter,
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

function canonicalizeRequest(
  input: ProviderSelectionRequest,
):
  | { readonly ok: true; readonly request: ProviderSelectionRequest }
  | { readonly ok: false; readonly result: BlockedProviderSelection } {
  try {
    const raw = asRecord(input);
    const mode = parseMode(raw.mode);
    const provider = parseProvider(raw.provider);
    const scope = freezeScope(parseIntegrationScope(raw.scope));
    const connectorAccountId = parseBinding(
      raw.connectorAccountId,
      "connector account",
    );
    const providerResourceId = parseBinding(
      raw.providerResourceId,
      "provider resource",
    );
    const configuration = raw.configuration === undefined
      ? undefined
      : parseProviderConfiguration(raw.configuration);
    const factories = freezeFactories(raw.factories);
    return {
      ok: true,
      request: Object.freeze({
        mode,
        provider,
        scope,
        connectorAccountId,
        providerResourceId,
        ...(configuration === undefined ? {} : { configuration }),
        factories,
      }),
    };
  } catch {
    const fallback = fallbackRequest(input);
    return {
      ok: false,
      result: blocked(
        fallback,
        "invalid",
        failure(fallback, "INVALID_REQUEST"),
      ),
    };
  }
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
    const context = Object.freeze({
      provider: input.provider,
      ...(configuration === undefined ? {} : { configuration }),
      scope: input.scope,
      connectorAccountId: input.connectorAccountId,
      providerResourceId: input.providerResourceId,
    });
    const value = await factory(context);
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
      adapter.providerResourceId !== input.providerResourceId
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
    providerResourceId: input.providerResourceId,
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
  return typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/.test(value) &&
    !/^(?:sk|pk|rk|ghp|gho|ghs|glpat|xox[abp]|AIza|AKIA|ya29|eyJ)/i.test(
      value,
    ) && !(value.length >= 32 && /[A-Z]/.test(value) && /[a-z]/.test(value) &&
      /[0-9]/.test(value));
}

function parseMode(value: unknown): ProviderSelectionMode {
  if (value === "configured" || value === "fixture") return value;
  throw new Error(
    "Provider selection mode is invalid; expected configured or fixture; value=<redacted>.",
  );
}

function parseProvider(value: unknown): IntegrationProvider {
  if (INTEGRATION_PROVIDERS.includes(value as IntegrationProvider)) {
    return value as IntegrationProvider;
  }
  throw new Error(
    "Provider selection provider is invalid; expected a registered provider; value=<redacted>.",
  );
}

function parseBinding(value: unknown, label: string): string {
  if (typeof value === "string" && safeBindingText(value)) return value;
  throw new Error(
    `${label} binding is invalid; expected a bounded safe identifier; value=<redacted>.`,
  );
}

function freezeScope(scope: IntegrationScope): IntegrationScope {
  return Object.freeze({
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
  });
}

function freezeFactories(value: unknown): ProviderSelectionFactories {
  if (!isRecord(value)) {
    throw new Error(
      "Provider selection factories are invalid; expected factory functions; value=<redacted>.",
    );
  }
  const factories: Record<string, ProviderSelectionFactory> = {};
  for (const key of ["papermark", "ideals", "intralinks", "fixture"]) {
    const factory = value[key];
    if (factory === undefined) continue;
    if (typeof factory !== "function") {
      throw new Error(
        "Provider selection factory is invalid; expected a function; value=<redacted>.",
      );
    }
    factories[key] = factory as ProviderSelectionFactory;
  }
  return Object.freeze(factories) as ProviderSelectionFactories;
}

function fallbackRequest(value: unknown): ProviderSelectionRequest {
  const source = isRecord(value) ? value : {};
  const rawProvider = readField(source, "provider");
  const provider = INTEGRATION_PROVIDERS.includes(
      rawProvider as IntegrationProvider,
    )
    ? rawProvider as IntegrationProvider
    : "papermark";
  const scope = fallbackScope(readField(source, "scope"));
  const rawConnector = readField(source, "connectorAccountId");
  const connectorAccountId = safeBindingText(rawConnector as string)
    ? rawConnector as string
    : "invalid-connector";
  const rawResource = readField(source, "providerResourceId");
  const providerResourceId = safeBindingText(rawResource as string)
    ? rawResource as string
    : "invalid-resource";
  const rawMode = readField(source, "mode");
  return Object.freeze({
    mode: rawMode === "fixture" ? "fixture" : "configured",
    provider,
    scope,
    connectorAccountId,
    providerResourceId,
    factories: Object.freeze({}),
  });
}

function fallbackScope(value: unknown): IntegrationScope {
  try {
    return freezeScope(parseIntegrationScope(value));
  } catch {
    return Object.freeze({
      tenantId: "tenant_invalid" as IntegrationScope["tenantId"],
      workspaceId: "workspace_invalid" as IntegrationScope["workspaceId"],
      dealId: "deal_invalid" as IntegrationScope["dealId"],
    });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  throw new Error(
    "Provider selection request is invalid; expected an object; value=<redacted>.",
  );
}

function readField(
  source: Record<string, unknown>,
  key: string,
): unknown {
  try {
    return source[key];
  } catch {
    return undefined;
  }
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
