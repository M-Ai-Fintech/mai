import {
  type IntegrationEnvironment,
  type IntegrationScope,
  sameIntegrationScope,
} from "../contracts.ts";
import type { PapermarkAdapterConfig } from "./config.ts";

const callAuthorizationBrand: unique symbol = Symbol(
  "papermark-call-authorization",
);
const claimRegistry = new WeakMap<object, PapermarkCallClaim>();

export type PapermarkCallAuthorization = {
  readonly [callAuthorizationBrand]: true;
};

interface PapermarkCallClaim {
  readonly provider: "papermark";
  readonly environment: IntegrationEnvironment;
  readonly endpoint: string;
  readonly providerVersion: string;
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;
  readonly folderId: string;
}

/**
 * Creates a synthetic authority token for fake-I/O tests only.
 *
 * @example createSyntheticPapermarkCallAuthorizationForTests(config)
 */
export function createSyntheticPapermarkCallAuthorizationForTests(
  config: PapermarkAdapterConfig,
): PapermarkCallAuthorization {
  if (Deno.env.get("DENO_ENV") !== "test") {
    throw new Error(
      "Synthetic Papermark call authorization requires DENO_ENV=test; expected test-only fake I/O.",
    );
  }
  const token = Object.freeze({ [callAuthorizationBrand]: true });
  claimRegistry.set(token, claimFor(config));
  return token as PapermarkCallAuthorization;
}

/**
 * Revalidates exact claim-bound authority immediately before a provider effect.
 *
 * @example assertPapermarkCallAuthorization(authorization, config)
 */
export function assertPapermarkCallAuthorization(
  authorization: unknown,
  config: PapermarkAdapterConfig,
): asserts authorization is PapermarkCallAuthorization {
  const claim = readClaim(authorization);
  if (claim === undefined || !sameClaim(claim, claimFor(config))) {
    throw new Error(
      "Papermark call authorization is invalid; expected a private claim bound to the exact provider, environment, endpoint, version, scope, connector account, workspace, and folder.",
    );
  }
}

function readClaim(value: unknown): PapermarkCallClaim | undefined {
  if (!isObject(value)) return undefined;
  if (value[callAuthorizationBrand] !== true) return undefined;
  return claimRegistry.get(value);
}

function claimFor(config: PapermarkAdapterConfig): PapermarkCallClaim {
  const activation = config.configuration.activation;
  const endpoint = config.configuration.endpoint;
  if (
    config.provider !== "papermark" ||
    config.configuration.provider !== "papermark" ||
    activation === undefined ||
    endpoint === undefined
  ) {
    throw new Error(
      "Papermark call authorization cannot be bound; expected enabled configuration with endpoint and activation version.",
    );
  }
  return Object.freeze({
    provider: config.provider,
    environment: config.configuration.environment,
    endpoint,
    providerVersion: activation.providerVersion,
    scope: Object.freeze({ ...config.binding.scope }),
    connectorAccountId: config.binding.connectorAccount.id,
    providerWorkspaceId: config.binding.providerWorkspaceId,
    folderId: config.binding.folderId,
  });
}

function sameClaim(
  left: PapermarkCallClaim,
  right: PapermarkCallClaim,
): boolean {
  return left.provider === right.provider &&
    left.environment === right.environment &&
    left.endpoint === right.endpoint &&
    left.providerVersion === right.providerVersion &&
    sameIntegrationScope(left.scope, right.scope) &&
    left.connectorAccountId === right.connectorAccountId &&
    left.providerWorkspaceId === right.providerWorkspaceId &&
    left.folderId === right.folderId;
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}
