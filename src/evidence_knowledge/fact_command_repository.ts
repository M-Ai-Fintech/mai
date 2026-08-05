import type { OutboxRepository } from "../platform/events/v1.ts";
import type {
  Clock,
  PostgresTransactionRunner,
  TransactionHandle,
} from "../platform/persistence/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import { VersionConflictError } from "../platform/persistence/concurrency.ts";
import type {
  AllowedFactCommandAuthorization,
  FactTransitionResult,
  FactTransitionStore,
  TransitionFactStatusCommand,
} from "./fact_commands.ts";
import type { ExactDocumentVersionVerificationPort } from "./document_version_verification.ts";
import { assertFactStatusTransition } from "./fact.ts";
import type { EvidenceScope, Fact, FactVersion } from "./model.ts";
import {
  factSelectColumns,
  factVersionSelectColumns,
  scopeParameters,
} from "./repository_sql.ts";
import { rowToFact, rowToFactVersion } from "./repository_rows.ts";
import { EvidenceKnowledgeRepository } from "./repository.ts";
import { loadEffectiveFactVersionStatus } from "./fact_version_status.ts";
import { appendFactTransitionAudit } from "./fact_command_audit.ts";
import {
  appendHistory,
  appendInvalidation,
  appendProvenance,
  buildOutboxEvent,
  durableId,
  parseInvalidation,
  validateReplacement,
  verifyCitations,
} from "./fact_command_helpers.ts";

export interface FactCommandRepositoryDependencies {
  readonly transactions: PostgresTransactionRunner;
  readonly evidence: EvidenceKnowledgeRepository;
  readonly verifier: ExactDocumentVersionVerificationPort;
  readonly outbox: OutboxRepository;
  readonly clock: Clock;
  readonly onFactLockAcquired?: (
    command: TransitionFactStatusCommand,
  ) => Promise<void>;
  readonly onTransactionStarted?: (
    command: TransitionFactStatusCommand,
    pid: number,
  ) => Promise<void>;
  readonly appendAudit?: typeof appendFactTransitionAudit;
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
    auth: AllowedFactCommandAuthorization,
  ): Promise<FactTransitionResult> {
    return this.dependencies.transactions.run((transaction) =>
      this.transitionInTransaction(transaction, command, auth)
    );
  }

  private async transitionInTransaction(
    transaction: TransactionHandle,
    command: TransitionFactStatusCommand,
    auth: AllowedFactCommandAuthorization,
  ): Promise<FactTransitionResult> {
    if (this.dependencies.onTransactionStarted) {
      const pidRes = await transaction.query<{ pid: number }>(
        "SELECT pg_backend_pid() AS pid",
      );
      if (pidRes.rows[0]?.pid) {
        await this.dependencies.onTransactionStarted(
          command,
          pidRes.rows[0].pid,
        );
      }
    }
    const occurredAt = this.dependencies.clock.now();
    const existing = await claimCommand(
      transaction,
      command,
      occurredAt,
    );
    if (existing.kind === "replay") return existing.result;

    const fact = await lockFact(transaction, command.scope, command.factId);
    if (this.dependencies.onFactLockAcquired) {
      await this.dependencies.onFactLockAcquired(command);
    }
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
    if (command.targetStatus === "superseded") {
      if (version.status !== "approved") {
        throw new Error(
          `Fact version "${version.factVersionId}" has status "${version.status}"; expected approved before supersession.`,
        );
      }
      if (fact.currentFactVersionId !== version.factVersionId) {
        throw new Error(
          `Fact version "${version.factVersionId}" is not current; expected current fact version "${fact.currentFactVersionId}" for supersession.`,
        );
      }
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

    const newCurrentVersionId = command.targetStatus === "superseded"
      ? replacement!.factVersionId
      : (fact.currentFactVersionId ?? version.factVersionId);

    const updated = await updateFact(
      transaction,
      command.scope,
      fact,
      newCurrentVersionId,
      command.expectedAggregateVersion,
    );

    const historyId = durableId("history");
    await appendHistory(
      transaction,
      historyId,
      command,
      fact,
      version,
      occurredAt,
    );
    await appendProvenance(
      transaction,
      command,
      version,
      replacement,
      occurredAt,
    );

    const invalidationId = durableId("invalidation");
    await appendInvalidation(
      transaction,
      invalidationId,
      command,
      version,
      historyId,
      occurredAt,
    );

    const appendAudit = this.dependencies.appendAudit ??
      appendFactTransitionAudit;
    await appendAudit(
      transaction,
      command,
      auth,
      fact,
      updated,
      version,
      replacement,
      occurredAt,
    );

    const event = buildOutboxEvent(
      command,
      fact,
      updated,
      version,
      replacement,
      invalidationId,
      occurredAt,
    );
    await this.dependencies.outbox.append(transaction, event);

    const result: FactTransitionResult = {
      fact: updated,
      factVersionId: version.factVersionId,
      invalidationId: parseInvalidation(invalidationId),
      replayed: false,
    };
    await completeCommand(
      transaction,
      command,
      JSON.stringify(result),
      occurredAt,
    );
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
  occurredAt: Date,
): Promise<ClaimedCommand | ReplayedCommand> {
  const result = await transaction.query(
    `INSERT INTO evidence_knowledge.command_idempotency (tenant_id, workspace_id, deal_id, actor_id, command_type, target_id, idempotency_key, payload_digest, created_at) VALUES ($1,$2,$3,$4,'fact-status',$5,$6,$7,$8) ON CONFLICT (tenant_id,workspace_id,deal_id,actor_id,command_type,target_id,idempotency_key) DO NOTHING`,
    [
      ...scopeParameters(command.scope),
      command.context.actorId,
      command.factId,
      command.idempotencyKey,
      command.payloadDigest,
      occurredAt,
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

async function updateFact(
  transaction: TransactionHandle,
  scope: EvidenceScope,
  fact: Fact,
  currentFactVersionId: string,
  expectedAggregateVersion: AggregateVersion,
): Promise<Fact> {
  const updated = await transaction.query(
    `UPDATE evidence_knowledge.facts SET status='approved', current_fact_version_id=$5, aggregate_version=aggregate_version+1 WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_id=$4 AND aggregate_version=$6 RETURNING fact_id AS "factId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", category, status, current_fact_version_id AS "currentFactVersionId", aggregate_version AS "aggregateVersion", created_at AS "createdAt"`,
    [
      ...scopeParameters(scope),
      fact.factId,
      currentFactVersionId,
      expectedAggregateVersion,
    ],
  );
  if (updated.rowCount !== 1) {
    throw new VersionConflictError(
      "VERSION_CONFLICT",
      fact.factId,
      expectedAggregateVersion,
    );
  }
  return rowToFact(updated.rows[0]);
}

async function completeCommand(
  transaction: TransactionHandle,
  command: TransitionFactStatusCommand,
  resultReference: string,
  occurredAt: Date,
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
      occurredAt,
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
      occurredAt,
    ],
  );
  if (result.rowCount === 1) return;
  throw new Error(
    `Fact command idempotency key "${command.idempotencyKey}" could not be completed; expected one pending row.`,
  );
}
