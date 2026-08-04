import type { TransactionHandle } from "../platform/persistence/v1.ts";
import { type InboxMessage, InboxRepository } from "../platform/events/v1.ts";
import { type OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import { JobRepository } from "../platform/jobs/v1.ts";
import { sanitizedFailure } from "../platform/events/v1.ts";
import type { Clock } from "../platform/persistence/v1.ts";
import { type DocumentJobInput, enqueueDocumentJob } from "./jobs.ts";

export interface DocumentProviderEvent {
  readonly message: InboxMessage;
  readonly job: DocumentJobInput;
  readonly outboxEvent: OutboxEvent;
}

export interface DocumentEventConsumerDependencies {
  readonly transactions: {
    run<TResult>(
      callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
    ): Promise<TResult>;
  };
  readonly inbox: InboxRepository;
  readonly jobs: JobRepository;
  readonly outbox: OutboxRepository;
  readonly clock: Clock;
}

export type DocumentEventOutcome =
  | { readonly status: "scheduled" }
  | { readonly status: "duplicate"; readonly state: "processing" | "processed" }
  | { readonly status: "retry" }
  | { readonly status: "failed" };

export class DocumentEventConsumer {
  constructor(
    private readonly dependencies: DocumentEventConsumerDependencies,
  ) {}

  consume(event: DocumentProviderEvent): Promise<DocumentEventOutcome> {
    return this.dependencies.transactions.run((transaction) =>
      this.consumeInTransaction(transaction, event)
    );
  }

  private async consumeInTransaction(
    transaction: TransactionHandle,
    event: DocumentProviderEvent,
  ): Promise<DocumentEventOutcome> {
    const claim = await this.dependencies.inbox.claim(
      transaction,
      event.message,
    );
    if (claim.status === "duplicate") return claim;
    try {
      await enqueueDocumentJob(
        transaction,
        { jobs: this.dependencies.jobs, outbox: this.dependencies.outbox },
        event.job,
        event.outboxEvent,
      );
      await this.dependencies.inbox.complete(
        transaction,
        event.message,
        this.dependencies.clock.now(),
      );
      return { status: "scheduled" };
    } catch (_error) {
      await this.dependencies.inbox.fail(
        transaction,
        event.message,
        sanitizedFailure("DOCUMENT_EVENT_FAILED"),
      );
      return { status: "failed" };
    }
  }
}
