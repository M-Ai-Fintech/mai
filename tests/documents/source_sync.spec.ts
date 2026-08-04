import { assertEquals, assertRejects } from "@std/assert";
import { collectAndChecksum } from "../../src/documents/checksum.ts";
import { FakeObjectStore } from "../../src/documents/object_store.ts";
import {
  DocumentProviderFailure,
  type DocumentSourceProvider,
  FakeDocumentSourceProvider,
  normalizeProviderError,
  type SourceDocument,
  type SourceDocumentPage,
} from "../../src/documents/source_provider.ts";
import type { ByteSource } from "../../src/documents/checksum.ts";
import type {
  ProviderCapabilities,
  ProviderMarker,
} from "../../src/documents/source.ts";
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

Deno.test("source sync records missing provider identity without advancing the cursor", async () => {
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
  assertEquals(result.cursor, undefined);
  assertEquals(cursorUpdate, undefined);
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

Deno.test("successful source pages advance and duplicate pages remain idempotent", async () => {
  const document = providerDocument("provider-contract");
  const provider = fakeProvider([document], {
    "provider-contract": new TextEncoder().encode("contract"),
  });
  const objectStore = new FakeObjectStore();
  const versions = new InMemoryVersionSink();
  const updates: string[] = [];
  const service = syncService(provider, objectStore, versions, updates);

  const first = await service.synchronize();
  const second = await service.synchronize();
  assertEquals(first, {
    created: 1,
    duplicates: 0,
    skipped: 0,
    failures: [],
    cursor: "cursor-next",
    providerVersion: "provider-v2",
  });
  assertEquals(second.created, 0);
  assertEquals(second.duplicates, 1);
  assertEquals(second.cursor, "cursor-next");
  assertEquals(updates, ["cursor-next", "cursor-next"]);
  assertEquals(versions.values.length, 1);
});

Deno.test("partial source pages retain successful and failed accounting without advancing", async () => {
  const provider = fakeProvider([
    providerDocument("provider-contract"),
    { name: "missing-id.pdf", mimeType: "application/pdf" },
  ], { "provider-contract": new TextEncoder().encode("contract") });
  const objectStore = new FakeObjectStore();
  const versions = new InMemoryVersionSink();
  const updates: string[] = [];
  const result = await syncService(provider, objectStore, versions, updates)
    .synchronize();

  assertEquals(result.created, 1);
  assertEquals(result.duplicates, 0);
  assertEquals(result.skipped, 1);
  assertEquals(result.failures.length, 1);
  assertEquals(result.failures[0].code, "INVALID_PROVIDER_METADATA");
  assertEquals(result.cursor, undefined);
  assertEquals(updates, []);
  assertEquals(versions.values.length, 1);
});

Deno.test("provider download failure keeps the source cursor retryable", async () => {
  const provider = fakeProvider([providerDocument("provider-missing")], {});
  const updates: string[] = [];
  const result = await syncService(
    provider,
    new FakeObjectStore(),
    new InMemoryVersionSink(),
    updates,
  ).synchronize();

  assertEquals(result.created, 0);
  assertEquals(result.failures[0].code, "NOT_FOUND");
  assertEquals(result.cursor, undefined);
  assertEquals(updates, []);
});

Deno.test("retrying a failed page creates once, then advances as a duplicate", async () => {
  const provider = new RetryingSourceProvider(
    providerDocument("provider-retry"),
  );
  const objectStore = new FakeObjectStore();
  const versions = new InMemoryVersionSink();
  const updates: string[] = [];
  const service = syncService(provider, objectStore, versions, updates);

  const failed = await service.synchronize();
  assertEquals(failed.created, 0);
  assertEquals(failed.failures[0].code, "NOT_FOUND");
  assertEquals(failed.cursor, undefined);

  provider.available = true;
  const recovered = await service.synchronize();
  const replay = await service.synchronize();
  assertEquals(recovered.created, 1);
  assertEquals(recovered.cursor, "cursor-next");
  assertEquals(replay.duplicates, 1);
  assertEquals(replay.cursor, "cursor-next");
  assertEquals(versions.values.length, 1);
  assertEquals(updates, ["cursor-next", "cursor-next"]);
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

function syncService(
  provider: DocumentSourceProvider,
  objectStore: FakeObjectStore,
  versions: InMemoryVersionSink,
  updates: string[],
): DocumentSourceSyncService {
  const upload = new DocumentUploadService({ objectStore, versions });
  return new DocumentSourceSyncService({
    provider,
    source: fixtureSource(),
    upload,
    resolveUpload: (_source, document) =>
      Promise.resolve(uploadCommandFor(document)),
    updateCursor: (cursor) => {
      if (cursor !== undefined) updates.push(cursor);
      return Promise.resolve(fixtureSource());
    },
  });
}

function uploadCommandFor(document: SourceDocument): UploadCommand {
  const source = createDocumentSource({
    ...fixtureSource(),
    providerDocumentId: document.providerDocumentId,
    providerVersion: document.providerVersion ?? "v1",
  });
  return uploadCommand(fixtureDocument(), source);
}

function providerDocument(providerDocumentId: string): SourceDocument {
  return {
    providerDocumentId,
    name: "Contract.pdf",
    mimeType: "application/pdf",
    sizeBytes: 8,
    providerVersion: "v1",
  };
}

function fakeProvider(
  documents: readonly SourceDocument[],
  contents: Readonly<Record<string, Uint8Array>>,
): FakeDocumentSourceProvider {
  return new FakeDocumentSourceProvider({
    provider: createProviderMarker("fixture"),
    capabilities: fixtureCapabilities(),
    pages: [{
      providerVersion: "provider-v2",
      nextCursor: "cursor-next",
      documents,
    }],
    contents,
  });
}

class RetryingSourceProvider implements DocumentSourceProvider {
  readonly provider = createProviderMarker("fixture");
  available = false;

  constructor(private readonly document: SourceDocument) {}

  discoverCapabilities(): Promise<ProviderCapabilities> {
    return Promise.resolve(fixtureCapabilities());
  }

  listDocuments(
    _request: { readonly providerWorkspaceId: string },
  ): Promise<SourceDocumentPage> {
    return Promise.resolve({
      providerVersion: "provider-v2",
      nextCursor: "cursor-next",
      documents: [this.document],
    });
  }

  downloadDocument(
    _request: {
      readonly providerWorkspaceId: string;
      readonly providerDocumentId: string;
    },
  ): Promise<ByteSource> {
    if (this.available) {
      return Promise.resolve(new TextEncoder().encode("contract"));
    }
    return Promise.reject(
      new DocumentProviderFailure({
        code: "NOT_FOUND",
        message: "retryable fixture failure",
        retryable: true,
      }),
    );
  }
}

function fixtureCapabilities(): ProviderCapabilities {
  const provider: ProviderMarker = createProviderMarker("fixture");
  return {
    provider,
    capabilities: ["list_documents", "download_document"],
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
