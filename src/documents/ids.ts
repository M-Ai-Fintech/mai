const MAX_DOCUMENT_IDENTIFIER_LENGTH = 96;

const documentIdBrand: unique symbol = Symbol("document-id");
const documentVersionIdBrand: unique symbol = Symbol("document-version-id");
const documentSourceIdBrand: unique symbol = Symbol("document-source-id");
const connectorAccountIdBrand: unique symbol = Symbol("connector-account-id");
const objectReferenceIdBrand: unique symbol = Symbol("object-reference-id");
const processingRunIdBrand: unique symbol = Symbol("processing-run-id");
const derivedArtifactIdBrand: unique symbol = Symbol("derived-artifact-id");

export type DocumentId = string & {
  readonly [documentIdBrand]: "DocumentId";
};

export type DocumentVersionId = string & {
  readonly [documentVersionIdBrand]: "DocumentVersionId";
};

export type DocumentSourceId = string & {
  readonly [documentSourceIdBrand]: "DocumentSourceId";
};

export type ConnectorAccountId = string & {
  readonly [connectorAccountIdBrand]: "ConnectorAccountId";
};

export type ObjectReferenceId = string & {
  readonly [objectReferenceIdBrand]: "ObjectReferenceId";
};

export type ProcessingRunId = string & {
  readonly [processingRunIdBrand]: "ProcessingRunId";
};

export type DerivedArtifactId = string & {
  readonly [derivedArtifactIdBrand]: "DerivedArtifactId";
};

export type DocumentIdentifierIssueCode =
  | "INVALID_TYPE"
  | "EMPTY"
  | "SURROUNDING_WHITESPACE"
  | "WRONG_PREFIX"
  | "INCOMPLETE"
  | "INVALID_LENGTH"
  | "INVALID_FORMAT";

export type DocumentIdentifierResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
    readonly ok: false;
    readonly issue: { readonly code: DocumentIdentifierIssueCode };
  };

export function parseDocumentId(
  value: unknown,
): DocumentIdentifierResult<DocumentId> {
  return parseDocumentIdentifier(value, "doc_") as DocumentIdentifierResult<
    DocumentId
  >;
}

export function parseDocumentVersionId(
  value: unknown,
): DocumentIdentifierResult<DocumentVersionId> {
  return parseDocumentIdentifier(value, "docver_") as DocumentIdentifierResult<
    DocumentVersionId
  >;
}

export function parseDocumentSourceId(
  value: unknown,
): DocumentIdentifierResult<DocumentSourceId> {
  return parseDocumentIdentifier(value, "source_") as DocumentIdentifierResult<
    DocumentSourceId
  >;
}

export function parseConnectorAccountId(
  value: unknown,
): DocumentIdentifierResult<ConnectorAccountId> {
  return parseDocumentIdentifier(
    value,
    "connector_",
  ) as DocumentIdentifierResult<ConnectorAccountId>;
}

export function parseObjectReferenceId(
  value: unknown,
): DocumentIdentifierResult<ObjectReferenceId> {
  return parseDocumentIdentifier(value, "object_") as DocumentIdentifierResult<
    ObjectReferenceId
  >;
}

export function parseProcessingRunId(
  value: unknown,
): DocumentIdentifierResult<ProcessingRunId> {
  return parseDocumentIdentifier(value, "run_") as DocumentIdentifierResult<
    ProcessingRunId
  >;
}

export function parseDerivedArtifactId(
  value: unknown,
): DocumentIdentifierResult<DerivedArtifactId> {
  return parseDocumentIdentifier(
    value,
    "artifact_",
  ) as DocumentIdentifierResult<DerivedArtifactId>;
}

function parseDocumentIdentifier(
  value: unknown,
  prefix: string,
): DocumentIdentifierResult<string> {
  if (typeof value !== "string") return identifierFailure("INVALID_TYPE");
  if (value.length === 0) return identifierFailure("EMPTY");
  if (value !== value.trim()) {
    return identifierFailure("SURROUNDING_WHITESPACE");
  }
  if (!value.startsWith(prefix)) return identifierFailure("WRONG_PREFIX");
  if (value.length === prefix.length) return identifierFailure("INCOMPLETE");
  if (value.length > MAX_DOCUMENT_IDENTIFIER_LENGTH) {
    return identifierFailure("INVALID_LENGTH");
  }
  if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length))) {
    return { ok: true, value };
  }
  return identifierFailure("INVALID_FORMAT");
}

function identifierFailure(
  code: DocumentIdentifierIssueCode,
): DocumentIdentifierResult<never> {
  return { ok: false, issue: { code } };
}
