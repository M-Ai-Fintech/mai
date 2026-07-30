import { Clock, TransactionHandle } from "../persistence/v1.ts";
import {
  ClaimedOutboxEvent,
  OutboxFailureState,
  OutboxStore,
} from "./outbox.ts";

declare const sanitizedFailureBrand: unique symbol;
export type SanitizedFailure = string & {
  readonly [sanitizedFailureBrand]: "SanitizedFailure";
};

export interface OutboxPublisher {
  publish(event: ClaimedOutboxEvent): Promise<void>;
}

export interface OutboxRetryPolicy {
  nextAttempt(attemptCount: number, now: Date): Date | undefined;
}

export interface OutboxFailureSanitizer {
  sanitize(error: unknown): SanitizedFailure;
}

export interface EventTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

export interface OutboxDispatcherDependencies {
  readonly transactions: EventTransactionRunner;
  readonly store: OutboxStore;
  readonly publisher: OutboxPublisher;
  readonly clock: Clock;
  readonly retryPolicy: OutboxRetryPolicy;
  readonly failureSanitizer: OutboxFailureSanitizer;
}

export type DispatchOutcome =
  | { readonly status: "idle" }
  | { readonly status: "published"; readonly eventId: string }
  | {
    readonly status: OutboxFailureState;
    readonly eventId: string;
  };

export class OutboxDispatcher {
  constructor(private readonly dependencies: OutboxDispatcherDependencies) {}

  /**
   * Claims and dispatches at most one durable event; it never loops forever.
   *
   * @example await dispatcher.dispatchOne("worker_a", 30_000)
   */
  async dispatchOne(
    owner: string,
    leaseMilliseconds: number,
  ): Promise<DispatchOutcome> {
    const now = this.dependencies.clock.now();
    const event = await this.claimOne(owner, now, leaseMilliseconds);
    if (event === undefined) return { status: "idle" };
    try {
      await this.dependencies.publisher.publish(event);
      await this.recordPublished(event);
      return { status: "published", eventId: event.eventId };
    } catch (error) {
      return await this.recordFailure(event, error);
    }
  }

  private claimOne(
    owner: string,
    now: Date,
    leaseMilliseconds: number,
  ): Promise<ClaimedOutboxEvent | undefined> {
    assertLeaseDuration(leaseMilliseconds);
    return this.dependencies.transactions.run(async (transaction) => {
      const claimed = await this.dependencies.store.claim(transaction, {
        owner,
        now,
        leaseUntil: new Date(now.getTime() + leaseMilliseconds),
        limit: 1,
      });
      return claimed[0];
    });
  }

  private recordPublished(
    event: ClaimedOutboxEvent,
  ): Promise<void> {
    return this.dependencies.transactions.run((transaction) =>
      this.dependencies.store.markPublished(
        transaction,
        event,
        this.dependencies.clock.now(),
      )
    );
  }

  private recordFailure(
    event: ClaimedOutboxEvent,
    error: unknown,
  ): Promise<DispatchOutcome> {
    const now = this.dependencies.clock.now();
    const failure = this.dependencies.failureSanitizer.sanitize(error);
    const retryAt = this.dependencies.retryPolicy.nextAttempt(
      event.attemptCount,
      now,
    );
    return this.dependencies.transactions.run(async (transaction) => ({
      status: await this.dependencies.store.recordFailure(
        transaction,
        event,
        failure,
        retryAt,
      ),
      eventId: event.eventId,
    }));
  }
}

/**
 * Creates a storage-safe failure code; raw errors and stacks are rejected.
 *
 * @example sanitizedFailure("PUBLISH_FAILED")
 */
export function sanitizedFailure(code: string): SanitizedFailure {
  if (/^[A-Z][A-Z0-9_:-]{0,127}$/.test(code)) {
    return code as SanitizedFailure;
  }
  throw new Error(
    `Failure code "${code}" is unsafe; expected uppercase code characters only.`,
  );
}

function assertLeaseDuration(milliseconds: number): void {
  if (Number.isSafeInteger(milliseconds) && milliseconds > 0) return;
  throw new Error(
    `Lease duration "${milliseconds}" is invalid; expected positive integer milliseconds.`,
  );
}
