import {
  assertKnownKeys,
  assertRecord,
  rejectInlineCredentialKeys,
} from "./configuration_validation.ts";

const READINESS_EVIDENCE_KEYS = new Set([
  "evidenceId",
  "provider",
  "environment",
  "providerVersion",
  "environmentId",
  "gate",
  "outcome",
  "source",
  "capturedAt",
  "artifactDigest",
]);

/**
 * Rejects unknown or credential-bearing readiness evidence fields.
 *
 * @example assertReadinessEvidenceShape({ evidenceId: "evidence_contract", provider: "papermark", environment: "local-development", providerVersion: "commit-1", environmentId: "local", gate: "configuration", outcome: "passed", source: "local-runtime", capturedAt: new Date(), artifactDigest: "a".repeat(64) })
 */
export function assertReadinessEvidenceShape(value: unknown): void {
  assertRecord(value, "readiness evidence");
  rejectInlineCredentialKeys(value);
  assertKnownKeys(value, READINESS_EVIDENCE_KEYS, "readiness evidence");
}
