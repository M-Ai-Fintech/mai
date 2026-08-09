import type { ToolOutput } from "../../agent_runtime/tool_gateway.ts";
import type {
  CapabilityUnavailable,
  DocumentSummary,
  EvidenceSearchHit,
  GovernedDocumentMetadata,
} from "./governed_evidence_tool_contracts.ts";

export function result(
  kind: "read" | "proposal",
  value: Record<string, unknown>,
): ToolOutput {
  return { kind, value: Object.freeze(value) };
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
  summary: DocumentSummary,
): DocumentSummary {
  return {
    documentId: summary.documentId,
    name: summary.name,
    mimeType: summary.mimeType,
    classification: summary.classification,
    ...(summary.currentVersion === undefined
      ? {}
      : { currentVersion: summary.currentVersion }),
  };
}

export function sanitizeMetadata(
  metadata: GovernedDocumentMetadata,
): GovernedDocumentMetadata {
  return {
    reference: metadata.reference,
    documentId: metadata.documentId,
    name: metadata.name,
    mimeType: metadata.mimeType,
    classification: metadata.classification,
  };
}

export function sanitizeSearchHit(hit: EvidenceSearchHit): EvidenceSearchHit {
  return {
    evidenceId: hit.evidenceId,
    citationId: hit.citationId,
    source: hit.source,
    ...(hit.excerpt === undefined ? {} : { excerpt: hit.excerpt }),
    ...(hit.score === undefined ? {} : { score: hit.score }),
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
