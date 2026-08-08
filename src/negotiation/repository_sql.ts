import {
  type IdempotencyClaim,
  IdempotencyRepository,
  type PostgresTransactionRunner,
} from "../platform/persistence/v1.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { NegotiationScope } from "./ids.ts";
import {
  freezeRound,
  NegotiationError,
  type NegotiationRound,
} from "./model.ts";
import {
  commandKey,
  evidenceFromRound,
  type NegotiationCommandIdentity,
  type NegotiationEvidenceRecord,
  type NegotiationTransaction,
  type NegotiationUnitOfWork,
  type NegotiationUnitOfWorkResult,
} from "./repository.ts";

export class PostgresNegotiationTransaction implements NegotiationTransaction {
  readonly kind = "postgres" as const;

  constructor(readonly handle: TransactionHandle) {}

  async findRound(
    scope: NegotiationScope,
    roundId: string,
  ): Promise<NegotiationRound | undefined> {
    const result = await this.handle.query<NegotiationRoundRow>(
      `SELECT document FROM negotiation.rounds
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND round_id = $4`,
      [scope.tenantId, scope.workspaceId, scope.dealId, roundId],
    );
    const document = result.rows[0]?.document;
    return document === undefined ? undefined : freezeRound(document);
  }

  async insertRound(round: NegotiationRound): Promise<void> {
    await this.handle.query(
      `INSERT INTO negotiation.rounds (
         round_id, negotiation_id, tenant_id, workspace_id, deal_id,
         version, status, document, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        round.roundId,
        round.negotiationId,
        round.scope.tenantId,
        round.scope.workspaceId,
        round.scope.dealId,
        round.version,
        round.status,
        JSON.stringify(round),
        round.createdAt,
        round.updatedAt,
      ],
    );
    await this.appendEvidence(evidenceFromRound(round));
  }

  async replaceRound(
    round: NegotiationRound,
    expectedVersion: AggregateVersion,
  ): Promise<void> {
    const result = await this.handle.query(
      `UPDATE negotiation.rounds
       SET version = $5, status = $6, document = $7, updated_at = $8
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND round_id = $4 AND version = $9`,
      [
        round.scope.tenantId,
        round.scope.workspaceId,
        round.scope.dealId,
        round.roundId,
        round.version,
        round.status,
        JSON.stringify(round),
        round.updatedAt,
        expectedVersion,
      ],
    );
    if (result.rowCount === 1) {
      await this.appendEvidence(evidenceFromRound(round));
      return;
    }
    throw new NegotiationError(
      "STALE_VERSION",
      `Negotiation round "${round.roundId}" version "${expectedVersion}" is stale; expected one exact PostgreSQL aggregate update.`,
    );
  }

  async appendEvidence(record: NegotiationEvidenceRecord): Promise<void> {
    await this.handle.query(
      `INSERT INTO negotiation.evidence_events (
         evidence_id, tenant_id, workspace_id, deal_id, round_id,
         evidence_type, subject_id, subject_version, document, recorded_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      [
        record.evidenceId,
        record.scope.tenantId,
        record.scope.workspaceId,
        record.scope.dealId,
        record.roundId,
        record.evidenceType,
        record.subjectId,
        record.subjectVersion,
        JSON.stringify(record.document),
        record.recordedAt,
      ],
    );
  }
}

interface NegotiationRoundRow {
  readonly document: NegotiationRound;
}

export class PostgresNegotiationUnitOfWork implements NegotiationUnitOfWork {
  private readonly idempotency: IdempotencyRepository;

  constructor(
    private readonly transactions: PostgresTransactionRunner,
    clock: { now(): Date },
  ) {
    this.idempotency = new IdempotencyRepository(clock);
  }

