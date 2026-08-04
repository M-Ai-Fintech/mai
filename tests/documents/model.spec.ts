import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import {
  parseConnectorAccountId,
  parseDocumentId,
  parseDocumentSourceId,
  parseDocumentVersionId,
  parseObjectReferenceId,
  parseProcessingRunId,
} from "../../src/documents/ids.ts";
import {
  createDocument,
  createObjectReference,
} from "../../src/documents/model.ts";
import { createDocumentVersion } from "../../src/documents/version.ts";
import {
  createDocumentSource,
  createProviderMarker,
} from "../../src/documents/source.ts";
import { createProcessingRun } from "../../src/documents/processing.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";

Deno.test("document identifiers preserve bounded-context brands", () => {
  assert(parseDocumentId("doc_contract").ok);
  assert(parseDocumentVersionId("docver_contract-v1").ok);
  assert(parseDocumentSourceId("source_room").ok);
  assert(parseConnectorAccountId("connector_papermark").ok);
  assert(parseObjectReferenceId("object_contract-v1").ok);
  assert(parseProcessingRunId("run_extract-v1").ok);
  assertFalse(parseDocumentId("tenant_contract").ok);
});

Deno.test("document creation requires explicit tenant/workspace/deal scope and metadata", () => {
  const scope = fixtureScope();
  const document = createDocument({
    documentId: requiredId("doc_contract", parseDocumentId),
    scope,
    name: "Share Purchase Agreement.pdf",
    mimeType: "application/pdf",
    classification: "legal",
    aggregateVersion: 1,
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
    updatedAt: timestamp("2026-08-03T12:00:00.000Z"),
  });

  assertEquals(document.scope, scope);
  assertEquals(document.name, "Share Purchase Agreement.pdf");
  assertEquals(document.currentVersionId, undefined);
  assert(Object.isFrozen(document));
  assertThrows(
    () => createDocument({ ...document, name: "" }),
    Error,
    'Document name ""',
  );
});

Deno.test("document versions are immutable and never invent source identity or timestamps", () => {
  const scope = fixtureScope();
  const source = createDocumentSource({
    sourceId: requiredId("source_room", parseDocumentSourceId),
    scope,
    connectorAccount: {
      connectorAccountId: requiredId(
        "connector_papermark",
        parseConnectorAccountId,
      ),
      tenantId: scope.tenantId,
      provider: createProviderMarker("papermark"),
    },
    provider: createProviderMarker("papermark"),
    providerWorkspaceId: "room_42",
    providerDocumentId: undefined,
    providerVersion: undefined,
    cursor: undefined,
    aggregateVersion: 1,
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
    updatedAt: timestamp("2026-08-03T12:00:00.000Z"),
  });
  const objectReference = createObjectReference({
    objectReferenceId: requiredId(
      "object_contract-v1",
      parseObjectReferenceId,
    ),
    scope,
    objectKey: "documents/doc_contract/docver_contract-v1",
    storageVersion: "storage-v1",
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    byteLength: 12,
    mediaType: "application/pdf",
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
  });
  const version = createDocumentVersion({
    documentVersionId: requiredId(
      "docver_contract-v1",
      parseDocumentVersionId,
    ),
    documentId: requiredId("doc_contract", parseDocumentId),
    scope,
    versionNumber: 1,
    source,
    provider: source.provider,
    checksum: objectReference.checksum,
    classification: "legal",
    objectReference,
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
  });

  assertEquals(version.source.providerDocumentId, undefined);
  assertEquals(version.createdAt.toISOString(), "2026-08-03T12:00:00.000Z");
  assert(Object.isFrozen(version));
  assert(Object.isFrozen(version.source));
  assertFalse(Reflect.set(version, "versionNumber", 2));
  assertEquals(version.versionNumber, 1);
});

Deno.test("processing runs retain exact input provenance and versioned artifacts", () => {
  const run = createProcessingRun({
    processingRunId: requiredId("run_extract-v1", parseProcessingRunId),
    scope: fixtureScope(),
    documentVersionId: requiredId(
      "docver_contract-v1",
      parseDocumentVersionId,
    ),
    inputChecksum: { algorithm: "sha256", value: "b".repeat(64) },
    processor: "text-extractor",
    processorVersion: "2026.08.03",
    state: "queued",
    attemptCount: 0,
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
  });

  assertEquals(run.documentVersionId, "docver_contract-v1");
  assertEquals(run.derivedArtifacts, []);
  assert(Object.isFrozen(run));
});

function fixtureScope() {
  return {
    tenantId: requiredId("tenant_acme", parseTenantId),
    workspaceId: requiredId("workspace_dealroom", parseWorkspaceId),
    dealId: requiredId("deal_horizon", parseDealId),
  };
}

function timestamp(value: string): Date {
  return new Date(value);
}

function requiredId<T>(
  value: string,
  parse: (value: unknown) => { readonly ok: true; readonly value: T } | {
    readonly ok: false;
  },
): T {
  const result = parse(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
