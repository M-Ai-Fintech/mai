import { assertEquals, assertRejects } from "@std/assert";
import {
  InboxConflictError,
  type InboxMessage,
  InboxRepository,
  sanitizedFailure,
} from "../../../src/platform/events/v1.ts";
import type {
  TransactionHandle,
  TransactionQueryResult,
} from "../../../src/platform/persistence/transaction.ts";
import { parseTenantId } from "../../../src/platform/api/v1.ts";

interface InboxRow {
  readonly payloadDigest: string;
  readonly processingState: "processing" | "processed" | "failed";
  readonly failureReference: string | null;
}

Deno.test("inbox test adapter deduplicates receipts and rejects digest conflicts", async () => {
  const transaction = new DeterministicInboxTestAdapter();
  const repository = new InboxRepository();
  const message = fixtureMessage("a".repeat(64));

  assertEquals(await repository.claim(transaction, message), {
    status: "claimed",
  });
  await repository.complete(transaction, message, message.receivedAt);
  assertEquals(await repository.claim(transaction, message), {
    status: "duplicate",
    state: "processed",
  });
  await assertRejects(
    () =>
      repository.claim(transaction, {
        ...message,
        payloadDigest: "b".repeat(64),
      }),
    InboxConflictError,
    "INBOX_CONFLICT",
  );
});

Deno.test("inbox test adapter preserves sanitized failure evidence for retry", async () => {
  const transaction = new DeterministicInboxTestAdapter();
  const repository = new InboxRepository();
  const message = fixtureMessage("c".repeat(64));

  await repository.claim(transaction, message);
  await repository.fail(
    transaction,
    message,
    sanitizedFailure("CONSUMER_FAILED"),
  );
  assertEquals(
    await repository.claim(transaction, {
      ...message,
      receivedAt: new Date("2026-08-01T12:01:00.000Z"),
    }),
    { status: "retry", previousFailure: "CONSUMER_FAILED" },
  );
});

function fixtureMessage(payloadDigest: string): InboxMessage {
  const tenant = parseTenantId("tenant_fixture");
  if (!tenant.ok) throw new Error("Inbox fixture tenant is invalid.");
  return {
    tenantId: tenant.value,
    sourceIdentity: "source_fixture",
    messageIdentity: "message_fixture",
    payloadDigest,
    receivedAt: new Date("2026-08-01T12:00:00.000Z"),
  };
}

class DeterministicInboxTestAdapter implements TransactionHandle {
  readonly metadata: Readonly<Record<string, string>> = {};
  private row: InboxRow | undefined;

  query<TRow = Record<string, unknown>>(
    text: string,
    parameters: readonly unknown[] = [],
  ): Promise<TransactionQueryResult<TRow>> {
    if (text.startsWith("INSERT INTO")) {
      return Promise.resolve(this.insert(parameters));
    }
    if (text.startsWith("SELECT payload_digest")) {
      return Promise.resolve(
        this.lock() as unknown as TransactionQueryResult<TRow>,
      );
    }
    if (text.includes("processing_state = 'processed'")) {
      return Promise.resolve(this.process());
    }
    if (text.includes("processing_state = 'failed'")) {
      return Promise.resolve(this.fail(parameters));
    }
    return Promise.resolve(
      this.redeliver() as unknown as TransactionQueryResult<TRow>,
    );
  }

  private insert(
    parameters: readonly unknown[],
  ): TransactionQueryResult<never> {
    if (this.row !== undefined) return { rows: [], rowCount: 0 };
    this.row = {
      payloadDigest: String(parameters[3]),
      processingState: "processing",
      failureReference: null,
    };
    return { rows: [], rowCount: 1 };
  }

  private lock(): TransactionQueryResult<InboxRow> {
    return {
      rows: this.row === undefined ? [] : [this.row],
      rowCount: this.row === undefined ? 0 : 1,
    };
  }

  private process(): TransactionQueryResult<never> {
    const row = this.requireRow();
    this.row = { ...row, processingState: "processed" };
    return { rows: [], rowCount: 1 };
  }

  private fail(parameters: readonly unknown[]): TransactionQueryResult<never> {
    const row = this.requireRow();
    this.row = {
      ...row,
      processingState: "failed",
      failureReference: String(parameters[4]),
    };
    return { rows: [], rowCount: 1 };
  }

  private redeliver(): TransactionQueryResult<never> {
    const row = this.requireRow();
    this.row = { ...row, processingState: "processing" };
    return { rows: [], rowCount: 1 };
  }

  private requireRow(): InboxRow {
    if (this.row !== undefined) return this.row;
    throw new Error(
      "Inbox test adapter has no fixture row; expected a claimed message.",
    );
  }
}
