import type { IdempotencyKey } from "../platform/api/v1.ts";
import {
  IdempotencyConflictError,
  IdempotencyRepository,
  type PostgresTransactionRunner,
  type TransactionHandle,
} from "../platform/persistence/v1.ts";
import type { ActorId, WorkScope } from "./ids.ts";
import type { WorkAggregate } from "./model.ts";
import {
  InMemoryWorkManagementRepository,
  type WorkManagementRepository,
  type WorkManagementTransaction,
} from "./repository.ts";
import { PostgresWorkManagementRepository } from "./repository_sql.ts";

export interface WorkCommandExecutionIdentity extends WorkScope {
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly aggregateType: WorkAggregate["aggregateType"];
  readonly aggregateId: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly payloadDigest: string;
  readonly resultId: string;
  readonly recordedAt: string;
}

export interface WorkManagementCommandUnitOfWork {
  read<TResult>(
    operation: (transaction: WorkManagementTransaction) => Promise<TResult>,
  ): Promise<TResult>;
  run<T extends WorkAggregate>(
    identity: WorkCommandExecutionIdentity,
    operation: (transaction: WorkManagementTransaction) => Promise<T>,
  ): Promise<{ readonly value: T; readonly replayed: boolean }>;
}

export class WorkManagementIdempotencyInProgressError extends Error {
  readonly code = "IDEMPOTENCY_IN_PROGRESS" as const;

  constructor(readonly idempotencyKey: IdempotencyKey, state: string) {
    super(
      `Work Management idempotency key "${idempotencyKey}" is "${state}"; expected one command executor and no concurrent duplicate execution.`,
    );
    this.name = "WorkManagementIdempotencyInProgressError";
  }
}

export class WorkManagementCommandsDisabledError extends Error {
  readonly code = "COMMANDS_DISABLED" as const;

  constructor() {
    super(
      "Work Management commands are disabled until membership reconciliation is clean and activation is explicitly recorded; expected read-only inspection or governed rollout.",
    );
    this.name = "WorkManagementCommandsDisabledError";
  }
}

