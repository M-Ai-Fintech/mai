import {
  type IntegrationEnvironment,
  type IntegrationScope,
  sameIntegrationScope,
  type SecretReference,
  type SecretResolver,
} from "../contracts.ts";
import type { PapermarkAdapterConfig } from "./config.ts";
import type { PapermarkFetch } from "./transport.ts";

const callAuthorizationBrand: unique symbol = Symbol(
  "papermark-call-authorization",
);
const syntheticFakeBrand: unique symbol = Symbol("papermark-synthetic-fake");
const claimRegistry = new WeakMap<object, PapermarkCallClaim>();

export type PapermarkCallAuthorization = {
  readonly [callAuthorizationBrand]: true;
};

export type PapermarkSyntheticFakeKind = "secret-resolver" | "fetch";

export interface PapermarkSyntheticAuthorizationDependencies {
  readonly secretResolver: SecretResolver;
  readonly fetch: PapermarkFetch;
}

interface PapermarkSyntheticFakeMarker {
  readonly kind: PapermarkSyntheticFakeKind;
  readonly name: string;
}

interface PapermarkCallClaim {
  readonly provider: "papermark";
  readonly lifecycle: "enabled";
  readonly environment: IntegrationEnvironment;
  readonly endpoint: string;
  readonly secretRef: SecretReference;
  readonly activation: Readonly<Record<string, string>>;
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;
  readonly folderId: string;
  readonly pageSize: number;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly maxDelayMs: number;
  readonly secretResolver: SecretResolver;
  readonly fetch: PapermarkFetch;
}

/**
 * Marks a named in-memory fake for synthetic Papermark authorization tests.
 *
 * @example markPapermarkSyntheticFakeForTests(resolver, "secret-resolver", "SecretResolverFake")
 */
export function markPapermarkSyntheticFakeForTests<
  T extends object | ((...args: never[]) => unknown),
>(
  dependency: T,
  kind: PapermarkSyntheticFakeKind,
  name: string,
): T {
  assertTestEnvironment();
  if (!/^[A-Za-z][A-Za-z0-9_-]{2,63}Fake$/.test(name)) {
    throw new Error(
      "Papermark synthetic dependency name is invalid; expected a named *Fake marker.",
    );
  }
  const existing = readFakeMarker(dependency);
  if (isFakeMarker(existing)) {
    if (existing.kind === kind && existing.name === name) return dependency;
    throw new Error(
      "Papermark synthetic dependency already has a different fake marker; expected one stable named marker.",
    );
  }
  Object.defineProperty(dependency, syntheticFakeBrand, {
    configurable: false,
    enumerable: false,
    value: Object.freeze({ kind, name }),
    writable: false,
  });
  return dependency;
}

/**
 * Creates a synthetic authority token bound to exact fake dependencies.
 *
 * @example createSyntheticPapermarkCallAuthorizationForTests(config, { secretResolver, fetch })
 */
export function createSyntheticPapermarkCallAuthorizationForTests(
  config: PapermarkAdapterConfig,
  dependencies: PapermarkSyntheticAuthorizationDependencies,
): PapermarkCallAuthorization;
export function createSyntheticPapermarkCallAuthorizationForTests(
  config: PapermarkAdapterConfig,
  secretResolver: SecretResolver,
  fetch: PapermarkFetch,
): PapermarkCallAuthorization;
export function createSyntheticPapermarkCallAuthorizationForTests(
  config: PapermarkAdapterConfig,
  second: PapermarkSyntheticAuthorizationDependencies | SecretResolver,
  third?: PapermarkFetch,
): PapermarkCallAuthorization {
  assertTestEnvironment();
  const dependencies = "secretResolver" in (second as object)
    ? second as PapermarkSyntheticAuthorizationDependencies
    : { secretResolver: second as SecretResolver, fetch: third! };
  assertSyntheticDependency(
    dependencies.secretResolver,
    "secret-resolver",
  );
  assertSyntheticDependency(dependencies.fetch, "fetch");
  const token = Object.freeze({ [callAuthorizationBrand]: true });
  claimRegistry.set(token, claimFor(config, dependencies));
  return token as PapermarkCallAuthorization;
}

/**
 * Revalidates exact claim-bound authority immediately before a provider effect.
 *
 * @example assertPapermarkCallAuthorization(authorization, config, resolver, fetch)
 */
export function assertPapermarkCallAuthorization(
  authorization: unknown,
  config: PapermarkAdapterConfig,
  secretResolver?: SecretResolver,
  fetch?: PapermarkFetch,
): asserts authorization is PapermarkCallAuthorization {
  const claim = readClaim(authorization);
  if (
    claim === undefined ||
    !sameClaim(
      claim,
      claimFor(config, {
        secretResolver: secretResolver!,
        fetch: fetch!,
      }),
    )
  ) {
    throw new Error(
      "Papermark call authorization is invalid; expected a private claim bound to the exact canonical configuration and transport dependencies.",
    );
  }
}

