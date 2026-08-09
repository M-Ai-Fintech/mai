import type {
  RuntimeScope,
  SourceVersionReference,
} from "../../agent_runtime/model.ts";
import type { RequestContext } from "../../shared/contracts/request_context.ts";

export type DocumentClassification =
  | "legal"
  | "financial"
  | "tax"
  | "operational"
  | "other";
export interface Checksum {
  readonly algorithm: "sha256";
  readonly value: string;
}
export type CitationLocation =
  | { readonly kind: "page"; readonly page: number }
  | {
    readonly kind: "line";
    readonly startLine: number;
    readonly endLine: number;
  }
  | { readonly kind: "character"; readonly start: number; readonly end: number }
  | { readonly kind: "artifact"; readonly artifactId: string };
export interface ExactDocumentVersionReference {
  readonly documentVersionId: string;
  readonly version: number;
  readonly checksum: Checksum;
}
export interface ExactEvidenceReference extends ExactDocumentVersionReference {
  readonly location: CitationLocation;
  readonly classification: DocumentClassification;
  readonly processingVersion: string;
}
export interface CapabilityUnavailable {
  readonly status: "unavailable";
  readonly reasonCode: string;
  readonly message?: string;
}
export interface DocumentSummary {
  readonly documentId: string;
  readonly name: string;
  readonly mimeType: string;
  readonly classification: DocumentClassification;
  readonly currentVersion: ExactDocumentVersionReference;
}
export interface GovernedDocumentMetadata {
  readonly reference: ExactDocumentVersionReference;
  readonly documentId: string;
  readonly name: string;
  readonly mimeType: string;
  readonly classification: DocumentClassification;
}
export interface GovernedDocumentContent {
  readonly reference: ExactDocumentVersionReference;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
}
export interface EvidenceSearchHit {
  readonly evidenceId: string;
  readonly citationId: string;
  readonly source: ExactEvidenceReference;
  readonly excerpt?: string;
  readonly score?: number;
}
export interface DocumentListRequest {
  readonly context: RequestContext;
  readonly scope: RuntimeScope;
  readonly limit: number;
  readonly afterDocumentId?: string;
}
export interface DocumentVersionReadRequest {
  readonly context: RequestContext;
  readonly scope: RuntimeScope;
  readonly reference: ExactDocumentVersionReference;
}
export interface SourceVersionCheckRequest {
  readonly context: RequestContext;
  readonly scope: RuntimeScope;
  readonly reference: SourceVersionReference;
}
export interface EvidenceSearchRequest {
  readonly context: RequestContext;
  readonly scope: RuntimeScope;
  readonly query: string;
  readonly limit: number;
}
export interface GovernedDocumentListingPort {
  list(
    request: DocumentListRequest,
  ): Promise<readonly DocumentSummary[] | CapabilityUnavailable>;
}
export interface GovernedDocumentMetadataPort {
  read(
    request: DocumentVersionReadRequest,
  ): Promise<GovernedDocumentMetadata | CapabilityUnavailable | undefined>;
}
export interface GovernedDocumentContentPort {
  read(
    request: DocumentVersionReadRequest,
  ): Promise<GovernedDocumentContent | CapabilityUnavailable | undefined>;
}
export interface GovernedSourceVersionPort {
  isCurrent(
    request: SourceVersionCheckRequest,
  ): Promise<boolean | CapabilityUnavailable>;
}
export interface GovernedEvidenceSearchPort {
  search(
    request: EvidenceSearchRequest,
  ): Promise<readonly EvidenceSearchHit[] | CapabilityUnavailable>;
}
export interface GovernedEvidenceToolDependencies {
  readonly listing: GovernedDocumentListingPort;
  readonly metadata: GovernedDocumentMetadataPort;
  readonly content: GovernedDocumentContentPort;
  readonly sourceVersions: GovernedSourceVersionPort;
  readonly search: GovernedEvidenceSearchPort;
}

export const GOVERNED_EVIDENCE_TOOL_NAMES = Object.freeze({
  listDocuments: "governed.documents.list",
  readMetadata: "governed.documents.version_metadata",
  readContent: "governed.documents.version_content",
  searchEvidence: "governed.evidence.search",
  proposeCitation: "governed.evidence.citation_proposal",
  proposeMissingDocumentFinding:
    "governed.evidence.missing_document_finding_proposal",
});
