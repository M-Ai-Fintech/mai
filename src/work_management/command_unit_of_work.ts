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
import type { AuthorityEvaluation } from "./authority_evaluation.ts";
import { WorkManagementError } from "./model.ts";

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
  ): Promise<{
    readonly value: T;
    readonly replayed: boolean;
    readonly denied?: boolean;
    readonly denial?: AuthorityEvaluation;
  }>;
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

export class WorkManagementReplayIntegrityError extends Error {
  readonly code = "REPLAY_INTEGRITY_CONFLICT" as const;

  constructor(readonly resultReference: string, message: string) {
    super(
      `Command replay result "${resultReference}" is invalid; ${message}.`,
    );
    this.name = "WorkManagementReplayIntegrityError";
  }
}

export class WorkManagementCommandsDisabledError extends Error {
  readonly code = "COMMANDS_DISABLED" as const;

  constructor() {
    super(
      "Work Management commands are disabled in read_only or disabled mode until membership reconciliation is clean and activation is explicitly recorded; expected read-only inspection or governed rollout.",
    );
    this.name = "WorkManagementCommandsDisabledError";
  }
}

export class WorkManagementAuthorityDeniedError extends WorkManagementError {
  constructor(readonly evaluation: AuthorityEvaluation) {
    super(
      "HUMAN_AUTHORITY_REQUIRED",
      `Approval authority denied the command; reasons: ${
        evaluation.reasons.join(", ")
      }.`,
    );
    this.name = "WorkManagementAuthorityDeniedError";
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
    assertReplayIdentity(identity, existing.resultId, result.aggregate);
    return { value: result.aggregate as T, replayed: true };
  }
}

/** PostgreSQL authority: claim, writes, result, and completion share one tx. */
export class PostgresWorkManagementUnitOfWork
  implements WorkManagementCommandUnitOfWork {
  constructor(
    private readonly transactions: PostgresTransactionRunner,
    private readonly idempotency: IdempotencyRepository,
    private readonly mode: "disabled" | "read_only" | "commands" = "commands",
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
  ): Promise<{
    readonly value: T;
    readonly replayed: boolean;
    readonly denied?: boolean;
    readonly denial?: AuthorityEvaluation;
  }> {
    return this.transactions.run(async (handle) => {
      const repository = new PostgresWorkManagementRepository(handle);
      const claim = postgresClaim(identity);
      const inspected = await this.idempotency.inspect(handle, claim);
      if (inspected.status === "replay") {
        return await replayPostgres<T>(repository, identity, inspected);
      }
      if (inspected.status !== "absent") {
        throw new WorkManagementIdempotencyInProgressError(
          identity.idempotencyKey,
          inspected.status,
        );
      }
      if (this.mode !== "commands") {
        throw new WorkManagementCommandsDisabledError();
      }
      await assertMembershipCommandsAvailable(handle);
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
      let value: T;
      try {
        value = await operation(repository);
      } catch (error) {
        if (!(error instanceof WorkManagementAuthorityDeniedError)) throw error;
        await repository.appendAuthorityEvaluation(error.evaluation);
        await this.idempotency.fail(
          handle,
          claim,
          error.evaluation.evaluationId,
        );
        return {
          value: undefined as unknown as T,
          replayed: false,
          denied: true,
          denial: error.evaluation,
        };
      }
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
    readonly errorReference?: string;
    readonly state: "completed" | "failed";
  },
): Promise<{ readonly value: T; readonly replayed: boolean }> {
  if (status.state === "failed" && status.errorReference !== undefined) {
    const evaluation = await repository.findAuthorityEvaluationById(
      status.errorReference,
    );
    if (evaluation !== undefined) {
      throw new WorkManagementAuthorityDeniedError(evaluation);
    }
  }
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
  assertReplayIdentity(identity, status.resultReference, result.aggregate);
  return { value: result.aggregate as T, replayed: true };
}

function assertReplayIdentity(
  identity: WorkCommandExecutionIdentity,
  resultReference: string,
  aggregate: WorkAggregate,
): void {
  if (resultReference !== identity.resultId) {
    throw new WorkManagementReplayIntegrityError(
      resultReference,
      `expected result reference "${identity.resultId}"`,
    );
  }
  if (
    aggregate.aggregateType !== identity.aggregateType ||
    aggregate.id !== identity.aggregateId ||
    aggregate.tenantId !== identity.tenantId ||
    aggregate.workspaceId !== identity.workspaceId ||
    aggregate.dealId !== identity.dealId
  ) {
    throw new WorkManagementReplayIntegrityError(
      resultReference,
      "aggregate type, ID, or tenant/workspace/Deal scope differs from the claimed command",
    );
  }
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
