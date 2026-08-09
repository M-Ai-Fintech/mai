import type {
  ActorReference,
  AuthorizationDecision,
  AuthorizationRequest,
} from "../../platform/authz/v1.ts";
import { resourceKind } from "../../platform/authz/v1.ts";
import type { RequestContext } from "../../shared/contracts/request_context.ts";
import type { IntegrationScope } from "../contracts.ts";
import type { PapermarkAdapterConfig } from "./config.ts";
import { type PapermarkFetch, type PapermarkTimer } from "./transport.ts";

const callAuthorizationBrand: unique symbol = Symbol(
  "papermark-call-authorization",
);
const claimRegistry = new WeakMap<object, PapermarkCallClaim>();

export type PapermarkCallAuthorization = {
  readonly [callAuthorizationBrand]: true;
};

export interface PapermarkCallDependencies {
  readonly secretResolver: {
    resolve(
      reference: import("../contracts.ts").SecretReference,
      signal?: AbortSignal,
    ): Promise<import("../contracts.ts").RuntimeSecret>;
  };
  readonly fetch: PapermarkFetch;
  readonly sleep: (delayMs: number) => Promise<void>;
  readonly now: () => Date;
  readonly timer: PapermarkTimer;
}

export interface PapermarkAuthorizationState {
  readonly request: PapermarkAuthorizationRequest;
  readonly decision: AuthorizationDecision;
}

export interface PapermarkAuthorizationRequest extends AuthorizationRequest {
  readonly capability: "list_documents";
  readonly connectorAccountId: string;
  readonly providerAccountId: string;
  readonly providerTeamId: string;
  readonly dataRoomId: string;
  readonly dataRoomFolderId: string;
}

export interface PapermarkCallAuthorizationIssue {
  readonly config: PapermarkAdapterConfig;
  readonly dependencies: PapermarkCallDependencies;
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: IntegrationScope;
  readonly authorized: PapermarkAuthorizationState;
  readonly revalidate: () => PapermarkAuthorizationState;
}

interface PapermarkCallClaim {
  readonly config: PapermarkConfigSnapshot;
  readonly authorization: PapermarkAuthorizationSnapshot;
  readonly secretResolver: PapermarkCallDependencies["secretResolver"];
  readonly fetch: PapermarkFetch;
  readonly sleep: (delayMs: number) => Promise<void>;
  readonly now: () => Date;
  readonly timer: PapermarkTimer;
  readonly revalidate: () => PapermarkAuthorizationState;
}

interface PapermarkConfigSnapshot {
  readonly provider: "papermark";
  readonly lifecycle: "enabled";
  readonly environment: PapermarkAdapterConfig["configuration"]["environment"];
  readonly endpoint: string;
  readonly secretRef: Readonly<Record<string, string | undefined>>;
  readonly activation: Readonly<Record<string, string>>;
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerAccountId: string;
  readonly providerTeamId: string;
  readonly dataRoomId: string;
  readonly dataRoomFolderId: string;
  readonly pageSize: number;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly maxDelayMs: number;
}

interface PapermarkAuthorizationSnapshot {
  readonly context: Readonly<Record<string, string | undefined>>;
  readonly actor: Readonly<Pick<ActorReference, "id" | "kind" | "state">>;
  readonly scope: Readonly<{
    tenantId: IntegrationScope["tenantId"];
    workspaceId: IntegrationScope["workspaceId"];
    dealId?: IntegrationScope["dealId"];
  }>;
  readonly resource: Readonly<{ kind: string; id: string }>;
  readonly action: string;
  readonly capability: "list_documents";
  readonly connectorAccountId: string;
  readonly providerAccountId: string;
  readonly providerTeamId: string;
  readonly dataRoomId: string;
  readonly dataRoomFolderId: string;
  readonly decisionReference: string;
  readonly expiresAt?: string;
}

/**
 * Issues a claim only for an already-allowed platform authorization state.
 *
 * @internal Only trusted integration composition and test-only orchestration call this function.
 */
export function issuePapermarkCallAuthorization(
  input: PapermarkCallAuthorizationIssue,
): PapermarkCallAuthorization {
  if (
    input.authorized.decision.outcome !== "allow" ||
    !sameRequestBinding(input.authorized.request, input)
  ) {
    throw invalidAuthorizationError();
  }
  const token = Object.freeze({
    [callAuthorizationBrand]: true,
    toJSON: (): undefined => undefined,
  });
  claimRegistry.set(token, {
    config: configSnapshot(input.config),
    authorization: authorizationSnapshot(input.authorized),
    secretResolver: input.dependencies.secretResolver,
    fetch: input.dependencies.fetch,
    sleep: input.dependencies.sleep,
    now: input.dependencies.now,
    timer: input.dependencies.timer,
    revalidate: input.revalidate,
  });
  return token as PapermarkCallAuthorization;
}

