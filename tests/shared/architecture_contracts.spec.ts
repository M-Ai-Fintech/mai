import {
  parseActorId,
  parseCorrelationId,
  parseDealId,
  parseIdempotencyKey,
  parseJobId,
  parseOperationId,
  parseRequestContext,
  type ParseResult,
  parseTenantId,
  parseWorkspaceId,
  serializeActorId,
} from "../../src/platform/api/v1.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("v1 identifiers accept their canonical wire values", () => {
  const actor = expectIdentifier(parseActorId("actor_analyst-42"));

  assertEquals(serializeActorId(actor), "actor_analyst-42");
  assertIdentifier(parseTenantId("tenant_northstar"));
  assertIdentifier(parseWorkspaceId("workspace_primary"));
  assertIdentifier(parseDealId("deal_solar-2026"));
  assertIdentifier(parseCorrelationId("cor_request-7"));
  assertIdentifier(parseIdempotencyKey("idem_create-deal-7"));
  assertIdentifier(parseOperationId("op_processing-7"));
  assertIdentifier(parseJobId("job_processing-7"));
});

Deno.test("v1 identifiers reject malformed values deterministically", () => {
  assertRejects(parseActorId(""), "EMPTY");
  assertRejects(parseActorId("   "), "WHITESPACE_ONLY");
  assertRejects(parseActorId(" actor_analyst"), "SURROUNDING_WHITESPACE");
  assertRejects(parseActorId("tenant_analyst"), "WRONG_PREFIX");
  assertRejects(parseActorId("actor_invalid value"), "INVALID_FORMAT");
  assertRejects(parseActorId("actor_"), "INCOMPLETE");
  assertRejects(parseActorId(`actor_${"a".repeat(64)}`), "INVALID_LENGTH");
});

Deno.test("v1 request context enforces nested tenant, workspace, and deal scope", () => {
  const result = parseRequestContext({
    actorId: "actor_analyst-42",
    tenantId: "tenant_northstar",
    workspaceId: "workspace_primary",
    dealId: "deal_solar-2026",
    correlationId: "cor_request-7",
    origin: "http",
  });

  const context = expectIdentifier(result);
  assertEquals(context.tenantId, "tenant_northstar");
  assertEquals(context.workspaceId, "workspace_primary");
  assertEquals(context.dealId, "deal_solar-2026");
  assertEquals(context.origin, "http");
});

Deno.test("v1 request context rejects missing parent scope and malformed input", () => {
  assertContextRejects({
    actorId: "actor_analyst-42",
    tenantId: "tenant_northstar",
    dealId: "deal_solar-2026",
    correlationId: "cor_request-7",
    origin: "http",
  }, "DEAL_REQUIRES_WORKSPACE");
  assertContextRejects({
    actorId: "actor_analyst-42",
    workspaceId: "workspace_primary",
    correlationId: "cor_request-7",
    origin: "http",
  }, "MISSING_TENANT");
  assertContextRejects({
    actorId: "actor_analyst-42",
    tenantId: "tenant_northstar",
    correlationId: "cor_request-7",
    origin: "browser",
  }, "INVALID_ORIGIN");
});

function assertIdentifier<T>(result: ParseResult<T>): void {
  assert(result.ok, "Expected identifier to parse");
}

function expectIdentifier<T>(
  result:
    | ParseResult<T>
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly issue: { readonly code: string } },
): T {
  if (result.ok) return result.value;
  throw new Error(`Expected identifier to parse, got ${result.issue.code}`);
}

function assertRejects(
  result: ParseResult<unknown>,
  code: string,
): void {
  if (!result.ok) return assertEquals(result.issue.code, code);
  throw new Error("Expected identifier rejection");
}

function assertContextRejects(value: unknown, code: string): void {
  const result = parseRequestContext(value);
  if (!result.ok) return assertEquals(result.issue.code, code);
  throw new Error("Expected request context rejection");
}
