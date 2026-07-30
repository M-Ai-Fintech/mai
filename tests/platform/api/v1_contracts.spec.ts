import {
  API_ERROR_CATALOG,
  API_V1_BASE_PATH,
  type ApiError,
  type Command,
  type CommandPort,
  createAcceptedJobEnvelope,
  createProtectedNotFoundError,
  createSuccessEnvelope,
  formatEtag,
  parseApiEnvelope,
  parseCorrelationHeader,
  parseEtag,
  parseIdempotencyHeader,
  parseIdempotencyKey,
  parseIfMatch,
  parseJobId,
  parseOpaqueCursor,
  parseOperationId,
  parseRequestContext,
  type Query,
  type QueryPort,
  type RequestContext,
  serializeOpaqueCursor,
  validateRequiredString,
} from "../../../src/platform/api/v1.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("v1 success, cursor, and accepted-job envelopes serialize predictably", () => {
  const context = requestContext();
  const cursor = expectValue(parseOpaqueCursor("next-page_7"));
  const success = createSuccessEnvelope({ total: 1 }, {
    correlationId: context.correlationId,
    nextCursor: cursor,
    projectionAsOf: "2026-07-30T10:00:00Z",
    freshness: "current",
    warnings: [{
      code: "STALE_PROJECTION",
      message: "Projection is refreshing.",
    }],
  });
  const accepted = createAcceptedJobEnvelope({
    operationId: expectValue(parseOperationId("op_work-7")),
    jobId: expectValue(parseJobId("job_work-7")),
    status: "queued",
    correlationId: context.correlationId,
  });

  assertEquals(serializeOpaqueCursor(cursor), "next-page_7");
  assertEquals(success.meta.nextCursor, "next-page_7");
  assertEquals(
    expectSuccessEnvelope(parseApiEnvelope(success)),
    success,
  );
  assertEquals(accepted.data.statusUrl, "/api/v1/jobs/job_work-7");
  assertEquals(accepted.meta.correlationId, "cor_request-7");
});

Deno.test("v1 envelope parsers reject unknown and disclosure metadata", () => {
  assertRejected(
    parseApiEnvelope({
      data: {},
      meta: { correlationId: "cor_request-7", extra: true },
    }),
    "INVALID_ENVELOPE",
  );
  for (const unsafe of ["resourceId", "stack", "rawProviderResponse"]) {
    assertRejected(
      parseApiEnvelope({
        error: {
          code: "PROTECTED_NOT_FOUND",
          message: "Not found.",
          correlationId: "cor_request-7",
          retryable: false,
          [unsafe]: "secret",
        },
      }),
      "FORBIDDEN_ERROR_FIELD",
    );
  }
  assertRejected(
    parseApiEnvelope({
      error: {
        code: "UNAUTHENTICATED",
        message: "No session.",
        correlationId: "cor_request-7",
        retryable: false,
        expectedVersion: 1,
      },
    }),
    "FORBIDDEN_ERROR_FIELD",
  );
  assertRejected(
    parseApiEnvelope({
      error: {
        code: "VERSION_CONFLICT",
        message: "Conflict.",
        correlationId: "cor_request-7",
        retryable: false,
        expectedVersion: 1,
        currentVersion: 2,
        safeComparisonUrl: "/api/v1evil",
      },
    }),
    "INVALID_ERROR_FIELD",
  );
});

Deno.test("v1 error catalog has stable protected and version-conflict contracts", () => {
  const context = requestContext();
  const protectedNotFound = createProtectedNotFoundError(context.correlationId);
  const parsed = parseApiEnvelope({
    error: {
      code: "VERSION_CONFLICT",
      message: "The aggregate changed after the supplied version.",
      correlationId: "cor_request-7",
      retryable: false,
      expectedVersion: 7,
      currentVersion: 8,
      safeComparisonUrl: "/api/v1/deals/deal_solar-2026",
    },
  });

  assertEquals(API_ERROR_CATALOG.PROTECTED_NOT_FOUND.httpStatus, 404);
  assertEquals(
    API_ERROR_CATALOG.ASYNC_OPERATION_FAILED.asynchronousTerminal,
    true,
  );
  assertEquals(protectedNotFound.error.code, "PROTECTED_NOT_FOUND");
  assert(!("resourceId" in protectedNotFound.error));
  assertEquals(expectErrorEnvelope(parsed).error.code, "VERSION_CONFLICT");
  assertEquals(
    expectErrorEnvelope(parseApiEnvelope({
      error: {
        code: "VALIDATION_FAILED",
        message: "Validation failed.",
        correlationId: "cor_request-7",
        retryable: false,
        fieldErrors: {
          reason: [{
            field: "reason",
            code: "REQUIRED",
            message: "reason is required.",
          }],
        },
      },
    })).error.fieldErrors?.reason[0].code,
    "REQUIRED",
  );
  assertRejected(
    parseApiEnvelope({ data: {}, error: {} }),
    "AMBIGUOUS_ENVELOPE",
  );
  assertRejected(
    parseApiEnvelope({
      error: {
        code: "PROTECTED_NOT_FOUND",
        message: "Not found.",
        correlationId: "cor_request-7",
        retryable: false,
        fieldErrors: { resourceId: [] },
      },
    }),
    "FORBIDDEN_ERROR_FIELD",
  );
  assertRejected(
    parseApiEnvelope({
      error: {
        code: "VERSION_CONFLICT",
        message: "The aggregate changed.",
        correlationId: "cor_request-7",
        retryable: false,
      },
    }),
    "INVALID_ERROR_FIELD",
  );
  assertEquals(
    Object.fromEntries(
      Object.entries(API_ERROR_CATALOG).map(([code, entry]) => [
        code,
        entry.httpStatus,
      ]),
    ),
    {
      VALIDATION_FAILED: 422,
      UNAUTHENTICATED: 401,
      PROTECTED_NOT_FOUND: 404,
      ACTION_FORBIDDEN: 403,
      VERSION_CONFLICT: 409,
      STALE_VERSION: 409,
      IDEMPOTENCY_CONFLICT: 409,
      INVALID_TRANSITION: 409,
      RETENTION_OR_LEGAL_HOLD: 423,
      RATE_LIMITED: 429,
      DEPENDENCY_UNAVAILABLE: 503,
      ASYNC_OPERATION_FAILED: 200,
    },
  );
});

