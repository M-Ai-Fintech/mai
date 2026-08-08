import type { ActorId, IdempotencyKey } from "../platform/api/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { NegotiationRound } from "./model.ts";
import { freezeRound, NegotiationError } from "./model.ts";
import type { NegotiationScope } from "./ids.ts";

export interface NegotiationCommandIdentity extends NegotiationScope {
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetId: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly payloadDigest: string;
  readonly recordedAt: string;
}

export interface NegotiationEvidenceRecord {
  readonly evidenceId: string;
  readonly scope: NegotiationScope;
  readonly roundId: string;
  readonly evidenceType: string;
  readonly subjectId: string;
  readonly subjectVersion: AggregateVersion;
  readonly document: Readonly<Record<string, unknown>>;
  readonly recordedAt: string;
}

export interface NegotiationTransaction {
  readonly kind: "in_memory" | "postgres";
  readonly handle?: TransactionHandle;
  findRound(
    scope: NegotiationScope,
    roundId: string,
  ): Promise<NegotiationRound | undefined>;
  insertRound(round: NegotiationRound): Promise<void>;
  replaceRound(
    round: NegotiationRound,
    expectedVersion: AggregateVersion,
  ): Promise<void>;
  appendEvidence?(record: NegotiationEvidenceRecord): Promise<void>;
}

export interface NegotiationUnitOfWorkResult {
  readonly round: NegotiationRound;
  readonly replayed: boolean;
}

export interface NegotiationUnitOfWork {
  read<TResult>(
    operation: (transaction: NegotiationTransaction) => Promise<TResult>,
  ): Promise<TResult>;
  run(
    identity: NegotiationCommandIdentity,
    operation: (
      transaction: NegotiationTransaction,
    ) => Promise<NegotiationRound>,
  ): Promise<NegotiationUnitOfWorkResult>;
}

export class InMemoryNegotiationUnitOfWork implements NegotiationUnitOfWork {
  private readonly rounds = new Map<string, NegotiationRound>();
  private readonly claims = new Map<string, InMemoryClaim>();
  readonly evidence: NegotiationEvidenceRecord[] = [];
  private readonly transaction = new InMemoryNegotiationTransaction(
    this.rounds,
    this.evidence,
  );

  read<TResult>(
    operation: (transaction: NegotiationTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return operation(this.transaction);
  }

  async run(
    identity: NegotiationCommandIdentity,
    operation: (
      transaction: NegotiationTransaction,
    ) => Promise<NegotiationRound>,
  ): Promise<NegotiationUnitOfWorkResult> {
    const key = commandKey(identity);
    const existing = this.claims.get(key);
    if (existing !== undefined) return replayClaim(existing, identity);
    this.claims.set(key, { payloadDigest: identity.payloadDigest });
    const snapshot = new Map(this.rounds);
    const evidenceLength = this.evidence.length;
    try {
      const round = await operation(this.transaction);
      const frozen = freezeRound(round);
      this.claims.set(key, {
        payloadDigest: identity.payloadDigest,
        round: frozen,
      });
      return { round: frozen, replayed: false };
    } catch (error) {
      this.rounds.clear();
      for (const [roundKey, round] of snapshot) {
        this.rounds.set(roundKey, round);
      }
      this.evidence.splice(evidenceLength);
      this.claims.delete(key);
      throw error;
    }
  }
}

interface InMemoryClaim {
  readonly payloadDigest: string;
  readonly round?: NegotiationRound;
}

class InMemoryNegotiationTransaction implements NegotiationTransaction {
  readonly kind = "in_memory" as const;

  constructor(
    private readonly rounds: Map<string, NegotiationRound>,
    private readonly evidence: NegotiationEvidenceRecord[],
  ) {}

  findRound(
    scope: NegotiationScope,
    roundId: string,
  ): Promise<NegotiationRound | undefined> {
    return Promise.resolve(this.rounds.get(roundKey(scope, roundId)));
  }

  async insertRound(round: NegotiationRound): Promise<void> {
    const key = roundKey(round.scope, round.roundId);
    if (this.rounds.has(key)) {
      throw new NegotiationError(
        "IDEMPOTENCY_CONFLICT",
        `Negotiation round "${round.roundId}" already exists; expected one creation command.`,
      );
    }
    this.rounds.set(key, freezeRound(round));
    await this.appendEvidence(evidenceFromRound(round));
  }

  async replaceRound(
    round: NegotiationRound,
    expectedVersion: AggregateVersion,
  ): Promise<void> {
    const key = roundKey(round.scope, round.roundId);
    const current = this.rounds.get(key);
    if (current === undefined) throw protectedRoundNotFound(round.roundId);
    if (current.version !== expectedVersion) {
      throw new NegotiationError(
        "STALE_VERSION",
        `Negotiation round "${round.roundId}" version "${expectedVersion}" is stale; expected current version "${current.version}".`,
      );
    }
    this.rounds.set(key, freezeRound(round));
    await this.appendEvidence(evidenceFromRound(round));
  }

  appendEvidence(record: NegotiationEvidenceRecord): Promise<void> {
    if (!this.evidence.some((item) => item.evidenceId === record.evidenceId)) {
      this.evidence.push(Object.freeze({
        ...record,
        scope: Object.freeze({ ...record.scope }),
        document: Object.freeze({ ...record.document }),
      }));
    }
    return Promise.resolve();
  }
}

function replayClaim(
  claim: InMemoryClaim,
  identity: NegotiationCommandIdentity,
): NegotiationUnitOfWorkResult {
  if (claim.payloadDigest !== identity.payloadDigest) {
    throw new NegotiationError(
      "IDEMPOTENCY_CONFLICT",
      `IDEMPOTENCY_CONFLICT: Negotiation idempotency key "${identity.idempotencyKey}" was reused with a different payload.`,
    );
  }
  if (claim.round === undefined) {
    throw new NegotiationError(
      "IDEMPOTENCY_IN_PROGRESS",
      `Negotiation idempotency key "${identity.idempotencyKey}" is still in progress; expected one command executor.`,
    );
  }
  return { round: claim.round, replayed: true };
}

export function commandKey(identity: NegotiationCommandIdentity): string {
  // An idempotency key is one caller command token, not one token per
  // command-type/target tuple. The payload digest still binds the exact
  // command and scope, so cross-command or cross-scope reuse conflicts.
  return [identity.actorId, identity.idempotencyKey].join("|");
}

export function roundKey(scope: NegotiationScope, roundId: string): string {
  return `${scope.tenantId}|${scope.workspaceId}|${scope.dealId}|${roundId}`;
}

export function evidenceFromRound(
  round: NegotiationRound,
): NegotiationEvidenceRecord {
  const event = round.history.at(-1);
  if (event === undefined) {
    return {
      evidenceId: `negotiation_evidence_${round.roundId}_${round.version}`,
      scope: round.scope,
      roundId: round.roundId,
      evidenceType: "negotiation_round_snapshot",
      subjectId: round.roundId,
      subjectVersion: round.version,
      document: { round },
      recordedAt: round.updatedAt,
    };
  }
  return {
    evidenceId: event.eventId,
    scope: round.scope,
    roundId: round.roundId,
    evidenceType: event.eventType,
    subjectId: event.aggregateId,
    subjectVersion: round.version,
    document: { round, event },
    recordedAt: event.occurredAt,
  };
}

export function protectedRoundNotFound(roundId: string): NegotiationError {
  return new NegotiationError(
    "PROTECTED_NOT_FOUND",
    `Negotiation round "${roundId}" was not found; expected an authorized round in the requested scope.`,
  );
}
