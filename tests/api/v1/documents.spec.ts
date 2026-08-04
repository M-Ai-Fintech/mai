import { assert, assertEquals, assertFalse } from "@std/assert";
import {
  type DocumentCommandScheduler,
  type DocumentsAuthorizationPort,
  type DocumentScheduleInput,
  type DocumentScheduleResult,
  type DocumentsReadPort,
  DocumentsV1Application,
} from "../../../src/api/v1/documents.ts";
import {
  type DocumentsRequestContextPort,
  handleDocumentsV1Route,
} from "../../../src/api/v1/documents_routes.ts";
import {
  createDocument,
  type Document,
  type DocumentScope,
} from "../../../src/documents/model.ts";
import {
  parseActorId,
  parseCorrelationId,
  parseDealId,
  parseJobId,
  parseOperationId,
  parseTenantId,
  parseWorkspaceId,
  type RequestContext,
} from "../../../src/platform/api/v1.ts";
import { deriveDocumentIdempotencyKey } from "../../../src/documents/jobs.ts";
import { parseDocumentId } from "../../../src/documents/ids.ts";
import pg from "pg";
import { createDocumentsComposition } from "../../../src/documents/composition.ts";

Deno.test("documents v1 reads are authorized, scoped, etagged, and cursor-paginated", async () => {
  const first = fixtureDocument("doc_contract", 1);
  const second = fixtureDocument("doc_second", 2);
  const reads = new FakeDocumentsReadPort([first, second]);
  const application = applicationFor(reads);
  const firstResponse = await route(
    application,
    "/api/v1/documents?limit=1",
  );
  assertEquals(firstResponse.status, 200);
  assertEquals(firstResponse.headers.get("ETag"), null);
  const firstPage = await firstResponse.json();
  assertEquals(firstPage.data[0].documentId, "doc_contract");
  assert(firstPage.meta.nextCursor);
  assert(firstPage.meta.correlationId === "cor_documents");

  const next = await route(
    application,
    `/api/v1/documents?limit=1&cursor=${firstPage.meta.nextCursor}`,
  );
  const nextPage = await next.json();
  assertEquals(nextPage.data[0].documentId, "doc_second");

  const detail = await route(
    application,
    "/api/v1/documents/doc_contract",
    "GET",
  );
  assertEquals(detail.headers.get("ETag"), '"v1"');
  assertEquals((await detail.json()).data.name, "Contract");
  assertEquals(reads.lastScope, fixtureScope());
});

Deno.test("documents v1 protects denied reads before loading scoped data", async () => {
  const reads = new FakeDocumentsReadPort([fixtureDocument("doc_contract", 1)]);
  const authorization = new RecordingAuthorizationPort(false);
  const application = new DocumentsV1Application(
    authorization,
    reads,
    new RecordingDocumentScheduler(),
  );
  const response = await route(
    application,
    "/api/v1/documents/doc_contract",
    "GET",
  );
  assertEquals(response.status, 404);
  assertEquals((await response.json()).error.code, "PROTECTED_NOT_FOUND");
  assertFalse(reads.findCalls > 0);
  assertEquals(authorization.requests[0].resourceId, "doc_contract");
});

Deno.test("documents v1 commands require If-Match and deterministic idempotency", async () => {
  const reads = new FakeDocumentsReadPort([fixtureDocument("doc_contract", 3)]);
  const scheduler = new RecordingDocumentScheduler();
  const application = new DocumentsV1Application(
    new RecordingAuthorizationPort(true),
    reads,
    scheduler,
  );
  const key = await deriveDocumentIdempotencyKey({
    actorId: context().actorId,
    commandType: "documents.process",
    targetType: "document",
    targetId: "doc_contract",
  });
  const response = await route(
    application,
    "/api/v1/documents/doc_contract/process",
    "POST",
    { documentVersionId: "docver_contract-v1", version: 1 },
    { "If-Match": '"v3"', "Idempotency-Key": key },
  );
  assertEquals(response.status, 202);
  assertEquals((await response.json()).data.status, "queued");
  assertEquals(scheduler.input?.expectedVersion, 3);
  assertEquals(
    scheduler.input?.inputVersionReferences?.[0].aggregateType,
    "DocumentVersion",
  );
  assertEquals(
    scheduler.input?.inputVersionReferences?.[0].documentId,
    "doc_contract",
  );

  const missingIfMatch = await route(
    application,
    "/api/v1/documents/doc_contract/sync",
    "POST",
    {},
    { "Idempotency-Key": key },
  );
  assertEquals(missingIfMatch.status, 422);
  assertEquals((await missingIfMatch.json()).error.code, "VALIDATION_FAILED");
});

