import {
  action,
  type ActorReference,
  evaluateAuthorization,
  resourceKind,
} from "../../platform/authz/v1.ts";
import type { RequestContext } from "../../shared/contracts/request_context.ts";
import {
  createNormalizedIntegrationFailure,
  normalizeIntegrationFailure,
} from "../failures.ts";
import type {
  ConfiguredProviderSelection,
  ProviderSelectionResult,
} from "../provider_selection.ts";
import type { IntegrationScope } from "../contracts.ts";
import {
  type PapermarkAdapterConfig,
  type PapermarkAdapterConfigInput,
  type PapermarkConnectorBinding,
  type PapermarkProviderAccountBinding,
  parsePapermarkAdapterConfig,
} from "./config.ts";
import {
  issuePapermarkCallAuthorization,
  type PapermarkAuthorizationRequest,
  type PapermarkAuthorizationState,
  type PapermarkCallDependencies,
} from "./authorization.ts";
import { PapermarkIntegrationAdapter } from "./adapter.ts";
import { freezeSelectedAdapter } from "../selected_adapter.ts";

export interface PapermarkAuthorizationInput {
  readonly policy: Omit<
    PapermarkAuthorizationRequest,
    "context" | "actor" | "scope"
  >;
  readonly currentRequest?: () => PapermarkAuthorizationRequest;
}

export type PapermarkIntegrationAdapterFactory = (
  config: PapermarkAdapterConfig,
  dependencies: PapermarkCallDependencies & {
    readonly authorization:
      import("./authorization.ts").PapermarkCallAuthorization;
  },
) => PapermarkIntegrationAdapter | Promise<PapermarkIntegrationAdapter>;

export interface PapermarkIntegrationCompositionInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: IntegrationScope;
  readonly connectorAccount: PapermarkConnectorBinding;
  readonly providerAccount: PapermarkProviderAccountBinding;
  readonly dataRoomId: string;
  readonly dataRoomFolderId: string;
  readonly configuration: PapermarkAdapterConfigInput["configuration"];
  readonly pageSize?: number;
  readonly timeoutMs?: number;
  readonly retry?: PapermarkAdapterConfigInput["retry"];
  readonly capability: "list_documents";
  readonly authorization: PapermarkAuthorizationInput;
  readonly dependencies: PapermarkCallDependencies;
  readonly adapterFactory?: PapermarkIntegrationAdapterFactory;
}

/**
 * Selects a configured Papermark adapter only after platform authorization.
 *
 * @example await selectAuthorizedPapermarkProvider(input)
 */
export async function selectAuthorizedPapermarkProvider(
  input: PapermarkIntegrationCompositionInput,
): Promise<ProviderSelectionResult> {
  let config: PapermarkAdapterConfig;
  try {
    config = parseConfig(input);
  } catch {
    return blocked(input, "invalid", "INVALID_REQUEST");
  }
  try {
    assertAuthorizationShape(input, config);
  } catch {
    return blocked(input, "unauthorized", "AUTHORIZATION_DENIED");
  }
  const initial = authorizedState(input, config);
  if (initial.decision.outcome === "deny") {
    return blocked(input, "unauthorized", "AUTHORIZATION_DENIED");
  }
  const revalidate = () => currentAuthorizedState(input, config);
  try {
    const authorization = issuePapermarkCallAuthorization({
      config,
      dependencies: input.dependencies,
      context: input.context,
      actor: input.actor,
      scope: input.scope,
      authorized: initial,
      revalidate,
    });
    const adapterDependencies = {
      ...input.dependencies,
      authorization,
    };
    const adapter = input.adapterFactory === undefined
      ? new PapermarkIntegrationAdapter(config, adapterDependencies)
      : await input.adapterFactory(config, adapterDependencies);
    return configuredSelection(config, adapter);
  } catch (error) {
    const failure = normalizeIntegrationFailure({
      provider: "papermark",
      operation: "construct_adapter",
      error,
    });
    return blocked(
      input,
      failure.code === "AUTHORIZATION_DENIED" ? "unauthorized" : "unavailable",
      failure.code,
    );
  }
}

function parseConfig(
  input: PapermarkIntegrationCompositionInput,
): PapermarkAdapterConfig {
  return parsePapermarkAdapterConfig({
    configuration: input.configuration,
    scope: input.scope,
    connectorAccount: input.connectorAccount,
    providerAccount: input.providerAccount,
    dataRoomId: input.dataRoomId,
    dataRoomFolderId: input.dataRoomFolderId,
    ...(input.pageSize === undefined ? {} : { pageSize: input.pageSize }),
    ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
    ...(input.retry === undefined ? {} : { retry: input.retry }),
  });
}