/** Explicit process-local adapter for deterministic unit tests only. */
export class InMemoryWorkManagementTestUnitOfWork
  implements WorkManagementCommandUnitOfWork {
  private readonly claims = new Map<
    string,
    { readonly digest: string; readonly resultId?: string }
  >();

  constructor(readonly repository = new InMemoryWorkManagementRepository()) {}

  read<TResult>(
    operation: (transaction: WorkManagementTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return this.repository.run(operation);
  }

  async run<T extends WorkAggregate>(
    identity: WorkCommandExecutionIdentity,
    operation: (transaction: WorkManagementTransaction) => Promise<T>,
  ): Promise<{ readonly value: T; readonly replayed: boolean }> {
    const key = identityKey(identity);
    const existing = this.claims.get(key);
    if (existing !== undefined) return await this.replay(identity, existing);
    this.claims.set(key, { digest: identity.payloadDigest });
    try {
      const value = await this.repository.run(async (transaction) => {
        const aggregate = await operation(transaction);
        await transaction.saveCommandResult({
          resultId: identity.resultId,
          aggregate,
          recordedAt: identity.recordedAt,
        });
        return aggregate;
      });
      this.claims.set(key, {
        digest: identity.payloadDigest,
        resultId: identity.resultId,
      });
      return { value, replayed: false };
    } catch (error) {
      this.claims.delete(key);
      throw error;
    }
  }

  private async replay<T extends WorkAggregate>(
    identity: WorkCommandExecutionIdentity,
    existing: { readonly digest: string; readonly resultId?: string },
  ): Promise<{ readonly value: T; readonly replayed: boolean }> {
    if (existing.digest !== identity.payloadDigest) {
      throw new IdempotencyConflictError(
        identity.idempotencyKey,
      );
    }
    if (existing.resultId === undefined) {
      throw new WorkManagementIdempotencyInProgressError(
        identity.idempotencyKey,
        "in_progress",
      );
    }
    const result = await this.repository.findCommandResult(existing.resultId);
    if (result === undefined) {
      throw new Error(
        `Work command result "${existing.resultId}" is missing; expected durable replay state.`,
      );
    }
    return { value: result.aggregate as T, replayed: true };
  }
}

/** PostgreSQL authority: claim, writes, result, and completion share one tx. */
export class PostgresWorkManagementUnitOfWork
  implements WorkManagementCommandUnitOfWork {
  constructor(
    private readonly transactions: PostgresTransactionRunner,
    private readonly idempotency: IdempotencyRepository,
  ) {}

  read<TResult>(
    operation: (transaction: WorkManagementTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return this.transactions.run((handle) =>
      operation(new PostgresWorkManagementRepository(handle))
    );
  }

  run<T extends WorkAggregate>(
    identity: WorkCommandExecutionIdentity,
    operation: (transaction: WorkManagementTransaction) => Promise<T>,
  ): Promise<{ readonly value: T; readonly replayed: boolean }> {
    return this.transactions.run(async (handle) => {
      await assertMembershipCommandsAvailable(handle);
      const repository = new PostgresWorkManagementRepository(handle);
      const claim = postgresClaim(identity);
      const status = await this.idempotency.claim(handle, claim);
      if (status.status === "replay") {
        return await replayPostgres<T>(repository, identity, status);
      }
      if (status.status !== "claimed") {
        throw new WorkManagementIdempotencyInProgressError(
          identity.idempotencyKey,
          status.status,
        );
      }
      const value = await operation(repository);
      await repository.saveCommandResult({
        resultId: identity.resultId,
        aggregate: value,
        recordedAt: identity.recordedAt,
      });
      await this.idempotency.complete(handle, claim, identity.resultId);
      return { value, replayed: false };
    });
  }
}

async function assertMembershipCommandsAvailable(
  handle: TransactionHandle,
): Promise<void> {
  await handle.query(
    "SELECT work_management.lock_membership_rollout_shared()",
  );
  const result = await handle.query<{ readonly available: boolean }>(
    "SELECT work_management.membership_commands_available() AS available",
  );
  if (result.rows[0]?.available === true) return;
  throw new WorkManagementCommandsDisabledError();
}

function postgresClaim(identity: WorkCommandExecutionIdentity) {
  const recordedAt = new Date(identity.recordedAt);
  return {
    tenantId: identity.tenantId,
    actorId: identity.actorId,
    commandType: identity.commandType,
    targetType: `work_management:${identity.aggregateType}`,
    targetId:
      `${identity.workspaceId}|${identity.dealId}|${identity.aggregateId}`,
    idempotencyKey: identity.idempotencyKey,
    payloadDigest: identity.payloadDigest,
    expiresAt: new Date(recordedAt.getTime() + 24 * 60 * 60 * 1_000),
  };
}

async function replayPostgres<T extends WorkAggregate>(
  repository: WorkManagementTransaction,
  identity: WorkCommandExecutionIdentity,
  status: {
    readonly resultReference: string | undefined;
    readonly state: "completed" | "failed";
  },
): Promise<{ readonly value: T; readonly replayed: boolean }> {
  if (status.state !== "completed" || status.resultReference === undefined) {
    throw new WorkManagementIdempotencyInProgressError(
      identity.idempotencyKey,
      status.state,
    );
  }
  const result = await repository.findCommandResult(status.resultReference);
  if (result === undefined) {
    throw new Error(
      `Work command result "${status.resultReference}" is missing; expected durable replay state.`,
    );
  }
  return { value: result.aggregate as T, replayed: true };
}

function identityKey(identity: WorkCommandExecutionIdentity): string {
  return [
    identity.tenantId,
    identity.workspaceId,
    identity.dealId,
    identity.actorId,
    identity.commandType,
    identity.aggregateType,
    identity.aggregateId,
    identity.idempotencyKey,
  ].join("|");
}

export type WorkManagementTestRepository = WorkManagementRepository;
