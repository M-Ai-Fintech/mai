import { assert, assertEquals } from "@std/assert";
import {
  createDeliverableJob,
  type DeliverableJobInput,
  deriveDeliverableIdempotencyKey,
} from "../../src/deliverables/jobs.ts";
import {
  parseActorId,
  parseAggregateVersion,
  parseCorrelationId,
  parseDealId,
  parseIdempotencyKey,
  parseJobId,
  parseOperationId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";

Deno.test("deliverable jobs bind export work to an exact immutable version", () => {
  const job = createDeliverableJob(fixtureJob("deliverables.export"));
  assertEquals(job.inputVersionReferences, [{
    aggregateType: "DeliverableVersion",
    aggregateId: "delivver_diligence-v2",
    version: required(2, parseAggregateVersion),
  }]);
  assertEquals(job.payload, {
    exportId: "export_diligence-v2-pdf",
    format: "pdf",
  });
  assert(Object.isFrozen(job));
});

Deno.test("deliverable idempotency keys are deterministic and target-specific", async () => {
  const input = {
    actorId: required("actor_owner", parseActorId),
    commandType: "deliverables.export",
    targetType: "DeliverableVersion",
    targetId: "delivver_diligence-v2",
  };
  const first = await deriveDeliverableIdempotencyKey(input);
  const second = await deriveDeliverableIdempotencyKey(input);
  const other = await deriveDeliverableIdempotencyKey({
    ...input,
    targetId: "delivver_diligence-v3",
  });
  assertEquals(first, second);
  assert(first !== other);
  assert(first.startsWith("idem_"));
});

function fixtureJob(
  jobType: DeliverableJobInput["jobType"],
): DeliverableJobInput {
  return {
    jobId: required("job_diligence-export-v2", parseJobId),
    operationId: required("op_diligence-export-v2", parseOperationId),
    jobType,
    schemaVersion: 1,
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
    initiatingActorId: required("actor_owner", parseActorId),
    correlationId: required("cor_deliverables", parseCorrelationId),
    idempotencyKey: required("idem_diligence-export-v2", parseIdempotencyKey),
    inputVersionReferences: [{
      aggregateType: "DeliverableVersion",
      aggregateId: "delivver_diligence-v2",
      version: required(2, parseAggregateVersion),
    }],
    payload: { exportId: "export_diligence-v2-pdf", format: "pdf" },
    timeoutAt: new Date("2026-08-07T15:00:00.000Z"),
    createdAt: new Date("2026-08-07T14:00:00.000Z"),
  };
}

function required<T>(
  value: string | number,
  parser: (candidate: unknown) =>
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
