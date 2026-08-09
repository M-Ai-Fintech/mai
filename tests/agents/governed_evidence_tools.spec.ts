import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import type { AuthorizationDecision } from "../../src/platform/authz/v1.ts";
import { ToolGateway } from "../../src/agent_runtime/tool_gateway.ts";
import type {
  CapabilityUnavailable,
  DocumentListRequest,
  DocumentSummary,
  DocumentVersionReadRequest,
  EvidenceSearchHit,
  GovernedDocumentContent,
  GovernedDocumentContentPort,
  GovernedDocumentListingPort,
  GovernedDocumentMetadata,
  GovernedDocumentMetadataPort,
  GovernedEvidenceSearchPort,
} from "../../src/agent/tools/governed_evidence_tools.ts";
import {
  createGovernedCitationProposalTool,
  createGovernedDocumentContentTool,
  createGovernedDocumentListingTool,
  createGovernedDocumentMetadataTool,
  createGovernedEvidenceSearchTool,
  createGovernedMissingDocumentFindingTool,
} from "../../src/agent/tools/governed_evidence_tools.ts";
import {
  allowDecision,
  authorizedInvocation,
  exactReference,
  RecordingEvidenceSearchPort,
  request,
  scope,
  sourceVersion,
  ToggleSourceVersionPort,
} from "./governed_evidence_fakes.ts";

Deno.test("governed listing is authorized before protected loading", async () => {
  const versions = new ToggleSourceVersionPort();
  const listing = new RecordingDocumentListingPort([
    {
      documentId: "doc_contract",
      name: "Contract.pdf",
      mimeType: "application/pdf",
      classification: "legal",
      currentVersion: exactReference,
    },
  ]);
  const tool = createGovernedDocumentListingTool(listing, versions);
  const events: string[] = [];
  const gateway = new ToolGateway([tool], {
    authorize: () => {
      events.push("authorize");
      return allowDecision();
    },
  });
  const result = await gateway.invoke(request(tool.name, "list_documents", {}));

  assertEquals(result.status, "succeeded");
  assertEquals(events, ["authorize"]);
  assertEquals(listing.requests.length, 1);
  assertEquals(listing.requests[0].scope, scope);
  if (result.status === "succeeded") {
    assertEquals(result.output.discoveredSourceVersions, [sourceVersion]);
  }
});

Deno.test("governed listing rejects missing or malformed current versions", async () => {
  const invalidSummaries = [
    {
      documentId: "doc_missing_version",
      name: "Missing.pdf",
      mimeType: "application/pdf",
      classification: "legal",
    },
    {
      documentId: "doc_malformed_version",
      name: "Malformed.pdf",
      mimeType: "application/pdf",
      classification: "legal",
      currentVersion: { ...exactReference, version: 0 },
    },
  ] as const;

  for (const summary of invalidSummaries) {
    const versions = new ToggleSourceVersionPort();
    const listing = new RecordingDocumentListingPort([
      summary as unknown as DocumentSummary,
    ]);
    const tool = createGovernedDocumentListingTool(listing, versions);
    const result = await tool.execute(
      authorizedInvocation(tool.name, "list_documents"),
    );

    assertEquals(result.value.status, "unavailable");
    assertEquals(result.value.reasonCode, "INVALID_PROVIDER_RESPONSE");
    assertEquals(result.value.documents, []);
    assertEquals(versions.checks, 0);
  }
});

Deno.test("gateway denial prevents every governed port from loading", async () => {
  const versions = new ToggleSourceVersionPort();
  const listing = new RecordingDocumentListingPort([]);
  const tool = createGovernedDocumentListingTool(listing, versions);
  const gateway = new ToolGateway([tool], {
    authorize: () => ({
      outcome: "deny",
      reasonCode: "NO_MATCHING_GRANT",
      allowedActions: [],
      approvedScope: undefined,
      fieldMask: {
        include: [],
        omit: [],
        redact: [],
        approvedClassifications: [],
      },
    } as AuthorizationDecision),
  });
  const result = await gateway.invoke(request(tool.name, "list_documents", {}));

  assertEquals(result, { status: "denied", reason: "NO_MATCHING_GRANT" });
  assertEquals(listing.requests.length, 0);
  const permissiveGateway = new ToolGateway([tool], {
    authorize: () => allowDecision(),
  });
  const mismatch = await permissiveGateway.invoke({
    ...request(tool.name, "read_document_content", {}),
    resourceId: "governed.documents.other",
  });

  assertEquals(mismatch.status, "blocked");
  if (mismatch.status === "blocked") {
    assertEquals(mismatch.semanticStatus, "denied");
    assertEquals(mismatch.output.value.status, "denied");
    assertEquals(mismatch.output.value.reasonCode, "TOOL_REQUEST_MISMATCH");
  }
  assertEquals(listing.requests.length, 0);
});

