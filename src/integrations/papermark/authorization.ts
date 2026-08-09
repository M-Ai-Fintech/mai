import {
  type IntegrationEnvironment,
  type IntegrationScope,
  sameIntegrationScope,
  type SecretReference,
  type SecretResolver,
} from "../contracts.ts";
import type { PapermarkAdapterConfig } from "./config.ts";
import { type PapermarkFetch, type PapermarkTimer } from "./transport.ts";
import {
  ClockFake,
  FetchFake,
  SecretResolverFake,
  SleepFake,
  TimerFake,
} from "./synthetic_fakes.ts";

const callAuthorizationBrand: unique symbol = Symbol(
  "papermark-call-authorization",
);
const claimRegistry = new WeakMap<object, PapermarkCallClaim>();
const DEFAULT_TEST_TIME = "2026-08-08T12:00:00.000Z";

export type PapermarkCallAuthorization = {
  readonly [callAuthorizationBrand]: true;
};

export interface PapermarkCallDependencies {
  readonly secretResolver: SecretResolver;
  readonly fetch: PapermarkFetch;
  readonly sleep: (delayMs: number) => Promise<void>;
  readonly now: () => Date;
  readonly timer: PapermarkTimer;
}

export type PapermarkSyntheticSecretMode =
  | "immediate"
  | "stalled"
  | "delayed";

export interface PapermarkSyntheticSecretScript {
  readonly mode?: PapermarkSyntheticSecretMode;
  readonly value?: string;
}

export interface PapermarkSyntheticTestBundleOptions {
  readonly secret?: string | PapermarkSyntheticSecretScript;
  readonly secretMode?: PapermarkSyntheticSecretMode;
  readonly responses?: readonly (Response | Error)[];
  readonly responseQueue?: readonly (Response | Error)[];
  readonly now?: Date | string;
}

export interface PapermarkSyntheticSecretCall {
  readonly reference: SecretReference;
  readonly signal?: AbortSignal;
}

export interface PapermarkSyntheticFetchCall {
  readonly url: string;
  readonly init: RequestInit;
}

export interface PapermarkSyntheticTestControls {
  readonly secret: {
    readonly calls: readonly PapermarkSyntheticSecretCall[];
    release(): void;
  };
  readonly fetch: {
    readonly calls: readonly PapermarkSyntheticFetchCall[];
  };
  readonly sleep: {
    readonly delays: readonly number[];
  };
  readonly clock: {
    readonly calls: number;
  };
  readonly timer: {
    readonly delays: readonly number[];
    fire(): void;
  };
}

export interface PapermarkSyntheticTestBundle {
  readonly dependencies: PapermarkCallDependencies & {
    readonly authorization: PapermarkCallAuthorization;
  };
  readonly controls: PapermarkSyntheticTestControls;
}

/**
 * Builds the only synthetic Papermark I/O bundle used by integration tests.
 *
 * @internal This factory is intentionally absent from every v1 public seam.
 *
 * @example const bundle = createPapermarkSyntheticTestBundle(config, { responses: [new Response("{}")], secret: "test-secret" })
 */
export function createPapermarkSyntheticTestBundle(
  config: PapermarkAdapterConfig,
  options: PapermarkSyntheticTestBundleOptions = {},
): PapermarkSyntheticTestBundle {
  assertTestEnvironment();
  assertBundleOptions(options);
  const script = parseSecretScript(options);
  const responses = parseResponseQueue(options);
  const secretFake = new SecretResolverFake(script);
  const fetchFake = new FetchFake(responses);
  const sleepFake = new SleepFake();
  const clockFake = new ClockFake(parseTestTime(options.now));
  const timerFake = new TimerFake();
  const dependencies: PapermarkCallDependencies = Object.freeze({
    secretResolver: secretFake,
    fetch: fetchFake.fetch,
    sleep: sleepFake.sleep,
    now: clockFake.now,
    timer: timerFake,
  });
  const authorization = issuePapermarkCallAuthorization(
    config,
    dependencies,
  );
  const completeDependencies = Object.freeze({
    ...dependencies,
    authorization,
  });
  return Object.freeze({
    dependencies: completeDependencies,
    controls: Object.freeze({
      secret: Object.freeze({
        calls: secretFake.calls,
        release: () => secretFake.release(),
      }),
      fetch: Object.freeze({ calls: fetchFake.calls }),
      sleep: Object.freeze({ delays: sleepFake.delays }),
      clock: Object.freeze({
        get calls(): number {
          return clockFake.calls;
        },
      }),
      timer: Object.freeze({
        delays: timerFake.delays,
        fire: () => timerFake.fire(),
      }),
    }),
  });
}