Deno.test("documents v1 rejects stale versions and mismatched deterministic keys", async () => {
  const application = applicationFor(
    new FakeDocumentsReadPort([fixtureDocument("doc_contract", 4)]),
  );
  const key = await deriveDocumentIdempotencyKey({
    actorId: context().actorId,
    commandType: "documents.sync",
    targetType: "document",
    targetId: "doc_contract",
  });
  const stale = await route(
    application,
    "/api/v1/documents/doc_contract/sync",
    "POST",
    {},
    { "If-Match": '"v3"', "Idempotency-Key": key },
  );
  assertEquals(stale.status, 409);
  assertEquals((await stale.json()).error.code, "VERSION_CONFLICT");

  const wrongKey = await route(
    application,
    "/api/v1/documents/doc_contract/sync",
    "POST",
    {},
    { "If-Match": '"v4"', "Idempotency-Key": "idem_wrong-key" },
  );
  assertEquals(wrongKey.status, 409);
  assertEquals((await wrongKey.json()).error.code, "IDEMPOTENCY_CONFLICT");
});

Deno.test("documents composition exposes owned migrations with adapters disabled", async () => {
  const pool = new pg.Pool({
    connectionString:
      "postgres://postgres:postgres@localhost:55432/mai_test_mai106",
  });
  const composition = createDocumentsComposition({
    pool,
    authorization: new RecordingAuthorizationPort(true),
  });
  assertFalse(composition.adaptersEnabled);
  assertEquals(composition.sourceProvider.provider, "disabled");
  assert(composition.migrations.some(({ id }) => id === "documents-0001"));
  await composition.close();
});

async function route(
  application: DocumentsV1Application,
  path: string,
  method = "GET",
  body?: unknown,
  headers: Readonly<Record<string, string>> = {},
): Promise<Response> {
  const request = new Request(`http://localhost${path}`, {
    method,
    headers: body === undefined
      ? headers
      : { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const response = await handleDocumentsV1Route(request, {
    context: new FixtureRequestContextPort(),
    application,
  });
  assert(response);
  return response;
}

function applicationFor(reads: DocumentsReadPort): DocumentsV1Application {
  return new DocumentsV1Application(
    new RecordingAuthorizationPort(true),
    reads,
    new RecordingDocumentScheduler(),
  );
}

class FixtureRequestContextPort implements DocumentsRequestContextPort {
  contextFor(_request: Request): RequestContext {
    return context();
  }
}

class RecordingAuthorizationPort implements DocumentsAuthorizationPort {
  readonly requests: Array<{ readonly resourceId: string }> = [];

  constructor(private readonly allowed: boolean) {}

  authorize(request: { readonly resourceId: string }): Promise<boolean> {
    this.requests.push(request);
    return Promise.resolve(this.allowed);
  }
}

class FakeDocumentsReadPort implements DocumentsReadPort {
  findCalls = 0;
  lastScope: DocumentScope | undefined;

  constructor(private readonly documents: readonly Document[]) {}

  findDocument(
    scope: DocumentScope,
    documentId: Document["documentId"],
  ): Promise<Document | undefined> {
    this.findCalls += 1;
    this.lastScope = scope;
    return Promise.resolve(
      this.documents.find((document) =>
        document.documentId === documentId && sameScope(document.scope, scope)
      ),
    );
  }

  listDocuments(
    scope: DocumentScope,
    options: {
      readonly limit: number;
      readonly afterDocumentId?: Document["documentId"];
    },
  ): Promise<readonly Document[]> {
    this.lastScope = scope;
    const start = options.afterDocumentId === undefined
      ? 0
      : this.documents.findIndex((document) =>
        document.documentId === options.afterDocumentId
      ) + 1;
    return Promise.resolve(
      this.documents.filter((document) => sameScope(document.scope, scope))
        .slice(start, start + options.limit),
    );
  }
}

class RecordingDocumentScheduler implements DocumentCommandScheduler {
  input: DocumentScheduleInput | undefined;

  schedule(input: DocumentScheduleInput): Promise<DocumentScheduleResult> {
    this.input = input;
    return Promise.resolve({
      status: "accepted",
      job: {
        jobId: requiredId("job_documents", parseJobId),
        operationId: requiredId("op_documents", parseOperationId),
      },
    });
  }
}

function fixtureDocument(id: string, version: number): Document {
  const scope = fixtureScope();
  return createDocument({
    documentId: requiredId(id, parseDocumentId),
    scope,
    name: id === "doc_contract" ? "Contract" : "Second document",
    mimeType: "application/pdf",
    classification: "legal",
    aggregateVersion: version,
    createdAt: new Date("2026-08-03T12:00:00.000Z"),
    updatedAt: new Date("2026-08-03T12:01:00.000Z"),
  });
}

function fixtureScope(): DocumentScope {
  return {
    tenantId: requiredId("tenant_acme", parseTenantId),
    workspaceId: requiredId("workspace_dealroom", parseWorkspaceId),
    dealId: requiredId("deal_horizon", parseDealId),
  };
}

function context(): RequestContext {
  return {
    actorId: requiredId("actor_reviewer", parseActorId),
    tenantId: requiredId("tenant_acme", parseTenantId),
    workspaceId: requiredId("workspace_dealroom", parseWorkspaceId),
    dealId: requiredId("deal_horizon", parseDealId),
    correlationId: requiredId("cor_documents", parseCorrelationId),
    origin: "http",
  };
}

function sameScope(left: DocumentScope, right: DocumentScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function requiredId<T>(
  value: unknown,
  parse: (
    input: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parse(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture value "${String(value)}" is invalid.`);
}
