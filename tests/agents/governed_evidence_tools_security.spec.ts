import { assertEquals, assertFalse } from "@std/assert";
import type {
  RuntimeActor,
  RuntimeScope,
  SourceVersionReference,
} from "../../src/agent_runtime/model.ts";
import type { ToolActivityId } from "../../src/agent_runtime/ids.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import type {
  CapabilityUnavailable,
  DocumentListRequest,
  DocumentSummary,
  DocumentVersionReadRequest,
  EvidenceSearchHit,
  ExactDocumentVersionReference,
  GovernedDocumentContent,
  GovernedDocumentContentPort,
  GovernedDocumentListingPort,
  GovernedDocumentMetadata,
  GovernedDocumentMetadataPort,
  GovernedEvidenceSearchPort,
  GovernedSourceVersionPort,
} from "../../src/agent/tools/governed_evidence_tools.ts";
import {
  createGovernedDocumentContentTool,
  createGovernedDocumentListingTool,
  createGovernedDocumentMetadataTool,
  createGovernedEvidenceSearchTool,
} from "../../src/agent/tools/governed_evidence_tools.ts";

const scope: RuntimeScope = {
  tenantId: "tenant_acme" as RuntimeScope["tenantId"],
  workspaceId: "workspace_horizon" as RuntimeScope["workspaceId"],
  dealId: "deal_horizon" as RuntimeScope["dealId"],
};
const context: RequestContext = {
  actorId: "actor_agent" as RequestContext["actorId"],
  tenantId: scope.tenantId,
  workspaceId: scope.workspaceId,
  dealId: scope.dealId,
  correlationId: "cor_tools_security" as RequestContext["correlationId"],
  origin: "job",
};
const actor: RuntimeActor = {
  actorId: context.actorId,
  kind: "ai",
  state: "active",
};
const exactReference: ExactDocumentVersionReference = {
  documentVersionId: "docv_contract_v2",
  version: 2,
  checksum: { algorithm: "sha256", value: "a".repeat(64) },
};
const sourceVersion: SourceVersionReference = {
  sourceType: "document_version",
  sourceId: exactReference.documentVersionId,
  version: exactReference.version as SourceVersionReference["version"],
  checksum: exactReference.checksum.value,
};

Deno.test("listing rechecks declared sources before protected loading", async () => {
  const versions = new ToggleSourceVersionPort();
  versions.current = false;
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
  const result = await tool.execute({
    ...authorizedInvocation(tool.name, "list_documents"),
    sourceVersions: [sourceVersion],
  });

  assertEquals(result.value.status, "stale");
  assertEquals(result.value.documents, []);
  assertEquals(listing.requests.length, 0);
  assertEquals(versions.checks, 1);
});

Deno.test("listing rechecks returned versions and fails closed without documents", async () => {
  const versions = new ToggleSourceVersionPort();
  versions.onCheck = () => {
    versions.current = false;
  };
  const listing = new RecordingDocumentListingPort([
    {
      documentId: "doc_contract",
      name: "Contract.pdf",
      mimeType: "application/pdf",
      classification: "legal",
      currentVersion: {
        ...exactReference,
        objectKey: "s3://private/contracts/contract.pdf",
        filesystemPath: "/srv/private/contracts/contract.pdf",
        providerToken: "provider-secret",
      } as DocumentSummary["currentVersion"],
    },
  ]);
  const tool = createGovernedDocumentListingTool(listing, versions);
  const result = await tool.execute({
    ...authorizedInvocation(tool.name, "list_documents"),
  });

  assertEquals(result.value.status, "stale");
  assertEquals(result.value.documents, []);
  assertEquals(listing.requests.length, 1);
  assertEquals(versions.checks, 1);
});

Deno.test("listing rechecks every returned current version", async () => {
  const versions = new ToggleSourceVersionPort();
  const listing = new RecordingDocumentListingPort([
    {
      documentId: "doc_contract",
      name: "Contract.pdf",
      mimeType: "application/pdf",
      classification: "legal",
      currentVersion: exactReference,
    },
    {
      documentId: "doc_schedule",
      name: "Schedule.pdf",
      mimeType: "application/pdf",
      classification: "financial",
      currentVersion: {
        documentVersionId: "docv_schedule_v1",
        version: 1,
        checksum: { algorithm: "sha256", value: "b".repeat(64) },
      },
    },
  ]);
  const tool = createGovernedDocumentListingTool(listing, versions);
  const result = await tool.execute(
    authorizedInvocation(tool.name, "list_documents"),
  );

  assertEquals(result.value.status, "ok");
  assertEquals(versions.checks, 2);
});

Deno.test("listing returns unavailable without loading protected documents", async () => {
  const listing = new RecordingDocumentListingPort([]);
  const tool = createGovernedDocumentListingTool(
    listing,
    new UnavailableSourceVersionPort("VERSION_SERVICE_UNAVAILABLE"),
  );
  const result = await tool.execute({
    ...authorizedInvocation(tool.name, "list_documents"),
    sourceVersions: [sourceVersion],
  });

  assertEquals(result.value.status, "unavailable");
  assertEquals(result.value.documents, []);
  assertEquals(result.value.reasonCode, "SOURCE_VERSION_CHECK_UNAVAILABLE");
  assertEquals(listing.requests.length, 0);
});

