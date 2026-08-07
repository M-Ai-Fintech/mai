import type { ActorReference } from "../platform/authz/v1.ts";
import type {
  AggregateVersion,
  IdempotencyKey,
  JobId,
  OperationId,
  RequestContext,
} from "../platform/api/v1.ts";
import {
  type Clock,
  IdempotencyRepository,
  type TransactionHandle,
} from "../platform/persistence/v1.ts";
import {
  type ClaimedJob,
  type DurableJob,
  JobRepository,
} from "../platform/jobs/v1.ts";
import type { ValuationRequest } from "../engines/valuation/types.ts";
import type { DeterministicValuationPort } from "./compute.ts";
import type {
  ValuationApproval,
  ValuationAuthoritySnapshot,
  ValuationInput,
  ValuationInvalidation,
  ValuationModel,
  ValuationModelDefinition,
  ValuationResult,
  ValuationScenario,
} from "./model.ts";
import type {
  ValuationApprovalId,
  ValuationInputId,
  ValuationInvalidationId,
  ValuationModelId,
  ValuationResultId,
  ValuationScenarioId,
} from "./ids.ts";
import type { ExactValuationBasis, ValuationScope } from "./basis.ts";
import type { ValuationInputProvenance } from "./provenance.ts";
import type { ValuationRepository } from "./repository_contract.ts";
import type { ValuationEffects } from "./effects.ts";
import { PostgresValuationEffects } from "./effects.ts";
import { failedJob } from "./command_runtime.ts";
import type { ValuationCommandRuntime } from "./command_runtime.ts";
import { ValuationError } from "./errors.ts";
import {
  activateModel,
  addInput,
  createModel,
  createScenario,
  enqueueCompute,
} from "./command_handlers.ts";
import { approve, executeCompute, invalidate } from "./compute_handlers.ts";

export interface ValuationTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

export interface ValuationCommandServiceConfig {
  readonly transactions: ValuationTransactionRunner;
  readonly repository: ValuationRepository;
  readonly calculations: DeterministicValuationPort;
  readonly effects?: ValuationEffects;
  readonly idempotency?: IdempotencyRepository;
  readonly jobs?: JobRepository;
  readonly clock?: Clock;
}

export interface CreateValuationModelCommand {
  readonly context: RequestContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly actor: ActorReference;
  readonly modelId: ValuationModelId;
  readonly name: string;
  readonly definition: ValuationModelDefinition;
}

export interface ActivateValuationModelCommand {
  readonly context: RequestContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly actor: ActorReference;
  readonly modelId: ValuationModelId;
  readonly expectedVersion: AggregateVersion;
}

export interface CreateValuationScenarioCommand {
  readonly context: RequestContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly actor: ActorReference;
  readonly scenarioId: ValuationScenarioId;
  readonly modelId: ValuationModelId;
  readonly modelVersion?: AggregateVersion;
  readonly name: string;
}

export interface AddValuationInputCommand {
  readonly context: RequestContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly actor: ActorReference;
  readonly scenarioId: ValuationScenarioId;
  readonly inputId: ValuationInputId;
  readonly expectedScenarioVersion: AggregateVersion;
  readonly request: ValuationRequest;
  readonly basis: ExactValuationBasis;
  readonly provenance: ValuationInputProvenance;
}

export interface EnqueueValuationComputeCommand {
  readonly context: RequestContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly actor: ActorReference;
  readonly scenarioId: ValuationScenarioId;
  readonly jobId: JobId;
  readonly operationId: OperationId;
  readonly expectedScenarioVersion: AggregateVersion;
  readonly timeoutMs?: number;
}

export interface ExecuteValuationComputeCommand {
  readonly job: ClaimedJob;
  readonly resultId: ValuationResultId;
}

export interface ApproveValuationCommand {
  readonly context: RequestContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly actor: ActorReference;
  readonly authority: ValuationAuthoritySnapshot;
  readonly scenarioId: ValuationScenarioId;
  readonly resultId: ValuationResultId;
  readonly approvalId: ValuationApprovalId;
  readonly expectedScenarioVersion: AggregateVersion;
}

export interface InvalidateValuationCommand {
  readonly context: RequestContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly actor: ActorReference;
  readonly scenarioId: ValuationScenarioId;
  readonly resultId?: ValuationResultId;
  readonly invalidationId: ValuationInvalidationId;
  readonly expectedScenarioVersion: AggregateVersion;
  readonly kind: "stale" | "invalidated";
  readonly reason: string;
  readonly sourceReference?: string;
}

export type CommandResult<T> = {
  readonly status: "accepted";
  readonly value: T;
};

export class ValuationCommandService {
  private readonly runtime: ValuationCommandRuntime;

  constructor(config: ValuationCommandServiceConfig) {
    const clock = config.clock ?? { now: () => new Date() };
    this.runtime = {
      config,
      clock,
      effects: config.effects ?? new PostgresValuationEffects(),
      idempotency: config.idempotency ?? new IdempotencyRepository(clock),
      jobs: config.jobs ?? new JobRepository(),
    };
  }

  createModel(
    command: CreateValuationModelCommand,
  ): Promise<CommandResult<ValuationModel>> {
    return this.run((transaction) =>
      createModel(this.runtime, transaction, command)
    );
  }

  activateModel(
    command: ActivateValuationModelCommand,
  ): Promise<CommandResult<ValuationModel>> {
    return this.run((transaction) =>
      activateModel(this.runtime, transaction, command)
    );
  }

  createScenario(
    command: CreateValuationScenarioCommand,
  ): Promise<CommandResult<ValuationScenario>> {
    return this.run((transaction) =>
      createScenario(this.runtime, transaction, command)
    );
  }

  addInput(
    command: AddValuationInputCommand,
  ): Promise<CommandResult<ValuationInput>> {
    return this.run((transaction) =>
      addInput(this.runtime, transaction, command)
    );
  }

  enqueueCompute(
    command: EnqueueValuationComputeCommand,
  ): Promise<CommandResult<DurableJob>> {
    return this.run((transaction) =>
      enqueueCompute(this.runtime, transaction, command)
    );
  }

  async executeCompute(
    command: ExecuteValuationComputeCommand,
  ): Promise<CommandResult<ValuationResult>> {
    try {
      return await this.run((transaction) =>
        executeCompute(this.runtime, transaction, command)
      );
    } catch (error) {
      const code = jobFailureCode(error);
      if (code !== undefined) {
        await this.run((transaction) =>
          this.runtime.jobs.fail(
            transaction,
            command.job,
            failedJob(code, this.runtime.clock.now()),
          )
        );
      }
      throw error;
    }
  }

  approve(
    command: ApproveValuationCommand,
  ): Promise<CommandResult<ValuationApproval>> {
    return this.run((transaction) =>
      approve(this.runtime, transaction, command)
    );
  }

  invalidate(
    command: InvalidateValuationCommand,
  ): Promise<CommandResult<ValuationInvalidation>> {
    return this.run((transaction) =>
      invalidate(this.runtime, transaction, command)
    );
  }

  private run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    return this.runtime.config.transactions.run(callback);
  }
}

function jobFailureCode(error: unknown): string | undefined {
  if (!(error instanceof ValuationError)) return undefined;
  return error.code === "STALE_INPUT" || error.code === "JOB_FAILED"
    ? error.code
    : undefined;
}

export type { ValuationScope };
