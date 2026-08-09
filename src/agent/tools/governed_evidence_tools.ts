import type {
  AuthorizedToolInvocation,
  ToolDefinition,
  ToolOutput,
} from "../../agent_runtime/tool_gateway.ts";
import {
  type DocumentListRequest,
  type DocumentSummary,
  type EvidenceSearchHit,
  type ExactDocumentVersionReference,
  type GovernedDocumentContentPort,
  type GovernedDocumentListingPort,
  type GovernedDocumentMetadataPort,
  type GovernedEvidenceSearchPort,
  type GovernedEvidenceToolDependencies,
  type GovernedSourceVersionPort,
} from "./governed_evidence_tool_contracts.ts";
import {
  GOVERNED_EVIDENCE_TOOL_NAMES,
} from "./governed_evidence_tool_contracts.ts";
import {
  bytesToBase64,
  contentStatus,
  contentUnavailable,
  denied,
  freshnessCode,
  isUnavailable,
  proposalDenied,
  proposalStatus,
  reason,
  result,
  sanitizeContent,
  sanitizeDocumentSummary,
  sanitizeMetadata,
  sanitizeSearchHit,
  searchResult,
  unavailable,
} from "./governed_evidence_tool_values.ts";
import {
  optionalText,
  parseBasis,
  parseDocumentReference,
  parseEvidenceReference,
  prepareInput,
  readLimit,
  recheckSources,
  sameDocumentReference,
  type VersionReader,
} from "./governed_evidence_tool_input.ts";

export * from "./governed_evidence_tool_contracts.ts";

export class GovernedDocumentListingTool implements ToolDefinition {
  readonly name = GOVERNED_EVIDENCE_TOOL_NAMES.listDocuments;
  readonly capability = "read" as const;
  constructor(
    private readonly port: GovernedDocumentListingPort,
    private readonly sourceVersions: GovernedSourceVersionPort,
  ) {}
  async execute(invocation: AuthorizedToolInvocation): Promise<ToolOutput> {
    const prepared = prepareInput(
      invocation,
      this.capability,
      "list_documents",
      this.name,
    );
    if (!prepared.ok) return prepared.output;
    const options = parseListingOptions(prepared.input);
    if (options === undefined) return denied(this.capability, "INVALID_INPUT");
    const before = await recheckSources(
      invocation,
      this.sourceVersions,
      [],
    );
    if (before !== "current") return listingStatus(before);
    const response = await this.port.list({
      context: invocation.context,
      scope: invocation.scope,
      ...options,
    });
    if (isUnavailable(response)) {
      return listingStatus("unavailable", response.reasonCode);
    }
    const documents = sanitizeListingDocuments(response);
    if (documents === undefined) {
      return listingStatus("unavailable", "INVALID_PROVIDER_RESPONSE");
    }
    const freshness = await recheckSources(
      invocation,
      this.sourceVersions,
      documentVersions(documents),
    );
    if (freshness !== "current") return listingStatus(freshness);
    return result(this.capability, {
      status: "ok",
      documents,
    });
  }
}

export class GovernedDocumentMetadataTool implements ToolDefinition {
  readonly name = GOVERNED_EVIDENCE_TOOL_NAMES.readMetadata;
  readonly capability = "read" as const;
  constructor(
    private readonly port: GovernedDocumentMetadataPort,
    private readonly sourceVersions: GovernedSourceVersionPort,
  ) {}
  execute(invocation: AuthorizedToolInvocation): Promise<ToolOutput> {
    return executeExact(
      invocation,
      this.sourceVersions,
      (request) => this.port.read(request),
      "metadata",
      this.name,
      "read_document_metadata",
    );
  }
}

export class GovernedDocumentContentTool implements ToolDefinition {
  readonly name = GOVERNED_EVIDENCE_TOOL_NAMES.readContent;
  readonly capability = "read" as const;
  constructor(
    private readonly port: GovernedDocumentContentPort,
    private readonly sourceVersions: GovernedSourceVersionPort,
  ) {}
  execute(invocation: AuthorizedToolInvocation): Promise<ToolOutput> {
    return executeExact(
      invocation,
      this.sourceVersions,
      (request) => this.port.read(request),
      "content",
      this.name,
      "read_document_content",
    );
  }
}

