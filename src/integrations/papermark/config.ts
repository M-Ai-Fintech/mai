import { type IntegrationScope, parseIntegrationScope } from "../contracts.ts";
import type { ProviderConfiguration } from "../configuration.ts";

const PAPERMARK_PROVIDER = "papermark" as const;
const LEGACY_PAPERMARK_HOST = "api.papermark.io";
const OFFICIAL_PAPERMARK_HOST = "api.papermark.com";
const LOCAL_PAPERMARK_HOST = "localhost";
const LOCAL_PAPERMARK_PORT = "3000";
const LOCAL_PAPERMARK_PATH = "/api";
const INLINE_CREDENTIAL_KEY =
  /(api[-_]?key|authorization|credential|password|private[-_]?key|token|value)/i;

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
  assertEnabledConfiguration(input.configuration);
  assertScope(input.scope);
  assertConnectorAccount(input.connectorAccount, input.scope);
  const binding = Object.freeze({
    scope: Object.freeze({ ...input.scope }),
    connectorAccount: Object.freeze({ ...input.connectorAccount }),
    providerWorkspaceId: parseLocator(
      input.providerWorkspaceId,
      "provider workspace ID",
    ),
    folderId: parseLocator(input.folderId, "Papermark folder ID"),
  });
  const configuration = Object.freeze({
    provider: input.configuration.provider,
    lifecycle: input.configuration.lifecycle,
    environment: input.configuration.environment,
    endpoint: input.configuration.endpoint,
    ...(input.configuration.secretRef === undefined
      ? {}
      : { secretRef: Object.freeze({ ...input.configuration.secretRef }) }),
  });
  return Object.freeze({
    provider: PAPERMARK_PROVIDER,
    configuration,
    binding,
    pageSize: parseBoundedInteger(input.pageSize ?? 50, "page size", 1, 1_000),
    timeoutMs: parseBoundedInteger(
      input.timeoutMs ?? 10_000,
      "timeout",
      1,
      120_000,
    ),
    retry: Object.freeze({
      maxAttempts: parseBoundedInteger(
        input.retry?.maxAttempts ?? 3,
        "max attempts",
        1,
        4,
      ),
      maxDelayMs: parseBoundedInteger(
        input.retry?.maxDelayMs ?? 2_000,
        "max retry delay",
        0,
        30_000,
      ),
    }),
  });
}

function assertEnabledConfiguration(
  configuration: ProviderConfiguration,
): void {
  assertNoInlineCredentialKeys(configuration);
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
  if (
    configuration.environment !== "local-development" &&
    configuration.environment !== "sandbox-certification"
  ) {
    throw new Error(
      `Papermark environment "${configuration.environment}" is invalid; expected local-development or sandbox-certification.`,
    );
  }
  if (configuration.endpoint === undefined) {
    throw new Error(
      "Papermark endpoint is missing; expected an explicit official or approved local URL.",
    );
  }
  assertPapermarkEndpoint(configuration.endpoint);
  if (configuration.secretRef === undefined) {
    throw new Error(
      "Papermark secret reference is missing; expected a resolver locator and never an inline credential.",
    );
  }
}

function assertNoInlineCredentialKeys(
  configuration: ProviderConfiguration,
): void {
  for (
    const key of Object.keys(
      configuration as unknown as Record<string, unknown>,
    )
  ) {
    if (key === "secretRef") continue;
    if (INLINE_CREDENTIAL_KEY.test(key)) {
      throw new Error(
        `Papermark configuration key "${key}" is an inline credential; expected a secret reference locator.`,
      );
    }
  }
}

function assertPapermarkEndpoint(endpoint: string): void {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error(
      "Papermark endpoint is invalid; expected an approved absolute HTTP(S) URL.",
    );
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(
      "Papermark endpoint is invalid; expected an approved URL without credentials, query, or fragment.",
    );
  }
  if (parsed.hostname === LEGACY_PAPERMARK_HOST) {
    throw new Error(
      `Papermark endpoint "${endpoint}" is legacy; expected ${OFFICIAL_PAPERMARK_HOST} or the approved local development endpoint.`,
    );
  }
  if (parsed.hostname === OFFICIAL_PAPERMARK_HOST) {
    if (parsed.protocol !== "https:" || parsed.pathname !== "/") {
      throw new Error(
        `Papermark endpoint "${endpoint}" is invalid; expected https://${OFFICIAL_PAPERMARK_HOST}.`,
      );
    }
    return;
  }
  if (
    parsed.hostname === LOCAL_PAPERMARK_HOST &&
    parsed.protocol === "http:" &&
    parsed.port === LOCAL_PAPERMARK_PORT &&
    parsed.pathname.replace(/\/$/, "") === LOCAL_PAPERMARK_PATH
  ) return;
  throw new Error(
    `Papermark endpoint "${endpoint}" is not approved; expected https://${OFFICIAL_PAPERMARK_HOST} or http://${LOCAL_PAPERMARK_HOST}:${LOCAL_PAPERMARK_PORT}${LOCAL_PAPERMARK_PATH}.`,
  );
}

function assertScope(scope: IntegrationScope): void {
  parseIntegrationScope(scope);
}

function assertConnectorAccount(
  connectorAccount: PapermarkConnectorBinding,
  scope: IntegrationScope,
): void {
  if (connectorAccount.provider !== PAPERMARK_PROVIDER) {
    throw new Error(
      `Papermark connector account provider "${
        String(connectorAccount.provider)
      }" is invalid; expected "papermark".`,
    );
  }
  const connectorId = parseLocator(connectorAccount.id, "connector account ID");
  if (!/^connector_[a-z0-9]+(?:-[a-z0-9]+)*$/.test(connectorId)) {
    throw new Error(
      `Papermark connector account ID "${connectorId}" is invalid; expected a connector_ identifier.`,
    );
  }
  if (connectorAccount.tenantId !== scope.tenantId) {
    throw new Error(
      `Papermark connector account tenant "${connectorAccount.tenantId}" does not match scope tenant "${scope.tenantId}"; expected the same tenant binding.`,
    );
  }
}

function parseLocator(value: string, label: string): string {
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
  value: number,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
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
