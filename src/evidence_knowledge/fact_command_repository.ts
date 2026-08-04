import type { OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import type {
  Clock,
  PostgresTransactionRunner,
  TransactionHandle,
} from "../platform/persistence/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import { VersionConflictError } from "../platform/persistence/concurrency.ts";
import type {
  FactTransitionResult,
  FactTransitionStore,
  TransitionFactStatusCommand,
} from "./fact_commands.ts";
import type { ExactDocumentVersionVerificationPort } from "./document_version_verification.ts";
import { assertFactStatusTransition } from "./fact.ts";
import { parseInvalidationId } from "./ids.ts";
import type { EvidenceScope, Fact, FactVersion } from "./model.ts";
import {
  factSelectColumns,
  factVersionSelectColumns,
  scopeParameters,
} from "./repository_sql.ts";
import { rowToFact, rowToFactVersion } from "./repository_rows.ts";
import { EvidenceKnowledgeRepository } from "./repository.ts";
import { loadEffectiveFactVersionStatus } from "./fact_version_status.ts";

export interface FactCommandRepositoryDependencies {
  readonly transactions: PostgresTransactionRunner;
  readonly evidence: EvidenceKnowledgeRepository;
  readonly verifier: ExactDocumentVersionVerificationPort;
  readonly outbox: OutboxRepository;
  readonly clock: Clock;
}

export class PostgresFactTransitionStore implements FactTransitionStore {
  private readonly repository: EvidenceKnowledgeRepository;

  constructor(
    private readonly dependencies: FactCommandRepositoryDependencies,
  ) {
    this.repository = dependencies.evidence;
  }

  transition(
    command: TransitionFactStatusCommand,
  ): Promise<FactTransitionResult> {
    return this.dependencies.transactions.run((transaction) =>
      this.transitionInTransaction(transaction, command)
    );
  }

  private async transitionInTransaction(
    transaction: TransactionHandle,
    command: TransitionFactStatusCommand,
  ): Promise<FactTransitionResult> {
    const existing = await claimCommand(
      transaction,
      command,
      this.dependencies.clock,
    );
    if (existing.kind === "replay") return existing.result;
    const fact = await lockFact(transaction, command.scope, command.factId);
    if (fact.aggregateVersion !== command.expectedAggregateVersion) {
      throw new VersionConflictError(
        "VERSION_CONFLICT",
        command.factId,
        command.expectedAggregateVersion,
      );
    }
    const version = await loadFactVersion(
      transaction,
      command.scope,
      command.factVersionId,
    );
    assertVersionBelongsToFact(version, command.factId);
    assertAggregateTransition(fact.status, command.targetStatus);
    if (command.targetStatus === "approved" && version.status !== "proposed") {
      throw new Error(
        `Fact version "${version.factVersionId}" has status "${version.status}"; expected proposed before approval.`,
      );
    }
    if (
      command.targetStatus === "superseded" && version.status !== "approved"
    ) {
      throw new Error(
        `Fact version "${version.factVersionId}" has status "${version.status}"; expected approved before supersession.`,
      );
    }
    await verifyCitations(
      transaction,
      command,
      version,
      this.repository,
      this.dependencies.verifier,
    );
    const replacement = command.replacementFactVersionId === undefined
      ? undefined
      : await loadFactVersion(
        transaction,
        command.scope,
        command.replacementFactVersionId,
      );
    validateReplacement(version, replacement, command.targetStatus);
    const updated = await updateFact(
      transaction,
      command.scope,
      fact,
      command.targetStatus,
      command.expectedAggregateVersion,
    );
    const historyId = durableId("history");
    await appendHistory(transaction, historyId, command, fact, version);
    await appendProvenance(transaction, command, version, replacement);
    const invalidationId = durableId("invalidation");
    await appendInvalidation(
      transaction,
      invalidationId,
      command,
      version,
      historyId,
    );
    const event = buildOutboxEvent(command, updated, invalidationId);
    await this.dependencies.outbox.append(transaction, event);
    const result: FactTransitionResult = {
      fact: updated,
      factVersionId: version.factVersionId,
      invalidationId: parseInvalidation(invalidationId),
      replayed: false,
    };
    await completeCommand(transaction, command, JSON.stringify(result));
    return result;
  }
}

interface ClaimedCommand {
  readonly kind: "claimed";
}
interface ReplayedCommand {
  readonly kind: "replay";
  readonly result: FactTransitionResult;
}

async function claimCommand(
  transaction: TransactionHandle,
  command: TransitionFactStatusCommand,
  clock: Clock,
): Promise<ClaimedCommand | ReplayedCommand> {
  const result = await transaction.query(
    `INSERT INTO evidence_knowledge.command_idempotency (tenant_id, workspace_id, deal_id, actor_id, command_type, target_id, idempotency_key, payload_digest, created_at) VALUES ($1,$2,$3,$4,'fact-status',$5,$6,$7,$8) ON CONFLICT (tenant_id,workspace_id,deal_id,actor_id,command_type,target_id,idempotency_key) DO NOTHING`,
    [
      ...scopeParameters(command.scope),
      command.context.actorId,
      command.factId,
      command.idempotencyKey,
      command.payloadDigest,
      clock.now(),
    ],
  );
  if (result.rowCount === 1) return { kind: "claimed" };
  const existing = await transaction.query<
    {
      payloadDigest: string;
      resultReference: string | null;
      completedAt: Date | null;
    }
  >(
    `SELECT payload_digest AS "payloadDigest", result_reference AS "resultReference", completed_at AS "completedAt" FROM evidence_knowledge.command_idempotency WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND actor_id=$4 AND command_type='fact-status' AND target_id=$5 AND idempotency_key=$6 FOR UPDATE`,
    [
      ...scopeParameters(command.scope),
      command.context.actorId,
      command.factId,
      command.idempotencyKey,
    ],
  );
  const row = existing.rows[0];
  if (row === undefined) {
    throw new Error(
      `Fact command idempotency key "${command.idempotencyKey}" disappeared; expected a durable row.`,
    );
  }
  if (row.payloadDigest !== command.payloadDigest) {
    throw new Error(
      `Fact command idempotency key "${command.idempotencyKey}" payload digest changed; expected the original payload.`,
    );
  }
  if (row.completedAt === null || row.resultReference === null) {
    throw new Error(
      `Fact command idempotency key "${command.idempotencyKey}" is already in progress; expected the first transaction to finish.`,
    );
  }
  return {
    kind: "replay",
    result: {
      ...JSON.parse(row.resultReference) as FactTransitionResult,
      replayed: true,
    },
  };
}

async function lockFact(
  transaction: TransactionHandle,
  scope: EvidenceScope,
  factId: string,
): Promise<Fact> {
  const result = await transaction.query(
    `${factSelectColumns()} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_id=$4 FOR UPDATE`,
    [...scopeParameters(scope), factId],
  );
  if (result.rows[0] === undefined) {
    throw new Error(
      `Fact "${factId}" was not found in the requested scope; expected protected-not-found.`,
    );
  }
  return rowToFact(result.rows[0]);
}

async function loadFactVersion(
  transaction: TransactionHandle,
  scope: EvidenceScope,
  factVersionId: string,
): Promise<FactVersion> {
  const result = await transaction.query(
    `${factVersionSelectColumns()} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_version_id=$4`,
    [...scopeParameters(scope), factVersionId],
  );
  if (result.rows[0] === undefined) {
    throw new Error(
      `Fact version "${factVersionId}" was not found in the requested scope; expected protected-not-found.`,
    );
  }
  const version = rowToFactVersion(result.rows[0]);
  const state = await loadEffectiveFactVersionStatus(
    transaction,
    scope,
    factVersionId,
    version.status,
  );
  return Object.freeze({ ...version, status: state });
}

function assertAggregateTransition(
  from: Fact["status"],
  to: "approved" | "superseded",
): void {
  if (from === "approved" && to === "approved") return;
  assertFactStatusTransition(from, to);
}

function assertVersionBelongsToFact(
  version: FactVersion,
  factId: string,
): void {
  if (version.factId === factId) return;
  throw new Error(
    `Fact version "${version.factVersionId}" belongs to fact "${version.factId}"; expected fact "${factId}".`,
  );
}

async function verifyCitations(
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
    await verifier.verify(command.scope, citation.source);
  }
}