Deno.test("input cannot select a scope different from the trusted invocation", async () => {
  const versions = new ToggleSourceVersionPort();
  const listing = new RecordingDocumentListingPort([]);
  const tool = createGovernedDocumentListingTool(listing, versions);
  const result = await tool.execute({
    ...authorizedInvocation(tool.name, "list_documents"),
    input: { scope: { ...scope, dealId: "deal_other" } },
  });

  assertEquals(result.kind, "read");
  assertEquals(result.value.status, "denied");
  assertEquals(result.value.reasonCode, "SCOPE_MISMATCH");
  assertEquals(listing.requests.length, 0);
});

Deno.test("exact metadata and content reads invalidate stale versions before loading", async () => {
  const versions = new ToggleSourceVersionPort();
  const metadata = new RecordingDocumentMetadataPort({
    reference: exactReference,
    documentId: "doc_contract",
    name: "Contract.pdf",
    mimeType: "application/pdf",
    classification: "legal",
  });
  const content = new RecordingDocumentContentPort({
    reference: exactReference,
    mediaType: "application/pdf",
    bytes: new TextEncoder().encode("contract"),
  });
  const metadataTool = createGovernedDocumentMetadataTool(metadata, versions);
  const contentTool = createGovernedDocumentContentTool(content, versions);

  const metadataResult = await metadataTool.execute({
    ...authorizedInvocation(metadataTool.name, "read_document_metadata"),
    input: { ...exactReference },
    sourceVersions: [sourceVersion],
  });
  const contentResult = await contentTool.execute({
    ...authorizedInvocation(contentTool.name, "read_document_content"),
    input: { ...exactReference },
    sourceVersions: [sourceVersion],
  });
  assertEquals(metadataResult.value.status, "ok");
  assertEquals(contentResult.value.status, "ok");
  assertEquals(metadata.requests.length, 1);
  assertEquals(content.requests.length, 1);
  assertStringIncludes(String(contentResult.value.content), "Y29udHJhY3Q=");
  assertEquals(metadataResult.discoveredSourceVersions, [sourceVersion]);
  assertEquals(contentResult.discoveredSourceVersions, [sourceVersion]);

  versions.current = false;
  const stale = await contentTool.execute({
    ...authorizedInvocation(contentTool.name, "read_document_content"),
    input: { ...exactReference },
    sourceVersions: [sourceVersion],
  });
  assertEquals(stale.value.status, "stale");
  assertEquals(content.requests.length, 1);

  versions.current = true;
  content.onRead = () => {
    versions.current = false;
  };
  const staleAfterRead = await contentTool.execute({
    ...authorizedInvocation(contentTool.name, "read_document_content"),
    input: { ...exactReference },
    sourceVersions: [sourceVersion],
  });
  assertEquals(staleAfterRead.value.status, "stale");
  assertEquals(staleAfterRead.value.content, "");
  assertEquals(content.requests.length, 2);

  versions.current = true;
  metadata.onRead = () => {
    versions.current = false;
  };
  const metadataAfterRead = await metadataTool.execute({
    ...authorizedInvocation(metadataTool.name, "read_document_metadata"),
    input: { ...exactReference },
    sourceVersions: [sourceVersion],
  });
  assertEquals(metadataAfterRead.value.status, "stale");
  assertEquals(metadataAfterRead.value.metadata, undefined);
  assertEquals(metadata.requests.length, 2);
});

Deno.test("evidence search returns only exact, current references", async () => {
  const versions = new ToggleSourceVersionPort();
  const search = new RecordingEvidenceSearchPort([
    {
      evidenceId: "evidence_contract",
      citationId: "citation_contract",
      source: {
        ...exactReference,
        location: { kind: "page", page: 4 },
        classification: "legal",
        processingVersion: "extract-v1",
      },
      excerpt: "Change of control requires consent.",
    },
  ]);
  const tool = createGovernedEvidenceSearchTool(search, versions);
  const result = await tool.execute({
    ...authorizedInvocation(tool.name, "search_evidence"),
    input: { query: "change of control", limit: 5 },
    sourceVersions: [sourceVersion],
  });

  const searchValue = result.value as {
    readonly status: string;
    readonly results: readonly EvidenceSearchHit[];
  };
  assertEquals(searchValue.status, "ok");
  assertEquals(searchValue.results.length, 1);
  assertEquals(
    searchValue.results[0].source.documentVersionId,
    exactReference.documentVersionId,
  );
  assertEquals(searchValue.results[0].source.version, exactReference.version);
  assertFalse("objectKey" in searchValue.results[0]);
  assertEquals(result.discoveredSourceVersions, [sourceVersion]);

  versions.current = false;
  const stale = await tool.execute({
    ...authorizedInvocation(tool.name, "search_evidence"),
    input: { query: "change of control" },
    sourceVersions: [sourceVersion],
  });
  assertEquals(stale.value.status, "stale");
});

