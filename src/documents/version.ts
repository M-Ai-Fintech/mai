import type { DocumentSource } from "./source.ts";
import {
  assertChecksum,
  assertDocumentScope,
  type Checksum,
  type DocumentScope,
  type ObjectReference,
} from "./model.ts";
import type { DocumentId, DocumentVersionId } from "./ids.ts";
import type { ProviderMarker } from "./source.ts";

export interface DocumentVersion {
  readonly documentVersionId: DocumentVersionId;
  readonly documentId: DocumentId;
  readonly scope: DocumentScope;
  readonly versionNumber: number;
  readonly source: DocumentSource;
  readonly provider: ProviderMarker;
  readonly checksum: Checksum;
  readonly classification:
    | "legal"
    | "financial"
    | "tax"
    | "operational"
    | "other";
  readonly objectReference: ObjectReference;
  readonly createdAt: Date;
}

export interface DocumentVersionInput extends DocumentVersion {}

export function createDocumentVersion(
  input: DocumentVersionInput,
): DocumentVersion {
  assertText(input.documentVersionId, "Document version ID", 96);
  assertText(input.documentId, "Document ID", 96);
  assertDocumentScope(input.scope, input.source.scope);
  assertDocumentScope(input.scope, input.objectReference.scope);
  if (!Number.isSafeInteger(input.versionNumber) || input.versionNumber < 1) {
    throw new Error(
      `Document version number "${input.versionNumber}" is invalid; expected a positive safe integer.`,
    );
  }
  if (input.provider !== input.source.provider) {
    throw new Error(
      `Document version provider "${input.provider}" does not match source provider "${input.source.provider}".`,
    );
  }
  assertChecksum(input.checksum);
  assertChecksum(input.objectReference.checksum);
  if (input.checksum.value !== input.objectReference.checksum.value) {
    throw new Error(
      `Document version checksum "${input.checksum.value}" does not match object checksum "${input.objectReference.checksum.value}".`,
    );
  }
  assertDate(input.createdAt, "Document version created timestamp");
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    source: input.source,
    checksum: Object.freeze({ ...input.checksum }),
    objectReference: input.objectReference,
  });
}

function assertText(value: string, label: string, maximum: number): void {
  if (typeof value === "string" && value.trim() && value.length <= maximum) {
    return;
  }
  throw new Error(
    `${label} "${value}" is invalid; expected 1-${maximum} characters.`,
  );
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `${label} "${
      String(value)
    }" is invalid; expected a valid Date supplied by the caller.`,
  );
}
