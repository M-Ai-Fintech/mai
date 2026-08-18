import pg from "pg";
import manifestJson from "../../tests/fixtures/investor-demo/manifest.json" with {
  type: "json",
};
import type { AuditEventDraft } from "../audit_activity/v1.ts";
import { PostgresAuditEventRepository } from "../audit_activity/v1.ts";
import type {
  DemoManifest,
  DemoReadinessResult,
} from "../demo_readiness/contracts.ts";
import {
  type DemoPersistenceResult,
  DemoWorkflowPersistence,
} from "../demo_readiness/persistence.ts";
import {
  buildSyntheticInvestorDemo,
  demoScope,
} from "../demo_readiness/runner.ts";
import type { IdempotencyKey } from "../platform/api/v1.ts";
import { PostgresTransactionRunner } from "../platform/persistence/v1.ts";

const fixtureRoot = new URL(
  "../../tests/fixtures/investor-demo/",
  import.meta.url,
);
const fixedTime = new Date("2026-08-10T12:00:00.000Z");
const workflowKey = "idem_local-scenario-workflow" as IdempotencyKey;
const receiptActorId = "actor_demo-banker" as AuditEventDraft["actorId"];
const receiptStatic = Object.freeze({
  ...demoScope,
  actorId: receiptActorId,
  actorKind: "human" as const,
  origin: "internal" as const,
  correlationId:
    "correlation_local-scenario" as AuditEventDraft["correlationId"],
  aggregateType: "DemoReadinessRun",
  aggregateId: demoScope.dealId,
  aggregateVersion: 1 as AuditEventDraft["aggregateVersion"],
  eventType: "DemoReadinessCompleted",
  schemaVersion: 1,
  occurredAt: fixedTime,
});

/** Creates the redacted, deterministic audit receipt for the local workflow. */
export function buildLocalMvpReceipt(
  result: DemoReadinessResult,
): AuditEventDraft {
  return {
    ...receiptStatic,
    eventId: result.auditEventId as AuditEventDraft["eventId"],
    authoritySnapshot: receiptAuthoritySnapshot(),
    evidenceSnapshot: receiptEvidenceSnapshot(result),
    provenance: receiptProvenance(),
    payload: receiptPayload(result),
    classifications: receiptClassifications(),
    contentDigest: result.datasetDigest,
  };
}

function receiptAuthoritySnapshot(): AuditEventDraft["authoritySnapshot"] {
  return {
    snapshotId: "authority_local-scenario",
    actorId: receiptActorId,
    actorKind: "human",
    policyVersion: "local-scenario-v1",
    scope: demoScope,
    capturedAt: fixedTime,
  };
}

function receiptEvidenceSnapshot(
  result: DemoReadinessResult,
): AuditEventDraft["evidenceSnapshot"] {
  return {
    capturedAt: fixedTime,
    references: result.documentVersions.map((document) => ({
      sourceType: "DocumentVersion",
      sourceId: document.documentVersionId,
      sourceVersion: "synthetic-plaintext-v1",
      checksum: document.checksum,
    })),
  };
}

function receiptProvenance(): AuditEventDraft["provenance"] {
  return {
    actorId: receiptActorId,
    actorKind: "human",
    origin: "internal",
    operationReference: "local-mvp.prepare",
  };
}

function receiptPayload(result: DemoReadinessResult) {
  return {
    datasetId: result.datasetId,
    datasetDigest: result.datasetDigest,
    synthetic: true,
    customerData: false,
  };
}

function receiptClassifications(): AuditEventDraft["classifications"] {
  return {
    datasetId: "public",
    datasetDigest: "internal",
    synthetic: "public",
    customerData: "public",
  };
}

/** Persists the synthetic workflow through its owning context repositories. */
export async function seedLocalMvpWorkflow(
  pool: pg.Pool,
): Promise<DemoPersistenceResult> {
  const workflow = await buildSyntheticInvestorDemo(
    manifestJson as DemoManifest,
    fixtureRoot,
    { environment: "local-demo", databaseName: "mai_demo_readiness" },
  );
  const persistence = new DemoWorkflowPersistence(
    new PostgresTransactionRunner(pool),
    new PostgresAuditEventRepository(),
  );
  return await persistence.persist(
    workflowKey,
    workflow,
    buildLocalMvpReceipt(workflow.result),
  );
}
