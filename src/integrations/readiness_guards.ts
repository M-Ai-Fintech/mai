import type {
  IntegrationEnvironment,
  IntegrationProvider,
  ProviderLifecycle,
} from "./contracts.ts";

const coordinatorAuthorizationBrand: unique symbol = Symbol(
  "coordinator-authorization",
);

export interface CoordinatorAuthorization {
  readonly authorizationReference: string;
  readonly [coordinatorAuthorizationBrand]: "coordinator";
}

/**
 * Checks a coordinator-issued, claim-bound authorization marker.
 *
 * @example hasCoordinatorAuthorization(undefined)
 */
export function hasCoordinatorAuthorization(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const candidate = value as Partial<CoordinatorAuthorization>;
  return candidate[coordinatorAuthorizationBrand] === "coordinator" &&
    typeof candidate.authorizationReference === "string" &&
    /^[A-Za-z0-9._-]{1,128}$/.test(candidate.authorizationReference);
}

/**
 * Copies coordinator authority while preserving its private runtime brand.
 *
 * @example canonicalizeCoordinatorAuthorization(undefined)
 */
export function canonicalizeCoordinatorAuthorization(
  value: unknown,
): CoordinatorAuthorization | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new Error(
      "Readiness coordinator authorization is invalid; expected coordinator-owned authorization metadata.",
    );
  }
  const candidate = value as Partial<CoordinatorAuthorization>;
  const authorizationReference = candidate.authorizationReference;
  if (
    candidate[coordinatorAuthorizationBrand] !== "coordinator" ||
    typeof authorizationReference !== "string" ||
    !/^[A-Za-z0-9._-]{1,128}$/.test(authorizationReference)
  ) {
    throw new Error(
      "Readiness coordinator authorization is invalid; expected coordinator-owned authorization metadata.",
    );
  }
  return Object.freeze({
    authorizationReference,
    [coordinatorAuthorizationBrand]: "coordinator" as const,
  });
}

/**
 * Rejects readiness targets that contradict provider lifecycle ownership.
 *
 * @example assertReadinessProviderTarget("fixture", "fixture", "enabled")
 */
export function assertReadinessProviderTarget(
  provider: IntegrationProvider,
  target: IntegrationEnvironment,
  lifecycle: ProviderLifecycle,
): void {
  assertFixtureTarget(provider, target);
  assertDeferredTarget(provider, target, lifecycle);
}

function assertFixtureTarget(
  provider: IntegrationProvider,
  target: IntegrationEnvironment,
): void {
  if (provider === "fixture" && target !== "fixture") {
    throw new Error(
      `Fixture readiness provider cannot evaluate target "${target}"; expected fixture target.`,
    );
  }
  if (target === "fixture" && provider !== "fixture") {
    throw new Error(
      `Readiness target "fixture" requires the fixture provider; received "${provider}".`,
    );
  }
}

function assertDeferredTarget(
  provider: IntegrationProvider,
  target: IntegrationEnvironment,
  lifecycle: ProviderLifecycle,
): void {
  if (provider === "ideals" || provider === "intralinks") {
    if (target !== "interface-only" || lifecycle !== "deferred") {
      throw new Error(
        `Deferred provider "${provider}" cannot claim readiness target "${target}" or lifecycle "${lifecycle}".`,
      );
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