function assertTestEnvironment(): void {
  if (Deno.env.get("DENO_ENV") === "test") return;
  throw new Error(
    "Synthetic Papermark test bundles require DENO_ENV=test; expected closed scripted fake I/O.",
  );
}

function parseSecretScript(
  options: PapermarkSyntheticTestBundleOptions,
): Required<PapermarkSyntheticSecretScript> {
  const secret = options.secret;
  if (typeof secret === "function") {
    throw new Error(
      "Synthetic secret script is invalid; expected inert scripted values and never a function; value=<redacted>.",
    );
  }
  const parsed = secret === undefined
    ? { mode: "immediate" as const, value: "synthetic-test-secret" }
    : typeof secret === "string"
    ? { mode: "immediate" as const, value: secret }
    : parseSecretObject(secret);
  if (options.secretMode !== undefined) {
    assertSecretMode(options.secretMode);
    if (options.secretMode !== parsed.mode) {
      throw new Error(
        "Synthetic secret script is invalid; expected one consistent inert secret mode.",
      );
    }
  }
  return Object.freeze({
    mode: options.secretMode ?? parsed.mode,
    value: parsed.value,
  });
}

function assertBundleOptions(
  value: unknown,
): asserts value is PapermarkSyntheticTestBundleOptions {
  if (!isPlainObject(value) || hasAccessor(value)) {
    throw new Error(
      "Synthetic test bundle options are invalid; expected an inert script object; value=<redacted>.",
    );
  }
  const allowed = new Set([
    "secret",
    "secretMode",
    "responses",
    "responseQueue",
    "now",
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error(
      "Synthetic test bundle options contain an unsupported field; expected inert scripted values; field=<redacted>.",
    );
  }
}

function parseSecretObject(
  value: PapermarkSyntheticSecretScript,
): Required<PapermarkSyntheticSecretScript> {
  if (!isPlainObject(value) || hasAccessor(value)) {
    throw new Error(
      "Synthetic secret script is invalid; expected an inert mode and secret string object; value=<redacted>.",
    );
  }
  const candidate = value as unknown as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (keys.some((key) => key !== "mode" && key !== "value")) {
    throw new Error(
      "Synthetic secret script is invalid; expected only inert mode and secret string fields; value=<redacted>.",
    );
  }
  const mode = candidate.mode ?? "immediate";
  const secret = candidate.value ?? "synthetic-test-secret";
  assertSecretMode(mode);
  if (typeof secret !== "string") {
    throw new Error(
      "Synthetic secret script is invalid; expected an inert secret string; value=<redacted>.",
    );
  }
  return { mode, value: secret };
}

function assertSecretMode(
  value: unknown,
): asserts value is PapermarkSyntheticSecretMode {
  if (value === "immediate" || value === "stalled" || value === "delayed") {
    return;
  }
  throw new Error(
    "Synthetic secret mode is invalid; expected immediate, stalled, or delayed; value=<redacted>.",
  );
}

function parseResponseQueue(
  options: PapermarkSyntheticTestBundleOptions,
): readonly (Response | Error)[] {
  if (options.responses !== undefined && options.responseQueue !== undefined) {
    throw new Error(
      "Synthetic response script is invalid; expected one inert response queue.",
    );
  }
  const queue = options.responses ?? options.responseQueue ?? [];
  if (!Array.isArray(queue)) {
    throw new Error(
      "Synthetic response script is invalid; expected an inert response/error queue.",
    );
  }
  for (const item of queue) {
    if (
      item instanceof Response || item instanceof Error ||
      item instanceof DOMException
    ) {
      continue;
    }
    throw new Error(
      "Synthetic response script is invalid; expected only Response or Error values; value=<redacted>.",
    );
  }
  return queue.slice();
}

function parseTestTime(value: Date | string | undefined): Date {
  const time = value === undefined
    ? new Date(DEFAULT_TEST_TIME)
    : value instanceof Date
    ? new Date(value.getTime())
    : typeof value === "string"
    ? new Date(value)
    : undefined;
  if (time === undefined || Number.isNaN(time.getTime())) {
    throw new Error(
      "Synthetic clock value is invalid; expected one fixed valid Date; value=<redacted>.",
    );
  }
  return time;
}

interface PapermarkCallClaim {
  readonly config: PapermarkConfigSnapshot;
  readonly secretResolver: SecretResolver;
  readonly fetch: PapermarkFetch;
  readonly sleep: (delayMs: number) => Promise<void>;
  readonly now: () => Date;
  readonly timer: PapermarkTimer;
}

interface PapermarkConfigSnapshot {
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
}

/**
 * Revalidates exact claim-bound authority immediately before a provider effect.
 *
 * @example assertPapermarkCallAuthorization(authorization, config, dependencies)
 */
export function assertPapermarkCallAuthorization(
  authorization: unknown,
  config: PapermarkAdapterConfig,
  dependencies: PapermarkCallDependencies,
): asserts authorization is PapermarkCallAuthorization {
  const claim = readClaim(authorization);
  if (
    claim === undefined ||
    !sameClaim(claim, claimFor(config, dependencies))
  ) {
    throw new Error(
      "Papermark call authorization is invalid; expected a private claim bound to the exact canonical configuration and transport dependencies.",
    );
  }
}

function issuePapermarkCallAuthorization(
  config: PapermarkAdapterConfig,
  dependencies: PapermarkCallDependencies,
): PapermarkCallAuthorization {
  const token = Object.freeze({ [callAuthorizationBrand]: true });
  claimRegistry.set(token, claimFor(config, dependencies));
  return token as PapermarkCallAuthorization;
}

function claimFor(
  config: PapermarkAdapterConfig,
  dependencies: PapermarkCallDependencies,
): PapermarkCallClaim {
  const snapshot = configSnapshot(config);
  return Object.freeze({
    config: snapshot,
    secretResolver: dependencies.secretResolver,
    fetch: dependencies.fetch,
    sleep: dependencies.sleep,
    now: dependencies.now,
    timer: dependencies.timer,
  });
}

function configSnapshot(
  config: PapermarkAdapterConfig,
): PapermarkConfigSnapshot {
  const activation = config.configuration.activation;
  const endpoint = config.configuration.endpoint;
  const secretRef = config.configuration.secretRef;
  if (
    config.provider !== "papermark" ||
    config.configuration.provider !== "papermark" ||
    config.configuration.lifecycle !== "enabled" ||
    activation === undefined || endpoint === undefined ||
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
  });
}

function sameClaim(
  left: PapermarkCallClaim,
  right: PapermarkCallClaim,
): boolean {
  return sameConfig(left.config, right.config) &&
    left.secretResolver === right.secretResolver &&
    left.fetch === right.fetch &&
    left.sleep === right.sleep &&
    left.now === right.now &&
    left.timer === right.timer;
}

function sameConfig(
  left: PapermarkConfigSnapshot,
  right: PapermarkConfigSnapshot,
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
    left.maxDelayMs === right.maxDelayMs;
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

function readClaim(value: unknown): PapermarkCallClaim | undefined {
  if (!isObject(value)) return undefined;
  if (value[callAuthorizationBrand] !== true) return undefined;
  return claimRegistry.get(value);
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function hasAccessor(value: Record<string, unknown>): boolean {
  try {
    return Object.keys(value).some((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor?.get !== undefined || descriptor?.set !== undefined;
    });
  } catch {
    return true;
  }
}