function authorizedState(
  input: PapermarkIntegrationCompositionInput,
  config: PapermarkAdapterConfig,
): PapermarkAuthorizationState {
  const request = authorizationRequest(input, config);
  return { request, decision: evaluateAuthorization(request) };
}

function currentAuthorizedState(
  input: PapermarkIntegrationCompositionInput,
  config: PapermarkAdapterConfig,
): PapermarkAuthorizationState {
  const request = input.authorization.currentRequest?.() ??
    authorizationRequest(input, config);
  assertCurrentRequestBinding(input, config, request);
  return { request, decision: evaluateAuthorization(request) };
}

function authorizationRequest(
  input: PapermarkIntegrationCompositionInput,
  config: PapermarkAdapterConfig,
): PapermarkAuthorizationRequest {
  return {
    ...input.authorization.policy,
    context: input.context,
    actor: input.actor,
    scope: config.binding.scope,
  };
}

function assertAuthorizationShape(
  input: PapermarkIntegrationCompositionInput,
  config: PapermarkAdapterConfig,
): void {
  const request = authorizationRequest(input, config);
  if (
    request.action !== action(input.capability) ||
    request.resource.kind !== resourceKind("papermark_dataroom") ||
    request.resource.id !== config.binding.dataRoomId
  ) {
    throw new Error(
      "Papermark authorization resource is not exact; value=<redacted>.",
    );
  }
  assertCurrentRequestBinding(input, config, request);
}

function assertCurrentRequestBinding(
  input: PapermarkIntegrationCompositionInput,
  config: PapermarkAdapterConfig,
  request: PapermarkAuthorizationRequest,
): void {
  if (
    request.context.actorId !== input.actor.id ||
    request.actor.id !== input.actor.id ||
    request.context.tenantId !== config.binding.scope.tenantId ||
    request.context.workspaceId !== config.binding.scope.workspaceId ||
    request.context.dealId !== config.binding.scope.dealId ||
    request.actor.kind !== input.actor.kind ||
    request.scope.tenantId !== config.binding.scope.tenantId ||
    request.scope.workspaceId !== config.binding.scope.workspaceId ||
    request.scope.dealId !== config.binding.scope.dealId ||
    request.resource.id !== config.binding.dataRoomId ||
    request.resource.kind !== resourceKind("papermark_dataroom") ||
    request.action !== action(input.capability) ||
    request.capability !== input.capability ||
    request.connectorAccountId !== config.binding.connectorAccount.id ||
    request.providerAccountId !== config.binding.providerAccount.accountId ||
    request.providerTeamId !== config.binding.providerAccount.teamId ||
    request.dataRoomId !== config.binding.dataRoomId ||
    request.dataRoomFolderId !== config.binding.dataRoomFolderId
  ) {
    throw new Error(
      "Papermark authorization binding is not exact; value=<redacted>.",
    );
  }
}

function configuredSelection(
  config: PapermarkAdapterConfig,
  adapter: PapermarkIntegrationAdapter,
): ConfiguredProviderSelection {
  return Object.freeze({
    kind: "configured",
    status: "selected",
    source: "provider",
    synthetic: false,
    readiness: "not-claimed",
    provider: "papermark",
    environment: config.configuration.environment,
    scope: config.binding.scope,
    connectorAccountId: config.binding.connectorAccount.id,
    providerResourceId: config.binding.dataRoomId,
    providerAccountId: config.binding.providerAccount.accountId,
    providerTeamId: config.binding.providerAccount.teamId,
    providerFolderId: config.binding.dataRoomFolderId,
    dataRoomId: config.binding.dataRoomId,
    dataRoomFolderId: config.binding.dataRoomFolderId,
    adapter: freezeSelectedAdapter(adapter),
  });
}

function blocked(
  input: PapermarkIntegrationCompositionInput,
  reason: "invalid" | "unauthorized" | "unavailable",
  code: Parameters<typeof createNormalizedIntegrationFailure>[0]["code"],
): ProviderSelectionResult {
  return Object.freeze({
    kind: "blocked",
    status: "blocked",
    provider: "papermark" as const,
    reason,
    scope: input.scope,
    connectorAccountId: input.connectorAccount.id,
    providerResourceId: input.dataRoomId,
    failure: createNormalizedIntegrationFailure({
      provider: "papermark",
      operation: "select_provider",
      code,
    }),
  });
}
