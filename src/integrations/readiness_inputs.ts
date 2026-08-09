import type { ProviderLifecycle } from "./contracts.ts";
import {
  assertReadinessProviderTarget,
  canonicalizeCoordinatorAuthorization,
  hasCoordinatorAuthorization,
} from "./readiness_guards.ts";
import type {
  ReadinessEvaluationRequest,
  ReadinessEvidence,
} from "./readiness.ts";
import {
  assertReadinessDate,
  assertReadinessIdentifier,
  assertReadinessProvider,
  assertReadinessTarget,
} from "./readiness_assertions.ts";

type EvidenceCanonicalizer = (
  evidence: readonly ReadinessEvidence[],
) => readonly ReadinessEvidence[];

/**
 * Snapshots and validates one readiness request before evidence evaluation.
 *
 * @example canonicalizeReadinessRequest({ provider: "papermark", target: "local-development", providerVersion: "commit-1", environmentId: "local", lifecycle: "enabled", configured: true, implementation: "complete", evidence: [], evaluatedAt: new Date() }, freezeEvidence)
 */
export function canonicalizeReadinessRequest(
  input: ReadinessEvaluationRequest,
  canonicalizeEvidence: EvidenceCanonicalizer,
): ReadinessEvaluationRequest {
  const coordinatorAuthorization = canonicalizeCoordinatorAuthorization(
    input.coordinatorAuthorization,
  );
  const snapshot = {
    provider: input.provider,
    target: input.target,
    providerVersion: input.providerVersion,
    environmentId: input.environmentId,
    lifecycle: input.lifecycle,
    configured: input.configured,
    implementation: input.implementation,
    evidence: input.evidence,
    evaluatedAt: input.evaluatedAt,
    ...(coordinatorAuthorization === undefined
      ? {}
      : { coordinatorAuthorization }),
  };
  assertReadinessRequest(snapshot);
  const evidence = canonicalizeEvidence(snapshot.evidence);
  const evaluatedAtEpoch = snapshot.evaluatedAt.getTime();
  if (
    evidence.some(({ capturedAt }) => capturedAt.getTime() > evaluatedAtEpoch)
  ) {
    throw new Error(
      "Readiness evidence is newer than the evaluation clock; expected evidence captured at or before evaluatedAt.",
    );
  }
  return Object.freeze({
    provider: snapshot.provider,
    target: snapshot.target,
    providerVersion: snapshot.providerVersion,
    environmentId: snapshot.environmentId,
    lifecycle: snapshot.lifecycle,
    configured: snapshot.configured,
    implementation: snapshot.implementation,
    evidence,
    evaluatedAt: new Date(evaluatedAtEpoch),
    ...(snapshot.coordinatorAuthorization === undefined
      ? {}
      : { coordinatorAuthorization: snapshot.coordinatorAuthorization }),
  });
}

function assertReadinessRequest(
  input: ReadinessEvaluationRequest,
): void {
  assertReadinessProvider(input.provider);
  assertReadinessTarget(input.target);
  assertReadinessIdentifier(input.providerVersion, "provider version");
  assertReadinessIdentifier(input.environmentId, "environment ID");
  assertLifecycle(input.lifecycle);
  if (typeof input.configured !== "boolean") {
    throw new Error(
      "Readiness configured flag is invalid; expected a boolean configuration state.",
    );
  }
  if (
    input.implementation !== "complete" && input.implementation !== "partial"
  ) {
    throw new Error(
      "Readiness implementation state is invalid; expected complete or partial.",
    );
  }
  assertReadinessDate(input.evaluatedAt, "evaluation timestamp");
  assertReadinessProviderTarget(input.provider, input.target, input.lifecycle);
  if (
    input.coordinatorAuthorization !== undefined &&
    !hasCoordinatorAuthorization(input.coordinatorAuthorization)
  ) {
    throw new Error(
      "Readiness coordinator authorization is invalid; expected coordinator-owned authorization metadata.",
    );
  }
}

function assertLifecycle(value: ProviderLifecycle): void {
  if (value === "enabled" || value === "disabled" || value === "deferred") {
    return;
  }
  throw new Error(
    "Readiness lifecycle is invalid; expected enabled, disabled, or deferred.",
  );
}
