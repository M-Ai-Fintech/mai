import type {
  DocumentId,
  DocumentVersionId,
  ObjectReferenceId,
} from "./ids.ts";
import {
  type DealId,
  type TenantId,
  type WorkspaceId,
} from "../platform/api/v1.ts";

export type DocumentClassification =
  | "legal"
  | "financial"
  | "tax"
  | "operational"
  | "other";

export interface DocumentScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}

export interface Checksum {
  readonly algorithm: "sha256";
  readonly value: string;
}

export interface ObjectReference {
  readonly objectReferenceId: ObjectReferenceId;
  readonly scope: DocumentScope;
  readonly objectKey: string;
  readonly storageVersion: string;
  readonly checksum: Checksum;
  readonly byteLength: number;
  readonly mediaType: string;
  readonly createdAt: Date;
}

export interface Document {
  readonly documentId: DocumentId;
  readonly scope: DocumentScope;
  readonly name: string;
  readonly mimeType: string;
  readonly classification: DocumentClassification;
  readonly aggregateVersion: number;
  readonly currentVersionId?: DocumentVersionId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DocumentInput extends Omit<Document, "currentVersionId"> {
  readonly currentVersionId?: DocumentVersionId;
}

export function createDocument(input: DocumentInput): Document {
  assertDocumentId(input.documentId);
  assertScope(input.scope);
  assertText(input.name, "Document name", 512);
  assertText(input.mimeType, "Document MIME type", 255);
  assertClassification(input.classification);
  assertPositiveInteger(input.aggregateVersion, "Document aggregate version");
  assertDate(input.createdAt, "Document created timestamp");
  assertDate(input.updatedAt, "Document updated timestamp");
  return freezeDocument({ ...input });
}

export function createObjectReference(
  input: ObjectReference,
): ObjectReference {
  assertScope(input.scope);
  assertText(input.objectReferenceId, "Object reference ID", 96);
  assertText(input.objectKey, "Object key", 1024);
  assertText(input.storageVersion, "Object storage version", 255);
  assertChecksum(input.checksum);
  if (!Number.isSafeInteger(input.byteLength) || input.byteLength < 0) {
    throw new Error(
      `Object byte length "${input.byteLength}" is invalid; expected a non-negative safe integer.`,
    );
  }
  assertText(input.mediaType, "Object media type", 255);
  assertDate(input.createdAt, "Object reference created timestamp");
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    checksum: Object.freeze({ ...input.checksum }),
  });
}

export function assertDocumentScope(
  left: DocumentScope,
  right: DocumentScope,
): void {
  if (sameDocumentScope(left, right)) return;
  throw new Error(
    `Document scope "${scopeKey(left)}" does not match expected scope "${
      scopeKey(right)
    }".`,
  );
}

export function sameDocumentScope(
  left: DocumentScope,
  right: DocumentScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

export function assertChecksum(checksum: Checksum): void {
  if (
    checksum.algorithm === "sha256" &&
    /^[0-9a-f]{64}$/.test(checksum.value)
  ) return;
  throw new Error(
    `Checksum "${checksum.algorithm}:${checksum.value}" is invalid; expected a lowercase SHA-256 digest.`,
  );
}

function assertDocumentId(documentId: DocumentId): void {
  if (documentId.startsWith("doc_")) return;
  throw new Error(
    `Document ID "${documentId}" is invalid; expected a document_ identifier.`,
  );
}

function assertScope(scope: DocumentScope): void {
  assertText(scope.tenantId, "Document tenant ID", 96);
  assertText(scope.workspaceId, "Document workspace ID", 96);
  assertText(scope.dealId, "Document deal ID", 96);
}

function assertClassification(
  classification: DocumentClassification,
): void {
  if (
    ["legal", "financial", "tax", "operational", "other"].includes(
      classification,
    )
  ) return;
  throw new Error(
    `Document classification "${classification}" is invalid; expected a supported classification.`,
  );
}

function assertPositiveInteger(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new Error(
    `${label} "${value}" is invalid; expected a positive safe integer.`,
  );
}

function assertText(value: string, label: string, maximum: number): void {
  if (typeof value === "string" && value.trim() && value.length <= maximum) {
    return;
  }
  throw new Error(
    `${label} "${value}" is invalid; expected 1-${maximum} non-whitespace characters.`,
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

function freezeDocument(document: Document): Document {
  return Object.freeze({
    ...document,
    scope: Object.freeze({ ...document.scope }),
  });
}

function scopeKey(scope: DocumentScope): string {
  return `${scope.tenantId}/${scope.workspaceId}/${scope.dealId}`;
}
