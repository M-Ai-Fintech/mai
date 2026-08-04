import type { NotificationClock } from "./model.ts";

export interface DeliveryRetryInput {
  readonly attemptNumber: number;
  readonly now: Date;
  readonly expiresAt?: Date;
}

export interface DeliveryRetryDecision {
  readonly nextAttemptAt?: Date;
  readonly terminalFailureCode: string;
}

export interface DeliveryRetryPolicy {
  nextAttempt(input: DeliveryRetryInput): DeliveryRetryDecision;
}

export class ExponentialDeliveryRetryPolicy implements DeliveryRetryPolicy {
  constructor(
    private readonly maximumAttempts = 3,
    private readonly baseDelayMilliseconds = 1_000,
    private readonly maximumDelayMilliseconds = 60_000,
  ) {
    assertPositiveInteger(maximumAttempts, "maximum attempts");
    assertPositiveInteger(baseDelayMilliseconds, "base retry delay");
    assertPositiveInteger(maximumDelayMilliseconds, "maximum retry delay");
  }

  nextAttempt(input: DeliveryRetryInput): DeliveryRetryDecision {
    assertAttempt(input.attemptNumber);
    const delay = Math.min(
      this.maximumDelayMilliseconds,
      this.baseDelayMilliseconds * 2 ** (input.attemptNumber - 1),
    );
    const nextAttemptAt = new Date(input.now.getTime() + delay);
    if (input.attemptNumber >= this.maximumAttempts) {
      return { terminalFailureCode: "DELIVERY_RETRY_EXHAUSTED" };
    }
    if (input.expiresAt !== undefined && nextAttemptAt >= input.expiresAt) {
      return { terminalFailureCode: "DELIVERY_EXPIRY_REACHED" };
    }
    return { nextAttemptAt, terminalFailureCode: "DELIVERY_RETRY_EXHAUSTED" };
  }
}

export class NamedNotificationClock implements NotificationClock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    if (!Number.isSafeInteger(milliseconds)) {
      throw new Error(
        `Clock advance "${milliseconds}" is invalid; expected an integer millisecond count.`,
      );
    }
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

function assertAttempt(value: number): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new Error(
    `Delivery attempt number "${value}" is invalid; expected a positive integer.`,
  );
}

function assertPositiveInteger(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new Error(
    `Delivery ${label} "${value}" is invalid; expected a positive integer.`,
  );
}
