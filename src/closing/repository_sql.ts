import {
  type IdempotencyClaim,
  IdempotencyRepository,
  type PostgresTransactionRunner,
} from "../platform/persistence/v1.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import {
  ClosingError,
  type ClosingScope,
  type ClosingWorkspace,
  freezeWorkspace,
} from "./model.ts";
import type {
  ClosingCommandIdentity,
  ClosingCommandResult,
  ClosingTransaction,
  ClosingUnitOfWork,
} from "./repository.ts";

export class PostgresClosingTransaction implements ClosingTransaction {
  readonly kind = "postgres" as const;

  constructor(readonly handle: TransactionHandle) {}

  async find(
    scope: ClosingScope,
    workspaceId: string,
  ): Promise<ClosingWorkspace | undefined> {
    const result = await this.handle.query<ClosingWorkspaceRow>(
      `SELECT document FROM closing.workspaces
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND closing_workspace_id = $4`,
      [scope.tenantId, scope.workspaceId, scope.dealId, workspaceId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : freezeWorkspace(row.document);
  }

  async insert(workspace: ClosingWorkspace): Promise<void> {
    await this.handle.query(
      `INSERT INTO closing.workspaces (
         closing_workspace_id, tenant_id, workspace_id, deal_id, version,
         status, document, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        workspace.closingWorkspaceId,
        workspace.scope.tenantId,
        workspace.scope.workspaceId,
        workspace.scope.dealId,
        workspace.version,
        workspace.status,
        JSON.stringify(workspace),
        workspace.createdAt,
        workspace.updatedAt,
      ],
    );
  }

  async replace(
    workspace: ClosingWorkspace,
    expectedVersion: number,
  ): Promise<void> {
    const result = await this.handle.query(
      `UPDATE closing.workspaces
       SET version = $5, status = $6, document = $7, updated_at = $8
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND closing_workspace_id = $4 AND version = $9`,
      [
        workspace.scope.tenantId,
        workspace.scope.workspaceId,
        workspace.scope.dealId,
        workspace.closingWorkspaceId,
        workspace.version,
        workspace.status,
        JSON.stringify(workspace),
        workspace.updatedAt,
        expectedVersion,
      ],
    );
    if (result.rowCount === 1) return;
    throw new ClosingError(
      "STALE_VERSION",
      `Closing workspace "${workspace.closingWorkspaceId}" version "${expectedVersion}" is stale; expected one exact PostgreSQL aggregate update.`,
    );
  }
}

interface ClosingWorkspaceRow {
  readonly document: ClosingWorkspace;
}

export class PostgresClosingUnitOfWork implements ClosingUnitOfWork {
  private readonly idempotency: IdempotencyRepository;

  constructor(
    private readonly transactions: PostgresTransactionRunner,
    clock: { now(): Date },
  ) {
    this.idempotency = new IdempotencyRepository(clock);
  }

  read<TResult>(
    operation: (transaction: ClosingTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return this.transactions.run((handle) =>
      operation(new PostgresClosingTransaction(handle))
    );
  }

  run(
    identity: ClosingCommandIdentity,
    operation: (transaction: ClosingTransaction) => Promise<ClosingWorkspace>,
  ): Promise<ClosingCommandResult> {
    return this.transactions.run(async (handle) => {
      const transaction = new PostgresClosingTransaction(handle);
      const claim = postgresClaim(identity);
      const status = await this.idempotency.claim(handle, claim);
      if (status.status === "replay") return this.replay(transaction, identity);
      if (status.status !== "claimed") {
        throw new ClosingError(
          "IDEMPOTENCY_CONFLICT",
          `Closing idempotency key "${identity.idempotencyKey}" is "${status.status}"; expected one command executor.`,
        );
      }
      const workspace = await operation(transaction);
      await saveCommandResult(handle, identity, workspace);
      await this.idempotency.complete(handle, claim, resultReference(identity));
      return { workspace, replayed: false };
    });
  }

  private async replay(
    transaction: PostgresClosingTransaction,
    identity: ClosingCommandIdentity,
  ): Promise<ClosingCommandResult> {
    const result = await transaction.handle.query<ClosingResultRow>(
      `SELECT result FROM closing.command_results WHERE command_key = $1`,
      [commandKey(identity)],
    );
    const workspace = result.rows[0]?.result;
    if (workspace === undefined) {
      throw new ClosingError(
        "IDEMPOTENCY_CONFLICT",
        `Closing command result for idempotency key "${identity.idempotencyKey}" is missing; expected durable replay state.`,
      );
    }
    return { workspace: freezeWorkspace(workspace), replayed: true };
  }
}

interface ClosingResultRow {
  readonly result: ClosingWorkspace;
}

function postgresClaim(identity: ClosingCommandIdentity): IdempotencyClaim {
  return {
    tenantId: identity.tenantId,
    actorId: identity.actorId,
    commandType: identity.commandType,
    targetType: "closing_workspace",
    targetId: `${identity.workspaceId}|${identity.dealId}|${identity.targetId}`,
    idempotencyKey: identity.idempotencyKey,
    payloadDigest: identity.payloadDigest,
    expiresAt: new Date(Date.parse(identity.recordedAt) + 86_400_000),
  };
}

async function saveCommandResult(
  transaction: TransactionHandle,
  identity: ClosingCommandIdentity,
  workspace: ClosingWorkspace,
): Promise<void> {
  await transaction.query(
    `INSERT INTO closing.command_results (
       command_key, tenant_id, workspace_id, deal_id, actor_id,
       command_type, idempotency_key, payload_digest, result, recorded_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      commandKey(identity),
      identity.tenantId,
      identity.workspaceId,
      identity.dealId,
      identity.actorId,
      identity.commandType,
      identity.idempotencyKey,
      identity.payloadDigest,
      JSON.stringify(workspace),
      identity.recordedAt,
    ],
  );
}

function commandKey(identity: ClosingCommandIdentity): string {
  return [
    identity.tenantId,
    identity.workspaceId,
    identity.dealId,
    identity.actorId,
    identity.commandType,
    identity.targetId,
    identity.idempotencyKey,
  ].join("|");
}

function resultReference(identity: ClosingCommandIdentity): string {
  return `closing_result_${identity.idempotencyKey}`;
}
