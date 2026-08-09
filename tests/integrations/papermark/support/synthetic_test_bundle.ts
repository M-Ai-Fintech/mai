import {
  action,
  type ActorReference,
  evaluateAuthorization,
  resourceKind,
} from "../../../../src/platform/authz/v1.ts";
import { parseRequestContext } from "../../../../src/shared/contracts/request_context.ts";
import type { RequestContext } from "../../../../src/shared/contracts/request_context.ts";
import type {
  SecretReference,
} from "../../../../src/integrations/contracts.ts";
import type { PapermarkAdapterConfig } from "../../../../src/integrations/papermark/config.ts";
import {
  issuePapermarkCallAuthorization,
  type PapermarkAuthorizationRequest,
  type PapermarkAuthorizationState,
  type PapermarkCallAuthorization,
  type PapermarkCallDependencies,
} from "../../../../src/integrations/papermark/authorization.ts";
import {
  ClockFake,
  FetchFake,
  SecretResolverFake,
  SleepFake,
  TimerFake,
} from "./synthetic_fakes.ts";

const DEFAULT_TEST_TIME = "2026-08-08T12:00:00.000Z";

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
  readonly fetch: { readonly calls: readonly PapermarkSyntheticFetchCall[] };
  readonly sleep: { readonly delays: readonly number[] };
  readonly clock: { readonly calls: number };
  readonly timer: { readonly delays: readonly number[]; fire(): void };
}

export interface PapermarkSyntheticTestBundle {
  readonly dependencies: PapermarkCallDependencies & {
    readonly authorization: PapermarkCallAuthorization;
  };
  readonly controls: PapermarkSyntheticTestControls;
}

/**
 * Builds closed fake I/O and a test-only authorization state for integration tests.
 *
 * @example createPapermarkSyntheticTestBundle(config, { responses: [new Response("{}")], secret: "test-secret" })
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
  const authorization = issueSyntheticAuthorization(config, dependencies);
  return Object.freeze({
    dependencies: Object.freeze({ ...dependencies, authorization }),
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

function issueSyntheticAuthorization(
  config: PapermarkAdapterConfig,
  dependencies: PapermarkCallDependencies,
): PapermarkCallAuthorization {
  const context = syntheticContext(config);
  const actor: ActorReference = {
    id: context.actorId,
    kind: "service",
    state: "active",
  };
  const request: PapermarkAuthorizationRequest = {
    context,
    actor,
    scope: config.binding.scope,
    resource: {
      kind: resourceKind("papermark_dataroom"),
      id: config.binding.dataRoomId,
    },
    action: action("list_documents"),
    capability: "list_documents",
    connectorAccountId: config.binding.connectorAccount.id,
    providerAccountId: config.binding.providerAccount.accountId,
    providerTeamId: config.binding.providerAccount.teamId,
    dataRoomId: config.binding.dataRoomId,
    dataRoomFolderId: config.binding.dataRoomFolderId,
    requestedFields: [],
    roleFacts: [{
      id: "synthetic-papermark-read",
      scope: config.binding.scope,
      resourceKinds: [resourceKind("papermark_dataroom")],
      actions: [action("list_documents")],
      fields: [],
    }],
    grantFacts: [],
    restrictionFacts: [],
    relationshipFacts: [],
    clock: { now: () => dependencies.now().toISOString() },
  };
  const state = (): PapermarkAuthorizationState => ({
    request,
    decision: evaluateAuthorization(request),
  });
  const authorized = state();
  if (authorized.decision.outcome !== "allow") {
    throw new Error("Synthetic authorization setup was unexpectedly denied.");
  }
  return issuePapermarkCallAuthorization({
    config,
    dependencies,
    context,
    actor,
    scope: config.binding.scope,
    authorized,
    revalidate: state,
  });
}

function syntheticContext(config: PapermarkAdapterConfig): RequestContext {
  const parsed = parseRequestContext({
    actorId: "actor_synthetic",
    tenantId: config.binding.scope.tenantId,
    workspaceId: config.binding.scope.workspaceId,
    dealId: config.binding.scope.dealId,
    correlationId: "cor_synthetic",
    origin: "internal",
  });
  if (parsed.ok) return parsed.value;
  throw new Error("Synthetic authorization context could not be created.");
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
  if (options.secretMode !== undefined && options.secretMode !== parsed.mode) {
    throw new Error(
      "Synthetic secret script is invalid; expected one consistent inert secret mode.",
    );
  }
  return Object.freeze({
    mode: options.secretMode ?? parsed.mode,
    value: parsed.value,
  });
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
  if (Object.keys(candidate).some((key) => key !== "mode" && key !== "value")) {
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
      item instanceof Response ||
      item instanceof Error ||
      item instanceof DOMException
    ) continue;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasAccessor(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.get !== undefined || descriptor?.set !== undefined;
  });
}
