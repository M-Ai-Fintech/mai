import type {
  AuthorizedToolInvocation,
  ToolOutput,
} from "../../agent_runtime/tool_gateway.ts";
import type {
  RuntimeScope,
  SourceVersionReference,
} from "../../agent_runtime/model.ts";
import type {
  CapabilityUnavailable,
  CitationLocation,
  DocumentClassification,
  DocumentVersionReadRequest,
  ExactDocumentVersionReference,
  ExactEvidenceReference,
  GovernedDocumentContent,
  GovernedDocumentMetadata,
  GovernedSourceVersionPort,
} from "./governed_evidence_tool_contracts.ts";
import {
  denied,
  isRecord,
  isUnavailable,
} from "./governed_evidence_tool_values.ts";

export type PreparedInput =
  | { readonly ok: true; readonly input: Record<string, unknown> }
  | { readonly ok: false; readonly output: ToolOutput };
export type VersionResponse =
  | GovernedDocumentMetadata
  | GovernedDocumentContent
  | CapabilityUnavailable
  | undefined;
export type VersionReader = (
  request: DocumentVersionReadRequest,
) => Promise<VersionResponse>;

export function prepareInput(
  invocation: AuthorizedToolInvocation,
  capability: "read" | "proposal",
  expectedAction: string,
  expectedToolName: string,
): PreparedInput {
  if (
    invocation.context.actorId !== invocation.actor.actorId ||
    invocation.context.tenantId !== invocation.scope.tenantId ||
    invocation.context.workspaceId !== invocation.scope.workspaceId ||
    invocation.context.dealId !== invocation.scope.dealId
  ) return { ok: false, output: denied(capability, "TRUSTED_SCOPE_MISMATCH") };
  if (
    invocation.action !== expectedAction ||
    invocation.resourceKind !== "agent_tool" ||
    invocation.resourceId !== expectedToolName
  ) return { ok: false, output: denied(capability, "TOOL_REQUEST_MISMATCH") };
  if (!isRecord(invocation.input)) {
    return { ok: false, output: denied(capability, "INVALID_INPUT") };
  }
  if (
    invocation.input.scope !== undefined &&
    !sameInputScope(invocation.input.scope, invocation.scope)
  ) return { ok: false, output: denied(capability, "SCOPE_MISMATCH") };
  return { ok: true, input: invocation.input };
}

export async function recheckSources(
  invocation: AuthorizedToolInvocation,
  port: GovernedSourceVersionPort,
  additional: readonly ExactDocumentVersionReference[],
): Promise<"current" | "stale" | "unavailable"> {
  const references = new Map<string, SourceVersionReference>();
  for (const reference of invocation.sourceVersions) {
    references.set(sourceVersionKey(reference), reference);
  }
  for (const reference of additional) {
    const source: SourceVersionReference = {
      sourceType: "document_version",
      sourceId: reference.documentVersionId,
      version: reference.version as SourceVersionReference["version"],
      checksum: reference.checksum.value,
    };
    references.set(sourceVersionKey(source), source);
  }
  for (const reference of references.values()) {
    const current = await port.isCurrent({
      context: invocation.context,
      scope: invocation.scope,
      reference,
    });
    if (isUnavailable(current)) return "unavailable";
    if (!current) return "stale";
  }
  return "current";
}

export function parseDocumentReference(
  input: Record<string, unknown>,
): ExactDocumentVersionReference | undefined {
  const source = isRecord(input.source) ? input.source : input;
  const documentVersionId = optionalText(source.documentVersionId, 96);
  const versionValue = source.version ?? source.versionNumber ??
    source.expectedVersion;
  const version =
    typeof versionValue === "number" && Number.isSafeInteger(versionValue) &&
      versionValue > 0
      ? versionValue
      : undefined;
  const checksum = readChecksum(source.checksum);
  return documentVersionId === undefined || version === undefined ||
      checksum === undefined
    ? undefined
    : { documentVersionId, version, checksum };
}

export function parseEvidenceReference(
  value: unknown,
): ExactEvidenceReference | undefined {
  if (!isRecord(value)) return undefined;
  const reference = parseDocumentReference(value);
  const classification = value.classification;
  const processingVersion = optionalText(value.processingVersion, 128);
  const location = parseLocation(value.location);
  return reference !== undefined && isClassification(classification) &&
      processingVersion !== undefined && location !== undefined
    ? { ...reference, classification, processingVersion, location }
    : undefined;
}

export function parseBasis(
  value: unknown,
): ExactEvidenceReference[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return undefined;
  const basis = value.map(parseEvidenceReference);
  return basis.some((reference) => reference === undefined)
    ? undefined
    : basis as ExactEvidenceReference[];
}

export function readLimit(value: unknown): number | undefined {
  return value === undefined
    ? 50
    : typeof value === "number" && Number.isSafeInteger(value) && value > 0 &&
        value <= 100
    ? value
    : undefined;
}

export function optionalText(
  value: unknown,
  maximum: number,
): string | undefined {
  return typeof value === "string" && value.trim() && value.length <= maximum
    ? value.trim()
    : undefined;
}

export function sameDocumentReference(
  left: ExactDocumentVersionReference,
  right: ExactDocumentVersionReference,
): boolean {
  return left.documentVersionId === right.documentVersionId &&
    left.version === right.version &&
    left.checksum.algorithm === right.checksum.algorithm &&
    left.checksum.value === right.checksum.value;
}

export function sourceVersionKey(reference: SourceVersionReference): string {
  return `${reference.sourceType}:${reference.sourceId}:${reference.version}:${
    reference.checksum ?? ""
  }`;
}

function readChecksum(
  value: unknown,
): { readonly algorithm: "sha256"; readonly value: string } | undefined {
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

function parseLocation(value: unknown): CitationLocation | undefined {
  if (!isRecord(value) || typeof value.kind !== "string") return undefined;
  if (value.kind === "page" && positive(value.page)) {
    return { kind: "page", page: value.page };
  }
  if (
    value.kind === "line" && positive(value.startLine) &&
    positive(value.endLine) && value.endLine >= value.startLine
  ) return { kind: "line", startLine: value.startLine, endLine: value.endLine };
  if (
    value.kind === "character" && nonNegative(value.start) &&
    positive(value.end) && value.end > value.start
  ) return { kind: "character", start: value.start, end: value.end };
  const artifact = optionalText(value.artifactId, 256);
  return value.kind === "artifact" && artifact !== undefined
    ? { kind: "artifact", artifactId: artifact }
    : undefined;
}

function isClassification(value: unknown): value is DocumentClassification {
  return value === "legal" || value === "financial" || value === "tax" ||
    value === "operational" || value === "other";
}
function positive(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function nonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function sameInputScope(value: unknown, scope: RuntimeScope): boolean {
  return isRecord(value) && value.tenantId === scope.tenantId &&
    value.workspaceId === scope.workspaceId && value.dealId === scope.dealId;
}
