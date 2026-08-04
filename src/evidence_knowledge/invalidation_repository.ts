import type { EvidenceInvalidationEvent } from "./events.ts";
import { eventSourceId, eventSourceKind } from "./events.ts";
import type {
  InvalidationAcquisition,
  InvalidationFailure,
  InvalidationReceiptPort,
} from "./invalidation.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type {
  Clock,
  PostgresTransactionRunner,
} from "../platform/persistence/v1.ts";

export class PostgresInvalidationReceiptRepository
  implements InvalidationReceiptPort {
  constructor(
    private readonly transactions: PostgresTransactionRunner,
    private readonly clock: Clock,
    private readonly leaseMilliseconds = 30_000,
  ) {}

  acquire(event: EvidenceInvalidationEvent): Promise<InvalidationAcquisition> {
    return this.transactions.run((transaction) =>
      this.acquireInTransaction(transaction, event)
    );
  }

  async complete(eventId: string, ownerToken: string): Promise<void> {
    const now = this.clock.now();
    await this.transactions.run(async (transaction) => {
      const result = await transaction.query(
        `UPDATE evidence_knowledge.invalidation_receipts SET state='completed', owner_token=NULL, lease_expires_at=NULL, completed_at=$4 WHERE event_id=$1 AND state='processing' AND owner_token=$2 AND lease_expires_at>$3`,
        [eventId, ownerToken, now, now],
      );
      if (result.rowCount === 1) return;
      throw new Error(
        `Invalidation receipt "${eventId}" owner is stale; expected an active lease.`,
      );
    });
  }

  async releaseAfterFailure(
    eventId: string,
    ownerToken: string,
    failure: InvalidationFailure,
  ): Promise<void> {
    const now = this.clock.now();
    await this.transactions.run(async (transaction) => {
      const result = await transaction.query(
        `UPDATE evidence_knowledge.invalidation_receipts SET state='pending', owner_token=NULL, lease_expires_at=NULL, last_failure=$4 WHERE event_id=$1 AND state='processing' AND owner_token=$2 AND lease_expires_at>$3`,
        [eventId, ownerToken, now, `${failure.code}: ${failure.message}`],
      );
      if (result.rowCount === 1) return;
      throw new Error(
        `Invalidation receipt "${eventId}" owner is stale; expected an active lease.`,
      );
    });
  }

  private async acquireInTransaction(
    transaction: TransactionHandle,
    event: EvidenceInvalidationEvent,
  ): Promise<InvalidationAcquisition> {
    const now = this.clock.now();
    const ownerToken = crypto.randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + this.leaseMilliseconds);
    const inserted = await transaction.query(
      `INSERT INTO evidence_knowledge.invalidation_receipts (event_id, tenant_id, workspace_id, deal_id, source_kind, source_id, state, owner_token, lease_expires_at, attempt_count, created_at) VALUES ($1,$2,$3,$4,$5,$6,'processing',$7,$8,1,$9) ON CONFLICT (event_id) DO NOTHING`,
      [
        event.eventId,
        event.scope.tenantId,
        event.scope.workspaceId,
        event.scope.dealId,
        eventSourceKind(event),
        eventSourceId(event),
        ownerToken,
        leaseExpiresAt,
        now,
      ],
    );
    if (inserted.rowCount === 1) return { kind: "acquired", ownerToken };
    const result = await transaction.query<{
      state: "processing" | "pending" | "completed";
      ownerToken: string | null;
      leaseExpiresAt: Date | null;
    }>(
      `SELECT state, owner_token AS "ownerToken", lease_expires_at AS "leaseExpiresAt" FROM evidence_knowledge.invalidation_receipts WHERE event_id=$1 FOR UPDATE`,
      [event.eventId],
    );
    const receipt = result.rows[0];
    if (receipt?.state === "completed") return { kind: "completed" };
    if (
      receipt?.state === "processing" &&
      receipt.leaseExpiresAt !== null && receipt.leaseExpiresAt > now
    ) return { kind: "busy" };
    const updated = await transaction.query(
      `UPDATE evidence_knowledge.invalidation_receipts SET state='processing', owner_token=$2, lease_expires_at=$3, attempt_count=attempt_count+1, last_failure=NULL WHERE event_id=$1 AND state<>'completed' RETURNING event_id`,
      [event.eventId, ownerToken, leaseExpiresAt],
    );
    if (updated.rowCount !== 1) return { kind: "completed" };
    return { kind: "acquired", ownerToken };
  }
}
