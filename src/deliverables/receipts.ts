import type { DeliveryReceipt, ReleasePurpose } from "./model.ts";

export type ReceiptOutcome =
  | {
    readonly state: "retry_scheduled";
    readonly failureCode: string;
    readonly nextAttemptAt?: Date;
  }
  | { readonly state: "sent" }
  | { readonly state: "delivered" }
  | { readonly state: "failed"; readonly failureCode: string }
  | { readonly state: "revoked" }
  | { readonly state: "expired" };

export function transitionReceipt(
  receipt: DeliveryReceipt,
  outcome: ReceiptOutcome,
): DeliveryReceipt {
  assertReceiptTransition(receipt.state, outcome.state);
  if (outcome.state === "retry_scheduled" || outcome.state === "failed") {
    assertFailureCode(outcome.failureCode);
  }
  return Object.freeze({
    ...receipt,
    state: outcome.state,
    attemptCount: receipt.attemptCount +
      (outcome.state === "retry_scheduled" ? 1 : 0),
    ...(outcome.state === "retry_scheduled" || outcome.state === "failed"
      ? { failureCode: outcome.failureCode }
      : {}),
    ...(outcome.state === "retry_scheduled" &&
        outcome.nextAttemptAt !== undefined
      ? { nextAttemptAt: outcome.nextAttemptAt }
      : {}),
    ...(outcome.state === "sent" || outcome.state === "delivered"
      ? { failureCode: undefined, nextAttemptAt: undefined }
      : {}),
  });
}

export function createDeliveryReceipt(input: {
  readonly receiptId: string;
  readonly exportId: string;
  readonly recipientId: string;
  readonly purpose: ReleasePurpose;
  readonly idempotencyKey: string;
  readonly nextAttemptAt: Date;
}): DeliveryReceipt {
  if (!input.recipientId.trim() || !input.purpose.trim()) {
    throw new Error(
      `Delivery receipt "${input.receiptId}" has incomplete recipient scope; expected recipient and purpose.`,
    );
  }
  return Object.freeze({
    receiptId: input.receiptId,
    exportId: input.exportId,
    recipientId: input.recipientId,
    purpose: input.purpose,
    idempotencyKey: input.idempotencyKey,
    state: "pending" as const,
    attemptCount: 0,
    nextAttemptAt: input.nextAttemptAt,
  });
}

export function assertReceiptIdempotency(
  existing: DeliveryReceipt | undefined,
  idempotencyKey: string,
): "new" | "replay" | "conflict" {
  if (existing === undefined) return "new";
  if (existing.idempotencyKey === idempotencyKey) return "replay";
  return "conflict";
}

function assertReceiptTransition(
  from: DeliveryReceipt["state"],
  to: DeliveryReceipt["state"],
): void {
  const allowed: Readonly<Record<DeliveryReceipt["state"], readonly string[]>> =
    {
      pending: ["retry_scheduled", "sent", "failed", "revoked", "expired"],
      retry_scheduled: ["sent", "failed", "revoked", "expired"],
      sent: ["delivered", "revoked", "expired"],
      delivered: ["revoked", "expired"],
      failed: ["retry_scheduled", "revoked", "expired"],
      revoked: [],
      expired: [],
    };
  if (allowed[from].includes(to)) return;
  throw new Error(
    `Delivery receipt transition "${from}" -> "${to}" is invalid; expected a retryable receipt state transition.`,
  );
}

function assertFailureCode(code: string): void {
  if (/^[A-Z][A-Z0-9_:-]{0,127}$/.test(code)) return;
  throw new Error(
    `Delivery failure code "${code}" is unsafe; expected an uppercase sanitized code.`,
  );
}
