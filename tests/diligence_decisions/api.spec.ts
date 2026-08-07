import { assertEquals } from "@std/assert";
import {
  type CommandResult,
  diligenceCommandEnvelope,
  DiligenceDecisionError,
  diligenceDecisionErrorEnvelope,
  parseActor,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/diligence_decisions/v1.ts";
import {
  parseCorrelationId,
  type RequestContext,
} from "../../src/platform/api/v1.ts";

const context: RequestContext = {
  actorId: required("actor_api", parseActor),
  tenantId: required("tenant_api", parseTenantId),
  workspaceId: required("workspace_api", parseWorkspaceId),
  dealId: required("deal_api", parseDealId),
  correlationId: required("cor_api", parseCorrelationId),
  origin: "http",
};

Deno.test("API contract preserves command replay metadata", () => {
  const result: CommandResult<{ readonly id: string }> = {
    status: "replayed",
    value: { id: "finding_api" },
  };
  const envelope = diligenceCommandEnvelope(result, context);
  assertEquals(envelope.data.status, "replayed");
  assertEquals(envelope.meta.correlationId, context.correlationId);
});

Deno.test("API contract protects inaccessible records and maps concurrency errors", () => {
  const hidden = diligenceDecisionErrorEnvelope(
    new DiligenceDecisionError("PROTECTED_NOT_FOUND", "hidden"),
    context,
  );
  const stale = diligenceDecisionErrorEnvelope(
    new DiligenceDecisionError("STALE_INVALIDATION", "stale"),
    context,
  );
  assertEquals(hidden.error.code, "PROTECTED_NOT_FOUND");
  assertEquals(stale.error.code, "STALE_VERSION");
});

function required<T>(
  value: string,
  parser: (value: unknown) =>
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Invalid API fixture "${value}".`);
}
