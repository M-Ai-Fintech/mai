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
import { assertTransactionSafeAdapter } from "./transaction_port_policy.ts";

interface CommonCompositionOptions {
  readonly authorization: WorkManagementAuthorizationPort;
  readonly clock: WorkManagementClock;
  readonly targets?: ApprovalTargetPort;
  readonly evidence?: ApprovalEvidencePort;
  readonly authority?: ApprovalAuthoritySnapshotPort;
  readonly requireAuthorityEvaluation?: boolean;
}

export interface InMemoryWorkManagementTestCompositionOptions
  extends CommonCompositionOptions {}

/** Explicit PostgreSQL test adapter; production composition never self-registers caller ports. */
export interface PostgresWorkManagementTestCompositionOptions
  extends PostgresWorkManagementCompositionOptions {}

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
  if (options.mode === "commands") {
    if (options.requireAuthorityEvaluation === false) {
      throw new Error(
        "Work Management commands require server authority evaluation and immutable proof; expected requireAuthorityEvaluation=true.",
      );
    }
    assertTransactionSafeAdapter("authorization", options.authorization);
    assertTransactionSafeAdapter(
      "target",
      options.targets ??
        new RejectingApprovalTargetTestPort(),
    );
    assertTransactionSafeAdapter(
      "evidence",
      options.evidence ??
        new RejectingApprovalEvidenceTestPort(),
    );
    assertTransactionSafeAdapter(
      "authority",
      options.authority ??
        new RejectingApprovalAuthorityTestPort(),
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
    options.mode === "read_only",
  );
  const serviceConfiguration: CommonCompositionOptions = {
    ...options,
    targets: options.targets ?? new RejectingApprovalTargetTestPort(),
    evidence: options.evidence ?? new RejectingApprovalEvidenceTestPort(),
    authority: options.authority ?? new RejectingApprovalAuthorityTestPort(),
    requireAuthorityEvaluation: options.mode === "commands"
      ? true
      : options.requireAuthorityEvaluation ?? false,
  };
  return {
    adapter: "postgres",
    mode: options.mode,
    service: new WorkManagementService(
      serviceOptions(serviceConfiguration, unitOfWork, effects),
    ),
  };
}

/**
 * Creates an explicitly named PostgreSQL test composition with named fakes.
 * Caller-provided ports are never accepted by the production composition.
 */
export function createPostgresWorkManagementTestComposition(
  options: PostgresWorkManagementTestCompositionOptions,
): PostgresWorkManagementComposition {
  if (options.mode === "disabled") {
    throw new Error(
      "Work Management test composition is disabled; expected read_only or commands.",
    );
  }
  const targets = options.targets ?? new RejectingApprovalTargetTestPort();
  const evidence = options.evidence ?? new RejectingApprovalEvidenceTestPort();
  const authority = options.authority ??
    new RejectingApprovalAuthorityTestPort();
  const authorization = options.authorization;
  const effects = new PostgresWorkManagementTransactionalEffects(
    options.audit,
    options.outbox === undefined ? undefined : options.outbox,
    true,
  );
  const idempotency = new IdempotencyRepository({
    now: () => new Date(options.clock.now()),
  });
  const postgres = new PostgresWorkManagementUnitOfWork(
    options.transactions,
    idempotency,
  );
  return {
    adapter: "postgres",
    mode: options.mode,
    service: new WorkManagementService(serviceOptions(
      {
        ...options,
        authorization,
        targets,
        evidence,
        authority,
        requireAuthorityEvaluation: options.mode === "commands"
          ? true
          : options.requireAuthorityEvaluation ?? false,
      },
      options.mode === "read_only"
        ? new ReadOnlyWorkManagementUnitOfWork(postgres)
        : postgres,
      effects,
    )),
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
    requireAuthorityEvaluation: options.requireAuthorityEvaluation ?? false,
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
  readonly transactionSafe = true as const;
  readonly transactionMode = "mai106_local" as const;
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
  readonly transactionSafe = true as const;
  readonly transactionMode = "mai106_local" as const;
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
  readonly transactionSafe = true as const;
  readonly transactionMode = "mai106_local" as const;
  resolve(): Promise<never> {
    return Promise.reject(
      new Error(
        "Approval authority validation is not configured; expected a named trusted test port.",
      ),
    );
  }
}

export * from "./application_service.ts";
