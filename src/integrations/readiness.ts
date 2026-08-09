import {
  INTEGRATION_PROVIDERS,
  type IntegrationEnvironment,
  type IntegrationProvider,
  type ProviderLifecycle,
} from "./contracts.ts";
import {
  assertReadinessProviderTarget,
  type CoordinatorAuthorization,
  hasCoordinatorAuthorization,
} from "./readiness_guards.ts";
import { assertReadinessEvidenceShape } from "./readiness_validation.ts";

export type { CoordinatorAuthorization } from "./readiness_guards.ts";

export type ReadinessState =
  | "interface-only"
  | "fixture"
  | "local-development"
  | "sandbox-certification"
  | "production-candidate"
  | "production-verified"
  | "deferred"
  | "disabled"
  | "unavailable"
  | "gated"
  | "partially-implemented";

export type ReadinessTarget = Extract<
  ReadinessState,
  IntegrationEnvironment
>;

export const READINESS_GATES = [
  "interface-contract",
  "fixture-conformance",
  "coordinator-authorization",
  "configuration",
  "credentials",
  "provider-version",
  "license",
  "endpoint",
  "connector-account",
  "health",
  "capabilities",
  "failure-normalization",
  "authorization",
  "pagination",
  "scope-isolation",
  "classification",
  "residency",
  "retention",
  "deletion",
  "legal-hold",
  "recovery",
  "rollback",
  "secret-redaction",
  "production-environment",
  "production-security",
  "production-observation",
  "production-recovery",
] as const;

export type ReadinessGate = typeof READINESS_GATES[number];

export type ReadinessEvidenceSource =
  | "interface-test"
  | "fixture-test"
  | "local-runtime"
  | "sandbox-run"
  | "production-review"
  | "production-verification";

export interface ReadinessEvidenceInput {
  readonly evidenceId: string;
  readonly provider: IntegrationProvider;
  readonly environment: ReadinessTarget;
  readonly providerVersion: string;
  readonly environmentId: string;
  readonly gate: ReadinessGate;
  readonly outcome: "passed" | "failed";
  readonly source: ReadinessEvidenceSource;
  readonly capturedAt: Date;
  readonly artifactDigest: string;
}

export interface ReadinessEvidence extends ReadinessEvidenceInput {}

export interface ReadinessEvaluationRequest {
  readonly provider: IntegrationProvider;
  readonly target: ReadinessTarget;
  readonly providerVersion: string;
  readonly environmentId: string;
  readonly lifecycle: ProviderLifecycle;
  readonly configured: boolean;
  readonly implementation: "complete" | "partial";
  readonly evidence: readonly ReadinessEvidence[];
  readonly coordinatorAuthorization?: CoordinatorAuthorization;
}

export interface ReadinessEvaluation {
  readonly state: ReadinessState;
  readonly target: ReadinessTarget;
  readonly matchedEvidenceIds: readonly string[];
  readonly missingGates: readonly ReadinessGate[];
}

export interface ReadinessRegister {
  readonly evidence: readonly ReadinessEvidence[];
  appendEvidence(evidence: ReadinessEvidence): ReadinessRegister;
  evaluate(
    request: Omit<ReadinessEvaluationRequest, "evidence">,
  ): ReadinessEvaluation;
}

const REQUIRED_GATES: Readonly<
  Record<ReadinessTarget, readonly ReadinessGate[]>
> = {
  "interface-only": ["interface-contract"],
  fixture: ["interface-contract", "fixture-conformance"],
  "local-development": [
    "interface-contract",
    "configuration",
    "credentials",
    "endpoint",
    "health",
    "capabilities",
    "failure-normalization",
    "scope-isolation",
    "secret-redaction",
  ],
  "sandbox-certification": [
    "interface-contract",
    "coordinator-authorization",
    "configuration",
    "credentials",
    "provider-version",
    "license",
    "endpoint",
    "connector-account",
    "health",
    "capabilities",
    "failure-normalization",
    "authorization",
    "pagination",
    "scope-isolation",
    "classification",
    "residency",
    "retention",
    "deletion",
    "legal-hold",
    "recovery",
    "rollback",
    "secret-redaction",
  ],
  "production-candidate": [
    "interface-contract",
    "coordinator-authorization",
    "configuration",
    "credentials",
    "provider-version",
    "license",
    "endpoint",
    "connector-account",
    "health",
    "capabilities",
    "failure-normalization",
    "authorization",
    "pagination",
    "scope-isolation",
    "classification",
    "residency",
    "retention",
    "deletion",
    "legal-hold",
    "recovery",
    "rollback",
    "secret-redaction",
    "production-environment",
    "production-security",
  ],
  "production-verified": [
    "interface-contract",
    "coordinator-authorization",
    "configuration",
    "credentials",
    "provider-version",
    "license",
    "endpoint",
    "connector-account",
    "health",
    "capabilities",
    "failure-normalization",
    "authorization",
    "pagination",
    "scope-isolation",
    "classification",
    "residency",
    "retention",
    "deletion",
    "legal-hold",
    "recovery",
    "rollback",
    "secret-redaction",
    "production-environment",
    "production-security",
    "production-observation",
    "production-recovery",
  ],
};

