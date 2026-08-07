import type {
  Clock,
  TransactionPool,
  TransactionScopeInstaller,
} from "../platform/persistence/v1.ts";
import { PostgresTransactionRunner } from "../platform/persistence/v1.ts";
import type { DeterministicValuationPort } from "./compute.ts";
import { Mai18DeterministicValuationAdapter } from "./compute.ts";
import {
  ValuationCommandService,
  type ValuationCommandServiceConfig,
} from "./commands.ts";
import { platformMigrations } from "../platform/persistence/v1.ts";
import { valuationMigrations } from "./migrations/index.ts";
import { PostgresValuationRepository } from "./repository.ts";
import type { ValuationRepository } from "./repository_contract.ts";
import type { ValuationScope } from "./basis.ts";
import type {
  ValuationComparison,
  ValuationResult,
  ValuationScenario,
} from "./model.ts";
import type {
  ValuationComparisonId,
  ValuationResultId,
  ValuationScenarioId,
} from "./ids.ts";
import type { ValuationReadPort } from "./read.ts";

export interface ValuationCompositionConfig {
  readonly pool: TransactionPool;
  readonly calculations?: DeterministicValuationPort;
  readonly scopeInstaller?: TransactionScopeInstaller;
  readonly clock?: Clock;
  readonly repository?: ValuationRepository;
  readonly commandConfig?: Omit<
    ValuationCommandServiceConfig,
    "transactions" | "repository" | "calculations"
  >;
}

export class PostgresValuationContext implements ValuationReadPort {
  readonly migrations = Object.freeze([
    ...platformMigrations,
    ...valuationMigrations,
  ]);
  readonly transactions: PostgresTransactionRunner;
  readonly repository: ValuationRepository;
  readonly commands: ValuationCommandService;

  constructor(config: ValuationCompositionConfig) {
    this.transactions = new PostgresTransactionRunner(
      config.pool,
      config.scopeInstaller,
    );
    this.repository = config.repository ?? new PostgresValuationRepository();
    this.commands = new ValuationCommandService({
      ...config.commandConfig,
      transactions: this.transactions,
      repository: this.repository,
      calculations: config.calculations ??
        new Mai18DeterministicValuationAdapter(),
      ...(config.clock === undefined ? {} : { clock: config.clock }),
    });
  }

  findScenario(
    scope: ValuationScope,
    id: ValuationScenarioId,
  ): Promise<ValuationScenario | undefined> {
    return this.transactions.run((transaction) =>
      this.repository.findScenario(transaction, scope, id)
    );
  }

  findResult(
    scope: ValuationScope,
    id: ValuationResultId,
  ): Promise<ValuationResult | undefined> {
    return this.transactions.run((transaction) =>
      this.repository.findResult(transaction, scope, id)
    );
  }

  findComparison(
    scope: ValuationScope,
    id: ValuationComparisonId,
  ): Promise<ValuationComparison | undefined> {
    return this.transactions.run((transaction) =>
      this.repository.findComparison(transaction, scope, id)
    );
  }
}
