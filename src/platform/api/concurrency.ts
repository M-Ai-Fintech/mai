import {
  type AggregateVersion,
  isAggregateVersion,
  parseAggregateVersion,
} from "../../shared/contracts/aggregate_version.ts";

export type { AggregateVersion } from "../../shared/contracts/aggregate_version.ts";

export type VersionIssueCode =
  | "MISSING_IF_MATCH"
  | "INVALID_ETAG"
  | "INVALID_VERSION"
  | "UNSUPPORTED_WEAK_TAG"
  | "UNSUPPORTED_WILDCARD"
  | "UNSUPPORTED_MULTIPLE_TAGS";

export type VersionParseResult =
  | { readonly ok: true; readonly value: AggregateVersion }
  | { readonly ok: false; readonly issue: { readonly code: VersionIssueCode } };

export function formatEtag(version: number): string {
  if (!isAggregateVersion(version)) {
    throw new RangeError(
      `Invalid aggregate version ${version}; expected a positive safe integer.`,
    );
  }
  return `"v${version}"`;
}

export function parseEtag(value: unknown): VersionParseResult {
  if (typeof value !== "string") return versionFailure("INVALID_ETAG");
  const match = /^"v([0-9]+)"$/.exec(value);
  if (match === null) return versionFailure("INVALID_ETAG");
  return parseVersion(match[1]);
}

export function parseIfMatch(value: string | null): VersionParseResult {
  if (value === null) return versionFailure("MISSING_IF_MATCH");
  if (value === "*") return versionFailure("UNSUPPORTED_WILDCARD");
  if (value.startsWith("W/")) return versionFailure("UNSUPPORTED_WEAK_TAG");
  if (value.includes(",")) return versionFailure("UNSUPPORTED_MULTIPLE_TAGS");
  return parseEtag(value);
}

function parseVersion(value: string): VersionParseResult {
  const version = Number(value);
  const parsed = parseAggregateVersion(version);
  return parsed.ok ? parsed : versionFailure("INVALID_VERSION");
}

function versionFailure(code: VersionIssueCode): VersionParseResult {
  return { ok: false, issue: { code } };
}
