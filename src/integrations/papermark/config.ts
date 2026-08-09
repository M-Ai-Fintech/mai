import { type IntegrationScope, parseIntegrationScope } from "../contracts.ts";
import {
  parseProviderConfiguration,
  type ProviderConfiguration,
} from "../configuration.ts";
import {
  assertKnownKeys,
  assertRecord,
  rejectInlineCredentialKeys,
} from "../configuration_validation.ts";

const PAPERMARK_PROVIDER = "papermark" as const;
const ADAPTER_CONFIG_KEYS = new Set([
  "configuration",
  "scope",
  "connectorAccount",
  "providerWorkspaceId",
  "folderId",
  "pageSize",
  "timeoutMs",
  "retry",
]);
const CONNECTOR_ACCOUNT_KEYS = new Set(["id", "provider", "tenantId"]);
const SCOPE_KEYS = new Set(["tenantId", "workspaceId", "dealId"]);
const RETRY_POLICY_KEYS = new Set(["maxAttempts", "maxDelayMs"]);

export interface PapermarkConnectorBinding {
  readonly id: string;
  readonly provider: typeof PAPERMARK_PROVIDER;
  readonly tenantId: IntegrationScope["tenantId"];
}

export interface PapermarkScopeBinding {
  readonly scope: IntegrationScope;
  readonly connectorAccount: PapermarkConnectorBinding;
  readonly providerWorkspaceId: string;
  readonly folderId: string;
}

export interface PapermarkRetryPolicy {
  readonly maxAttempts: number;
  readonly maxDelayMs: number;
}

export interface PapermarkAdapterConfig {
  readonly provider: typeof PAPERMARK_PROVIDER;
  readonly configuration: ProviderConfiguration;
  readonly binding: PapermarkScopeBinding;
  readonly pageSize: number;
  readonly timeoutMs: number;
  readonly retry: PapermarkRetryPolicy;
}

export interface PapermarkAdapterConfigInput {
  readonly configuration: ProviderConfiguration;
  readonly scope: IntegrationScope;
  readonly connectorAccount: PapermarkConnectorBinding;
  readonly providerWorkspaceId: string;
  readonly folderId: string;
  readonly pageSize?: number;
  readonly timeoutMs?: number;
  readonly retry?: Partial<PapermarkRetryPolicy>;
}

/**
 * Validates explicit Papermark endpoint, scope, and bounded request settings.
 *
 * @example parsePapermarkAdapterConfig({ configuration, scope, connectorAccount, providerWorkspaceId: "workspace-room", folderId: "folder-1" })
 */
export function parsePapermarkAdapterConfig(
  input: PapermarkAdapterConfigInput,
): PapermarkAdapterConfig {
  const value = parseAdapterConfigInput(input);
  const configuration = parseProviderConfiguration(value.configuration);
  assertEnabledConfiguration(configuration);
  const policy = parseRequestPolicy(value);
  return Object.freeze({
    provider: PAPERMARK_PROVIDER,
    configuration,
    binding: parsePapermarkBinding(value),
    pageSize: policy.pageSize,
    timeoutMs: policy.timeoutMs,
    retry: policy.retry,
  });
}

function parseAdapterConfigInput(
  input: PapermarkAdapterConfigInput,
): Record<string, unknown> {
  const value = input as unknown;
  assertRecord(value, "Papermark adapter configuration");
  rejectInlineCredentialKeys(value);
  assertKnownKeys(
    value,
    ADAPTER_CONFIG_KEYS,
    "Papermark adapter configuration",
  );
  return value;
}

function parsePapermarkBinding(
  value: Record<string, unknown>,
): PapermarkScopeBinding {
  const scope = parsePapermarkScope(value.scope);
  const connectorAccount = parseConnectorAccount(value.connectorAccount, scope);
  const providerWorkspaceId = parseLocator(
    value.providerWorkspaceId,
    "provider workspace ID",
  );
  const folderId = parseLocator(value.folderId, "Papermark folder ID");
  return Object.freeze({
    scope,
    connectorAccount,
    providerWorkspaceId,
    folderId,
  });
}

