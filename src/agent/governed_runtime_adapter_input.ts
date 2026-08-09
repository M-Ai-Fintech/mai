import type {
  ExactDocumentVersionReference,
  ExactEvidenceReference,
} from "./tools/governed_evidence_tool_contracts.ts";
import {
  isRecord,
  parseExactDocumentReference,
  parseExactEvidenceReference,
} from "./tools/governed_evidence_tool_values.ts";
import type { RuntimeScope } from "../agent_runtime/model.ts";

export interface ExactDocumentToolInput {
  readonly scope: RuntimeScope;
  readonly reference: ExactDocumentVersionReference;
}

export interface CitationToolInput {
  readonly scope: RuntimeScope;
  readonly source: ExactEvidenceReference;
  readonly excerpt?: string;
}

export type GovernedToolInputMapping =
  | {
    readonly status: "ready";
    readonly input: Readonly<Record<string, unknown>>;
  }
  | { readonly status: "unavailable"; readonly reason: string };

export function mapGovernedToolInput(
  capability: string,
  requestInput: unknown,
  scope: RuntimeScope,
): GovernedToolInputMapping {
  const input = record(requestInput);
  const context = record(input.context);
  if (
    capability === "document.metadata.read" ||
    capability === "document.content.read"
  ) return mapDocumentInput(capability, input, context, scope);
  if (capability === "citation.propose") {
    return mapCitationInput(capability, input, context, scope);
  }
  return mapLegacyInput(capability, input, scope);
}

function mapDocumentInput(
  capability: string,
  input: Record<string, unknown>,
  context: Record<string, unknown>,
  scope: RuntimeScope,
): GovernedToolInputMapping {
  const candidate = context.reference ?? input.reference ?? context;
  const reference = parseExactDocumentReference(candidate, true);
  return reference === undefined
    ? unavailable(capability, "context.reference exact document version")
    : ready({ scope, reference });
}

function mapCitationInput(
  capability: string,
  input: Record<string, unknown>,
  context: Record<string, unknown>,
  scope: RuntimeScope,
): GovernedToolInputMapping {
  const sourceCandidate = context.source ?? input.source ?? context;
  const source = parseExactEvidenceReference(sourceCandidate, true);
  const excerptValue = context.excerpt ?? input.excerpt;
  const excerpt = optionalText(excerptValue);
  if (
    source === undefined || excerptValue !== undefined && excerpt === undefined
  ) {
    return unavailable(capability, "context.source exact evidence reference");
  }
  return ready({
    scope,
    source,
    ...(excerpt === undefined ? {} : { excerpt }),
  });
}

function mapLegacyInput(
  capability: string,
  input: Record<string, unknown>,
  scope: RuntimeScope,
): GovernedToolInputMapping {
  if (capability === "document.list") return ready({ scope, limit: 50 });
  if (capability === "evidence.search") {
    return ready({
      scope,
      query: text(input.query) ?? "governed proposal",
      limit: 50,
    });
  }
  if (capability === "finding.propose") {
    return ready({
      scope,
      title: "Governed proposal finding",
      statement: text(input.query) ?? "Review required.",
      basis: [],
    });
  }
  return ready({ scope, ...input });
}

function ready(
  input: Readonly<Record<string, unknown>>,
): GovernedToolInputMapping {
  return { status: "ready", input };
}

function unavailable(
  capability: string,
  expected: string,
): GovernedToolInputMapping {
  return {
    status: "unavailable",
    reason: `Capability "${capability}" requires ${expected}.`,
  };
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() && value.length <= 16_384
    ? value.trim()
    : undefined;
}
