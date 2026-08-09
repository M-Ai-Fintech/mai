import {
  CAPABILITY_STATUSES,
  type CapabilityObservation,
  type CapabilityObservationSource,
  type CapabilitySnapshot,
  type CapabilitySnapshotInput,
  type CapabilityStatus,
  HEALTH_CHECK_STATES,
  type HealthCheck,
  type HealthCheckState,
  type HealthSnapshot,
  type HealthSnapshotInput,
  INTEGRATION_CAPABILITIES,
  INTEGRATION_ENVIRONMENTS,
  INTEGRATION_FAILURE_CODES,
  INTEGRATION_PROVIDERS,
  type IntegrationCapability,
  type IntegrationEnvironment,
  type IntegrationFailureCode,
  type IntegrationProvider,
  type IntegrationScope,
  parseIntegrationScope,
  PROVIDER_LIFECYCLES,
  type ProviderLifecycle,
} from "./contracts.ts";
import {
  assertKnownKeys,
  assertRecord,
  rejectInlineCredentialKeys,
} from "./configuration_validation.ts";

const CAPABILITY_SNAPSHOT_KEYS = new Set([
  "provider",
  "environment",
  "lifecycle",
  "configured",
  "source",
  "scope",
  "requested",
  "observations",
  "observedAt",
]);
const HEALTH_SNAPSHOT_KEYS = new Set([
  "provider",
  "environment",
  "lifecycle",
  "configured",
  "scope",
  "checks",
  "observedAt",
]);
const SCOPE_KEYS = new Set(["tenantId", "workspaceId", "dealId"]);
const OBSERVATION_KEYS = new Set(["capability", "status", "reasonCode"]);
const HEALTH_CHECK_KEYS = new Set(["name", "state"]);

/**
 * Validates and freezes an explicit capability observation set.
 *
 * @example createCapabilitySnapshot({ provider: "fixture", environment: "fixture", lifecycle: "enabled", configured: true, source: "fixture", scope, requested: ["list_documents"], observations: [{ capability: "list_documents", status: "supported" }], observedAt: new Date() })
 */
export function createCapabilitySnapshot(
  input: CapabilitySnapshotInput,
): CapabilitySnapshot {
  assertSnapshotShape(
    input,
    CAPABILITY_SNAPSHOT_KEYS,
    "capability snapshot",
  );
  assertProvider(input.provider);
  assertEnvironment(input.environment);
  assertLifecycle(input.lifecycle);
  assertBoolean(input.configured, "Capability configured flag");
  const scope = parseSnapshotScope(input.scope);
  assertDate(input.observedAt, "Capability observation timestamp");
  assertCapabilitySource(input.source, input.environment);
  assertCapabilityList(input.requested, "Capability request");
  assertCapabilityList(input.observations, "Capability observations");
  const requested = uniqueCapabilities(input.requested);
  const observations = validateObservations(input.observations, requested);
  if (
    (input.lifecycle !== "enabled" || !input.configured) &&
    observations.some(({ status }) => status === "supported")
  ) {
    throw new Error(
      `Provider "${input.provider}" capability snapshot must not claim supported capabilities while disabled or unconfigured.`,
    );
  }
  const observedAtEpoch = input.observedAt.getTime();
  const snapshot: CapabilitySnapshot = {
    provider: input.provider,
    environment: input.environment,
    lifecycle: input.lifecycle,
    configured: input.configured,
    source: input.source,
    scope,
    requested: Object.freeze(requested),
    observations: Object.freeze(observations),
    get observedAt(): Date {
      return new Date(observedAtEpoch);
    },
  };
  return Object.freeze(snapshot);
}

/**
 * Derives fail-closed health from lifecycle, configuration, and checks.
 *
 * @example createHealthSnapshot({ provider: "papermark", environment: "local-development", lifecycle: "enabled", configured: true, scope, checks: [{ name: "endpoint", state: "passed" }], observedAt: new Date() })
 */
export function createHealthSnapshot(
  input: HealthSnapshotInput,
): HealthSnapshot {
  assertSnapshotShape(input, HEALTH_SNAPSHOT_KEYS, "health snapshot");
  assertProvider(input.provider);
  assertEnvironment(input.environment);
  assertLifecycle(input.lifecycle);
  assertBoolean(input.configured, "Health configured flag");
  const scope = parseSnapshotScope(input.scope);
  assertDate(input.observedAt, "Health observation timestamp");
  assertHealthCheckList(input.checks);
  const checks = validateHealthChecks(input.checks);
  const observedAtEpoch = input.observedAt.getTime();
  const snapshot: HealthSnapshot = {
    provider: input.provider,
    environment: input.environment,
    lifecycle: input.lifecycle,
    configured: input.configured,
    scope,
    checks: Object.freeze(checks),
    state: deriveHealthState(input.lifecycle, input.configured, checks),
    get observedAt(): Date {
      return new Date(observedAtEpoch);
    },
  };
  return Object.freeze(snapshot);
}