Deno.test("nested provider references are reconstructed before output", async () => {
  const versions = new ToggleSourceVersionPort();
  const leakedReference = {
    ...exactReference,
    checksum: {
      ...exactReference.checksum,
      objectKey: "s3://private/contracts/contract.pdf",
      filesystemPath: "/srv/private/contracts/contract.pdf",
      providerToken: "provider-secret",
      credentials: { accessKey: "access-secret" },
      rawClient: { request: () => "private" },
    },
    objectKey: "s3://private/contracts/contract.pdf",
    filesystemPath: "/srv/private/contracts/contract.pdf",
    providerToken: "provider-secret",
    credentials: { accessKey: "access-secret" },
    rawClient: { request: () => "private" },
  };
  const listing = createGovernedDocumentListingTool(
    new RecordingDocumentListingPort([
      {
        documentId: "doc_contract",
        name: "Contract.pdf",
        mimeType: "application/pdf",
        classification: "legal",
        currentVersion: leakedReference as DocumentSummary["currentVersion"],
      },
    ]),
    versions,
  );
  const metadata = createGovernedDocumentMetadataTool(
    new RecordingDocumentMetadataPort({
      reference: leakedReference,
      documentId: "doc_contract",
      name: "Contract.pdf",
      mimeType: "application/pdf",
      classification: "legal",
    } as GovernedDocumentMetadata),
    versions,
  );
  const content = createGovernedDocumentContentTool(
    new RecordingDocumentContentPort({
      reference: leakedReference,
      mediaType: "application/pdf",
      bytes: new TextEncoder().encode("contract"),
    } as GovernedDocumentContent),
    versions,
  );
  const search = createGovernedEvidenceSearchTool(
    new RecordingEvidenceSearchPort([
      {
        evidenceId: "evidence_contract",
        citationId: "citation_contract",
        source: {
          ...leakedReference,
          location: {
            kind: "page",
            page: 4,
            filesystemPath: "/srv/private/evidence.txt",
            providerToken: "provider-secret",
          },
          classification: "legal",
          processingVersion: "extract-v1",
        } as unknown as EvidenceSearchHit["source"],
      },
    ]),
    versions,
  );

  const listingResult = await listing.execute(
    authorizedInvocation(listing.name, "list_documents"),
  );
  const metadataResult = await metadata.execute({
    ...authorizedInvocation(metadata.name, "read_document_metadata"),
    input: { ...exactReference },
  });
  const contentResult = await content.execute({
    ...authorizedInvocation(content.name, "read_document_content"),
    input: { ...exactReference },
  });
  const searchResult = await search.execute({
    ...authorizedInvocation(search.name, "search_evidence"),
    input: { query: "change of control" },
  });

  assertEquals(
    (listingResult.value.documents as readonly DocumentSummary[])[0]
      .currentVersion,
    exactReference,
  );
  assertEquals(
    (metadataResult.value.metadata as GovernedDocumentMetadata).reference,
    exactReference,
  );
  assertEquals(
    contentResult.value.reference as ExactDocumentVersionReference,
    exactReference,
  );
  assertEquals(
    (searchResult.value.results as readonly EvidenceSearchHit[])[0].source,
    {
      ...exactReference,
      location: { kind: "page", page: 4 },
      classification: "legal",
      processingVersion: "extract-v1",
    },
  );
  const serialized = JSON.stringify([
    listingResult.value,
    metadataResult.value,
    contentResult.value,
    searchResult.value,
  ]);
  assertFalse(serialized.includes("private"));
  assertFalse(serialized.includes("provider-secret"));
  assertFalse(serialized.includes("access-secret"));
});

function authorizedInvocation(toolName: string, action: string) {
  return {
    activityId: "activity_tools_security" as ToolActivityId,
    context,
    actor,
    scope,
    toolName,
    action,
    resourceKind: "agent_tool",
    resourceId: toolName,
    input: {},
    sourceVersions: [],
    beforeEffect: () => Promise.resolve(),
    authority: {
      snapshotReference: "authz-v1",
      decisionReference: "decision_tools_security",
      checkedAt: new Date(),
    },
  };
}

class RecordingDocumentListingPort implements GovernedDocumentListingPort {
  readonly requests: DocumentListRequest[] = [];
  constructor(private readonly values: readonly DocumentSummary[]) {}
  list(request: DocumentListRequest): Promise<readonly DocumentSummary[]> {
    this.requests.push(request);
    return Promise.resolve(this.values);
  }
}

class RecordingDocumentMetadataPort implements GovernedDocumentMetadataPort {
  constructor(private readonly value: GovernedDocumentMetadata) {}
  read(
    _request: DocumentVersionReadRequest,
  ): Promise<GovernedDocumentMetadata> {
    return Promise.resolve(this.value);
  }
}

class RecordingDocumentContentPort implements GovernedDocumentContentPort {
  constructor(private readonly value: GovernedDocumentContent) {}
  read(
    _request: DocumentVersionReadRequest,
  ): Promise<GovernedDocumentContent> {
    return Promise.resolve(this.value);
  }
}

class RecordingEvidenceSearchPort implements GovernedEvidenceSearchPort {
  constructor(private readonly values: readonly EvidenceSearchHit[]) {}
  search(): Promise<readonly EvidenceSearchHit[]> {
    return Promise.resolve(this.values);
  }
}

class UnavailableSourceVersionPort implements GovernedSourceVersionPort {
  constructor(private readonly reasonCode: string) {}
  isCurrent(): Promise<CapabilityUnavailable> {
    return Promise.resolve({
      status: "unavailable",
      reasonCode: this.reasonCode,
    });
  }
}

class ToggleSourceVersionPort implements GovernedSourceVersionPort {
  current = true;
  checks = 0;
  onCheck?: () => void;
  isCurrent(): Promise<boolean> {
    this.checks += 1;
    this.onCheck?.();
    return Promise.resolve(this.current);
  }
}