function assertTestEnvironment(): void {
  if (Deno.env.get("DENO_ENV") === "test") return;
  throw new Error(
    "Synthetic Papermark call authorization requires DENO_ENV=test; expected test-only fake I/O.",
  );
}

function assertSyntheticDependency(
  value: unknown,
  kind: PapermarkSyntheticFakeKind,
): void {
  if (isObject(value) || typeof value === "function") {
    const marker = readFakeMarker(value);
    if (isFakeMarker(marker) && marker.kind === kind) return;
  }
  throw new Error(
    `Papermark ${kind} dependency is not an explicit named synthetic fake; expected a *Fake marker.`,
  );
}

function readFakeMarker(value: unknown): unknown {
  if (!isObject(value) && typeof value !== "function") return undefined;
  const record = value as Record<PropertyKey, unknown>;
  return record[syntheticFakeBrand];
}

function isFakeMarker(value: unknown): value is PapermarkSyntheticFakeMarker {
  if (!isObject(value)) return false;
  return (value.kind === "secret-resolver" || value.kind === "fetch") &&
    typeof value.name === "string" &&
    /^[A-Za-z][A-Za-z0-9_-]{2,63}Fake$/.test(value.name);
}

function readClaim(value: unknown): PapermarkCallClaim | undefined {
  if (!isObject(value)) return undefined;
  if (value[callAuthorizationBrand] !== true) return undefined;
  return claimRegistry.get(value);
}

function claimFor(
  config: PapermarkAdapterConfig,
  dependencies: PapermarkSyntheticAuthorizationDependencies,
): PapermarkCallClaim {
  const activation = config.configuration.activation;
  const endpoint = config.configuration.endpoint;
  const secretRef = config.configuration.secretRef;
  if (
    config.provider !== "papermark" ||
    config.configuration.provider !== "papermark" ||
    config.configuration.lifecycle !== "enabled" ||
    activation === undefined ||
    endpoint === undefined ||
    secretRef === undefined
  ) {
    throw new Error(
      "Papermark call authorization cannot be bound; expected enabled configuration with complete canonical metadata.",
    );
  }
  return Object.freeze({
    provider: config.provider,
    lifecycle: config.configuration.lifecycle,
    environment: config.configuration.environment,
    endpoint,
    secretRef: Object.freeze({ ...secretRef }),
    activation: Object.freeze({ ...activation }),
    scope: Object.freeze({ ...config.binding.scope }),
    connectorAccountId: config.binding.connectorAccount.id,
    providerWorkspaceId: config.binding.providerWorkspaceId,
    folderId: config.binding.folderId,
    pageSize: config.pageSize,
    timeoutMs: config.timeoutMs,
    maxAttempts: config.retry.maxAttempts,
    maxDelayMs: config.retry.maxDelayMs,
    secretResolver: dependencies.secretResolver,
    fetch: dependencies.fetch,
  });
}

function sameClaim(
  left: PapermarkCallClaim,
  right: PapermarkCallClaim,
): boolean {
  return left.provider === right.provider &&
    left.lifecycle === right.lifecycle &&
    left.environment === right.environment &&
    left.endpoint === right.endpoint &&
    sameSecretReference(left.secretRef, right.secretRef) &&
    sameActivation(left.activation, right.activation) &&
    sameIntegrationScope(left.scope, right.scope) &&
    left.connectorAccountId === right.connectorAccountId &&
    left.providerWorkspaceId === right.providerWorkspaceId &&
    left.folderId === right.folderId &&
    left.pageSize === right.pageSize &&
    left.timeoutMs === right.timeoutMs &&
    left.maxAttempts === right.maxAttempts &&
    left.maxDelayMs === right.maxDelayMs &&
    left.secretResolver === right.secretResolver &&
    left.fetch === right.fetch;
}

function sameSecretReference(
  left: SecretReference,
  right: SecretReference,
): boolean {
  return left.manager === right.manager && left.name === right.name &&
    left.version === right.version;
}

function sameActivation(
  left: Readonly<Record<string, string>>,
  right: Readonly<Record<string, string>>,
): boolean {
  return left.approvalReference === right.approvalReference &&
    left.providerVersion === right.providerVersion &&
    left.license === right.license &&
    left.deploymentModel === right.deploymentModel &&
    left.region === right.region &&
    left.storageTopology === right.storageTopology &&
    left.rollbackOperator === right.rollbackOperator;
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}
