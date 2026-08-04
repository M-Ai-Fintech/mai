import type { CitationId } from "./ids.ts";
import {
  createExactDocumentVersionReference,
  type EvidenceScope,
  type ExactDocumentVersionReference,
} from "./model.ts";
import type { Freshness } from "./freshness.ts";

export interface Citation {
  readonly citationId: CitationId;
  readonly scope: EvidenceScope;
  readonly source: ExactDocumentVersionReference;
  readonly excerpt?: string;
  readonly freshness: Freshness;
  readonly createdAt: Date;
}

export function createCitation(input: Citation): Citation {
  if (input.excerpt !== undefined && input.excerpt.length > 16_384) {
    throw new Error(
      `Citation excerpt length "${input.excerpt.length}" is invalid; expected at most 16384 characters.`,
    );
  }
  if (input.source.location.kind !== "artifact" && !(input.excerpt?.trim())) {
    throw new Error(
      "Citation excerpt is empty; expected a source excerpt or artifact location.",
    );
  }
  const source = createExactDocumentVersionReference(input.source);
  if (
    !input.scope.tenantId || !input.scope.workspaceId || !input.scope.dealId
  ) {
    throw new Error(
      "Citation scope is incomplete; expected tenant, workspace, and Deal IDs.",
    );
  }
  if (
    !(input.createdAt instanceof Date) ||
    Number.isNaN(input.createdAt.getTime())
  ) {
    throw new Error(
      `Citation created timestamp "${
        String(input.createdAt)
      }" is invalid; expected a valid Date.`,
    );
  }
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    source,
  });
}
