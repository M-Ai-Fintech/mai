import {
  INTEGRATION_ENVIRONMENTS,
  type IntegrationEnvironment,
  type ProviderLifecycle,
  type RealIntegrationProvider,
  type SecretManager,
  type SecretReference,
} from "./contracts.ts";

const INLINE_CREDENTIAL_KEY =
  /(api[-_]?key|authorization|credential|password|private[-_]?key|secret|token|value)/i;

const CONFIGURATION_KEYS = new Set([
  "provider",
  "lifecycle",
  "environment",
  "endpoint",
  "secretRef",
]);

const SECRET_REFERENCE_KEYS = new Set(["manager", "name", "version"]);

export interface ProviderConfiguration {
  readonly provider: RealIntegrationProvider;
  readonly lifecycle: ProviderLifecycle;
  readonly environment: IntegrationEnvironment;
  readonly endpoint?: string;
  readonly secretRef?: SecretReference;
}

/**
 * Parses strict provider configuration without accepting credential values.
 *
 * @example parseProviderConfiguration({ provider: "papermark", lifecycle: "enabled", environment: "local-development", endpoint: "http://localhost:3000", secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" } })
 */
export function parseProviderConfiguration(
  value: unknown,
): ProviderConfiguration {
  assertRecord(value, "provider configuration");
  rejectInlineCredentialKeys(value);
  assertKnownKeys(value, CONFIGURATION_KEYS, "provider configuration");
  const provider = parseRealProvider(value.provider);
  const lifecycle = parseLifecycle(value.lifecycle);
  const environment = parseEnvironment(value.environment);
  const endpoint = value.endpoint === undefined
    ? undefined
    : parseEndpoint(value.endpoint);
  const secretRef = value.secretRef === undefined
    ? undefined
    : parseSecretReference(value.secretRef);

  assertProviderConfiguration({
    provider,
    lifecycle,
    environment,
    endpoint,
    secretRef,
  });
  return freezeConfiguration({
    provider,
    lifecycle,
    environment,
    ...(endpoint === undefined ? {} : { endpoint }),
    ...(secretRef === undefined ? {} : { secretRef }),
  });
}

/**
 * Parses a secret locator while excluding runtime secret material.
 *
 * @example parseSecretReference({ manager: "environment", name: "PAPER_MARK_SECRET" })
 */
export function parseSecretReference(value: unknown): SecretReference {
  assertRecord(value, "secret reference");
  rejectInlineCredentialKeys(value);
  assertKnownKeys(value, SECRET_REFERENCE_KEYS, "secret reference");
  const manager = parseSecretManager(value.manager);
  const name = parseLocatorText(value.name, "secret reference name");
  const version = value.version === undefined
    ? undefined
    : parseLocatorText(value.version, "secret reference version");
  return Object.freeze({
    manager,
    name,
    ...(version === undefined ? {} : { version }),
  });
}

function assertProviderConfiguration(
  configuration: ProviderConfiguration,
): void {
  if (
    configuration.provider === "ideals" ||
    configuration.provider === "intralinks"
  ) {
    assertDeferredProvider(configuration);
    return;
  }
  if (configuration.lifecycle === "enabled") {
    assertEnabledPapermark(configuration);
    return;
  }
  if (configuration.environment !== "interface-only") {
    throw new Error(
      `Papermark lifecycle "${configuration.lifecycle}" uses environment "${configuration.environment}"; expected interface-only while not enabled.`,
    );
  }
  if (
    configuration.endpoint !== undefined ||
    configuration.secretRef !== undefined
  ) {
    throw new Error(
      `Papermark lifecycle "${configuration.lifecycle}" carries endpoint or credential metadata; expected no provider credentials while disabled or deferred.`,
    );
  }
}

function assertDeferredProvider(configuration: ProviderConfiguration): void {
  if (configuration.lifecycle !== "deferred") {
    throw new Error(
      `Provider "${configuration.provider}" is deferred; expected lifecycle deferred and no enabled adapter.`,
    );
  }
  if (configuration.environment !== "interface-only") {
    throw new Error(
      `Provider "${configuration.provider}" uses environment "${configuration.environment}"; expected interface-only while deferred.`,
    );
  }
  if (
    configuration.endpoint !== undefined ||
    configuration.secretRef !== undefined
  ) {
    throw new Error(
      `Provider "${configuration.provider}" is deferred; expected no endpoint or credential metadata.`,
    );
  }
}

