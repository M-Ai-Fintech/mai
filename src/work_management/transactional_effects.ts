import { type OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { WorkManagementEvent } from "./events.ts";
import type { WorkManagementTransaction } from "./repository.ts";
import { PostgresWorkManagementRepository } from "./repository_sql.ts";
import type { TargetCommandDispatch } from "./target_commands.ts";

export interface WorkManagementAuditPort {
  append(
    transaction: TransactionHandle,
    event: WorkManagementEvent,
  ): Promise<string>;
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
    private readonly outbox: Pick<OutboxRepository, "append"> =
      new OutboxRepository(),
  ) {}

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
    payload: Object.freeze({ ...dispatch, actor: { ...dispatch.actor } }),
    correlationId: dispatch.correlationId,
    causationId: dispatch.causationId,
    occurredAt: recordedAt,
    availableAt: recordedAt,
  };
}