/**
 * Revalidates exact configuration, scope, actor, and current platform policy.
 *
 * @example assertPapermarkCallAuthorization(authorization, config, dependencies)
 */
export function assertPapermarkCallAuthorization(
  authorization: unknown,
  config: PapermarkAdapterConfig,
  dependencies: PapermarkCallDependencies & {
    readonly authorization?: PapermarkCallAuthorization;
  },
): asserts authorization is PapermarkCallAuthorization {
  const claim = readClaim(authorization);
  if (
    claim === undefined ||
    !sameClaimDependencies(claim, config, dependencies) ||
    !sameAuthorization(claim)
  ) {
    throw invalidAuthorizationError();
  }
}

function sameClaimDependencies(
  claim: PapermarkCallClaim,
  config: PapermarkAdapterConfig,
  dependencies: PapermarkCallDependencies,
): boolean {
  return sameConfig(claim.config, config) &&
    claim.secretResolver === dependencies.secretResolver &&
    claim.fetch === dependencies.fetch &&
    claim.sleep === dependencies.sleep &&
    claim.now === dependencies.now &&
    claim.timer === dependencies.timer;
}

function sameAuthorization(claim: PapermarkCallClaim): boolean {
  try {
    const current = claim.revalidate();
    return current.decision.outcome === "allow" &&
      sameAuthorizationSnapshot(
        claim.authorization,
        authorizationSnapshot(current),
      );
  } catch {
    return false;
  }
}

function sameRequestBinding(
  request: PapermarkAuthorizationRequest,
  input: PapermarkCallAuthorizationIssue,
): boolean {
  return request.context.actorId === input.context.actorId &&
    request.context.tenantId === input.context.tenantId &&
    request.context.workspaceId === input.context.workspaceId &&
    request.context.dealId === input.context.dealId &&
    request.context.sessionId === input.context.sessionId &&
    request.context.identityId === input.context.identityId &&
    request.context.origin === input.context.origin &&
    request.actor.id === input.actor.id &&
    request.actor.kind === input.actor.kind &&
    request.actor.state === input.actor.state &&
    request.scope.tenantId === input.scope.tenantId &&
    request.scope.workspaceId === input.scope.workspaceId &&
    request.scope.dealId === input.scope.dealId &&
    request.resource.kind === resourceKind("papermark_dataroom") &&
    request.resource.id === input.config.binding.dataRoomId &&
    request.action === "list_documents" &&
    request.capability === "list_documents" &&
    request.connectorAccountId === input.config.binding.connectorAccount.id &&
    request.providerAccountId ===
      input.config.binding.providerAccount.accountId &&
    request.providerTeamId === input.config.binding.providerAccount.teamId &&
    request.dataRoomId === input.config.binding.dataRoomId &&
    request.dataRoomFolderId === input.config.binding.dataRoomFolderId;
}

function authorizationSnapshot(
  state: PapermarkAuthorizationState,
): PapermarkAuthorizationSnapshot {
  if (state.decision.outcome !== "allow") throw invalidAuthorizationError();
  const approved = state.decision.approvedScope;
  return Object.freeze({
    context: Object.freeze({
      actorId: state.request.context.actorId,
      tenantId: state.request.context.tenantId,
      workspaceId: state.request.context.workspaceId,
      dealId: state.request.context.dealId,
      sessionId: state.request.context.sessionId,
      identityId: state.request.context.identityId,
      origin: state.request.context.origin,
    }),
    actor: Object.freeze({
      id: state.request.actor.id,
      kind: state.request.actor.kind,
      state: state.request.actor.state,
    }),
    scope: Object.freeze({ ...state.request.scope }),
    resource: Object.freeze({
      kind: state.request.resource.kind,
      id: state.request.resource.id,
    }),
    action: state.request.action,
    capability: state.request.capability,
    connectorAccountId: state.request.connectorAccountId,
    providerAccountId: state.request.providerAccountId,
    providerTeamId: state.request.providerTeamId,
    dataRoomId: state.request.dataRoomId,
    dataRoomFolderId: state.request.dataRoomFolderId,
    decisionReference: approved.decisionReference,
    ...(approved.expiresAt === undefined
      ? {}
      : { expiresAt: approved.expiresAt }),
  });
}

