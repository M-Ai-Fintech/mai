import { assertEquals, assertFalse } from "@std/assert";
import {
  parseEvidenceId,
  parseIndexId,
} from "../../src/evidence_knowledge/v1.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import {
  evidenceCandidate,
  EvidenceVectorProjectionService,
} from "../../src/evidence_knowledge/vector_projection.ts";
import { FakeEvidenceVectorPort } from "../../src/evidence_knowledge/vector_port.ts";

Deno.test("vector projections replace versions without changing exact source identity", async () => {
  const port = new FakeEvidenceVectorPort();
  const service = new EvidenceVectorProjectionService(port);
  const key = {
    scope: fixtureScope(),
    documentVersionId: "docver_contract-v1",
    classification: "financial" as const,
    processingVersion: "extractor-v1",
    indexVersion: 1,
  };
  await service.rebuild({
    indexId: required("index_contract-v1", parseIndexId),
    key,
    candidates: [
      evidenceCandidate(
        required("evidence_net-debt", parseEvidenceId),
        "candidate-1",
        "Net debt is EUR 10m.",
        ["finance"],
      ),
    ],
  });
  await service.rebuild({
    indexId: required("index_contract-v2", parseIndexId),
    key: { ...key, indexVersion: 2 },
    candidates: [],
  });
  assertEquals(port.projections.size, 2);
  assertEquals(
    port.projections.get(required("index_contract-v1", parseIndexId))?.key
      .documentVersionId,
    "docver_contract-v1",
  );
  assertFalse(
    port.projections.get(required("index_contract-v2", parseIndexId))?.state ===
      "stale",
  );
});

function fixtureScope() {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}
function required<T>(
  value: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
