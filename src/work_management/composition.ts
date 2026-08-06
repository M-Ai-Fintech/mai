import {
  IdempotencyRepository,
  type PostgresTransactionRunner,
} from "../platform/persistence/v1.ts";
import type { OutboxRepository } from "../platform/events/v1.ts";
import type {
  ApprovalAuthoritySnapshotPort,
  ApprovalEvidencePort,
  ApprovalTargetPort,
} from "./approval_package_factory.ts";
import {
  type WorkManagementApplicationOptions,
  type WorkManagementAuthorizationPort,
  type WorkManagementClock,
  WorkManagementService,
} from "./application_service.ts";
import {
  InMemoryWorkManagementTestUnitOfWork,
  PostgresWorkManagementUnitOfWork,
  type WorkCommandExecutionIdentity,
  type WorkManagementCommandUnitOfWork,
} from "./command_unit_of_work.ts";
import type { WorkAggregate } from "./model.ts";
import type { WorkManagementTransaction } from "./repository.ts";
import {
  NoopWorkManagementTestEffects,
  PostgresWorkManagementTransactionalEffects,
  type WorkManagementAuditPort,
} from "./transactional_effects.ts";

interface CommonCompositionOptions {
  readonly authorization: WorkManagementAuthorizationPort;
  readonly clock: WorkManagementClock;
  readonly targets?: ApprovalTargetPort;
  readonly evidence?: ApprovalEvidencePort;
  readonly authority?: ApprovalAuthoritySnapshotPort;
}

export interface InMemoryWorkManagementTestCompositionOptions
  extends CommonCompositionOptions {}

export interface PostgresWorkManagementCompositionOptions
  extends CommonCompositionOptions {
  readonly mode: "disabled" | "read_only" | "commands";
  readonly transactions: PostgresTransactionRunner;
  readonly audit: WorkManagementAuditPort;
  readonly outbox?: Pick<OutboxRepository, "append">;
}

export interface InMemoryWorkManagementTestComposition {
  readonly adapter: "in_memory_test";
  readonly repository: InMemoryWorkManagementTestUnitOfWork["repository"];
  readonly service: WorkManagementService;
}

export interface PostgresWorkManagementComposition {
  readonly adapter: "postgres";
  readonly mode: "read_only" | "commands";
  readonly service: WorkManagementService;
}

/** Creates the explicitly named process-local test adapter. */
export function createInMemoryWorkManagementTestComposition(
  options: InMemoryWorkManagementTestCompositionOptions,
): InMemoryWorkManagementTestComposition {
  const unitOfWork = new InMemoryWorkManagementTestUnitOfWork();
  return {
    adapter: "in_memory_test",
    repository: unitOfWork.repository,
    service: new WorkManagementService(serviceOptions(
      options,
      unitOfWork,
      new NoopWorkManagementTestEffects(),
    )),
  };
}

/** Creates production Work Management only with MAI-106 PostgreSQL authority. */
export function createPostgresWorkManagementComposition(
  options: PostgresWorkManagementCompositionOptions,
): PostgresWorkManagementComposition {
  if (options.mode === "disabled") {
    throw new Error(
      "Work Management composition is disabled; expected read_only or commands mode after governed rollout approval.",
    );
  }
  const idempotency = new IdempotencyRepository({
    now: () => new Date(options.clock.now()),
  });
  const postgres = new PostgresWorkManagementUnitOfWork(
    options.transactions,
    idempotency,
  );
  const unitOfWork = options.mode === "read_only"
    ? new ReadOnlyWorkManagementUnitOfWork(postgres)
    : postgres;
  const effects = new PostgresWorkManagementTransactionalEffects(
    options.audit,
    options.outbox,
  );
  return {
    adapter: "postgres",
    mode: options.mode,
    service: new WorkManagementService(
      serviceOptions(options, unitOfWork, effects),
    ),
  };
}

function serviceOptions(
  options: CommonCompositionOptions,
  unitOfWork: WorkManagementCommandUnitOfWork,
  effects: WorkManagementApplicationOptions["effects"],
): WorkManagementApplicationOptions {
  return {
    unitOfWork,
    effects,
    authorization: options.authorization,
    clock: options.clock,
    targets: options.targets ?? new RejectingApprovalTargetTestPort(),
    evidence: options.evidence ?? new RejectingApprovalEvidenceTestPort(),
    authority: options.authority ?? new RejectingApprovalAuthorityTestPort(),
  };
}

class ReadOnlyWorkManagementUnitOfWork
  implements WorkManagementCommandUnitOfWork {
  constructor(private readonly delegate: WorkManagementCommandUnitOfWork) {}

  read<TResult>(
    operation: (transaction: WorkManagementTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return this.delegate.read(operation);
  }

  run<T extends WorkAggregate>(
    identity: WorkCommandExecutionIdentity,
    _operation: (transaction: WorkManagementTransaction) => Promise<T>,
  ): Promise<{ readonly value: T; readonly replayed: boolean }> {
    return Promise.reject(
      new Error(
        `Work Management command "${identity.commandType}" is disabled in read_only mode; expected commands mode after reconciliation.`,
      ),
    );
  }
}

class RejectingApprovalTargetTestPort implements ApprovalTargetPort {
  validate(): Promise<never> {
    return Promise.reject(
      new Error(
        "Approval target validation is not configured; expected a named trusted test port.",
      ),
    );
  }

  currentVersion(): Promise<never> {
    return Promise.reject(
      new Error(
        "Approval target version validation is not configured; expected a named trusted test port.",
      ),
    );
  }
}

class RejectingApprovalEvidenceTestPort implements ApprovalEvidencePort {
  validate(): Promise<never> {
    return Promise.reject(
      new Error(
        "Approval evidence validation is not configured; expected a named trusted test port.",
      ),
    );
  }
}

class RejectingApprovalAuthorityTestPort
  implements ApprovalAuthoritySnapshotPort {
  resolve(): Promise<never> {
    return Promise.reject(
      new Error(
        "Approval authority validation is not configured; expected a named trusted test port.",
      ),
    );
  }
}

export * from "./application_service.ts";