export class GovernedEvidenceSearchTool implements ToolDefinition {
  readonly name = GOVERNED_EVIDENCE_TOOL_NAMES.searchEvidence;
  readonly capability = "read" as const;
  constructor(
    private readonly port: GovernedEvidenceSearchPort,
    private readonly sourceVersions: GovernedSourceVersionPort,
  ) {}
  async execute(invocation: AuthorizedToolInvocation): Promise<ToolOutput> {
    const prepared = prepareInput(
      invocation,
      this.capability,
      "search_evidence",
      this.name,
    );
    if (!prepared.ok) return prepared.output;
    const query = optionalText(prepared.input.query, 512);
    const limit = readLimit(prepared.input.limit);
    if (query === undefined || limit === undefined) {
      return searchResult("denied", "", "INVALID_INPUT");
    }
    const before = await recheckSources(invocation, this.sourceVersions, []);
    if (before !== "current") {
      return searchResult(before, query, freshnessCode(before));
    }
    const response = await this.port.search({
      context: invocation.context,
      scope: invocation.scope,
      query,
      limit,
    });
    if (isUnavailable(response)) {
      return searchResult("unavailable", query, response.reasonCode);
    }
    if (!Array.isArray(response)) {
      return searchResult("unavailable", query, "INVALID_PROVIDER_RESPONSE");
    }
    const hits = response.map(sanitizeSearchHit);
    const safeHits = hits.filter(isEvidenceSearchHit);
    if (safeHits.length !== hits.length) {
      return searchResult("unavailable", query, "INVALID_PROVIDER_RESPONSE");
    }
    const freshness = await recheckSources(
      invocation,
      this.sourceVersions,
      safeHits.map((hit) => hit.source),
    );
    if (freshness !== "current") {
      return searchResult(freshness, query, freshnessCode(freshness));
    }
    return result(this.capability, {
      status: "ok",
      query,
      results: safeHits,
    });
  }
}

export class GovernedCitationProposalTool implements ToolDefinition {
  readonly name = GOVERNED_EVIDENCE_TOOL_NAMES.proposeCitation;
  readonly capability = "proposal" as const;
  constructor(private readonly sourceVersions: GovernedSourceVersionPort) {}
  async execute(invocation: AuthorizedToolInvocation): Promise<ToolOutput> {
    const prepared = prepareInput(
      invocation,
      this.capability,
      "propose_citation",
      this.name,
    );
    if (!prepared.ok) return proposalDenied(reason(prepared.output));
    const source = parseEvidenceReference(prepared.input.source);
    const excerpt = optionalText(prepared.input.excerpt, 16_384);
    if (
      source === undefined ||
      (prepared.input.excerpt !== undefined && excerpt === undefined)
    ) return proposalDenied("INVALID_INPUT");
    const freshness = await recheckSources(invocation, this.sourceVersions, [
      source,
    ]);
    if (freshness !== "current") {
      return proposalStatus(freshness, freshnessCode(freshness));
    }
    const proposalId =
      `citation:${source.documentVersionId}:${source.version}:${
        source.checksum.value.slice(0, 16)
      }`;
    const proposal = {
      proposalId,
      proposalType: "citation",
      scope: invocation.scope,
      source,
      ...(excerpt === undefined ? {} : { excerpt }),
      state: "proposed",
      proposalOnly: true,
      final: false,
    };
    return result(this.capability, {
      status: "proposal",
      source,
      proposal,
      persisted: false,
      approved: false,
    });
  }
}

export class GovernedMissingDocumentFindingTool implements ToolDefinition {
  readonly name = GOVERNED_EVIDENCE_TOOL_NAMES.proposeMissingDocumentFinding;
  readonly capability = "proposal" as const;
  constructor(private readonly sourceVersions: GovernedSourceVersionPort) {}
  async execute(invocation: AuthorizedToolInvocation): Promise<ToolOutput> {
    const prepared = prepareInput(
      invocation,
      this.capability,
      "propose_missing_document_finding",
      this.name,
    );
    if (!prepared.ok) return proposalDenied(reason(prepared.output));
    const title = optionalText(prepared.input.title, 512);
    const statement = optionalText(prepared.input.statement, 4096);
    const basis = parseBasis(prepared.input.basis);
    if (title === undefined || statement === undefined || basis === undefined) {
      return proposalDenied("INVALID_INPUT");
    }
    const freshness = await recheckSources(
      invocation,
      this.sourceVersions,
      basis,
    );
    if (freshness !== "current") {
      return proposalStatus(freshness, freshnessCode(freshness));
    }
    const proposalId = `missing-document:${invocation.scope.dealId}:${
      title.toLowerCase().replaceAll(" ", "-")
    }`;
    const finding = {
      aggregateType: "finding",
      proposalId,
      scope: invocation.scope,
      title,
      statement,
      basis,
      state: "proposed",
      proposalOnly: true,
      final: false,
    };
    return result(this.capability, {
      status: "proposal",
      finding,
      proposal: finding,
      persisted: false,
      approved: false,
    });
  }
}

