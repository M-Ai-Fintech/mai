import {
  type IntegrationEnvironment,
  type IntegrationProvider,
  type ProviderLifecycle,
} from "./contracts.ts";
import {
  type CoordinatorAuthorization,
  hasCoordinatorAuthorization,
} from "./readiness_guards.ts";
import { canonicalizeReadinessRequest } from "./readiness_inputs.ts";
import {
  assertReadinessDate,
  assertReadinessIdentifier,
  assertReadinessProvider,
  assertReadinessTarget,
} from "./readiness_assertions.ts";
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
  "authenticated-room-lifecycle",
  "folder-lifecycle",
  "document-lifecycle",
  "permissions",
  "invalid-credentials",
  "expired-credentials",
  "provider-unavailable",
  "malformed-response",
  "timeout-retry",
  "rate-limit",
  "cleanup",
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
  readonly evaluatedAt: Date;
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

const PAPERMARK_PROFILE_GATES: readonly ReadinessGate[] = [
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
  "authenticated-room-lifecycle",
  "folder-lifecycle",
  "document-lifecycle",
  "permissions",
  "invalid-credentials",
  "expired-credentials",
  "provider-unavailable",
  "malformed-response",
  "timeout-retry",
  "rate-limit",
  "cleanup",
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
];

const REQUIRED_GATES: Readonly<
  Record<ReadinessTarget, readonly ReadinessGate[]>
> = {
  "interface-only": ["interface-contract"],
  fixture: ["interface-contract", "fixture-conformance"],
  "local-development": PAPERMARK_PROFILE_GATES,
  "sandbox-certification": PAPERMARK_PROFILE_GATES,
  "production-candidate": [
    ...PAPERMARK_PROFILE_GATES,
    "production-environment",
    "production-security",
  ],
  "production-verified": [
    ...PAPERMARK_PROFILE_GATES,
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
  const snapshot = {
    evidenceId: input.evidenceId,
    provider: input.provider,
    environment: input.environment,
    providerVersion: input.providerVersion,
    environmentId: input.environmentId,
    gate: input.gate,
    outcome: input.outcome,
    source: input.source,
    capturedAt: input.capturedAt,
    artifactDigest: input.artifactDigest,
  };
  assertReadinessProvider(snapshot.provider);
  assertReadinessTarget(snapshot.environment);
  assertReadinessIdentifier(snapshot.evidenceId, "evidence ID");
  assertReadinessIdentifier(snapshot.providerVersion, "provider version");
  assertReadinessIdentifier(snapshot.environmentId, "environment ID");
  assertGate(snapshot.gate);
  assertReadinessDate(snapshot.capturedAt, "evidence timestamp");
  assertDigest(snapshot.artifactDigest);
  assertSource(snapshot.environment, snapshot.source);
  if (snapshot.outcome !== "passed" && snapshot.outcome !== "failed") {
    throw new Error(
      "Readiness evidence outcome is invalid; expected passed or failed; value=<redacted>.",
    );
  }
  const capturedAtEpoch = snapshot.capturedAt.getTime();
  const evidence: ReadinessEvidence = {
    evidenceId: snapshot.evidenceId,
    provider: snapshot.provider,
    environment: snapshot.environment,
    providerVersion: snapshot.providerVersion,
    environmentId: snapshot.environmentId,
    gate: snapshot.gate,
    outcome: snapshot.outcome,
    source: snapshot.source,
    get capturedAt(): Date {
      return new Date(capturedAtEpoch);
    },
    artifactDigest: snapshot.artifactDigest,
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
  assertReadinessTarget(target);
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
  const request = canonicalizeReadinessRequest(input, freezeEvidence);
  const missingGates = missingReadinessGates(request);
  const state = readinessState(request, missingGates);
  const matchedEvidenceIds = matchingEvidence(request).map(({ evidenceId }) =>
    evidenceId
  );
  return Object.freeze({
    state,
    target: request.target,
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
          "Readiness evidence ID is duplicated; expected immutable unique evidence records; value=<redacted>.",
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
  if (!Array.isArray(evidence)) {
    throw new Error(
      "Readiness evidence is invalid; expected an array of records.",
    );
  }
  const ids = new Set<string>();
  const values = evidence.map((entry) => {
    const checked = createReadinessEvidence(entry);
    if (ids.has(checked.evidenceId)) {
      throw new Error(
        "Readiness evidence ID is duplicated; expected immutable unique evidence records; value=<redacted>.",
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
    if (
      current === undefined ||
      evidence.capturedAt > current.capturedAt ||
      (evidence.capturedAt.getTime() === current.capturedAt.getTime() &&
        evidence.outcome === "failed" && current.outcome === "passed")
    ) {
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

function assertGate(gate: ReadinessGate): void {
  if (READINESS_GATES.includes(gate)) return;
  throw new Error(
    "Readiness gate is invalid; expected a registered evidence gate; value=<redacted>.",
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
    "Readiness evidence source does not match environment; expected the environment-specific evidence source; value=<redacted>.",
  );
}

function assertDigest(value: string): void {
  if (/^[0-9a-f]{64}$/.test(value)) return;
  throw new Error(
    "Readiness artifact digest is invalid; expected a lowercase SHA-256 digest; value=<redacted>.",
  );
}