function sameAuthorizationSnapshot(
  left: PapermarkAuthorizationSnapshot,
  right: PapermarkAuthorizationSnapshot,
): boolean {
  return sameRecord(left.context, right.context) &&
    left.actor.id === right.actor.id &&
    left.actor.kind === right.actor.kind &&
    left.actor.state === right.actor.state &&
    left.scope.tenantId === right.scope.tenantId &&
    left.scope.workspaceId === right.scope.workspaceId &&
    left.scope.dealId === right.scope.dealId &&
    left.resource.kind === right.resource.kind &&
    left.resource.id === right.resource.id &&
    left.action === right.action &&
    left.capability === right.capability &&
    left.connectorAccountId === right.connectorAccountId &&
    left.providerAccountId === right.providerAccountId &&
    left.providerTeamId === right.providerTeamId &&
    left.dataRoomId === right.dataRoomId &&
    left.dataRoomFolderId === right.dataRoomFolderId &&
    left.decisionReference === right.decisionReference &&
    left.expiresAt === right.expiresAt;
}

function configSnapshot(
  config: PapermarkAdapterConfig,
): PapermarkConfigSnapshot {
  const endpoint = config.configuration.endpoint;
  const secretRef = config.configuration.secretRef;
  const activation = config.configuration.activation;
  if (
    config.provider !== "papermark" ||
    config.configuration.provider !== "papermark" ||
    config.configuration.lifecycle !== "enabled" ||
    endpoint === undefined ||
    secretRef === undefined ||
    activation === undefined
  ) throw invalidAuthorizationError();
  return Object.freeze({
    provider: config.provider,
    lifecycle: config.configuration.lifecycle,
    environment: config.configuration.environment,
    endpoint,
    secretRef: Object.freeze({ ...secretRef }),
    activation: activationSnapshot(activation),
    scope: Object.freeze({ ...config.binding.scope }),
    connectorAccountId: config.binding.connectorAccount.id,
    providerAccountId: config.binding.providerAccount.accountId,
    providerTeamId: config.binding.providerAccount.teamId,
    dataRoomId: config.binding.dataRoomId,
    dataRoomFolderId: config.binding.dataRoomFolderId,
    pageSize: config.pageSize,
    timeoutMs: config.timeoutMs,
    maxAttempts: config.retry.maxAttempts,
    maxDelayMs: config.retry.maxDelayMs,
  });
}

function activationSnapshot(
  activation: NonNullable<
    PapermarkAdapterConfig["configuration"]["activation"]
  >,
): Readonly<Record<string, string>> {
  return Object.freeze({
    approvalReference: activation.approvalReference,
    providerVersion: activation.providerVersion,
    apiScopes: activation.apiScopes.join(","),
    license: activation.license,
    deploymentModel: activation.deploymentModel,
    region: activation.region,
    storageTopology: activation.storageTopology,
    rollbackOperator: activation.rollbackOperator,
  });
}

function sameConfig(
  left: PapermarkConfigSnapshot,
  right: PapermarkAdapterConfig,
): boolean {
  const current = configSnapshot(right);
  return left.provider === current.provider &&
    left.lifecycle === current.lifecycle &&
    left.environment === current.environment &&
    left.endpoint === current.endpoint &&
    sameRecord(left.secretRef, current.secretRef) &&
    sameRecord(left.activation, current.activation) &&
    sameIntegrationScope(left.scope, current.scope) &&
    left.connectorAccountId === current.connectorAccountId &&
    left.providerAccountId === current.providerAccountId &&
    left.providerTeamId === current.providerTeamId &&
    left.dataRoomId === current.dataRoomId &&
    left.dataRoomFolderId === current.dataRoomFolderId &&
    left.pageSize === current.pageSize &&
    left.timeoutMs === current.timeoutMs &&
    left.maxAttempts === current.maxAttempts &&
    left.maxDelayMs === current.maxDelayMs;
}

function sameIntegrationScope(
  left: IntegrationScope,
  right: IntegrationScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId &&
    left.dealId === right.dealId;
}

function sameRecord(
  left: Readonly<Record<string, unknown>>,
  right: Readonly<Record<string, unknown>>,
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => left[key] === right[key]);
}

function readClaim(value: unknown): PapermarkCallClaim | undefined {
  if (!isObject(value) || value[callAuthorizationBrand] !== true) {
    return undefined;
  }
  return claimRegistry.get(value);
}

function invalidAuthorizationError(): Error {
  return new Error(
    "Papermark call authorization is invalid; expected a private claim bound to current platform authorization, exact configuration, scope, and transport dependencies.",
  );
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}
