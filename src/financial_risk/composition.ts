import type {
  Clock,
  TransactionPool,
  TransactionScopeInstaller,
} from "../platform/persistence/v1.ts";
import {
  platformMigrations,
  PostgresTransactionRunner,
} from "../platform/persistence/v1.ts";
import {
  FinancialRiskApplication,
  type FinancialRiskAuthorizationPort,
  type FinancialRiskReferenceVerificationPort,
} from "./application.ts";
import type { FinancialRiskInferencePort } from "./ports.ts";
import { PostgresFinancialRiskRepository } from "./postgres_repository.ts";
import type { FinancialRiskRepository } from "./repository.ts";
import {
  type FinancialRiskJobPort,
  PostgresFinancialRiskJobPort,
} from "./job_port.ts";
import { financialRiskMigrations } from "./migrations/index.ts";

export interface FinancialRiskCompositionConfig {
  readonly pool: TransactionPool;
  readonly authorization: FinancialRiskAuthorizationPort;
  readonly references: FinancialRiskReferenceVerificationPort;
  readonly inference: FinancialRiskInferencePort;
  readonly scopeInstaller?: TransactionScopeInstaller;
  readonly clock?: Clock;
  readonly repository?: FinancialRiskRepository;
  readonly jobs?: FinancialRiskJobPort;
}

export class FinancialRiskComposition {
  readonly migrations = Object.freeze([
    ...platformMigrations,
    ...financialRiskMigrations,
  ]);
  readonly transactions: PostgresTransactionRunner;
  readonly repository: FinancialRiskRepository;
  readonly jobs: FinancialRiskJobPort;
  readonly application: FinancialRiskApplication;

  constructor(config: FinancialRiskCompositionConfig) {
    this.transactions = new PostgresTransactionRunner(
      config.pool,
      config.scopeInstaller,
    );
    this.repository = config.repository ?? new PostgresFinancialRiskRepository(
      this.transactions,
      undefined,
      undefined,
      config.clock,
    );
    this.jobs = config.jobs ??
      new PostgresFinancialRiskJobPort(this.transactions);
    this.application = new FinancialRiskApplication(
      config.authorization,
      config.references,
      config.inference,
      this.repository,
      config.clock,
      this.jobs,
    );
  }
}