Deno.test("v1 ETag and If-Match accept only canonical strong aggregate versions", () => {
  assertEquals(formatEtag(7), '"v7"');
  assertEquals(expectValue(parseEtag('"v7"')), 7);
  assertEquals(expectValue(parseIfMatch('"v7"')), 7);
  assertRejected(parseIfMatch('W/"v7"'), "UNSUPPORTED_WEAK_TAG");
  assertRejected(parseIfMatch("*"), "UNSUPPORTED_WILDCARD");
  assertRejected(parseIfMatch('"v7", "v8"'), "UNSUPPORTED_MULTIPLE_TAGS");
  assertRejected(parseIfMatch('"v0"'), "INVALID_VERSION");
});

Deno.test("v1 correlation and idempotency header values remain validated", () => {
  assertEquals(
    expectValue(parseCorrelationHeader("cor_request-7")),
    "cor_request-7",
  );
  assertEquals(
    expectValue(parseIdempotencyHeader("idem_command-7")),
    "idem_command-7",
  );
  assertRejected(parseCorrelationHeader("cor_request 7"), "INVALID_FORMAT");
  assertRejected(parseIdempotencyHeader("idem_"), "INCOMPLETE");
});

Deno.test("v1 validation primitives return typed, safe field failures", () => {
  assertEquals(validateRequiredString("  ", "reason"), {
    ok: false,
    issues: [{
      field: "reason",
      code: "REQUIRED",
      message: "reason is required.",
    }],
  });
  assertEquals(validateRequiredString("accepted", "reason", { maxLength: 7 }), {
    ok: false,
    issues: [{
      field: "reason",
      code: "TOO_LONG",
      message: "reason exceeds 7 characters.",
    }],
  });
  assertEquals(validateRequiredString("accepted", "reason"), {
    ok: true,
    value: "accepted",
  });
});

function _compileTimeConsumerFixture(
  commandPort: CommandPort<PublishNote>,
  queryPort: QueryPort<GetNote>,
  context: RequestContext,
): void {
  const command: PublishNote = {
    name: "notes.publish",
    payload: { body: "Reviewed" },
    context,
    idempotencyKey: expectValue(parseIdempotencyKey("idem_command-7")),
    expectedVersion: expectValue(parseEtag('"v3"')),
  };
  const query: GetNote = {
    name: "notes.get",
    input: { noteId: "note_7" },
    context,
  };
  const commandResult: Promise<{ noteId: string }> = commandPort.execute(
    command,
  );
  const queryResult: Promise<{ body: string }> = queryPort.execute(query);

  const unrelated: Command<"notes.archive", { reason: string }, void> = {
    name: "notes.archive",
    payload: { reason: "duplicate" },
    context,
    idempotencyKey: command.idempotencyKey,
  };
  // @ts-expect-error A publish-only port must not accept an unrelated command.
  commandPort.execute(unrelated);

  void commandResult;
  void queryResult;
  assertEquals(API_V1_BASE_PATH, "/api/v1");
}

type PublishNote = Command<
  "notes.publish",
  { body: string },
  { noteId: string }
>;
type GetNote = Query<"notes.get", { noteId: string }, { body: string }>;

function requestContext(): RequestContext {
  return expectValue(parseRequestContext({
    actorId: "actor_analyst-42",
    tenantId: "tenant_northstar",
    workspaceId: "workspace_primary",
    correlationId: "cor_request-7",
    origin: "http",
  }));
}

function expectValue<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly issue: { readonly code: string } },
): T {
  if (result.ok) return result.value;
  throw new Error(`Expected value, got ${result.issue.code}`);
}

function assertRejected(
  result: { readonly ok: boolean; readonly issue?: { readonly code: string } },
  code: string,
): void {
  assert(!result.ok, "Expected rejection");
  assertEquals(result.issue?.code, code);
}

function expectErrorEnvelope(
  result: ReturnType<typeof parseApiEnvelope>,
): { readonly error: ApiError } {
  const value = expectValue(result);
  if ("error" in value) return value;
  throw new Error("Expected error envelope");
}

function expectSuccessEnvelope(
  result: ReturnType<typeof parseApiEnvelope>,
): { readonly meta: { readonly correlationId: string } } {
  const value = expectValue(result);
  if ("meta" in value) return value;
  throw new Error("Expected success envelope");
}
