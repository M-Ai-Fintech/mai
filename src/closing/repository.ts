import type { IdempotencyKey } from "../platform/api/v1.ts";
import type { ActorId } from "../platform/api/v1.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { ClosingScope, ClosingWorkspace } from "./model.ts";
import { ClosingError, freezeWorkspace } from "./model.ts";

export interface ClosingCommandIdentity extends ClosingScope {
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetId: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly payloadDigest: string;
  readonly recordedAt: string;
}

export interface ClosingTransaction {
  readonly kind: "in_memory" | "postgres";
  readonly handle?: TransactionHandle;
  find(
    scope: ClosingScope,
    workspaceId: string,
  ): Promise<ClosingWorkspace | undefined>;
  insert(workspace: ClosingWorkspace): Promise<void>;
  replace(workspace: ClosingWorkspace, expectedVersion: number): Promise<void>;
}

export interface ClosingCommandResult {
  readonly workspace: ClosingWorkspace;
  readonly replayed: boolean;
}

export interface ClosingUnitOfWork {
  read<TResult>(
    operation: (transaction: ClosingTransaction) => Promise<TResult>,
  ): Promise<TResult>;
  run(
    identity: ClosingCommandIdentity,
    operation: (transaction: ClosingTransaction) => Promise<ClosingWorkspace>,
  ): Promise<ClosingCommandResult>;
}

export class InMemoryClosingUnitOfWork implements ClosingUnitOfWork {
  private readonly workspaces = new Map<string, ClosingWorkspace>();
  private readonly claims = new Map<string, InMemoryClaim>();
  private readonly transaction = new InMemoryClosingTransaction(
    this.workspaces,
  );

  read<TResult>(
    operation: (transaction: ClosingTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return operation(this.transaction);
  }

  async run(
    identity: ClosingCommandIdentity,
    operation: (transaction: ClosingTransaction) => Promise<ClosingWorkspace>,
  ): Promise<ClosingCommandResult> {
    const key = commandKey(identity);
    const existing = this.claims.get(key);
    if (existing !== undefined) return replayClaim(existing, identity);
    this.claims.set(key, { payloadDigest: identity.payloadDigest });
    const snapshot = new Map(this.workspaces);
    try {
      const workspace = await operation(this.transaction);
      this.claims.set(key, {
        payloadDigest: identity.payloadDigest,
        workspace,
      });
      return { workspace, replayed: false };
    } catch (error) {
      this.workspaces.clear();
      for (const [workspaceKeyValue, workspace] of snapshot) {
        this.workspaces.set(workspaceKeyValue, workspace);
      }
      this.claims.delete(key);
      throw error;
    }
  }
}

interface InMemoryClaim {
  readonly payloadDigest: string;
  readonly workspace?: ClosingWorkspace;
}

class InMemoryClosingTransaction implements ClosingTransaction {
  readonly kind = "in_memory" as const;

  constructor(private readonly workspaces: Map<string, ClosingWorkspace>) {}

  find(
    scope: ClosingScope,
    workspaceId: string,
  ): Promise<ClosingWorkspace | undefined> {
    return Promise.resolve(
      this.workspaces.get(workspaceKey(scope, workspaceId)),
    );
  }

  insert(workspace: ClosingWorkspace): Promise<void> {
    const key = workspaceKey(workspace.scope, workspace.closingWorkspaceId);
    if (this.workspaces.has(key)) {
      throw new ClosingError(
        "IDEMPOTENCY_CONFLICT",
        `Closing workspace "${workspace.closingWorkspaceId}" already exists; expected one creation command.`,
      );
    }
    this.workspaces.set(key, freezeWorkspace(workspace));
    return Promise.resolve();
  }

  replace(
    workspace: ClosingWorkspace,
    expectedVersion: number,
  ): Promise<void> {
    const key = workspaceKey(workspace.scope, workspace.closingWorkspaceId);
    const current = this.workspaces.get(key);
    if (current === undefined) {
      throw protectedNotFound(workspace.closingWorkspaceId);
    }
    if (current.version !== expectedVersion) {
      throw new ClosingError(
        "STALE_VERSION",
        `Closing workspace "${workspace.closingWorkspaceId}" version "${expectedVersion}" is stale; expected current version "${current.version}".`,
      );
    }
    this.workspaces.set(key, freezeWorkspace(workspace));
    return Promise.resolve();
  }
}

function replayClaim(
  claim: InMemoryClaim,
  identity: ClosingCommandIdentity,
): ClosingCommandResult {
  if (claim.payloadDigest !== identity.payloadDigest) {
    throw new ClosingError(
      "IDEMPOTENCY_CONFLICT",
      `Closing idempotency key "${identity.idempotencyKey}" was reused with a different payload; expected the original command.`,
    );
  }
  if (claim.workspace === undefined) {
    throw new ClosingError(
      "IDEMPOTENCY_CONFLICT",
      `Closing idempotency key "${identity.idempotencyKey}" is still in progress; expected one command executor.`,
    );
  }
  return { workspace: claim.workspace, replayed: true };
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

function workspaceKey(scope: ClosingScope, workspaceId: string): string {
  return `${scope.tenantId}|${scope.workspaceId}|${scope.dealId}|${workspaceId}`;
}

function protectedNotFound(workspaceId: string): ClosingError {
  return new ClosingError(
    "PROTECTED_NOT_FOUND",
    `Closing workspace "${workspaceId}" was not found; expected an authorized workspace in the requested scope.`,
  );
}
