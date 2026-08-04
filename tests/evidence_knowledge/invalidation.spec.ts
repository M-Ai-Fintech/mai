import { assertEquals, assertRejects } from "@std/assert";
import {
  parseEvidenceId,
  parseFactVersionId,
  parseIndexId,
  parseInvalidationId,
} from "../../src/evidence_knowledge/v1.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import {
  FakeInvalidationReceiptPort,
  TargetedInvalidationConsumer,
} from "../../src/evidence_knowledge/invalidation.ts";
import { FakeEvidenceVectorPort } from "../../src/evidence_knowledge/vector_port.ts";
import type { EvidenceVectorPort } from "../../src/evidence_knowledge/vector_port.ts";

Deno.test("invalidation is targeted and duplicate delivery is idempotent", async () => {
  const vector = new FakeEvidenceVectorPort();
  const consumer = new TargetedInvalidationConsumer(vector, [
    {
      indexId: required("index_contract-v1", parseIndexId),
      scope: fixtureScope(),
      sourceKind: "evidence",
      sourceId: "evidence_net-debt",
    },
    {
      indexId: required("index_other-v1", parseIndexId),
      scope: fixtureScope(),
      sourceKind: "fact_version",
      sourceId: "factver_other-v1",
    },
  ], new FakeInvalidationReceiptPort());
  const event = {
    type: "evidence.source-invalidated" as const,
    eventId: required("invalidation_source", parseInvalidationId),
    scope: fixtureScope(),
    evidenceId: required("evidence_net-debt", parseEvidenceId),
    reason: "source superseded",
  };
  assertEquals(await consumer.consume(event), "processed");
  assertEquals(await consumer.consume(event), "duplicate");
  assertEquals(vector.staleReasons.size, 1);
  const other = {
    type: "evidence.fact-invalidated" as const,
    eventId: required("invalidation_fact", parseInvalidationId),
    scope: fixtureScope(),
    factVersionId: required("factver_other-v1", parseFactVersionId),
    reason: "fact superseded",
  };
  await consumer.consume(other);
  assertEquals(vector.staleReasons.size, 2);
});

Deno.test("failed invalidation is released and succeeds on retry", async () => {
  const vector = new FailOnceVectorPort();
  const receipts = new FakeInvalidationReceiptPort();
  const consumer = new TargetedInvalidationConsumer(vector, [{
    indexId: required("index_retry-v1", parseIndexId),
    scope: fixtureScope(),
    sourceKind: "evidence",
    sourceId: "evidence_retry",
  }], receipts);
  const event = {
    type: "evidence.source-invalidated" as const,
    eventId: required("invalidation_retry", parseInvalidationId),
    scope: fixtureScope(),
    evidenceId: required("evidence_retry", parseEvidenceId),
    reason: "checksum changed",
  };
  await assertRejects(() => consumer.consume(event), Error, "transient");
  assertEquals(receipts.failures.length, 1);
  assertEquals(await consumer.consume(event), "processed");
  assertEquals(await consumer.consume(event), "duplicate");
});

Deno.test("invalidation matching includes all scope dimensions and source kind", async () => {
  const vector = new FakeEvidenceVectorPort();
  const scope = fixtureScope();
  const otherTenant = {
    ...scope,
    tenantId: required("tenant_other", parseTenantId),
  };
  const consumer = new TargetedInvalidationConsumer(vector, [
    {
      indexId: required("index_match-v1", parseIndexId),
      scope,
      sourceKind: "evidence",
      sourceId: "evidence_same-source",
    },
    {
      indexId: required("index_tenant-v1", parseIndexId),
      scope: otherTenant,
      sourceKind: "evidence",
      sourceId: "evidence_same-source",
    },
    {
      indexId: required("index_kind-v1", parseIndexId),
      scope,
      sourceKind: "fact_version",
      sourceId: "evidence_same-source",
    },
  ], new FakeInvalidationReceiptPort());
  const event = {
    type: "evidence.source-invalidated" as const,
    eventId: required("invalidation_scope", parseInvalidationId),
    scope,
    evidenceId: required("evidence_same-source", parseEvidenceId),
    reason: "source superseded",
  };
  await consumer.consume(event);
  assertEquals([...vector.staleReasons.keys()].map(String), ["index_match-v1"]);
});

class FailOnceVectorPort implements EvidenceVectorPort {
  private failed = false;
  async replaceProjection(): Promise<void> {}
  async markStale(): Promise<void> {
    await Promise.resolve();
    if (!this.failed) {
      this.failed = true;
      throw new Error("transient vector failure");
    }
  }
}

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
