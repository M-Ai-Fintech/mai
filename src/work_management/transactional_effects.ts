import { type OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { WorkManagementEvent } from "./events.ts";
import type { WorkManagementTransaction } from "./repository.ts";
import { PostgresWorkManagementRepository } from "./repository_sql.ts";
import type { TargetCommandDispatch } from "./target_commands.ts";
import { assertTransactionSafeEffects } from "./transaction_port_policy.ts";

export interface WorkManagementAuditPort {
  readonly transactionSafe?: true;
  readonly transactionMode?: "postgres_transaction_local";
  append(
    transaction: TransactionHandle,
    event: WorkManagementEvent,
  ): Promise<string>;
}

interface TransactionLocalOutboxPort {
  readonly transactionSafe: true;
  readonly transactionMode: "postgres_transaction_local";
  append: OutboxRepository["append"];
}

function transactionLocalOutbox(
  outbox: Pick<OutboxRepository, "append">,
): TransactionLocalOutboxPort {
  return {
    transactionSafe: true,
    transactionMode: "postgres_transaction_local",
    append: outbox.append.bind(outbox),
  };
}

export interface WorkManagementTransactionalEffects {
  appendDomainEvent(
    transaction: WorkManagementTransaction,
    event: WorkManagementEvent,
  ): Promise<void>;
  appendTargetCommand(
    transaction: WorkManagementTransaction,
    dispatch: TargetCommandDispatch,
  ): Promise<void>;
}

/** Explicit no-external-I/O adapter for deterministic unit tests. */
export class NoopWorkManagementTestEffects
  implements WorkManagementTransactionalEffects {
  appendDomainEvent(
    _transaction: WorkManagementTransaction,
    event: WorkManagementEvent,
  ): Promise<void> {
    void event;
    return Promise.resolve();
  }

  appendTargetCommand(): Promise<void> {
    return Promise.resolve();
  }
}

/** Appends audit and outbox evidence using the command's PostgreSQL handle. */
export class PostgresWorkManagementTransactionalEffects
  implements WorkManagementTransactionalEffects {
  constructor(
    private readonly audit: WorkManagementAuditPort,
    outbox?: Pick<OutboxRepository, "append">,
    allowNamedTestAdapters = false,
  ) {
    this.outbox = outbox === undefined
      ? transactionLocalOutbox(new OutboxRepository())
      : outbox;
    if (!allowNamedTestAdapters) {
      assertTransactionSafeEffects(this.audit, this.outbox);
    }
  }

  private readonly outbox: Pick<OutboxRepository, "append">;

  async appendDomainEvent(
    transaction: WorkManagementTransaction,
    event: WorkManagementEvent,
  ): Promise<void> {
    const handle = postgresHandle(transaction);
    const auditEventId = await this.audit.append(handle, event);
    await this.outbox.append(handle, {
      ...event,
      payload: Object.freeze({ ...event.payload, auditEventId }),
    });
  }

  async appendTargetCommand(
    transaction: WorkManagementTransaction,
    dispatch: TargetCommandDispatch,
  ): Promise<void> {
    const handle = postgresHandle(transaction);
    await this.outbox.append(handle, targetOutboxEvent(dispatch));
  }
}

function postgresHandle(
  transaction: WorkManagementTransaction,
): TransactionHandle {
  if (transaction instanceof PostgresWorkManagementRepository) {
    return transaction.transaction;
  }
  throw new Error(
    "Work Management production effects require a PostgreSQL transaction-local repository; expected one MAI-106 transaction handle.",
  );
}

function targetOutboxEvent(dispatch: TargetCommandDispatch): OutboxEvent {
  const recordedAt = new Date(dispatch.recordedAt);
  return {
    eventId: dispatch.dispatchId,
    tenantId: dispatch.tenantId,
    workspaceId: dispatch.workspaceId,
    dealId: dispatch.dealId,
    aggregateType: "approval_request",
    aggregateId: dispatch.approvalRequestId,
    aggregateVersion: dispatch.approvalRequestVersion,
    eventType: "work_management.target_command_ready",
    schemaVersion: 1,
    payload: Object.freeze({
      schemaVersion: 1,
      dispatch: Object.freeze({ ...dispatch, actor: { ...dispatch.actor } }),
      ...(dispatch.authorityProof === undefined
        ? {}
        : { authorityProof: Object.freeze({ ...dispatch.authorityProof }) }),
    }),
    correlationId: dispatch.correlationId,
    causationId: dispatch.causationId,
    occurredAt: recordedAt,
    availableAt: recordedAt,
  };
}