function parseRequestPolicy(
  value: Record<string, unknown>,
): Pick<PapermarkAdapterConfig, "pageSize" | "timeoutMs" | "retry"> {
  const retry = parseRetryPolicy(value.retry);
  return {
    pageSize: parseBoundedInteger(
      value.pageSize === undefined ? 50 : value.pageSize,
      "page size",
      1,
      100,
    ),
    timeoutMs: parseBoundedInteger(
      value.timeoutMs === undefined ? 10_000 : value.timeoutMs,
      "timeout",
      1,
      120_000,
    ),
    retry: Object.freeze({
      maxAttempts: parseBoundedInteger(
        retry.maxAttempts === undefined ? 3 : retry.maxAttempts,
        "max attempts",
        1,
        4,
      ),
      maxDelayMs: parseBoundedInteger(
        retry.maxDelayMs === undefined ? 2_000 : retry.maxDelayMs,
        "max retry delay",
        0,
        30_000,
      ),
    }),
  };
}

function assertEnabledConfiguration(
  configuration: ProviderConfiguration,
): void {
  if (configuration.provider !== PAPERMARK_PROVIDER) {
    throw new Error(
      `Papermark configuration provider "${
        String(configuration.provider)
      }" is invalid; expected "papermark".`,
    );
  }
  if (configuration.lifecycle !== "enabled") {
    throw new Error(
      `Papermark lifecycle "${configuration.lifecycle}" is invalid; expected enabled for an adapter instance.`,
    );
  }
  assertPapermarkEnvironment(configuration.environment);
}

function assertPapermarkEnvironment(environment: string): void {
  if (
    environment === "local-development" ||
    environment === "sandbox-certification"
  ) {
    return;
  }
  throw new Error(
    `Papermark environment "${environment}" is invalid; expected local-development or sandbox-certification.`,
  );
}

function parsePapermarkScope(value: unknown): IntegrationScope {
  assertRecord(value, "Papermark integration scope");
  rejectInlineCredentialKeys(value);
  assertKnownKeys(value, SCOPE_KEYS, "Papermark integration scope");
  const scope = parseIntegrationScope(value);
  return Object.freeze({
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
  });
}

function parseConnectorAccount(
  value: unknown,
  scope: IntegrationScope,
): PapermarkConnectorBinding {
  assertRecord(value, "Papermark connector account");
  rejectInlineCredentialKeys(value);
  assertKnownKeys(value, CONNECTOR_ACCOUNT_KEYS, "Papermark connector account");
  if (value.provider !== PAPERMARK_PROVIDER) {
    throw new Error(
      `Papermark connector account provider "${
        String(value.provider)
      }" is invalid; expected "papermark".`,
    );
  }
  const connectorId = parseLocator(value.id, "connector account ID");
  if (!/^connector_[a-z0-9]+(?:-[a-z0-9]+)*$/.test(connectorId)) {
    throw new Error(
      `Papermark connector account ID "${connectorId}" is invalid; expected a connector_ identifier.`,
    );
  }
  if (value.tenantId !== scope.tenantId) {
    throw new Error(
      `Papermark connector account tenant "${
        String(value.tenantId)
      }" does not match scope tenant "${scope.tenantId}"; expected the same tenant binding.`,
    );
  }
  return Object.freeze({
    id: connectorId,
    provider: PAPERMARK_PROVIDER,
    tenantId: scope.tenantId,
  });
}

function parseRetryPolicy(
  value: unknown,
): { readonly maxAttempts?: unknown; readonly maxDelayMs?: unknown } {
  if (value === undefined) return {};
  assertRecord(value, "Papermark retry policy");
  rejectInlineCredentialKeys(value);
  assertKnownKeys(value, RETRY_POLICY_KEYS, "Papermark retry policy");
  return {
    maxAttempts: value.maxAttempts,
    maxDelayMs: value.maxDelayMs,
  };
}

function parseLocator(value: unknown, label: string): string {
  if (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 255 &&
    value.trim() === value &&
    !/\s/.test(value)
  ) return value;
  throw new Error(
    `${label} "${
      String(value)
    }" is invalid; expected 1-255 non-whitespace locator characters.`,
  );
}

function parseBoundedInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  ) return value;
  throw new Error(
    `Papermark ${label} "${
      String(value)
    }" is invalid; expected an integer from ${minimum} to ${maximum}.`,
  );
}
