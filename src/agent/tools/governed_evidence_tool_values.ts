import type { ToolOutput } from "../../agent_runtime/tool_gateway.ts";
import {
  deduplicateSourceVersions,
  type SourceVersionReference,
} from "../../agent_runtime/model.ts";
import type {
  CapabilityUnavailable,
  Checksum,
  CitationLocation,
  DocumentClassification,
  DocumentSummary,
  EvidenceSearchHit,
  ExactDocumentVersionReference,
  ExactEvidenceReference,
  GovernedDocumentContent,
  GovernedDocumentMetadata,
} from "./governed_evidence_tool_contracts.ts";

export function parseExactDocumentReference(
  value: unknown,
  allowVersionAliases = false,
): ExactDocumentVersionReference | undefined {
  if (!isRecord(value)) return undefined;
  const documentVersionId = referenceText(value.documentVersionId, 96);
  const versionValue = allowVersionAliases
    ? value.version ?? value.versionNumber ?? value.expectedVersion
    : value.version;
  const version = positiveReferenceVersion(versionValue);
  const checksum = parseChecksum(value.checksum);
  return documentVersionId === undefined || version === undefined ||
      checksum === undefined
    ? undefined
    : { documentVersionId, version, checksum };
}

export function parseExactEvidenceReference(
  value: unknown,
  allowVersionAliases = false,
): ExactEvidenceReference | undefined {
  if (!isRecord(value)) return undefined;
  const reference = parseExactDocumentReference(value, allowVersionAliases);
  const classification = isClassification(value.classification)
    ? value.classification
    : undefined;
  const processingVersion = referenceText(value.processingVersion, 128);
  const location = parseCitationLocation(value.location);
  return reference === undefined || classification === undefined ||
      processingVersion === undefined || location === undefined
    ? undefined
    : { ...reference, classification, processingVersion, location };
}

export function result(
  kind: "read" | "proposal",
  value: Record<string, unknown>,
  discoveredSourceVersions: readonly SourceVersionReference[] = [],
): ToolOutput {
  const uniqueSources = deduplicateSourceVersions(discoveredSourceVersions);
  return {
    kind,
    value: Object.freeze(value),
    ...(uniqueSources.length === 0 ? {} : {
      discoveredSourceVersions: Object.freeze([...uniqueSources]),
    }),
  };
}

export function runtimeSourceReference(
  reference: ExactDocumentVersionReference,
): SourceVersionReference {
  return {
    sourceType: "document_version",
    sourceId: reference.documentVersionId,
    version: reference.version as SourceVersionReference["version"],
    checksum: reference.checksum.value,
  };
}

export function denied(
  kind: "read" | "proposal",
  reasonCode: string,
): ToolOutput {
  return result(kind, { status: "denied", reasonCode });
}

export function unavailable(
  kind: "read" | "proposal",
  reasonCode: string,
): ToolOutput {
  return result(kind, { status: "unavailable", reasonCode });
}

export function contentStatus(
  status: "not_found" | "stale" | "unavailable",
): ToolOutput {
  return result("read", {
    status,
    content: "",
    contentEncoding: "base64",
    ...(status === "stale" ? { reasonCode: "SOURCE_VERSION_INVALIDATED" } : {}),
  });
}

export function contentUnavailable(reasonCode: string): ToolOutput {
  return result("read", {
    status: "unavailable",
    content: "",
    contentEncoding: "base64",
    reasonCode,
  });
}

export function searchResult(
  status: "denied" | "stale" | "unavailable",
  query: string,
  reasonCode: string,
): ToolOutput {
  return result("read", { status, query, results: [], reasonCode });
}

export function proposalDenied(reasonCode: string): ToolOutput {
  return result("proposal", {
    status: "denied",
    persisted: false,
    approved: false,
    reasonCode,
  });
}

export function proposalStatus(
  status: "stale" | "unavailable",
  reasonCode: string,
): ToolOutput {
  return result("proposal", {
    status,
    persisted: false,
    approved: false,
    reasonCode,
  });
}

export function freshnessCode(status: "stale" | "unavailable"): string {
  return status === "stale"
    ? "SOURCE_VERSION_INVALIDATED"
    : "SOURCE_VERSION_CHECK_UNAVAILABLE";
}

export function reason(output: ToolOutput): string {
  return typeof output.value.reasonCode === "string"
    ? output.value.reasonCode
    : "INVALID_INPUT";
}

