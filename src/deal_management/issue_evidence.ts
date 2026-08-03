const MAX_TEXT = 160;
const MAX_PATHS = 12;
import type { LegacyMappingIssueCode } from "./legacy_contracts.ts";

export type IssueEvidenceInput = {
  readonly code: LegacyMappingIssueCode;
  readonly legacyDealId: string;
  readonly received?: unknown;
  readonly expected?: unknown;
  readonly explanation: string;
  readonly mismatchPaths?: readonly string[];
  readonly receivedContent?: unknown;
  readonly expectedContent?: unknown;
  readonly receivedDigest?: string;
  readonly expectedDigest?: string;
  readonly operatorInterventionRequired?: boolean;
  readonly retrySafe?: boolean;
};

export type BoundedIssueEvidence = {
  readonly code: LegacyMappingIssueCode;
  readonly legacyDealId: string;
  readonly mismatchPaths: readonly string[];
  readonly received: string;
  readonly expected: string;
  readonly receivedDigest: string;
  readonly expectedDigest: string;
  readonly explanation: string;
  readonly operatorInterventionRequired: boolean;
  readonly retrySafe: boolean;
};

/** Builds bounded operator evidence without retaining provider or Deal content. */
export function boundedIssueEvidence(
  input: IssueEvidenceInput,
): BoundedIssueEvidence {
  return {
    code: input.code,
    legacyDealId: safeIdentifier(input.legacyDealId),
    mismatchPaths: (input.mismatchPaths ?? pathsForCode(input.code)).slice(
      0,
      MAX_PATHS,
    ).map(safePath),
    received: safeSummary(input.received),
    expected: safeSummary(input.expected),
    receivedDigest: input.receivedDigest ??
      contentDigest(input.receivedContent ?? input.received),
    expectedDigest: input.expectedDigest ??
      contentDigest(input.expectedContent ?? input.expected),
    explanation: safeSummary(input.explanation),
    operatorInterventionRequired: input.operatorInterventionRequired ?? true,
    retrySafe: input.retrySafe ?? true,
  };
}

function safeSummary(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "number" && Number.isFinite(value)) {
    return bound(String(value));
  }
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string" && isSensitive(value)) {
    return "content withheld; inspect the digest and mismatch paths";
  }
  if (typeof value === "string") return bound(value);
  if (typeof value === "string" && value === "undefined") return value;
  return "content withheld; inspect the digest and mismatch paths";
}

function isSensitive(value: string): boolean {
  return /secret|token|password|database_url|sql|stack trace|BEGIN (RSA|OPENSSH)/i
    .test(value) ||
    value.trim().startsWith("{") || value.trim().startsWith("[");
}

function safePath(value: string): string {
  return !isSensitive(value) && /^[A-Za-z0-9_.\-[\]]+$/.test(value)
    ? bound(value)
    : "redacted.path";
}

function safeIdentifier(value: string): string {
  return isSensitive(value) ? "redacted.legacyDealId" : bound(value);
}

function contentDigest(value: unknown): string {
  const text = canonicalValue(value);
  let first = 2166136261;
  let second = 16777619;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619) >>> 0;
    second = Math.imul(second ^ (code + index), 2246822519) >>> 0;
  }
  return `digest:${first.toString(16).padStart(8, "0")}${
    second.toString(16).padStart(8, "0")
  }`;
}

function canonicalValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${
    Object.keys(object).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalValue(object[key])}`
    ).join(",")
  }}`;
}

function bound(value: string): string {
  return value.length <= MAX_TEXT ? value : `${value.slice(0, MAX_TEXT - 1)}…`;
}

function pathsForCode(code: LegacyMappingIssueCode): readonly string[] {
  const paths: Readonly<Record<string, readonly string[]>> = {
    MISSING_REQUIRED_FIELD: ["legacyDeal.requiredField"],
    INVALID_CURRENCY: ["legacyDeal.currency"],
    INCOMPLETE_MANDATE: ["legacyDeal.mandate"],
    AUTHORITY_EXCEEDS_MANDATE: ["legacyDeal.team.authorityLevel"],
    SCOPE_MISMATCH: ["legacyDeal.scope"],
    RECONCILIATION_DRIFT: [
      "reconciliation.document",
      "reconciliation.fingerprint",
    ],
  };
  return paths[code] ?? ["legacyDeal"];
}
