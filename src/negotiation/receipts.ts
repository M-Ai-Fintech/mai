import type { DeliveryReceipt } from "./model.ts";
import { assertDeliveryReceiptTransition } from "./transitions.ts";
import { sanitizedNegotiationFailure } from "./jobs.ts";

export type NegotiationReceiptOutcome =
  | { readonly state: "sent"; readonly providerReference: string }
  | { readonly state: "delivered" }
  | {
    readonly state: "retry_scheduled";
    readonly failureCode: string;
    readonly nextAttemptAt: string;
  }
  | { readonly state: "failed"; readonly failureCode: string }
  | { readonly state: "revoked" }
  | { readonly state: "expired" };

export function transitionNegotiationReceipt(
  receipt: DeliveryReceipt,
  outcome: NegotiationReceiptOutcome,
  updatedAt: string,
): DeliveryReceipt {
  assertDeliveryReceiptTransition(receipt.state, outcome.state);
  assertInstant(updatedAt);
  const failure =
    outcome.state === "retry_scheduled" || outcome.state === "failed"
      ? sanitizedNegotiationFailure(outcome.failureCode)
      : undefined;
  return Object.freeze({
    ...receipt,
    state: outcome.state,
    attemptCount: receipt.attemptCount +
      (outcome.state === "sent" || outcome.state === "retry_scheduled" ||
          outcome.state === "failed"
        ? 1
        : 0),
    ...(outcome.state === "sent"
      ? { providerReference: outcome.providerReference }
      : {}),
    ...(failure === undefined ? {} : { failureCode: failure }),
    ...(outcome.state === "retry_scheduled"
      ? { nextAttemptAt: outcome.nextAttemptAt }
      : {}),
    ...(outcome.state === "sent" || outcome.state === "delivered"
      ? { failureCode: undefined, nextAttemptAt: undefined }
      : {}),
    updatedAt,
  });
}

export function assertReceiptIdempotency(
  existing: DeliveryReceipt | undefined,
  idempotencyKey: string,
): "new" | "replay" | "conflict" {
  if (existing === undefined) return "new";
  return existing.idempotencyKey === idempotencyKey ? "replay" : "conflict";
}

function assertInstant(value: string): void {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed) && new Date(parsed).toISOString() === value) {
    return;
  }
  throw new Error(
    `Negotiation receipt time "${value}" is invalid; expected canonical UTC ISO-8601.`,
  );
}
