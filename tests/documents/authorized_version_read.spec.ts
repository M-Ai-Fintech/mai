import { assertEquals } from "@std/assert";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import {
  parseActorId,
  parseCorrelationId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import type { DocumentsAuthorizationPort } from "../../src/api/v1/documents.ts";
import type { DocumentScope } from "../../src/documents/model.ts";
import type { DocumentVersion } from "../../src/documents/version.ts";
import { PostgresAuthorizedDocumentVersionReadPort } from "../../src/documents/authorized_version_read.ts";
import type { DocumentsRepository } from "../../src/documents/repository.ts";
import type { PostgresTransactionRunner } from "../../src/platform/persistence/v1.ts";
import {
  parseConnectorAccountId,
  parseDocumentId,
  parseDocumentSourceId,
  parseDocumentVersionId,
  parseObjectReferenceId,
} from "../../src/documents/ids.ts";
import type { DocumentVersionId } from "../../src/documents/ids.ts";
import {
  createDocumentSource,
  createProviderMarker,
} from "../../src/documents/source.ts";
import { createObjectReference } from "../../src/documents/model.ts";
import { createDocumentVersion } from "../../src/documents/version.ts";

class FakeDocumentsAuthorizationPort implements DocumentsAuthorizationPort {
  readonly authorizedIds = new Set<string>();
  authorizationsCalled = 0;

  authorize(req: { resourceId: string }): Promise<boolean> {
    this.authorizationsCalled++;
    return Promise.resolve(this.authorizedIds.has(req.resourceId));
  }
}

class FakeDocumentsRepository {
  private readonly versions = new Map<string, DocumentVersion>();

  addVersion(version: DocumentVersion): void {
    this.versions.set(version.documentVersionId, version);
  }

  findVersion(
    _tx: unknown,
    scope: DocumentScope,
    versionId: DocumentVersionId,
  ): Promise<DocumentVersion | undefined> {
    const version = this.versions.get(versionId);
    if (!version) return Promise.resolve(undefined);
    if (
      version.scope.tenantId !== scope.tenantId ||
      version.scope.workspaceId !== scope.workspaceId ||
      version.scope.dealId !== scope.dealId
    ) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(version);
  }
}

class FakeTransactionRunner {
  run<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    return fn(null);
  }
}

function fixtureContext(overrides?: Partial<RequestContext>): RequestContext {
  return {
    actorId: requiredId("actor_test", parseActorId),
    tenantId: requiredId("tenant_acme", parseTenantId),
    workspaceId: requiredId("workspace_dealroom", parseWorkspaceId),
    dealId: requiredId("deal_horizon", parseDealId),
    correlationId: requiredId("cor_test", parseCorrelationId),
    origin: "http",
    ...overrides,
  };
}

function fixtureScope(overrides?: Partial<DocumentScope>): DocumentScope {
  return {
    tenantId: requiredId("tenant_acme", parseTenantId),
    workspaceId: requiredId("workspace_dealroom", parseWorkspaceId),
    dealId: requiredId("deal_horizon", parseDealId),
    ...overrides,
  };
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

function fixtureDocumentVersion(docVerId: DocumentVersionId): DocumentVersion {
  const scope = fixtureScope();
  const provider = createProviderMarker("upload");
  const source = createDocumentSource({
    sourceId: requiredId("source_test", parseDocumentSourceId),
    scope,
    connectorAccount: {
      connectorAccountId: requiredId(
        "connector_test",
        parseConnectorAccountId,
      ),
      tenantId: scope.tenantId,
      provider,
    },
    provider,
    providerWorkspaceId: "ws_1",
    aggregateVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const objectReference = createObjectReference({
    objectReferenceId: requiredId("object_test", parseObjectReferenceId),
    scope,
    objectKey: "key",
    storageVersion: "v1",
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    byteLength: 100,
    mediaType: "application/pdf",
    createdAt: new Date(),
  });

  return createDocumentVersion({
    documentVersionId: docVerId,
    documentId: requiredId("doc_contract", parseDocumentId),
    scope,
    versionNumber: 1,
    source,
    provider,
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    classification: "financial",
    objectReference,
    createdAt: new Date(),
  });
}

const docVerId = requiredId("docver_contract-v1", parseDocumentVersionId);

Deno.test("AuthorizedDocumentVersionReadPort succeeds for accessible version", async () => {
  const auth = new FakeDocumentsAuthorizationPort();
  const repo = new FakeDocumentsRepository();
  const tx = new FakeTransactionRunner();
  const port = new PostgresAuthorizedDocumentVersionReadPort(
    auth,
    repo as unknown as DocumentsRepository,
    tx as unknown as PostgresTransactionRunner,
  );

  const version = fixtureDocumentVersion(docVerId);
  repo.addVersion(version);
  auth.authorizedIds.add(docVerId);

  const result = await port.findAccessibleVersion(
    fixtureContext(),
    fixtureScope(),
    docVerId,
  );
  assertEquals(result, version);
  assertEquals(auth.authorizationsCalled, 1);
});

Deno.test("AuthorizedDocumentVersionReadPort returns undefined for inaccessible version", async () => {
  const auth = new FakeDocumentsAuthorizationPort();
  const repo = new FakeDocumentsRepository();
  const tx = new FakeTransactionRunner();
  const port = new PostgresAuthorizedDocumentVersionReadPort(
    auth,
    repo as unknown as DocumentsRepository,
    tx as unknown as PostgresTransactionRunner,
  );

  const version = fixtureDocumentVersion(docVerId);
  repo.addVersion(version);

  const result = await port.findAccessibleVersion(
    fixtureContext(),
    fixtureScope(),
    docVerId,
  );
  assertEquals(result, undefined);
  assertEquals(auth.authorizationsCalled, 1);
});

Deno.test("AuthorizedDocumentVersionReadPort returns undefined for missing version", async () => {
  const auth = new FakeDocumentsAuthorizationPort();
  const repo = new FakeDocumentsRepository();
  const tx = new FakeTransactionRunner();
  const port = new PostgresAuthorizedDocumentVersionReadPort(
    auth,
    repo as unknown as DocumentsRepository,
    tx as unknown as PostgresTransactionRunner,
  );

  const missingVerId = requiredId("docver_missing-v1", parseDocumentVersionId);
  auth.authorizedIds.add(missingVerId);

  const result = await port.findAccessibleVersion(
    fixtureContext(),
    fixtureScope(),
    missingVerId,
  );
  assertEquals(result, undefined);
});

Deno.test("AuthorizedDocumentVersionReadPort rejects tenant, workspace, or deal mismatch before repo lookup", async () => {
  const auth = new FakeDocumentsAuthorizationPort();
  const repo = new FakeDocumentsRepository();
  const tx = new FakeTransactionRunner();
  const port = new PostgresAuthorizedDocumentVersionReadPort(
    auth,
    repo as unknown as DocumentsRepository,
    tx as unknown as PostgresTransactionRunner,
  );

  const result = await port.findAccessibleVersion(
    fixtureContext({
      tenantId: requiredId("tenant_other", parseTenantId),
    }),
    fixtureScope(),
    docVerId,
  );
  assertEquals(result, undefined);
  assertEquals(auth.authorizationsCalled, 0);
});
