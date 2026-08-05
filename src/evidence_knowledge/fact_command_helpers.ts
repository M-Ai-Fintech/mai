import type { OutboxEvent } from "../platform/events/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { TransitionFactStatusCommand } from "./fact_commands.ts";
import type { ExactDocumentVersionVerificationPort } from "./document_version_verification.ts";
import { parseInvalidationId } from "./ids.ts";
import type { Fact, FactVersion } from "./model.ts";
import { scopeParameters } from "./repository_sql.ts";
import type { EvidenceKnowledgeRepository } from "./repository.ts";

export function durableId(prefix: string): string {
  const namespace = prefix === "invalidation" ? "invalidation" : "evidence";
  return `${namespace}_${prefix}-${crypto.randomUUID().replaceAll("-", "")}`;
}

export function parseInvalidation(value: string) {
  const parsed = parseInvalidationId(value);
  if (parsed.ok) return parsed.value;
  throw new Error(`Invalidation ID "${value}" could not be branded.`);
}

export function validateReplacement(
  version: FactVersion,
  replacement: FactVersion | undefined,
  target: "approved" | "superseded",
): void {
  if (target !== "superseded") return;
  if (replacement === undefined) {
    throw new Error(
      `Fact version "${version.factVersionId}" cannot be superseded; expected a replacement fact version.`,
    );
  }
  if (
    replacement.factId !== version.factId ||
    replacement.versionNumber <= version.versionNumber ||
    replacement.status !== "approved"
  ) {
    throw new Error(
      `Fact replacement "${replacement.factVersionId}" is invalid; expected the same fact, a higher version, and approved status.`,
    );
  }
}

export async function verifyCitations(
  transaction: TransactionHandle,
  command: TransitionFactStatusCommand,
  version: FactVersion,
  repository: EvidenceKnowledgeRepository,
  verifier: ExactDocumentVersionVerificationPort,
): Promise<void> {
  for (const citationId of version.citationIds) {
    const citation = await repository.findCitation(
      transaction,
      command.scope,
      citationId,
    );
    if (citation === undefined) {
      throw new Error(
        `Citation "${citationId}" was not found in the fact scope; expected an exact citation.`,
      );
    }
    await verifier.verify(command.context, command.scope, citation.source);
  }
}

export async function appendHistory(
  transaction: TransactionHandle,
  historyId: string,
  command: TransitionFactStatusCommand,
  fact: Fact,
  version: FactVersion,
  occurredAt: Date,
): Promise<void> {
  await transaction.query(
    `INSERT INTO evidence_knowledge.fact_transition_history (history_id,tenant_id,workspace_id,deal_id,fact_id,fact_version_id,from_status,to_status,command_key,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      historyId,
      ...scopeParameters(command.scope),
      fact.factId,
      version.factVersionId,
      version.status,
      command.targetStatus,
      command.idempotencyKey,
      occurredAt,
    ],
  );
}

export async function appendProvenance(
  transaction: TransactionHandle,
  command: TransitionFactStatusCommand,
  version: FactVersion,
  replacement: FactVersion | undefined,
  occurredAt: Date,
): Promise<void> {
  if (replacement !== undefined) {
    await transaction.query(
      `INSERT INTO evidence_knowledge.provenance_links (provenance_id,tenant_id,workspace_id,deal_id,relation,source_kind,source_id,target_kind,target_id,created_at) VALUES ($1,$2,$3,$4,'supersedes','fact_version',$5,'fact_version',$6,$7)`,
      [
        durableId("provenance"),
        ...scopeParameters(command.scope),
        replacement.factVersionId,
        version.factVersionId,
        occurredAt,
      ],
    );
  }
  for (const citationId of version.citationIds) {
    await transaction.query(
      `INSERT INTO evidence_knowledge.fact_transition_provenance (provenance_id,tenant_id,workspace_id,deal_id,fact_id,fact_version_id,citation_id,relation,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        durableId("provenance"),
        ...scopeParameters(command.scope),
        version.factId,
        version.factVersionId,
        citationId,
        replacement === undefined ? "supports" : "supersedes",
        occurredAt,
      ],
    );
  }
}

export async function appendInvalidation(
  transaction: TransactionHandle,
  invalidationId: string,
  command: TransitionFactStatusCommand,
  version: FactVersion,
  eventIdentity: string,
  occurredAt: Date,
): Promise<void> {
  await transaction.query(
    `INSERT INTO evidence_knowledge.invalidations (invalidation_id,tenant_id,workspace_id,deal_id,source_kind,source_id,reason,event_identity,created_at) VALUES ($1,$2,$3,$4,'fact_version',$5,$6,$7,$8)`,
    [
      invalidationId,
      ...scopeParameters(command.scope),
      version.factVersionId,
      `fact ${command.targetStatus}`,
      eventIdentity,
      occurredAt,
    ],
  );
}

export function buildOutboxEvent(
  command: TransitionFactStatusCommand,
  factBefore: Fact,
  factAfter: Fact,
  version: FactVersion,
  _replacement: FactVersion | undefined,
  invalidationId: string,
  occurredAt: Date,
): OutboxEvent {
  return {
    eventId: durableId("event"),
    tenantId: command.scope.tenantId,
    workspaceId: command.scope.workspaceId,
    dealId: command.scope.dealId,
    aggregateType: "EvidenceFact",
    aggregateId: command.factId,
    aggregateVersion: factAfter.aggregateVersion as AggregateVersion,
    eventType: "evidence.fact-status-transitioned",
    schemaVersion: 1,
    payload: {
      invalidationId,
      factVersionId: version.factVersionId,
      previousFactVersionId: factBefore.currentFactVersionId ?? null,
      currentFactVersionId: factAfter.currentFactVersionId ?? null,
      targetStatus: command.targetStatus,
      rationale: command.rationale ?? null,
    },
    correlationId: command.context.correlationId,
    occurredAt,
    availableAt: occurredAt,
  };
}