export function sanitizeDocumentSummary(
  value: unknown,
): DocumentSummary | undefined {
  if (!isRecord(value)) return undefined;
  const documentId = safeText(value.documentId, 96);
  const name = safeText(value.name, 512);
  const mimeType = safeText(value.mimeType, 256);
  const currentVersion = parseExactDocumentReference(value.currentVersion);
  if (
    documentId === undefined || name === undefined || mimeType === undefined ||
    !isClassification(value.classification) || currentVersion === undefined
  ) return undefined;
  return {
    documentId,
    name,
    mimeType,
    classification: value.classification,
    currentVersion,
  };
}

export function sanitizeMetadata(
  value: unknown,
): GovernedDocumentMetadata | undefined {
  if (!isRecord(value)) return undefined;
  const reference = parseExactDocumentReference(value.reference);
  const documentId = safeText(value.documentId, 96);
  const name = safeText(value.name, 512);
  const mimeType = safeText(value.mimeType, 256);
  const classification = isClassification(value.classification)
    ? value.classification
    : undefined;
  if (
    reference === undefined || documentId === undefined || name === undefined ||
    mimeType === undefined || classification === undefined
  ) return undefined;
  return {
    reference,
    documentId,
    name,
    mimeType,
    classification,
  };
}

export function sanitizeContent(
  value: unknown,
): GovernedDocumentContent | undefined {
  if (!isRecord(value)) return undefined;
  const reference = parseExactDocumentReference(value.reference);
  const mediaType = safeText(value.mediaType, 256);
  if (reference === undefined || mediaType === undefined) return undefined;
  return value.bytes instanceof Uint8Array
    ? { reference, mediaType, bytes: value.bytes }
    : undefined;
}

export function sanitizeSearchHit(
  value: unknown,
): EvidenceSearchHit | undefined {
  if (!isRecord(value)) return undefined;
  const evidenceId = safeText(value.evidenceId, 96);
  const citationId = safeText(value.citationId, 96);
  const source = parseExactEvidenceReference(value.source);
  const excerpt = optionalOutputText(value.excerpt, 16_384);
  const score = value.score;
  if (
    evidenceId === undefined || citationId === undefined ||
    source === undefined ||
    (value.excerpt !== undefined && excerpt === undefined) ||
    (score !== undefined &&
      (typeof score !== "number" || !Number.isFinite(score)))
  ) return undefined;
  return {
    evidenceId,
    citationId,
    source,
    ...(excerpt === undefined ? {} : { excerpt }),
    ...(score === undefined ? {} : { score }),
  };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function isUnavailable(value: unknown): value is CapabilityUnavailable {
  return isRecord(value) && value.status === "unavailable" &&
    typeof value.reasonCode === "string";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseChecksum(value: unknown): Checksum | undefined {
  if (typeof value === "string") {
    return /^[0-9a-f]{64}$/.test(value)
      ? { algorithm: "sha256", value }
      : undefined;
  }
  if (
    !isRecord(value) || value.algorithm !== "sha256" ||
    typeof value.value !== "string" || !/^[0-9a-f]{64}$/.test(value.value)
  ) return undefined;
  return { algorithm: "sha256", value: value.value };
}

function parseCitationLocation(value: unknown): CitationLocation | undefined {
  if (!isRecord(value) || typeof value.kind !== "string") return undefined;
  const page = positiveReferenceVersion(value.page);
  if (value.kind === "page" && page !== undefined) {
    return { kind: "page", page };
  }
  const startLine = positiveReferenceVersion(value.startLine);
  const endLine = positiveReferenceVersion(value.endLine);
  if (
    value.kind === "line" && startLine !== undefined &&
    endLine !== undefined && endLine >= startLine
  ) {
    return { kind: "line", startLine, endLine };
  }
  const start = nonNegativeReferencePosition(value.start);
  const end = positiveReferenceVersion(value.end);
  if (
    value.kind === "character" && start !== undefined && end !== undefined &&
    end > start
  ) {
    return { kind: "character", start, end };
  }
  const artifactId = referenceText(value.artifactId, 256);
  return value.kind === "artifact" && artifactId !== undefined
    ? { kind: "artifact", artifactId }
    : undefined;
}

function isClassification(value: unknown): value is DocumentClassification {
  return value === "legal" || value === "financial" || value === "tax" ||
    value === "operational" || value === "other";
}

function positiveReferenceVersion(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

function nonNegativeReferencePosition(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function referenceText(value: unknown, maximum: number): string | undefined {
  return typeof value === "string" && value.trim() && value.length <= maximum
    ? value.trim()
    : undefined;
}

function safeText(value: unknown, maximum: number): string | undefined {
  return typeof value === "string" && value.length <= maximum
    ? value
    : undefined;
}

function optionalOutputText(
  value: unknown,
  maximum: number,
): string | undefined {
  return value === undefined ? undefined : safeText(value, maximum);
}