function assertEnabledPapermark(configuration: ProviderConfiguration): void {
  if (
    configuration.environment !== "local-development" &&
    configuration.environment !== "sandbox-certification"
  ) {
    throw new Error(
      `Papermark enabled environment "${configuration.environment}" is not permitted; expected local-development or sandbox-certification.`,
    );
  }
  if (configuration.endpoint === undefined) {
    throw new Error(
      "Papermark enabled configuration is missing endpoint; expected an explicit provider URL.",
    );
  }
  if (configuration.secretRef === undefined) {
    throw new Error(
      "Papermark enabled configuration is missing secret reference; expected locator metadata instead of a credential value.",
    );
  }
}

function parseRealProvider(value: unknown): RealIntegrationProvider {
  if (value === "papermark" || value === "ideals" || value === "intralinks") {
    return value;
  }
  throw new Error(
    `Integration provider "${
      String(value)
    }" is invalid; expected papermark, ideals, or intralinks.`,
  );
}

function parseLifecycle(value: unknown): ProviderLifecycle {
  if (value === "enabled" || value === "disabled" || value === "deferred") {
    return value;
  }
  throw new Error(
    `Provider lifecycle "${
      String(value)
    }" is invalid; expected enabled, disabled, or deferred.`,
  );
}

function parseEnvironment(value: unknown): IntegrationEnvironment {
  if (
    typeof value === "string" &&
    (INTEGRATION_ENVIRONMENTS as readonly string[]).includes(value)
  ) {
    return value as IntegrationEnvironment;
  }
  throw new Error(
    `Provider environment "${
      String(value)
    }" is invalid; expected an approved integration environment.`,
  );
}

function parseEndpoint(value: unknown): string {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    throw new Error(
      `Provider endpoint "${
        String(value)
      }" is invalid; expected an absolute HTTP(S) URL without credentials.`,
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `Provider endpoint "${value}" is invalid; expected an absolute HTTP(S) URL without credentials.`,
    );
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      `Provider endpoint "${value}" is invalid; expected an HTTP(S) URL without userinfo, query, or fragment credentials.`,
    );
  }
  return value;
}

function parseSecretManager(value: unknown): SecretManager {
  if (
    value === "environment" ||
    value === "local-secret-store" ||
    value === "vault"
  ) {
    return value;
  }
  throw new Error(
    `Secret manager "${
      String(value)
    }" is invalid; expected environment, local-secret-store, or vault.`,
  );
}

function parseLocatorText(value: unknown, label: string): string {
  if (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 255 &&
    value.trim() === value &&
    !/\s/.test(value)
  ) {
    return value;
  }
  throw new Error(
    `${label} "${
      String(value)
    }" is invalid; expected 1-255 non-whitespace locator characters.`,
  );
}

function freezeConfiguration(
  configuration: ProviderConfiguration,
): ProviderConfiguration {
  return Object.freeze({
    ...configuration,
    ...(configuration.secretRef === undefined
      ? {}
      : { secretRef: Object.freeze({ ...configuration.secretRef }) }),
  });
}

function rejectInlineCredentialKeys(value: unknown): void {
  if (Array.isArray(value)) {
    for (const child of value) rejectInlineCredentialKeys(child);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (INLINE_CREDENTIAL_KEY.test(key) && key !== "secretRef") {
      throw new Error(
        `Provider configuration key "${key}" is an inline credential; expected a secret reference locator.`,
      );
    }
    rejectInlineCredentialKeys(child);
  }
}

function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  label: string,
): void {
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown === undefined) return;
  throw new Error(
    `${label} key "${unknown}" is not recognized; expected the strict ${label} shape.`,
  );
}

function assertRecord(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (isRecord(value)) return;
  throw new Error(
    `${label} "${
      String(value)
    }" is invalid; expected an object with explicit fields.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