/**
 * Validates and freezes one credential-free readiness evidence record.
 *
 * @example createReadinessEvidence({ evidenceId: "evidence_contract", provider: "papermark", environment: "local-development", providerVersion: "commit-1", environmentId: "local", gate: "configuration", outcome: "passed", source: "local-runtime", capturedAt: new Date(), artifactDigest: "a".repeat(64) })
 */
export function createReadinessEvidence(
  input: ReadinessEvidenceInput,
): ReadinessEvidence {
  assertReadinessEvidenceShape(input);
  assertProvider(input.provider);
  assertTarget(input.environment);
  assertIdentifier(input.evidenceId, "evidence ID");
  assertIdentifier(input.providerVersion, "provider version");
  assertIdentifier(input.environmentId, "environment ID");
  assertGate(input.gate);
  assertDate(input.capturedAt);
  assertDigest(input.artifactDigest);
  assertSource(input.environment, input.source);
  if (input.outcome !== "passed" && input.outcome !== "failed") {
    throw new Error(
      `Readiness evidence outcome "${
        String(input.outcome)
      }" is invalid; expected passed or failed.`,
    );
  }
  const capturedAtEpoch = input.capturedAt.getTime();
  const evidence: ReadinessEvidence = {
    evidenceId: input.evidenceId,
    provider: input.provider,
    environment: input.environment,
    providerVersion: input.providerVersion,
    environmentId: input.environmentId,
    gate: input.gate,
    outcome: input.outcome,
    source: input.source,
    get capturedAt(): Date {
      return new Date(capturedAtEpoch);
    },
    artifactDigest: input.artifactDigest,
  };
  return Object.freeze(evidence);
}

/**
 * Returns the gates required for an exact readiness target.
 *
 * @example requiredReadinessGates("local-development")
 */
export function requiredReadinessGates(
  target: ReadinessTarget,
): readonly ReadinessGate[] {
  assertTarget(target);
  return Object.freeze([...REQUIRED_GATES[target]]);
}

/**
 * Evaluates immutable evidence without promoting a weaker environment claim.
 *
 * @example evaluateReadiness({ provider: "papermark", target: "local-development", providerVersion: "commit-1", environmentId: "local", lifecycle: "enabled", configured: true, implementation: "complete", evidence: [] })
 */
export function evaluateReadiness(
  input: ReadinessEvaluationRequest,
): ReadinessEvaluation {
  assertReadinessRequest(input);
  const missingGates = missingReadinessGates(input);
  const state = readinessState(input, missingGates);
  const matchedEvidenceIds = matchingEvidence(input).map(({ evidenceId }) =>
    evidenceId
  );
  return Object.freeze({
    state,
    target: input.target,
    matchedEvidenceIds: Object.freeze(matchedEvidenceIds),
    missingGates: Object.freeze(missingGates),
  });
}

/**
 * Creates an append-only readiness register whose evaluations are recomputed.
 *
 * @example createReadinessRegister().appendEvidence(evidence).evaluate(request)
 */
export function createReadinessRegister(
  initialEvidence: readonly ReadinessEvidence[] = [],
): ReadinessRegister {
  const evidence = freezeEvidence(initialEvidence);
  return Object.freeze({
    evidence,
    appendEvidence: (next: ReadinessEvidence): ReadinessRegister => {
      const checked = createReadinessEvidence(next);
      if (evidence.some((entry) => entry.evidenceId === checked.evidenceId)) {
        throw new Error(
          `Readiness evidence ID "${checked.evidenceId}" is duplicated; expected immutable unique evidence records.`,
        );
      }
      return createReadinessRegister([...evidence, checked]);
    },
    evaluate: (
      request: Omit<ReadinessEvaluationRequest, "evidence">,
    ): ReadinessEvaluation => evaluateReadiness({ ...request, evidence }),
  });
}

function freezeEvidence(
  evidence: readonly ReadinessEvidence[],
): readonly ReadinessEvidence[] {
  const ids = new Set<string>();
  const values = evidence.map((entry) => {
    const checked = createReadinessEvidence(entry);
    if (ids.has(checked.evidenceId)) {
      throw new Error(
        `Readiness evidence ID "${checked.evidenceId}" is duplicated; expected immutable unique evidence records.`,
      );
    }
    ids.add(checked.evidenceId);
    return checked;
  });
  return Object.freeze(values);
}

