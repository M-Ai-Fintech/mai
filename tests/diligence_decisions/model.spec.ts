import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  createDecisionRecord,
  createDecisionRequest,
  createExactEvidenceBasis,
  createFinding,
  createImpact,
  decisionRequestToRequested,
  DiligenceDecisionError,
  type EvidenceBasisReference,
  parseActor,
  parseDealId,
  parseDecisionRecordId,
  parseDecisionRequestId,
  parseFactVersionId,
  parseFindingId,
  parseImpactId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/diligence_decisions/v1.ts";
import { parseDocumentVersionId } from "../../src/documents/v1.ts";
import type { ExactDocumentVersionReference } from "../../src/evidence_knowledge/v1.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import { parseAggregateVersion } from "../../src/platform/api/v1.ts";

Deno.test("proposals preserve exact evidence basis and scope", () => {
  const basis = exactBasis();
  const finding = createFinding({
    id: required("finding_missing-tax", parseFindingId),
    scope: scope(),
    title: "Missing tax certificate",
    statement:
      "The expected tax certificate is not present in the reviewed VDR.",
    basis,
    proposedBy: agentActor(),
    now: now(),
  });
  const impact = createImpact({
    id: required("impact_tax-exposure", parseImpactId),
    findingId: finding.id,
    scope: finding.scope,
    statement: "Tax exposure requires human assessment.",
    severity: "high",
    basis,
    proposedBy: agentActor(),
    now: now(),
  });

  assertEquals(finding.basis.basisDigest, basis.basisDigest);
  assertEquals(impact.findingId, finding.id);
  assert(Object.isFrozen(finding));
  assert(Object.isFrozen(finding.basis));
});

Deno.test("decision requests require distinct requester and named human approver", async () => {
  const input = {
    id: required("decision_request_tax", parseDecisionRequestId),
    scope: scope(),
    subject: {
      kind: "finding" as const,
      id: required("finding_missing-tax", parseFindingId),
    },
    question:
      "Should the missing certificate be accepted as a diligence exception?",
    basis: exactBasis(),
    requester: humanActor("actor_requester"),
    namedApproverId: requiredActor("actor_approver"),
    now: now(),
  };
  const request = createDecisionRequest(input);
  assertEquals(request.state, "draft");
  assertEquals(decisionRequestToRequested(request, now()).state, "requested");

  const error = await assertRejects(
    () =>
      Promise.resolve().then(() =>
        createDecisionRequest({
          ...input,
          namedApproverId: requiredActor("actor_requester"),
        })
      ),
    Error,
  );
  assertEquals((error as DiligenceDecisionError).code, "SEPARATION_OF_DUTIES");
});

Deno.test("decision records are immutable human outcomes with exact basis", () => {
  const record = createDecisionRecord({
    id: required("decision_record_tax", parseDecisionRecordId),
    requestId: required("decision_request_tax", parseDecisionRequestId),
    scope: scope(),
    outcome: "approved",
    actor: humanActor("actor_approver"),
    requestVersion: aggregateVersion(2),
    basis: exactBasis(),
    authority: authority("actor_approver"),
    recordedAt: now(),
  });

  assertEquals(record.outcome, "approved");
  assert(Object.isFrozen(record));
  assertEquals(Reflect.set(record, "outcome", "rejected"), false);
});

function exactBasis() {
  const reference: ExactDocumentVersionReference = {
    documentVersionId: required("docver_tax-v1", parseDocumentVersionId),
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    location: { kind: "page", page: 4 },
    classification: "tax",
    processingVersion: "extractor-v1",
  };
  const references: readonly EvidenceBasisReference[] = [{
    kind: "document_version",
    reference,
  }, {
    kind: "fact_version",
    factVersionId: required("factver_tax-v1", parseFactVersionId),
  }];
  return createExactEvidenceBasis({
    scope: scope(),
    references,
    basisDigest: "b".repeat(64),
    capturedAt: now(),
  });
}

function scope() {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}

function now(): Date {
  return new Date("2026-08-07T12:00:00.000Z");
}

function agentActor(): ActorReference {
  return { id: requiredActor("actor_agent"), kind: "ai", state: "active" };
}

function humanActor(id: string): ActorReference {
  return { id: requiredActor(id), kind: "human", state: "active" };
}

function authority(id: string) {
  return {
    snapshotId: "authority_approver",
    actorId: requiredActor(id),
    policyVersion: "policy-v1",
    scope: scope(),
    capturedAt: now(),
  };
}

function requiredActor(value: string) {
  return required(value, parseActor);
}

function aggregateVersion(value: number) {
  const result = parseAggregateVersion(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture version "${value}" is invalid.`);
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
