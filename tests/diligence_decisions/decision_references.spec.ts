import { assertEquals, assertRejects } from "@std/assert";
import {
  advanceDecisionRequestReference,
  assertDecisionReferencesConsistent,
  createDecisionProjection,
  createDecisionRequest,
  createExactEvidenceBasis,
  DiligenceDecisionError,
  parseActor,
  parseDealId,
  parseDecisionRecordId,
  parseDecisionRequestId,
  parseFindingId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/diligence_decisions/v1.ts";
import { parseAggregateVersion } from "../../src/platform/api/v1.ts";

Deno.test(
  "supersession advances the request and projection current-record contract",
  () => {
    const request = decidedRequest();
    const replacement = required("decision_record_new", parseDecisionRecordId);
    const next = advanceDecisionRequestReference(
      request,
      request.decisionRecordId!,
      replacement,
      now(),
    );
    const projection = createDecisionProjection({
      requestId: request.id,
      currentRecordId: replacement,
      state: "active",
      version: version(2),
      updatedAt: now(),
    });

    assertEquals(next.decisionRecordId, projection.currentRecordId);
    assertEquals(next.version, version(4));
    assertDecisionReferencesConsistent(next, projection);
  },
);

Deno.test("contradictory current decision references are rejected", async () => {
  const request = decidedRequest();
  const projection = createDecisionProjection({
    requestId: request.id,
    currentRecordId: required("decision_record_new", parseDecisionRecordId),
    state: "active",
    version: version(2),
    updatedAt: now(),
  });
  const error = await assertRejects(
    () =>
      Promise.resolve().then(() =>
        assertDecisionReferencesConsistent(request, projection)
      ),
    DiligenceDecisionError,
  );
  assertEquals(error.code, "REFERENCE_MISMATCH");
});

Deno.test("contradictory invalidation state is rejected", async () => {
  const request = {
    ...decidedRequest(),
    state: "invalidated" as const,
  };
  const projection = createDecisionProjection({
    requestId: request.id,
    currentRecordId: request.decisionRecordId!,
    state: "active",
    version: version(2),
    updatedAt: now(),
  });
  const error = await assertRejects(
    () =>
      Promise.resolve().then(() =>
        assertDecisionReferencesConsistent(request, projection)
      ),
    DiligenceDecisionError,
  );
  assertEquals(error.code, "REFERENCE_MISMATCH");
});

function decidedRequest() {
  const draft = createDecisionRequest({
    id: required("decision_request_reference", parseDecisionRequestId),
    scope: scope(),
    subject: {
      kind: "finding",
      id: required("finding_reference", parseFindingId),
    },
    question: "Should this finding be accepted?",
    basis: basis(),
    requester: actor("actor_requester"),
    namedApproverId: required("actor_approver", parseActor),
    now: now(),
  });
  return {
    ...draft,
    state: "decided" as const,
    decisionRecordId: required("decision_record_old", parseDecisionRecordId),
    version: version(3),
  };
}

function basis() {
  return createExactEvidenceBasis({
    scope: scope(),
    references: [{
      kind: "fact_version",
      factVersionId: "factver_reference" as never,
    }],
    basisDigest: "b".repeat(64),
    capturedAt: now(),
  });
}

function scope() {
  return {
    tenantId: required("tenant_reference", parseTenantId),
    workspaceId: required("workspace_reference", parseWorkspaceId),
    dealId: required("deal_reference", parseDealId),
  };
}

function actor(value: string) {
  return {
    id: required(value, parseActor),
    kind: "human" as const,
    state: "active" as const,
  };
}

function now(): Date {
  return new Date("2026-08-07T12:00:00.000Z");
}

function version(value: number) {
  return required(value, parseAggregateVersion);
}

function required<T>(
  value: string | number,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Invalid fixture "${String(value)}".`);
}