function missingReadinessGates(
  input: ReadinessEvaluationRequest,
): ReadinessGate[] {
  const latest = latestMatchingEvidence(input);
  return requiredReadinessGates(input.target).filter((gate) =>
    gate === "coordinator-authorization"
      ? !hasCoordinatorAuthorization(input.coordinatorAuthorization)
      : latest.get(gate)?.outcome !== "passed"
  );
}

function matchingEvidence(
  input: ReadinessEvaluationRequest,
): ReadinessEvidence[] {
  return input.evidence.filter((evidence) =>
    evidence.gate !== "coordinator-authorization" &&
    evidence.provider === input.provider &&
    evidence.environment === input.target &&
    evidence.providerVersion === input.providerVersion &&
    evidence.environmentId === input.environmentId
  );
}

function latestMatchingEvidence(
  input: ReadinessEvaluationRequest,
): Map<ReadinessGate, ReadinessEvidence> {
  const latest = new Map<ReadinessGate, ReadinessEvidence>();
  for (const evidence of matchingEvidence(input)) {
    const current = latest.get(evidence.gate);
    if (current === undefined || evidence.capturedAt >= current.capturedAt) {
      latest.set(evidence.gate, evidence);
    }
  }
  return latest;
}

function readinessState(
  input: ReadinessEvaluationRequest,
  missingGates: readonly ReadinessGate[],
): ReadinessState {
  if (input.lifecycle === "deferred") return "deferred";
  if (input.lifecycle === "disabled") return "disabled";
  if (input.implementation === "partial") return "partially-implemented";
  if (!input.configured && input.target !== "interface-only") {
    return "unavailable";
  }
  return missingGates.length === 0 ? input.target : "gated";
}

function assertReadinessRequest(input: ReadinessEvaluationRequest): void {
  assertProvider(input.provider);
  assertTarget(input.target);
  assertIdentifier(input.providerVersion, "provider version");
  assertIdentifier(input.environmentId, "environment ID");
  assertReadinessProviderTarget(input.provider, input.target, input.lifecycle);
  if (
    input.coordinatorAuthorization !== undefined &&
    !hasCoordinatorAuthorization(input.coordinatorAuthorization)
  ) {
    throw new Error(
      "Readiness coordinator authorization is invalid; expected coordinator-owned authorization metadata.",
    );
  }
  for (const evidence of input.evidence) createReadinessEvidence(evidence);
}

function assertProvider(provider: IntegrationProvider): void {
  if (INTEGRATION_PROVIDERS.includes(provider)) return;
  throw new Error(
    `Readiness provider "${
      String(provider)
    }" is invalid; expected a registered provider marker.`,
  );
}

function assertTarget(target: ReadinessTarget): void {
  if (
    target === "interface-only" ||
    target === "fixture" ||
    target === "local-development" ||
    target === "sandbox-certification" ||
    target === "production-candidate" ||
    target === "production-verified"
  ) return;
  throw new Error(
    `Readiness target "${
      String(target)
    }" is invalid; expected an evidence-backed environment target.`,
  );
}

function assertGate(gate: ReadinessGate): void {
  if (READINESS_GATES.includes(gate)) return;
  throw new Error(
    `Readiness gate "${
      String(gate)
    }" is invalid; expected a registered evidence gate.`,
  );
}

function assertSource(
  environment: ReadinessTarget,
  source: ReadinessEvidenceSource,
): void {
  const expected = {
    "interface-only": "interface-test",
    fixture: "fixture-test",
    "local-development": "local-runtime",
    "sandbox-certification": "sandbox-run",
    "production-candidate": "production-review",
    "production-verified": "production-verification",
  }[environment];
  if (source === expected) return;
  throw new Error(
    `Readiness evidence source "${source}" does not match environment "${environment}"; expected "${expected}".`,
  );
}

function assertIdentifier(value: string, label: string): void {
  if (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    value.trim() === value &&
    /^[A-Za-z0-9._-]+$/.test(value)
  ) return;
  throw new Error(
    `${label} "${
      String(value)
    }" is invalid; expected 1-128 safe identifier characters.`,
  );
}

function assertDate(value: Date): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `Readiness evidence timestamp "${
      String(value)
    }" is invalid; expected a valid Date.`,
  );
}

function assertDigest(value: string): void {
  if (/^[0-9a-f]{64}$/.test(value)) return;
  throw new Error(
    `Readiness artifact digest "${
      String(value)
    }" is invalid; expected a lowercase SHA-256 digest.`,
  );
}
