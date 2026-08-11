import { DocumentsRepository } from "../documents/repository.ts";
import {
  createObjectReference,
  type DocumentScope,
} from "../documents/model.ts";
import { EvidenceKnowledgeRepository } from "../evidence_knowledge/repository.ts";
import { PostgresDiligenceDecisionsRepository } from "../diligence_decisions/repository.ts";
import { PostgresDeliverablesRepository } from "../deliverables/repository.ts";
import type {
  PostgresTransactionRunner,
  TransactionHandle,
} from "../platform/persistence/v1.ts";
import type { IdempotencyKey } from "../platform/api/v1.ts";
import type { AuditEventDraft } from "../audit_activity/v1.ts";
import type { DemoReadinessResult } from "./contracts.ts";
import type { SyntheticInvestorDemoWorkflow } from "./runner.ts";
import { demoScope } from "./runner.ts";
import { demoReadinessResultSchema } from "./api_contracts.ts";

export type DemoPersistenceResult =
  | { readonly kind: "created"; readonly result: DemoReadinessResult }
  | { readonly kind: "replayed"; readonly result: DemoReadinessResult };

export interface DemoAuditAppendPort {
  append(
    transaction: TransactionHandle,
    event: AuditEventDraft,
  ): Promise<unknown>;
}

/** Persists the demo through context-owned repositories and one exact snapshot.
 *
 * @example await persistence.persist(idempotencyKey, workflow)
 */
export class DemoWorkflowPersistence {
  private readonly documents = new DocumentsRepository();
  private readonly evidence = new EvidenceKnowledgeRepository();
  private readonly diligence = new PostgresDiligenceDecisionsRepository();
  private readonly deliverables = new PostgresDeliverablesRepository();

  constructor(
    private readonly transactions: PostgresTransactionRunner,
    private readonly audit: DemoAuditAppendPort,
  ) {}

  persist(
    idempotencyKey: IdempotencyKey,
    workflow: SyntheticInvestorDemoWorkflow,
    receipt: AuditEventDraft,
  ): Promise<DemoPersistenceResult> {
    return this.transactions.run(async (transaction) => {
      const claimed = await claimSnapshot(
        transaction,
        idempotencyKey,
        workflow.result,
      );
      if (!claimed) {
        return {
          kind: "replayed",
          result: await loadSnapshot(
            transaction,
            workflow.result,
            idempotencyKey,
          ),
        };
      }
      await persistStage(
        "documents",
        () => this.persistDocuments(transaction, workflow),
      );
      await persistStage(
        "evidence",
        () => this.persistEvidence(transaction, workflow),
      );
      await persistStage(
        "decision",
        () => this.persistDecision(transaction, workflow),
      );
      await persistStage(
        "deliverable",
        () => this.persistDeliverable(transaction, workflow),
      );
      await persistStage(
        "audit",
        async () => {
          await this.audit.append(transaction, receipt);
        },
      );
      return { kind: "created", result: workflow.result };
    });
  }

  loadLatest(
    scope: DocumentScope,
  ): Promise<DemoReadinessResult | undefined> {
    return this.transactions.run(async (transaction) => {
      const query = await transaction.query<{ readonly result: unknown }>(
        `SELECT result FROM demo_readiness.workflow_snapshots
         WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3
         ORDER BY created_at DESC, idempotency_key DESC LIMIT 1`,
        [scope.tenantId, scope.workspaceId, scope.dealId],
      );
      const value = query.rows[0]?.result;
      return value === undefined ? undefined : parseResult(value);
    });
  }

  private async persistDocuments(
    transaction: TransactionHandle,
    workflow: SyntheticInvestorDemoWorkflow,
  ): Promise<void> {
    for (let index = 0; index < workflow.versions.length; index += 1) {
      const version = workflow.versions[index];
      const document = workflow.documents[index];
      await this.documents.insertDocument(transaction, document);
      await this.documents.insertSource(transaction, version.source);
      await this.documents.insertObjectReference(
        transaction,
        version.objectReference,
      );
      await this.documents.appendVersion(transaction, version);
      await this.persistProcessing(
        transaction,
        version,
        workflow.processingRuns[index],
      );
    }
  }

  private async persistProcessing(
    transaction: TransactionHandle,
    version: SyntheticInvestorDemoWorkflow["versions"][number],
    run: SyntheticInvestorDemoWorkflow["processingRuns"][number],
  ): Promise<void> {
    await this.documents.insertProcessingRun(transaction, run);
    for (const artifact of run.derivedArtifacts) {
      const reference = createObjectReference({
        objectReferenceId: artifact.objectReferenceId,
        scope: artifact.scope,
        objectKey: `${version.objectReference.objectKey}.normalized.txt`,
        storageVersion: artifact.processorVersion,
        checksum: artifact.checksum,
        byteLength: version.objectReference.byteLength,
        mediaType: "text/plain",
        createdAt: artifact.createdAt,
      });
      await this.documents.insertObjectReference(transaction, reference);
      await insertDerivedArtifact(transaction, artifact);
    }
  }