Deno.test("citation and missing-document tools emit proposal-only values", async () => {
  const versions = new ToggleSourceVersionPort();
  const citationTool = createGovernedCitationProposalTool(versions);
  const findingTool = createGovernedMissingDocumentFindingTool(versions);
  const citation = await citationTool.execute({
    ...authorizedInvocation(citationTool.name, "propose_citation"),
    input: {
      source: {
        ...exactReference,
        location: { kind: "page", page: 4 },
        classification: "legal",
        processingVersion: "extract-v1",
      },
      excerpt: "Change of control requires consent.",
    },
  });
  const finding = await findingTool.execute({
    ...authorizedInvocation(
      findingTool.name,
      "propose_missing_document_finding",
    ),
    input: {
      title: "Missing signed contract",
      statement: "A signed contract version is required for review.",
      basis: [
        {
          ...exactReference,
          location: { kind: "page", page: 4 },
          classification: "legal",
          processingVersion: "extract-v1",
        },
      ],
    },
  });

  assertEquals(citation.value.status, "proposal");
  assertEquals(citation.value.persisted, false);
  assertEquals(citation.value.approved, false);
  assertEquals(finding.value.status, "proposal");
  assertEquals(finding.value.persisted, false);
  assertEquals(
    (finding.value.finding as { readonly state: string }).state,
    "proposed",
  );
  assertEquals(citation.discoveredSourceVersions, [sourceVersion]);
  assertEquals(finding.discoveredSourceVersions, [sourceVersion]);
  assertEquals(versions.checks, 2);
});

Deno.test("unsupported dependencies are explicit and do not fall back", async () => {
  const unavailable: CapabilityUnavailable = {
    status: "unavailable",
    reasonCode: "PROVIDER_NOT_CERTIFIED",
  };
  const search = new UnavailableEvidenceSearchPort(unavailable);
  const tool = createGovernedEvidenceSearchTool(
    search,
    new ToggleSourceVersionPort(),
  );
  const result = await tool.execute({
    ...authorizedInvocation(tool.name, "search_evidence"),
    input: { query: "contract" },
  });

  assertEquals(result.value.status, "unavailable");
  assertEquals(result.value.reasonCode, "PROVIDER_NOT_CERTIFIED");
  assertEquals(result.value.results, []);
});

class RecordingDocumentListingPort implements GovernedDocumentListingPort {
  readonly requests: DocumentListRequest[] = [];
  constructor(private readonly values: readonly DocumentSummary[]) {}
  list(request: DocumentListRequest): Promise<readonly DocumentSummary[]> {
    this.requests.push(request);
    return Promise.resolve(this.values);
  }
}

class RecordingDocumentMetadataPort implements GovernedDocumentMetadataPort {
  readonly requests: DocumentVersionReadRequest[] = [];
  onRead?: () => void;
  constructor(private readonly value: GovernedDocumentMetadata) {}
  read(
    request: DocumentVersionReadRequest,
  ): Promise<GovernedDocumentMetadata> {
    this.requests.push(request);
    this.onRead?.();
    return Promise.resolve(this.value);
  }
}

class RecordingDocumentContentPort implements GovernedDocumentContentPort {
  readonly requests: DocumentVersionReadRequest[] = [];
  onRead?: () => void;
  constructor(private readonly value: GovernedDocumentContent) {}
  read(
    request: DocumentVersionReadRequest,
  ): Promise<GovernedDocumentContent> {
    this.requests.push(request);
    this.onRead?.();
    return Promise.resolve(this.value);
  }
}

class UnavailableEvidenceSearchPort implements GovernedEvidenceSearchPort {
  constructor(private readonly value: CapabilityUnavailable) {}
  search(): Promise<CapabilityUnavailable> {
    return Promise.resolve(this.value);
  }
}