function assertSnapshotShape(
  value: unknown,
  keys: ReadonlySet<string>,
  label: string,
): asserts value is Record<string, unknown> {
  assertRecord(value, label);
  rejectInlineCredentialKeys(value);
  assertKnownKeys(value, keys, label);
}

function parseSnapshotScope(value: unknown): IntegrationScope {
  assertRecord(value, "integration scope");
  rejectInlineCredentialKeys(value);
  assertKnownKeys(value, SCOPE_KEYS, "integration scope");
  const parsed = parseIntegrationScope(value);
  return Object.freeze({
    tenantId: parsed.tenantId,
    workspaceId: parsed.workspaceId,
    dealId: parsed.dealId,
  });
}

function assertProvider(provider: IntegrationProvider): void {
  if (INTEGRATION_PROVIDERS.includes(provider)) return;
  throw new Error(
    `Integration provider "${
      String(provider)
    }" is invalid; expected a registered provider marker.`,
  );
}

function assertEnvironment(environment: IntegrationEnvironment): void {
  if (INTEGRATION_ENVIRONMENTS.includes(environment)) return;
  throw new Error(
    `Integration environment "${
      String(environment)
    }" is invalid; expected an approved environment state.`,
  );
}

function assertLifecycle(lifecycle: ProviderLifecycle): void {
  if ((PROVIDER_LIFECYCLES as readonly unknown[]).includes(lifecycle)) return;
  throw new Error(
    `Provider lifecycle "${
      String(lifecycle)
    }" is invalid; expected enabled, disabled, or deferred.`,
  );
}

function assertBoolean(value: boolean, label: string): void {
  if (typeof value === "boolean") return;
  throw new Error(
    `${label} "${String(value)}" is invalid; expected a boolean value.`,
  );
}

function assertCapabilitySource(
  source: CapabilityObservationSource,
  environment: IntegrationEnvironment,
): void {
  if (
    source !== "provider" && source !== "implementation" &&
    source !== "fixture"
  ) {
    throw new Error(
      `Capability evidence source "${
        String(source)
      }" is invalid; expected provider, implementation, or fixture.`,
    );
  }
  if (source === "fixture" && environment !== "fixture") {
    throw new Error(
      `Fixture capability evidence uses environment "${environment}"; expected fixture environment.`,
    );
  }
  if (source !== "fixture" && environment === "fixture") {
    throw new Error(
      `Capability evidence source "${source}" uses fixture environment; expected a real provider environment.`,
    );
  }
}

function assertCapabilityList(
  value: readonly unknown[],
  label: string,
): void {
  if (Array.isArray(value)) return;
  throw new Error(
    `${label} "${
      String(value)
    }" is invalid; expected an array of explicit values.`,
  );
}

function assertHealthCheckList(value: readonly unknown[]): void {
  if (Array.isArray(value)) return;
  throw new Error(
    `Provider health checks "${
      String(value)
    }" are invalid; expected an array of explicit checks.`,
  );
}

function uniqueCapabilities(
  capabilities: readonly IntegrationCapability[],
): IntegrationCapability[] {
  if (capabilities.length === 0) {
    throw new Error(
      "Capability request is empty; expected at least one explicit capability.",
    );
  }
  const unique = new Set<IntegrationCapability>();
  for (const capability of capabilities) {
    assertCapability(capability);
    if (unique.has(capability)) {
      throw new Error(
        `Capability "${capability}" is duplicated; expected one observation per requested capability.`,
      );
    }
    unique.add(capability);
  }
  return [...unique];
}