  private async persistEvidence(
    transaction: TransactionHandle,
    workflow: SyntheticInvestorDemoWorkflow,
  ): Promise<void> {
    for (const record of workflow.evidence) {
      await this.evidence.insertOrValidateCitation(
        transaction,
        record.citation,
      );
      await this.evidence.insertOrValidateEvidence(transaction, record);
    }
    await this.evidence.insertCalculation(transaction, workflow.calculation);
  }

  private async persistDecision(
    transaction: TransactionHandle,
    workflow: SyntheticInvestorDemoWorkflow,
  ): Promise<void> {
    await this.diligence.insertFinding(transaction, workflow.finding);
    await this.diligence.insertDecisionRequest(
      transaction,
      workflow.decisionRequest,
    );
    await this.diligence.insertDecisionRecord(
      transaction,
      workflow.decisionRecord,
    );
  }

  private async persistDeliverable(
    transaction: TransactionHandle,
    workflow: SyntheticInvestorDemoWorkflow,
  ): Promise<void> {
    await this.deliverables.insertDeliverable(
      transaction,
      workflow.deliverable,
    );
    await this.deliverables.insertSourceSnapshot(
      transaction,
      workflow.sourceSnapshot,
    );
    await this.deliverables.insertVersion(
      transaction,
      workflow.deliverableVersion,
    );
  }
}

async function persistStage(
  stage: string,
  persist: () => Promise<void>,
): Promise<void> {
  try {
    await persist();
  } catch (error) {
    const details = postgresErrorDetails(error);
    console.error(JSON.stringify({
      event: "demo_readiness.persistence_failed",
      stage,
      ...details,
    }));
    throw error;
  }
}

function postgresErrorDetails(
  error: unknown,
): Readonly<Record<string, string>> {
  if (typeof error !== "object" || error === null) return {};
  const value = error as Readonly<Record<string, unknown>>;
  return Object.fromEntries(
    ["code", "constraint", "table"].flatMap((name) =>
      typeof value[name] === "string" ? [[name, value[name]]] : []
    ),
  );
}

async function claimSnapshot(
  transaction: TransactionHandle,
  key: IdempotencyKey,
  result: DemoReadinessResult,
): Promise<boolean> {
  const inserted = await transaction.query(
    `INSERT INTO demo_readiness.workflow_snapshots
      (tenant_id, workspace_id, deal_id, idempotency_key, dataset_digest,
       result, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT DO NOTHING RETURNING idempotency_key`,
    [
      demoScope.tenantId,
      demoScope.workspaceId,
      demoScope.dealId,
      key,
      result.datasetDigest,
      JSON.stringify(result),
      new Date("2026-08-10T12:00:00.000Z"),
    ],
  );
  return inserted.rowCount === 1;
}

async function loadSnapshot(
  transaction: TransactionHandle,
  expected: DemoReadinessResult,
  key: IdempotencyKey,
): Promise<DemoReadinessResult> {
  const query = await transaction.query<{ readonly result: unknown }>(
    `SELECT result FROM demo_readiness.workflow_snapshots
     WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3
       AND idempotency_key=$4`,
    [demoScope.tenantId, demoScope.workspaceId, demoScope.dealId, key],
  );
  const result = parseResult(query.rows[0]?.result);
  if (result.datasetDigest === expected.datasetDigest) return result;
  throw new Error(
    `Demo idempotency key "${key}" resolved digest "${result.datasetDigest}"; expected "${expected.datasetDigest}".`,
  );
}

async function insertDerivedArtifact(
  transaction: TransactionHandle,
  artifact: SyntheticInvestorDemoWorkflow["processingRuns"][number][
    "derivedArtifacts"
  ][number],
): Promise<void> {
  await transaction.query(
    `INSERT INTO documents.derived_artifacts
      (derived_artifact_id, tenant_id, workspace_id, deal_id,
       document_version_id, artifact_version, artifact_type,
       object_reference_id, checksum_algorithm, checksum_value, processor,
       processor_version, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      artifact.derivedArtifactId,
      artifact.scope.tenantId,
      artifact.scope.workspaceId,
      artifact.scope.dealId,
      artifact.documentVersionId,
      artifact.artifactVersion,
      artifact.artifactType,
      artifact.objectReferenceId,
      artifact.checksum.algorithm,
      artifact.checksum.value,
      artifact.processor,
      artifact.processorVersion,
      artifact.createdAt,
    ],
  );
}

function parseResult(value: unknown): DemoReadinessResult {
  return demoReadinessResultSchema.parse(value);
}