function validateReplacement(
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

async function updateFact(
  transaction: TransactionHandle,
  scope: EvidenceScope,
  fact: Fact,
  target: "approved" | "superseded",
  expectedAggregateVersion: AggregateVersion,
): Promise<Fact> {
  const result = await transaction.query(
    `${factSelectColumns()} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_id=$4 AND aggregate_version=$5`,
    [...scopeParameters(scope), fact.factId, fact.aggregateVersion],
  );
  if (result.rowCount !== 1) {
    throw new Error(
      `Fact "${fact.factId}" changed during command validation; expected aggregate version "${fact.aggregateVersion}".`,
    );
  }
  const updated = await transaction.query(
    `UPDATE evidence_knowledge.facts SET status=$5, aggregate_version=aggregate_version+1 WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_id=$4 AND aggregate_version=$6 RETURNING fact_id AS "factId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", category, status, aggregate_version AS "aggregateVersion", created_at AS "createdAt"`,
    [...scopeParameters(scope), fact.factId, target, expectedAggregateVersion],
  );
  if (updated.rowCount !== 1) {
    throw new Error(
      `Fact "${fact.factId}" update lost optimistic concurrency; expected aggregate version "${fact.aggregateVersion}".`,
    );
  }
  return rowToFact(updated.rows[0]);
}

async function appendHistory(
  transaction: TransactionHandle,
  historyId: string,
  command: TransitionFactStatusCommand,
  fact: Fact,
  version: FactVersion,
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
      new Date(),
    ],
  );
}