function validateObservations(
  observations: readonly unknown[],
  requested: readonly IntegrationCapability[],
): CapabilityObservation[] {
  const values = observations.map((observation) =>
    parseCapabilityObservation(observation)
  );
  const observed = new Set<IntegrationCapability>();
  for (const observation of values) {
    assertCapability(observation.capability);
    assertCapabilityStatus(observation.status);
    if (observed.has(observation.capability)) {
      throw new Error(
        `Capability "${observation.capability}" is observed more than once; expected one status.`,
      );
    }
    observed.add(observation.capability);
    if (observation.reasonCode !== undefined) {
      assertFailureCode(observation.reasonCode);
    }
    if (
      observation.status === "supported" &&
      observation.reasonCode !== undefined
    ) {
      throw new Error(
        `Capability "${observation.capability}" has reason "${observation.reasonCode}"; supported capabilities must not carry a failure reason.`,
      );
    }
    if (
      observation.status !== "supported" &&
      observation.reasonCode === undefined
    ) {
      throw new Error(
        `Capability "${observation.capability}" is ${observation.status}; expected an explicit normalized failure reason.`,
      );
    }
  }
  const missing = requested.filter((capability) => !observed.has(capability));
  if (missing.length > 0) {
    throw new Error(
      `Capability observations omit "${
        missing.join(",")
      }"; expected every requested capability explicitly.`,
    );
  }
  const extra = [...observed].filter((capability) =>
    !requested.includes(capability)
  );
  if (extra.length > 0) {
    throw new Error(
      `Capability observations include "${
        extra.join(",")
      }" that were not requested; expected exact requested and observed capability sets.`,
    );
  }
  return values;
}

function parseCapabilityObservation(value: unknown): CapabilityObservation {
  assertRecord(value, "capability observation");
  rejectInlineCredentialKeys(value);
  assertKnownKeys(value, OBSERVATION_KEYS, "capability observation");
  assertCapability(value.capability as IntegrationCapability);
  assertCapabilityStatus(value.status as CapabilityStatus);
  const reasonCode = value.reasonCode === undefined
    ? undefined
    : value.reasonCode as IntegrationFailureCode;
  if (reasonCode !== undefined) assertFailureCode(reasonCode);
  const capability = value.capability as IntegrationCapability;
  const status = value.status as CapabilityStatus;
  if (reasonCode === undefined) {
    return Object.freeze({ capability, status });
  }
  return Object.freeze({ capability, status, reasonCode });
}

function assertCapabilityStatus(status: CapabilityStatus): void {
  if ((CAPABILITY_STATUSES as readonly unknown[]).includes(status)) return;
  throw new Error(
    `Capability status "${
      String(status)
    }" is invalid; expected supported, denied, or unavailable.`,
  );
}

function assertFailureCode(code: IntegrationFailureCode): void {
  if ((INTEGRATION_FAILURE_CODES as readonly unknown[]).includes(code)) return;
  throw new Error(
    `Capability failure reason "${
      String(code)
    }" is invalid; expected a normalized integration failure code.`,
  );
}

function assertCapability(capability: IntegrationCapability): void {
  if (INTEGRATION_CAPABILITIES.includes(capability)) return;
  throw new Error(
    `Integration capability "${
      String(capability)
    }" is invalid; expected a registered capability.`,
  );
}

function validateHealthChecks(checks: readonly unknown[]): HealthCheck[] {
  if (checks.length === 0) {
    throw new Error(
      "Provider health checks are empty; expected explicit dependency checks.",
    );
  }
  const names = new Set<string>();
  return checks.map((value) => {
    assertRecord(value, "provider health check");
    rejectInlineCredentialKeys(value);
    assertKnownKeys(value, HEALTH_CHECK_KEYS, "provider health check");
    if (
      typeof value.name !== "string" || !value.name.trim() ||
      value.name.length > 128
    ) {
      throw new Error(
        `Provider health check name "${
          String(value.name)
        }" is invalid; expected 1-128 non-whitespace characters.`,
      );
    }
    assertHealthCheckState(value.state as HealthCheckState);
    if (names.has(value.name)) {
      throw new Error(
        `Provider health check "${value.name}" is duplicated; expected one result per check.`,
      );
    }
    names.add(value.name);
    return Object.freeze({
      name: value.name,
      state: value.state as HealthCheckState,
    });
  });
}

function assertHealthCheckState(state: HealthCheckState): void {
  if ((HEALTH_CHECK_STATES as readonly unknown[]).includes(state)) return;
  throw new Error(
    `Provider health check state "${
      String(state)
    }" is invalid; expected passed, failed, unavailable, or skipped.`,
  );
}

function deriveHealthState(
  lifecycle: ProviderLifecycle,
  configured: boolean,
  checks: readonly HealthCheck[],
): HealthSnapshot["state"] {
  if (lifecycle === "disabled") return "disabled";
  if (lifecycle === "deferred") return "deferred";
  if (!configured) return "unavailable";
  if (
    checks.some(({ state }) => state === "unavailable" || state === "skipped")
  ) {
    return "unavailable";
  }
  if (checks.some(({ state }) => state === "failed")) return "degraded";
  return "healthy";
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `${label} "${
      String(value)
    }" is invalid; expected a valid Date supplied by the caller.`,
  );
}