  read<TResult>(
    operation: (transaction: NegotiationTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return this.transactions.run((handle) =>
      operation(new PostgresNegotiationTransaction(handle))
    );
  }

  run(
    identity: NegotiationCommandIdentity,
    operation: (
      transaction: NegotiationTransaction,
    ) => Promise<NegotiationRound>,
  ): Promise<NegotiationUnitOfWorkResult> {
    return this.transactions.run(async (handle) => {
      const transaction = new PostgresNegotiationTransaction(handle);
      const claim = postgresClaim(identity);
      const existing = await existingCommandResult(handle, identity);
      if (existing !== undefined) {
        if (existing.payloadDigest !== identity.payloadDigest) {
          throw new NegotiationError(
            "IDEMPOTENCY_CONFLICT",
            `IDEMPOTENCY_CONFLICT: Negotiation idempotency key "${identity.idempotencyKey}" was reused across commands or scopes with a different payload.`,
          );
        }
        return { round: freezeRound(existing.result), replayed: true };
      }
      const status = await this.idempotency.claim(handle, claim);
      if (status.status === "replay") return this.replay(transaction, identity);
      if (status.status !== "claimed") {
        throw new NegotiationError(
          "IDEMPOTENCY_IN_PROGRESS",
          `Negotiation idempotency key "${identity.idempotencyKey}" is "${status.status}"; expected one command executor.`,
        );
      }
      const round = freezeRound(await operation(transaction));
      await saveCommandResult(handle, identity, round);
      await this.idempotency.complete(handle, claim, resultReference(identity));
      return { round, replayed: false };
    });
  }

  private async replay(
    transaction: PostgresNegotiationTransaction,
    identity: NegotiationCommandIdentity,
  ): Promise<NegotiationUnitOfWorkResult> {
    const result = await transaction.handle.query<NegotiationResultRow>(
      `SELECT result FROM negotiation.command_results WHERE command_key = $1`,
      [commandKey(identity)],
    );
    const round = result.rows[0]?.result;
    if (round === undefined) {
      throw new NegotiationError(
        "IDEMPOTENCY_CONFLICT",
        `Negotiation command result for idempotency key "${identity.idempotencyKey}" is missing; expected durable replay state.`,
      );
    }
    return { round: freezeRound(round), replayed: true };
  }
}

interface NegotiationResultRow {
  readonly commandKey: string;
  readonly payloadDigest: string;
  readonly result: NegotiationRound;
}

async function existingCommandResult(
  transaction: TransactionHandle,
  identity: NegotiationCommandIdentity,
): Promise<NegotiationResultRow | undefined> {
  const result = await transaction.query<NegotiationResultRow>(
    `SELECT command_key AS "commandKey",
            payload_digest AS "payloadDigest",
            result
     FROM negotiation.command_results
     WHERE command_key = $1
        OR (actor_id = $2 AND idempotency_key = $3)
     ORDER BY command_key`,
    [
      commandKey(identity),
      identity.actorId,
      identity.idempotencyKey,
    ],
  );
  if (result.rows.length > 1) {
    throw new NegotiationError(
      "IDEMPOTENCY_CONFLICT",
      `IDEMPOTENCY_CONFLICT: Negotiation idempotency key "${identity.idempotencyKey}" has multiple durable command results; expected one logical result.`,
    );
  }
  return result.rows[0];
}

function postgresClaim(identity: NegotiationCommandIdentity): IdempotencyClaim {
  return {
    tenantId: identity.tenantId,
    actorId: identity.actorId,
    commandType: "negotiation_command",
    targetType: "negotiation_idempotency",
    targetId: identity.actorId,
    idempotencyKey: identity.idempotencyKey,
    payloadDigest: identity.payloadDigest,
    expiresAt: new Date(Date.parse(identity.recordedAt) + 86_400_000),
  };
}

async function saveCommandResult(
  transaction: TransactionHandle,
  identity: NegotiationCommandIdentity,
  round: NegotiationRound,
): Promise<void> {
  await transaction.query(
    `INSERT INTO negotiation.command_results (
       command_key, tenant_id, workspace_id, deal_id, actor_id,
       command_type, idempotency_key, payload_digest, result, recorded_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      commandKey(identity),
      identity.tenantId,
      identity.workspaceId,
      identity.dealId,
      identity.actorId,
      identity.commandType,
      identity.idempotencyKey,
      identity.payloadDigest,
      JSON.stringify(round),
      identity.recordedAt,
    ],
  );
}

function resultReference(identity: NegotiationCommandIdentity): string {
  return `negotiation_result_${identity.idempotencyKey}`;
}
