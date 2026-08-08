import pg from "pg";
import {
  platformMigrations,
  PostgresTransactionRunner,
} from "../platform/persistence/v1.ts";
import { IdempotencyRepository } from "../platform/persistence/v1.ts";
import { JobRepository } from "../platform/jobs/v1.ts";
import { OutboxRepository } from "../platform/events/v1.ts";
import {
  auditActivityMigrations,
  type AuditEventRepository,
  PostgresAuditEventRepository,
} from "../audit_activity/v1.ts";
import type {
  MatchingAuthorizationPort,
  MatchingClock,
} from "./service_contracts.ts";
import {
  LegacyMatchingComputeAdapter,
  type MatchingComputePort,
} from "./compute.ts";
import {
  type MatchingEffects,
  PostgresMatchingEffects,
  RecordingMatchingEffects,
} from "./effects.ts";
import {
  type MatchingRunScheduler,
  PostgresMatchingRunScheduler,
  RecordingMatchingRunScheduler,
} from "./jobs.ts";
import {
  InMemoryMatchingRepository,
  type MatchingRepository,
  PostgresMatchingRepository,
} from "./repository.ts";
import { MatchingService } from "./service.ts";
import { InMemoryMatchingTransactionRunner } from "./transaction.ts";
import { matchingMigrations } from "./migrations/index.ts";
import {
  type MatchingIdempotency,
  PostgresMatchingIdempotency,
  RecordingMatchingIdempotency,
} from "./idempotency.ts";

export interface InMemoryMatchingCompositionOptions {
  readonly authorization: MatchingAuthorizationPort;
  readonly clock?: MatchingClock;
  readonly compute?: MatchingComputePort;
  readonly effects?: MatchingEffects;
  readonly scheduler?: MatchingRunScheduler;
  readonly idempotency?: MatchingIdempotency;
}

export interface InMemoryMatchingComposition {
  readonly adapter: "in_memory_test";
  readonly repository: InMemoryMatchingRepository;
  readonly effects: MatchingEffects;
  readonly scheduler: MatchingRunScheduler;
  readonly idempotency: MatchingIdempotency;
  readonly service: MatchingService;
}

export function createInMemoryMatchingTestComposition(
  options: InMemoryMatchingCompositionOptions,
): InMemoryMatchingComposition {
  const repository = new InMemoryMatchingRepository();
  const effects = options.effects ?? new RecordingMatchingEffects();
  const scheduler = options.scheduler ?? new RecordingMatchingRunScheduler();
  const idempotency = options.idempotency ?? new RecordingMatchingIdempotency();
  return {
    adapter: "in_memory_test",
    repository,
    effects,
    idempotency,
    scheduler,
    service: new MatchingService({
      transactions: new InMemoryMatchingTransactionRunner(),
      repository,
      authorization: options.authorization,
      compute: options.compute ?? new LegacyMatchingComputeAdapter(),
      scheduler,
      effects,
      clock: options.clock ?? { now: () => new Date() },
      idempotency,
    }),
  };
}

export interface PostgresMatchingCompositionConfig {
  readonly pool: pg.Pool;
  readonly authorization: MatchingAuthorizationPort;
  readonly clock?: MatchingClock;
  readonly compute?: MatchingComputePort;
  readonly effects?: MatchingEffects;
  readonly scheduler?: MatchingRunScheduler;
  readonly idempotency?: MatchingIdempotency;
  readonly audit?: AuditEventRepository;
  readonly poolOwnership?: "owned" | "borrowed";
}

export class PostgresMatchingComposition {
  readonly transactions: PostgresTransactionRunner;
  readonly repository: MatchingRepository;
  readonly effects: MatchingEffects;
  readonly scheduler: MatchingRunScheduler;
  readonly idempotency: MatchingIdempotency;
  readonly service: MatchingService;
  readonly migrations = Object.freeze([
    ...platformMigrations,
    ...auditActivityMigrations,
    ...matchingMigrations,
  ]);
  private readonly poolOwnership: "owned" | "borrowed";
  private closed = false;

  constructor(
    readonly pool: pg.Pool,
    config: PostgresMatchingCompositionConfig,
  ) {
    this.transactions = new PostgresTransactionRunner(pool);
    this.repository = new PostgresMatchingRepository();
    this.effects = config.effects ?? new PostgresMatchingEffects(
      new OutboxRepository(),
      config.audit ?? new PostgresAuditEventRepository(),
    );
    const clock = config.clock ?? { now: () => new Date() };
    this.scheduler = config.scheduler ?? new PostgresMatchingRunScheduler(
      new JobRepository(),
    );
    this.idempotency = config.idempotency ?? new PostgresMatchingIdempotency(
      new IdempotencyRepository(clock),
    );
    this.service = new MatchingService({
      transactions: this.transactions,
      repository: this.repository,
      authorization: config.authorization,
      compute: config.compute ?? new LegacyMatchingComputeAdapter(),
      scheduler: this.scheduler,
      effects: this.effects,
      idempotency: this.idempotency,
      clock,
    });
    this.poolOwnership = config.poolOwnership ?? "borrowed";
  }

  close(): Promise<void> {
    if (this.closed) return Promise.resolve();
    this.closed = true;
    return this.poolOwnership === "owned" ? this.pool.end() : Promise.resolve();
  }
}

export function createPostgresMatchingComposition(
  config: PostgresMatchingCompositionConfig,
): PostgresMatchingComposition {
  return new PostgresMatchingComposition(config.pool, config);
}
