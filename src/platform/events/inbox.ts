import { TenantId } from "../../shared/contracts/identifiers.ts";
import { TransactionHandle } from "../persistence/transaction.ts";
import { SanitizedFailure } from "./dispatcher.ts";

export interface InboxMessage {
  readonly tenantId: TenantId;
  readonly sourceIdentity: string;
  readonly messageIdentity: string;
  readonly payloadDigest: string;
  readonly receivedAt: Date;
}

export type InboxClaimResult =
  | { readonly status: "claimed" }
  | {
    readonly status: "duplicate";
    readonly state: "processing" | "processed";
  }
  | {
    readonly status: "retry";
    readonly previousFailure: string | undefined;
  };

interface InboxRow {
  readonly payloadDigest: string;
  readonly processingState: "processing" | "processed" | "failed";
  readonly failureReference: string | null;
}

export class InboxConflictError extends Error {
  readonly code = "INBOX_CONFLICT";

  constructor(message: InboxMessage) {
    super(
      `INBOX_CONFLICT: source "${message.sourceIdentity}" message "${message.messageIdentity}" changed digest; expected the original payload.`,
    );
    this.name = "InboxConflictError";
  }
}

export class InboxRepository {
  /**
   * Claims a provider message or returns duplicate/retry evidence.
   *
   * @example await repository.claim(transaction, message)
   */
  async claim(
    transaction: TransactionHandle,
    message: InboxMessage,
  ): Promise<InboxClaimResult> {
    assertInboxMessage(message);
    const inserted = await insertInboxMessage(transaction, message);
    if (inserted.rowCount === 1) return { status: "claimed" };
    const existing = await lockInboxMessage(transaction, message);
    assertMatchingDigest(existing, message);
    if (existing.processingState === "failed") {
      return await retryFailedMessage(transaction, message, existing);
    }
    return await recordDuplicate(
      transaction,
      message,
      existing.processingState,
    );
  }

  /**
   * Marks the claimed message processed inside the effect transaction.
   *
   * @example await repository.complete(transaction, message, processedAt)
   */
  async complete(
    transaction: TransactionHandle,
    message: InboxMessage,
    processedAt: Date,
  ): Promise<void> {
    const result = await transaction.query(
      `UPDATE platform.inbox
       SET processing_state = 'processed', processed_at = $5
       WHERE tenant_id = $1 AND source_identity = $2
         AND message_identity = $3 AND payload_digest = $4
         AND processing_state = 'processing'`,
      [...messageIdentity(message), message.payloadDigest, processedAt],
    );
    assertInboxUpdate(result.rowCount, message, "complete");
  }

  /**
   * Stores only a sanitized failure reference while retaining receipt evidence.
   *
   * @example await repository.fail(transaction, message, failure)
   */
  async fail(
    transaction: TransactionHandle,
    message: InboxMessage,
    failure: SanitizedFailure,
  ): Promise<void> {
    const result = await transaction.query(
      `UPDATE platform.inbox
       SET processing_state = 'failed', sanitized_failure_reference = $5
       WHERE tenant_id = $1 AND source_identity = $2
         AND message_identity = $3 AND payload_digest = $4
         AND processing_state = 'processing'`,
      [...messageIdentity(message), message.payloadDigest, failure],
    );
    assertInboxUpdate(result.rowCount, message, "fail");
  }
}

function insertInboxMessage(
  transaction: TransactionHandle,
  message: InboxMessage,
) {
  return transaction.query(
    `INSERT INTO platform.inbox (
       tenant_id, source_identity, message_identity, payload_digest,
       received_at, last_received_at, processing_state
     ) VALUES ($1, $2, $3, $4, $5, $5, 'processing')
     ON CONFLICT (tenant_id, source_identity, message_identity) DO NOTHING`,
    [...messageIdentity(message), message.payloadDigest, message.receivedAt],
  );
}

async function lockInboxMessage(
  transaction: TransactionHandle,
  message: InboxMessage,
): Promise<InboxRow> {
  const result = await transaction.query<InboxRow>(
    `SELECT payload_digest AS "payloadDigest",
       processing_state AS "processingState",
       sanitized_failure_reference AS "failureReference"
     FROM platform.inbox
     WHERE tenant_id = $1 AND source_identity = $2 AND message_identity = $3
     FOR UPDATE`,
    messageIdentity(message),
  );
  if (result.rows[0] !== undefined) return result.rows[0];
  throw new Error(
    `Inbox message "${message.messageIdentity}" disappeared; expected a conflicting durable receipt.`,
  );
}

function assertMatchingDigest(row: InboxRow, message: InboxMessage): void {
  if (row.payloadDigest === message.payloadDigest) return;
  throw new InboxConflictError(message);
}

async function retryFailedMessage(
  transaction: TransactionHandle,
  message: InboxMessage,
  row: InboxRow,
): Promise<InboxClaimResult> {
  await updateDeliveryEvidence(transaction, message, "processing");
  return {
    status: "retry",
    previousFailure: row.failureReference ?? undefined,
  };
}

async function recordDuplicate(
  transaction: TransactionHandle,
  message: InboxMessage,
  state: "processing" | "processed",
): Promise<InboxClaimResult> {
  await updateDeliveryEvidence(transaction, message, state);
  return { status: "duplicate", state };
}

function updateDeliveryEvidence(
  transaction: TransactionHandle,
  message: InboxMessage,
  state: "processing" | "processed",
): Promise<unknown> {
  return transaction.query(
    `UPDATE platform.inbox
     SET delivery_count = delivery_count + 1, last_received_at = $4,
         processing_state = $5
     WHERE tenant_id = $1 AND source_identity = $2 AND message_identity = $3`,
    [...messageIdentity(message), message.receivedAt, state],
  );
}

function messageIdentity(message: InboxMessage): unknown[] {
  return [message.tenantId, message.sourceIdentity, message.messageIdentity];
}

function assertInboxMessage(message: InboxMessage): void {
  assertInboxText(message.sourceIdentity, "source identity");
  assertInboxText(message.messageIdentity, "message identity");
  if (/^[0-9a-f]{64}$/.test(message.payloadDigest)) return;
  throw new Error(
    `Inbox digest "${message.payloadDigest}" is invalid; expected 64 lowercase hexadecimal characters.`,
  );
}

function assertInboxText(value: string, label: string): void {
  if (value.trim() && value.length <= 128) return;
  throw new Error(
    `Inbox ${label} "${value}" is invalid; expected 1-128 characters.`,
  );
}

function assertInboxUpdate(
  rowCount: number | null,
  message: InboxMessage,
  action: string,
): void {
  if (rowCount === 1) return;
  throw new Error(
    `Inbox message "${message.messageIdentity}" could not ${action}; expected one processing row.`,
  );
}