async function appendProvenance(
  transaction: TransactionHandle,
  command: TransitionFactStatusCommand,
  version: FactVersion,
  replacement: FactVersion | undefined,
): Promise<void> {
  if (replacement !== undefined) {
    await transaction.query(
      `INSERT INTO evidence_knowledge.provenance_links (provenance_id,tenant_id,workspace_id,deal_id,relation,source_kind,source_id,target_kind,target_id,created_at) VALUES ($1,$2,$3,$4,'supersedes','fact_version',$5,'fact_version',$6,$7)`,
      [
        durableId("provenance"),
        ...scopeParameters(command.scope),
        version.factVersionId,
        replacement.factVersionId,
        new Date(),
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
        new Date(),
      ],
    );
  }
}

async function appendInvalidation(
  transaction: TransactionHandle,
  invalidationId: string,
  command: TransitionFactStatusCommand,
  version: FactVersion,
  eventIdentity: string,
): Promise<void> {
  await transaction.query(
    `INSERT INTO evidence_knowledge.invalidations (invalidation_id,tenant_id,workspace_id,deal_id,source_kind,source_id,reason,event_identity,created_at) VALUES ($1,$2,$3,$4,'fact_version',$5,$6,$7,$8)`,
    [
      invalidationId,
      ...scopeParameters(command.scope),
      version.factVersionId,
      `fact ${command.targetStatus}`,
      eventIdentity,
      new Date(),
    ],
  );
}

function buildOutboxEvent(
  command: TransitionFactStatusCommand,
  fact: Fact,
  invalidationId: string,
): OutboxEvent {
  return {
    eventId: durableId("event"),
    tenantId: command.scope.tenantId,
    workspaceId: command.scope.workspaceId,
    dealId: command.scope.dealId,
    aggregateType: "EvidenceFact",
    aggregateId: command.factId,
    aggregateVersion: fact.aggregateVersion as AggregateVersion,
    eventType: "evidence.fact-status-transitioned",
    schemaVersion: 1,
    payload: {
      invalidationId,
      factVersionId: command.factVersionId,
      status: command.targetStatus,
    },
    correlationId: command.context.correlationId,
    occurredAt: new Date(),
    availableAt: new Date(),
  };
}

async function completeCommand(
  transaction: TransactionHandle,
  command: TransitionFactStatusCommand,
  resultReference: string,
): Promise<void> {
  await transaction.query(
    `INSERT INTO evidence_knowledge.command_idempotency_history (history_id,tenant_id,workspace_id,deal_id,actor_id,command_type,target_id,idempotency_key,payload_digest,result_reference,completed_at) VALUES ($1,$2,$3,$4,$5,'fact-status',$6,$7,$8,$9,$10)`,
    [
      durableId("command-history"),
      ...scopeParameters(command.scope),
      command.context.actorId,
      command.factId,
      command.idempotencyKey,
      command.payloadDigest,
      resultReference,
      new Date(),
    ],
  );
  const result = await transaction.query(
    `UPDATE evidence_knowledge.command_idempotency SET result_reference=$8, completed_at=$9 WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND actor_id=$4 AND command_type='fact-status' AND target_id=$5 AND idempotency_key=$6 AND payload_digest=$7 AND completed_at IS NULL`,
    [
      ...scopeParameters(command.scope),
      command.context.actorId,
      command.factId,
      command.idempotencyKey,
      command.payloadDigest,
      resultReference,
      new Date(),
    ],
  );
  if (result.rowCount === 1) return;
  throw new Error(
    `Fact command idempotency key "${command.idempotencyKey}" could not be completed; expected one pending row.`,
  );
}

function durableId(prefix: string): string {
  const namespace = prefix === "invalidation" ? "invalidation" : "evidence";
  return `${namespace}_${prefix}-${crypto.randomUUID().replaceAll("-", "")}`;
}

function parseInvalidation(value: string) {
  const parsed = parseInvalidationId(value);
  if (parsed.ok) return parsed.value;
  throw new Error(`Invalidation ID "${value}" could not be branded.`);
}
