import {
  INTEGRATION_ENVIRONMENTS,
  type IntegrationEnvironment,
  type ProviderLifecycle,
  type RealIntegrationProvider,
  type SecretManager,
  type SecretReference,
} from "./contracts.ts";
import {
  type OwnerApprovedActivation,
  parseOwnerApprovedActivation,
} from "./configuration_activation.ts";
import {
  assertKnownKeys,
  assertRecord,
  rejectInlineCredentialKeys,
} from "./configuration_validation.ts";
import { assertPapermarkEndpointForEnvironment } from "./papermark_endpoint.ts";

export { parseOwnerApprovedActivation } from "./configuration_activation.ts";
export type { OwnerApprovedActivation } from "./configuration_activation.ts";
export { assertPapermarkEndpointForEnvironment } from "./papermark_endpoint.ts";

const CONFIGURATION_KEYS = new Set([
  "provider",
  "lifecycle",
  "environment",
  "endpoint",
  "secretRef",
  "activation",
]);

const SECRET_REFERENCE_KEYS = new Set(["manager", "name", "version"]);
const CREDENTIAL_PREFIX =
  /^(?:sk|pk|rk|ghp|gho|ghs|glpat|xox[abp]|AIza|AKIA|ya29|eyJ)[A-Za-z0-9_./+=-]{12,}$/i;

export interface ProviderConfiguration {
  readonly provider: RealIntegrationProvider;
  readonly lifecycle: ProviderLifecycle;
  readonly environment: IntegrationEnvironment;
  readonly endpoint?: string;
  readonly secretRef?: SecretReference;
  readonly activation?: OwnerApprovedActivation;
}

/**
 * Parses strict provider configuration without accepting credential values.
 *
 * @example parseProviderConfiguration({ provider: "papermark", lifecycle: "enabled", environment: "local-development", endpoint: "http://localhost:3000/api", secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" } })
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
  const activation = value.activation === undefined
    ? undefined
    : parseOwnerApprovedActivation(value.activation);

  assertProviderConfiguration({
    provider,
    lifecycle,
    environment,
    endpoint,
    secretRef,
    activation,
  });
  return freezeConfiguration({
    provider,
    lifecycle,
    environment,
    ...(endpoint === undefined ? {} : { endpoint }),
    ...(secretRef === undefined ? {} : { secretRef }),
    ...(activation === undefined ? {} : { activation }),
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
  const name = parseSecretLocator(manager, value.name);
  const version = value.version === undefined
    ? undefined
    : parseSecretVersion(manager, value.version);
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
    configuration.secretRef !== undefined ||
    configuration.activation !== undefined
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
    configuration.secretRef !== undefined ||
    configuration.activation !== undefined
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
  if (configuration.activation === undefined) {
    throw new Error(
      "Papermark enabled configuration is missing owner-approved activation metadata; expected a credential-free approval record.",
    );
  }
  parseOwnerApprovedActivation(configuration.activation);
  assertPapermarkEndpointForEnvironment(
    configuration.endpoint,
    configuration.environment,
  );
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
      "Provider endpoint is invalid; expected an absolute HTTP(S) URL without credentials.",
    );
  }
  const parsed = parseEndpointUrl(value);
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "Provider endpoint is invalid; expected an HTTP(S) URL without userinfo, query, or fragment credentials.",
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
    "Secret manager is invalid; expected environment, local-secret-store, or vault.",
  );
}

function parseLocatorText(value: unknown, label: string): string {
  if (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 255 &&
    value.trim() === value &&
    !/\s/.test(value) &&
    !looksCredentialLike(value)
  ) {
    return value;
  }
  throw new Error(
    `${label} is invalid; expected a bounded non-credential locator.`,
  );
}

function parseSecretLocator(manager: SecretManager, value: unknown): string {
  const locator = parseLocatorText(value, "secret reference name");
  if (manager === "environment") {
    if (/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(locator)) return locator;
    throw new Error(
      "Environment secret reference name is invalid; expected an uppercase environment-variable locator.",
    );
  }
  if (
    /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)+$/.test(
      locator,
    )
  ) return locator;
  throw new Error(
    `Secret manager "${manager}" reference name is invalid; expected a bounded path locator without credential material.`,
  );
}

function parseSecretVersion(manager: SecretManager, value: unknown): string {
  const version = parseLocatorText(value, "secret reference version");
  const valid = manager === "environment"
    ? version === "current"
    : manager === "local-secret-store"
    ? /^(?:current|v[0-9]{1,9}|version-[0-9]{1,9})$/.test(version)
    : /^(?:current|latest|v[0-9]{1,9}|version-[0-9]{1,9})$/.test(version);
  if (valid) return version;
  throw new Error(
    `Secret manager "${manager}" version is invalid; expected its bounded version locator syntax.`,
  );
}

function looksCredentialLike(value: string): boolean {
  if (CREDENTIAL_PREFIX.test(value)) return true;
  const mixedClasses = /[A-Z]/.test(value) && /[a-z]/.test(value) &&
    /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
  return value.length >= 32 && (mixedClasses || new Set(value).size >= 20);
}

function freezeConfiguration(
  configuration: ProviderConfiguration,
): ProviderConfiguration {
  return Object.freeze({
    ...configuration,
    ...(configuration.secretRef === undefined
      ? {}
      : { secretRef: Object.freeze({ ...configuration.secretRef }) }),
    ...(configuration.activation === undefined
      ? {}
      : { activation: Object.freeze({ ...configuration.activation }) }),
  });
}

function parseEndpointUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(
      "Provider endpoint is invalid; expected an absolute HTTP(S) URL without credentials.",
    );
  }
}
