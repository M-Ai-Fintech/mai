import { assertEquals, assertRejects } from "@std/assert";
import { collectAndChecksum } from "../../src/documents/checksum.ts";
import { FakeObjectStore } from "../../src/documents/object_store.ts";
import {
  DocumentProviderFailure,
  FakeDocumentSourceProvider,
  normalizeProviderError,
} from "../../src/documents/source_provider.ts";
import { DocumentSourceSyncService } from "../../src/documents/source_sync.ts";
import {
  DocumentUploadService,
  type UploadCommand,
} from "../../src/documents/upload.ts";
import { createDocument, type Document } from "../../src/documents/model.ts";
import {
  createDocumentSource,
  createProviderMarker,
  type DocumentSource,
} from "../../src/documents/source.ts";
import {
  parseConnectorAccountId,
  parseDocumentId,
  parseDocumentSourceId,
  parseDocumentVersionId,
  parseObjectReferenceId,
} from "../../src/documents/ids.ts";
import type { DocumentVersion } from "../../src/documents/version.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";

Deno.test("checksum collection consumes chunks and records an exact SHA-256", async () => {
  const collected = await collectAndChecksum(chunks(["hel", "lo"]));
  assertEquals(collected.byteLength, 5);
  assertEquals(
    collected.checksum.value,
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  );
});

Deno.test("upload stores a versioned object and duplicate source retries do not append a version", async () => {
  const objectStore = new FakeObjectStore();
  const versions = new InMemoryVersionSink();
  const upload = new DocumentUploadService({ objectStore, versions });
  const command = uploadCommand(fixtureDocument(), fixtureSource());
  const negotiation = await upload.negotiate(command);
  const first = await upload.complete(negotiation, chunks(["contract"]));
  const second = await upload.complete(negotiation, chunks(["contract"]));

  assertEquals(first.status, "created");
  assertEquals(second.status, "duplicate");
  assertEquals(versions.values.length, 1);
  assertEquals(objectStore.retainedObjectCount, 2);
  const retained = await collectAndChecksum(
    await objectStore.readObject(first.version.objectReference),
  );
  assertEquals(new TextDecoder().decode(retained.bytes), "contract");
});

Deno.test("source sync normalizes missing provider identity and advances cursor only after ingestion", async () => {
  const provider = new FakeDocumentSourceProvider({
    provider: createProviderMarker("fixture"),
    capabilities: {
      provider: createProviderMarker("fixture"),
      capabilities: ["list_documents", "download_document"],
    },
    pages: [{
      providerVersion: "room-v2",
      nextCursor: "cursor-v2",
      documents: [
        {
          providerDocumentId: undefined,
          name: "missing-id.pdf",
          mimeType: "application/pdf",
          sizeBytes: 5,
        },
      ],
    }],
  });
  let cursorUpdate: string | undefined;
  const service = new DocumentSourceSyncService({
    provider,
    source: fixtureSource(),
    resolveUpload: () => Promise.resolve(undefined),
    updateCursor: (cursor) => {
      cursorUpdate = cursor;
      return Promise.resolve(fixtureSource());
    },
  });

  const result = await service.synchronize();
  assertEquals(result.created, 0);
  assertEquals(result.skipped, 1);
  assertEquals(result.failures[0].code, "INVALID_PROVIDER_METADATA");
  assertEquals(cursorUpdate, "cursor-v2");
});

Deno.test("provider failures are normalized without exposing raw provider errors", async () => {
  const failure = normalizeProviderError(
    createProviderMarker("fixture"),
    "download_document",
    new DocumentProviderFailure({
      code: "RATE_LIMITED",
      message: "provider quota response",
      retryable: true,
    }),
  );
  assertEquals(failure.code, "RATE_LIMITED");
  assertEquals(failure.retryable, true);
  await assertRejects(
    () => Promise.reject(new Error("raw provider secret")),
    Error,
    "raw provider secret",
  );
});

async function* chunks(values: readonly string[]): AsyncIterable<Uint8Array> {
  for (const value of values) yield new TextEncoder().encode(value);
}

function fixtureDocument(): Document {
  return createDocument({
    documentId: requiredId("doc_contract", parseDocumentId),
    scope: fixtureScope(),
    name: "Contract.pdf",
    mimeType: "application/pdf",
    classification: "legal",
    aggregateVersion: 1,
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
    updatedAt: timestamp("2026-08-03T12:00:00.000Z"),
  });
}

function fixtureSource(): DocumentSource {
  const provider = createProviderMarker("fixture");
  return createDocumentSource({
    sourceId: requiredId("source_room", parseDocumentSourceId),
    scope: fixtureScope(),
    connectorAccount: {
      connectorAccountId: requiredId(
        "connector_fixture",
        parseConnectorAccountId,
      ),
      tenantId: fixtureScope().tenantId,
      provider,
    },
    provider,
    providerWorkspaceId: "room-1",
    providerVersion: "v1",
    aggregateVersion: 1,
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
    updatedAt: timestamp("2026-08-03T12:00:00.000Z"),
  });
}

function uploadCommand(
  document: Document,
  source: DocumentSource,
): UploadCommand {
  return {
    document,
    documentVersionId: requiredId("docver_contract-v1", parseDocumentVersionId),
    versionNumber: 1,
    source,
    objectReferenceId: requiredId("object_contract-v1", parseObjectReferenceId),
    objectKey: "documents/doc_contract/docver_contract-v1",
    storageVersion: "storage-v1",
    requestedAt: timestamp("2026-08-03T12:00:00.000Z"),
  };
}

function fixtureScope() {
  return {
    tenantId: requiredId("tenant_acme", parseTenantId),
    workspaceId: requiredId("workspace_dealroom", parseWorkspaceId),
    dealId: requiredId("deal_horizon", parseDealId),
  };
}

class InMemoryVersionSink {
  readonly values: DocumentVersion[] = [];

  findExisting(input: {
    readonly source: DocumentSource;
    readonly checksum: { readonly algorithm: "sha256"; readonly value: string };
  }): Promise<DocumentVersion | undefined> {
    return Promise.resolve(
      this.values.find((version) =>
        version.source.sourceId === input.source.sourceId &&
        version.source.providerDocumentId === input.source.providerDocumentId &&
        version.source.providerVersion === input.source.providerVersion &&
        version.checksum.value === input.checksum.value
      ),
    );
  }

  append(version: DocumentVersion): Promise<void> {
    this.values.push(version);
    return Promise.resolve();
  }
}

function timestamp(value: string): Date {
  return new Date(value);
}

function requiredId<T>(
  value: string,
  parse: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parse(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
