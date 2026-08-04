import pg from "pg";
import { InboxRepository } from "../platform/events/v1.ts";
import { JobRepository } from "../platform/jobs/v1.ts";
import { PostgresTransactionRunner } from "../platform/persistence/v1.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { NotificationAuthorizationPort } from "./projection.ts";
import {
  DisabledNotificationChannelAdapter,
  type NotificationChannelAdapter,
  type NotificationDeliveryAuthorizer,
  NotificationDeliveryWorker,
  type NotificationJobPort,
} from "./delivery.ts";
import {
  type NotificationEventAuthorizer,
  NotificationEventConsumer,
  type NotificationInboxPort,
  type NotificationTransactionRunner,
} from "./consumer.ts";
import {
  InMemoryNotificationRepository,
  type NotificationRepository,
  PostgresNotificationRepository,
} from "./repository.ts";
import { notificationMigrations } from "./migrations/index.ts";
import { ExponentialDeliveryRetryPolicy } from "./retry.ts";
import type { NotificationChannel, NotificationClock } from "./model.ts";
import {
  type NotificationV1Dependencies,
  NotificationV1Service,
} from "../api/v1/notifications.ts";

export interface NotificationCompositionOptions {
  readonly pool?: pg.Pool;
  readonly transactions?: NotificationTransactionRunner;
  readonly repository?: NotificationRepository;
  readonly inbox?: NotificationInboxPort;
  readonly jobs?: NotificationJobPort & Pick<JobRepository, "enqueue">;
  readonly authorization: NotificationAuthorizationPort;
  readonly eventAuthorizer: NotificationEventAuthorizer;
  readonly deliveryAuthorizer: NotificationDeliveryAuthorizer;
  readonly clock: NotificationClock;
  readonly adapters?: readonly NotificationChannelAdapter[];
}

export interface NotificationComposition {
  readonly repository: NotificationRepository;
  readonly transactions: NotificationTransactionRunner;
  readonly inbox: NotificationInboxPort;
  readonly jobs: NotificationJobPort & Pick<JobRepository, "enqueue">;
  readonly adapters: ReadonlyMap<
    NotificationChannel,
    NotificationChannelAdapter
  >;
  readonly migrations: typeof notificationMigrations;
  readonly consumer: NotificationEventConsumer;
  readonly delivery: NotificationDeliveryWorker;
  readonly v1: NotificationV1Service;
}

/**
 * Composes the notification-owned vertical slice without enabling providers.
 *
 * @example const composition = createNotificationComposition(testOptions)
 */
export function createNotificationComposition(
  options: NotificationCompositionOptions,
): NotificationComposition {
  const infrastructure = resolveInfrastructure(options);
  const adapters = resolveAdapters(options.adapters);
  const consumer = new NotificationEventConsumer({
    transactions: infrastructure.transactions,
    inbox: infrastructure.inbox,
    repository: infrastructure.repository,
    jobs: infrastructure.jobs,
    authorizer: options.eventAuthorizer,
    clock: options.clock,
  });
  const delivery = new NotificationDeliveryWorker({
    transactions: infrastructure.transactions,
    jobs: infrastructure.jobs,
    repository: infrastructure.repository,
    authorizer: options.deliveryAuthorizer,
    adapters,
    retryPolicy: new ExponentialDeliveryRetryPolicy(),
    clock: options.clock,
  });
  const v1Dependencies: NotificationV1Dependencies = {
    repository: infrastructure.repository,
    transactions: infrastructure.transactions,
    authorization: options.authorization,
    clock: options.clock,
  };
  return {
    ...infrastructure,
    adapters,
    migrations: notificationMigrations,
    consumer,
    delivery,
    v1: new NotificationV1Service(v1Dependencies),
  };
}

interface NotificationInfrastructure {
  readonly repository: NotificationRepository;
  readonly transactions: NotificationTransactionRunner;
  readonly inbox: NotificationInboxPort;
  readonly jobs: NotificationJobPort & Pick<JobRepository, "enqueue">;
}

function resolveInfrastructure(
  options: NotificationCompositionOptions,
): NotificationInfrastructure {
  if (options.pool !== undefined) {
    const transactions = new PostgresTransactionRunner(options.pool);
    const repository = new PostgresNotificationRepository();
    const inbox = new InboxRepository();
    const jobs = new JobRepository();
    return { repository, transactions, inbox, jobs };
  }
  if (
    options.transactions !== undefined && options.repository !== undefined &&
    options.inbox !== undefined && options.jobs !== undefined
  ) {
    return {
      repository: options.repository,
      transactions: options.transactions,
      inbox: options.inbox,
      jobs: options.jobs,
    };
  }
  if (
    options.transactions !== undefined || options.repository !== undefined ||
    options.inbox !== undefined || options.jobs !== undefined
  ) {
    throw new Error(
      "Notification infrastructure is incomplete; expected a PostgreSQL pool or all test transaction, repository, inbox, and job ports.",
    );
  }
  return {
    repository: new InMemoryNotificationRepository(),
    transactions: new UnconfiguredTransactionRunner(),
    inbox: new InboxRepository(),
    jobs: new JobRepository(),
  };
}

function resolveAdapters(
  configured: readonly NotificationChannelAdapter[] | undefined,
): ReadonlyMap<NotificationChannel, NotificationChannelAdapter> {
  const adapters = configured ?? [
    new DisabledNotificationChannelAdapter("in_app"),
    new DisabledNotificationChannelAdapter("email"),
  ];
  return new Map(adapters.map((adapter) => [adapter.channel, adapter]));
}

class UnconfiguredTransactionRunner implements NotificationTransactionRunner {
  run<TResult>(
    _callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    return Promise.reject(
      new Error(
        "Notification infrastructure is unconfigured; expected a test transaction runner or PostgreSQL pool.",
      ),
    );
  }
}