export function createGovernedDocumentListingTool(
  port: GovernedDocumentListingPort,
  sourceVersions: GovernedSourceVersionPort,
): GovernedDocumentListingTool {
  return new GovernedDocumentListingTool(port, sourceVersions);
}
export function createGovernedDocumentMetadataTool(
  port: GovernedDocumentMetadataPort,
  sourceVersions: GovernedSourceVersionPort,
): GovernedDocumentMetadataTool {
  return new GovernedDocumentMetadataTool(port, sourceVersions);
}
export function createGovernedDocumentContentTool(
  port: GovernedDocumentContentPort,
  sourceVersions: GovernedSourceVersionPort,
): GovernedDocumentContentTool {
  return new GovernedDocumentContentTool(port, sourceVersions);
}
export function createGovernedEvidenceSearchTool(
  port: GovernedEvidenceSearchPort,
  sourceVersions: GovernedSourceVersionPort,
): GovernedEvidenceSearchTool {
  return new GovernedEvidenceSearchTool(port, sourceVersions);
}
export function createGovernedCitationProposalTool(
  sourceVersions: GovernedSourceVersionPort,
): GovernedCitationProposalTool {
  return new GovernedCitationProposalTool(sourceVersions);
}
export function createGovernedMissingDocumentFindingTool(
  sourceVersions: GovernedSourceVersionPort,
): GovernedMissingDocumentFindingTool {
  return new GovernedMissingDocumentFindingTool(sourceVersions);
}
export function createGovernedEvidenceToolDefinitions(
  dependencies: GovernedEvidenceToolDependencies,
): readonly ToolDefinition[] {
  return Object.freeze([
    createGovernedDocumentListingTool(
      dependencies.listing,
      dependencies.sourceVersions,
    ),
    createGovernedDocumentMetadataTool(
      dependencies.metadata,
      dependencies.sourceVersions,
    ),
    createGovernedDocumentContentTool(
      dependencies.content,
      dependencies.sourceVersions,
    ),
    createGovernedEvidenceSearchTool(
      dependencies.search,
      dependencies.sourceVersions,
    ),
    createGovernedCitationProposalTool(dependencies.sourceVersions),
    createGovernedMissingDocumentFindingTool(dependencies.sourceVersions),
  ]);
}

async function executeExact(
  invocation: AuthorizedToolInvocation,
  sourceVersions: GovernedSourceVersionPort,
  read: VersionReader,
  mode: "metadata" | "content",
  toolName: string,
  action: string,
): Promise<ToolOutput> {
  const prepared = prepareInput(invocation, "read", action, toolName);
  if (!prepared.ok) return prepared.output;
  const reference = parseDocumentReference(prepared.input);
  if (reference === undefined) return denied("read", "INVALID_INPUT");
  const before = await recheckSources(invocation, sourceVersions, [reference]);
  if (before !== "current") {
    return mode === "content"
      ? contentStatus(before)
      : result("read", { status: before, reasonCode: freshnessCode(before) });
  }
  const response = await read({
    context: invocation.context,
    scope: invocation.scope,
    reference,
  });
  const after = await recheckSources(invocation, sourceVersions, [reference]);
  if (after !== "current") {
    return mode === "content"
      ? contentStatus(after)
      : result("read", { status: after, reasonCode: freshnessCode(after) });
  }
  if (isUnavailable(response)) {
    return mode === "content"
      ? contentUnavailable(response.reasonCode)
      : unavailable("read", response.reasonCode);
  }
  if (response === undefined) {
    return mode === "content"
      ? contentStatus("not_found")
      : result("read", { status: "not_found" });
  }
  if (mode === "metadata") {
    const metadata = sanitizeMetadata(response);
    if (metadata === undefined) {
      return unavailable("read", "INVALID_PROVIDER_RESPONSE");
    }
    if (!sameDocumentReference(metadata.reference, reference)) {
      return result("read", {
        status: "stale",
        reasonCode: "SOURCE_VERSION_INVALIDATED",
      });
    }
    return result("read", {
      status: "ok",
      metadata,
    });
  }
  const content = sanitizeContent(response);
  if (content === undefined) {
    return contentUnavailable("INVALID_PROVIDER_RESPONSE");
  }
  if (!sameDocumentReference(content.reference, reference)) {
    return contentStatus("stale");
  }
  return result("read", {
    status: "ok",
    content: bytesToBase64(content.bytes),
    contentEncoding: "base64",
    mediaType: content.mediaType,
    reference: content.reference,
  });
}

function parseListingOptions(
  input: Record<string, unknown>,
): Pick<DocumentListRequest, "limit" | "afterDocumentId"> | undefined {
  const limit = readLimit(input.limit);
  const afterDocumentId = optionalText(input.afterDocumentId, 96);
  return limit === undefined ||
      (input.afterDocumentId !== undefined && afterDocumentId === undefined)
    ? undefined
    : { limit, ...(afterDocumentId === undefined ? {} : { afterDocumentId }) };
}

function listingStatus(
  status: "stale" | "unavailable",
  reasonCode = freshnessCode(status),
): ToolOutput {
  return result("read", { status, documents: [], reasonCode });
}

function sanitizeListingDocuments(
  response: unknown,
): readonly DocumentSummary[] | undefined {
  if (!Array.isArray(response)) return undefined;
  const documents = response.map(sanitizeDocumentSummary);
  const safeDocuments = documents.filter(isDocumentSummary);
  return safeDocuments.length === documents.length ? safeDocuments : undefined;
}

function documentVersions(
  documents: readonly DocumentSummary[],
): readonly ExactDocumentVersionReference[] {
  return documents.flatMap((document) =>
    document.currentVersion === undefined ? [] : [document.currentVersion]
  );
}

function isDocumentSummary(
  value: DocumentSummary | undefined,
): value is DocumentSummary {
  return value !== undefined;
}

function isEvidenceSearchHit(
  value: EvidenceSearchHit | undefined,
): value is EvidenceSearchHit {
  return value !== undefined;
}
