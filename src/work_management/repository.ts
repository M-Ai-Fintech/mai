import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { WorkManagementEvent } from "./events.ts";
import type {
  ApprovalDecision,
  ApprovalRequest,
  Task,
  WorkAggregate,
  Workstream,
} from "./model.ts";
import { WorkManagementError } from "./model.ts";
import { semanticallyEquivalent } from "./record_identity.ts";
import type { TargetCommandDispatch } from "./target_commands.ts";
import type {
  ApprovalRequestId,
  TaskId,
  WorkScope,
  WorkstreamId,
} from "./ids.ts";

export type WorkHistoryRecord = WorkManagementEvent;

export interface WorkCommandResult {
  readonly resultId: string;
  readonly aggregate: WorkAggregate;
  readonly recordedAt: string;
}

export class WorkManagementRecordConflictError extends Error {
  readonly code = "IMMUTABLE_RECORD_CONFLICT" as const;

  constructor(readonly recordType: string, readonly recordId: string) {
    super(
      `Work Management ${recordType} "${recordId}" conflicts with a different immutable record; expected exact semantic replay.`,
    );
    this.name = "WorkManagementRecordConflictError";
  }
}

export class WorkManagementVersionConflictError extends Error {
  readonly code = "VERSION_CONFLICT" as const;

  constructor(
    readonly aggregateId: string,
    readonly expectedVersion: AggregateVersion | number,
    readonly currentVersion: AggregateVersion | number | undefined,
  ) {
    super(
      `Work aggregate "${aggregateId}" expected version "${expectedVersion}" but current version is "${
        currentVersion ?? "missing"
      }"; expected an exact optimistic-concurrency match.`,
    );
    this.name = "WorkManagementVersionConflictError";
  }
}

export interface WorkManagementTransaction {
  findWorkstream(
    scope: WorkScope,
    id: WorkstreamId,
  ): Promise<Workstream | undefined>;
  findTask(scope: WorkScope, id: TaskId): Promise<Task | undefined>;
  listTasksByWorkstream(
    scope: WorkScope,
    workstreamId: WorkstreamId,
  ): Promise<readonly Task[]>;
  findApprovalRequest(
    scope: WorkScope,
    id: ApprovalRequestId,
  ): Promise<ApprovalRequest | undefined>;
  listHistory(
    scope: WorkScope,
    aggregateType: string,
    aggregateId: string,
  ): Promise<readonly WorkHistoryRecord[]>;
  saveWorkstream(aggregate: Workstream, expectedVersion: number): Promise<void>;
  saveTask(aggregate: Task, expectedVersion: number): Promise<void>;
  saveApprovalRequest(
    aggregate: ApprovalRequest,
    expectedVersion: number,
  ): Promise<void>;
  appendApprovalDecision(
    request: ApprovalRequest,
    decision: ApprovalDecision,
  ): Promise<void>;
  listApprovalDecisions(
    scope: WorkScope,
    requestId: ApprovalRequestId,
  ): Promise<readonly ApprovalDecision[]>;
  appendHistory(event: WorkHistoryRecord): Promise<void>;
  saveCommandResult(result: WorkCommandResult): Promise<void>;
  findCommandResult(resultId: string): Promise<WorkCommandResult | undefined>;
  appendTargetCommand(dispatch: TargetCommandDispatch): Promise<void>;
  listTargetCommands(
    scope: WorkScope,
    requestId: ApprovalRequestId,
  ): Promise<readonly TargetCommandDispatch[]>;
}

export interface WorkManagementRepository extends WorkManagementTransaction {
  run<TResult>(
    callback: (
      transaction: WorkManagementTransaction,
    ) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

export interface WorkManagementSqlRepository extends WorkManagementTransaction {
  readonly transaction: TransactionHandle;
}

export class InMemoryWorkManagementRepository
  implements WorkManagementRepository {
  private readonly workstreams = new Map<string, Workstream>();
  private readonly tasks = new Map<string, Task>();
  private readonly approvals = new Map<string, ApprovalRequest>();
  private readonly history = new Map<string, WorkHistoryRecord[]>();
  private readonly decisions = new Map<string, ApprovalDecision>();
  private readonly decisionRequests = new Map<string, ApprovalRequest>();
  private readonly commandResults = new Map<string, WorkCommandResult>();
  private readonly targetCommands = new Map<string, TargetCommandDispatch>();

  findWorkstream(
    scope: WorkScope,
    id: WorkstreamId,
  ): Promise<Workstream | undefined> {
    return Promise.resolve(clone(this.workstreams.get(key(scope, id))));
  }

  findTask(scope: WorkScope, id: TaskId): Promise<Task | undefined> {
    return Promise.resolve(clone(this.tasks.get(key(scope, id))));
  }

  listTasksByWorkstream(
    scope: WorkScope,
    workstreamId: WorkstreamId,
  ): Promise<readonly Task[]> {
    return Promise.resolve(
      [...this.tasks.values()].filter((task) =>
        task.workstreamId === workstreamId &&
        key(task, task.id) === key(scope, task.id)
      ).sort((left, right) => left.id.localeCompare(right.id)).map(
        cloneRequired,
      ),
    );
  }

  findApprovalRequest(
    scope: WorkScope,
    id: ApprovalRequestId,
  ): Promise<ApprovalRequest | undefined> {
    return Promise.resolve(clone(this.approvals.get(key(scope, id))));
  }

  listHistory(
    scope: WorkScope,
    aggregateType: string,
    aggregateId: string,
  ): Promise<readonly WorkHistoryRecord[]> {
    return Promise.resolve(
      (this.history.get(key(scope, `${aggregateType}:${aggregateId}`)) ?? [])
        .map(cloneRequired),
    );
  }

  async saveWorkstream(
    aggregate: Workstream,
    expectedVersion: number,
  ): Promise<void> {
    await this.save(this.workstreams, aggregate, expectedVersion);
  }

  async saveTask(aggregate: Task, expectedVersion: number): Promise<void> {
    await this.save(this.tasks, aggregate, expectedVersion);
  }

  async saveApprovalRequest(
    aggregate: ApprovalRequest,
    expectedVersion: number,
  ): Promise<void> {
    await this.save(this.approvals, aggregate, expectedVersion);
  }

  appendApprovalDecision(
    request: ApprovalRequest,
    decision: ApprovalDecision,
  ): Promise<void> {
    const decisionKey = decision.id;
    const existing = this.decisions.get(decisionKey);
    if (existing === undefined) {
      this.decisions.set(decisionKey, cloneRequired(decision));
      this.decisionRequests.set(decisionKey, cloneRequired(request));
      return Promise.resolve();
    }
    const existingRequest = this.decisionRequests.get(decisionKey);
    if (
      semanticallyEquivalent(existing, decision) &&
      semanticallyEquivalent(existingRequest, request)
    ) return Promise.resolve();
    throw new WorkManagementRecordConflictError("decision", decision.id);
  }

  listApprovalDecisions(
    scope: WorkScope,
    requestId: ApprovalRequestId,
  ): Promise<readonly ApprovalDecision[]> {
    const values = [...this.decisions.entries()].filter(([decisionId]) => {
      const request = this.decisionRequests.get(decisionId);
      return request !== undefined && request.id === requestId &&
        key(request, request.id) === key(scope, requestId);
    }).map(([, decision]) => cloneRequired(decision));
    return Promise.resolve(values);
  }

  appendHistory(event: WorkHistoryRecord): Promise<void> {
    const scope = {
      tenantId: event.tenantId,
      workspaceId: event.workspaceId,
      dealId: event.dealId,
    };
    const aggregateKey = key(
      scope,
      `${event.aggregateType}:${event.aggregateId}`,
    );
    const entries = this.history.get(aggregateKey) ?? [];
    const sameId = [...this.history.values()].flat().find((item) =>
      item.eventId === event.eventId
    );
    if (sameId !== undefined) {
      if (semanticallyEquivalent(sameId, event)) return Promise.resolve();
      throw new WorkManagementRecordConflictError(
        "history event",
        event.eventId,
      );
    }
    if (
      entries.some((item) => item.aggregateVersion === event.aggregateVersion)
    ) {
      throw new WorkManagementError(
        "REFERENCE_MISMATCH",
        `Work aggregate "${event.aggregateId}" history version "${event.aggregateVersion}" already exists; expected one immutable event per version.`,
      );
    }
    entries.push(cloneRequired(event));
    this.history.set(aggregateKey, entries);
    return Promise.resolve();
  }

  saveCommandResult(result: WorkCommandResult): Promise<void> {
    const existing = this.commandResults.get(result.resultId);
    if (existing === undefined) {
      this.commandResults.set(result.resultId, cloneRequired(result));
      return Promise.resolve();
    }
    if (semanticallyEquivalent(existing, result)) return Promise.resolve();
    throw new WorkManagementRecordConflictError(
      "command result",
      result.resultId,
    );
  }

  findCommandResult(resultId: string): Promise<WorkCommandResult | undefined> {
    return Promise.resolve(clone(this.commandResults.get(resultId)));
  }

  appendTargetCommand(dispatch: TargetCommandDispatch): Promise<void> {
    const existing = this.targetCommands.get(dispatch.dispatchId);
    if (existing === undefined) {
      this.targetCommands.set(dispatch.dispatchId, cloneRequired(dispatch));
      return Promise.resolve();
    }
    if (semanticallyEquivalent(existing, dispatch)) return Promise.resolve();
    throw new WorkManagementRecordConflictError(
      "target command",
      dispatch.dispatchId,
    );
  }

  listTargetCommands(
    scope: WorkScope,
    requestId: ApprovalRequestId,
  ): Promise<readonly TargetCommandDispatch[]> {
    return Promise.resolve(
      [...this.targetCommands.values()].filter((item) =>
        item.approvalRequestId === requestId &&
        key(item, requestId) === key(scope, requestId)
      ).map(cloneRequired),
    );
  }

  run<TResult>(
    callback: (
      transaction: WorkManagementTransaction,
    ) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    const workstreams = new Map(this.workstreams);
    const tasks = new Map(this.tasks);
    const approvals = new Map(this.approvals);
    const history = new Map(
      [...this.history].map(([key, events]) => [key, [...events]]),
    );
    const decisions = new Map(this.decisions);
    const decisionRequests = new Map(this.decisionRequests);
    const commandResults = new Map(this.commandResults);
    const targetCommands = new Map(this.targetCommands);
    return Promise.resolve().then(() => callback(this)).catch(
      (error: unknown) => {
        restore(this.workstreams, workstreams);
        restore(this.tasks, tasks);
        restore(this.approvals, approvals);
        restore(this.history, history);
        restore(this.decisions, decisions);
        restore(this.decisionRequests, decisionRequests);
        restore(this.commandResults, commandResults);
        restore(this.targetCommands, targetCommands);
        throw error;
      },
    );
  }

  private save<
    T extends {
      readonly id: string;
      readonly tenantId: string;
      readonly workspaceId: string;
      readonly dealId: string;
      readonly version: number;
    },
  >(
    store: Map<string, T>,
    aggregate: T,
    expectedVersion: number,
  ): Promise<void> {
    const aggregateKey = key(aggregate, aggregate.id);
    const current = store.get(aggregateKey);
    if (current === undefined && expectedVersion !== 0) {
      throw new WorkManagementVersionConflictError(
        aggregate.id,
        expectedVersion,
        undefined,
      );
    }
    if (current !== undefined && current.version !== expectedVersion) {
      throw new WorkManagementVersionConflictError(
        aggregate.id,
        expectedVersion,
        current.version,
      );
    }
    store.set(aggregateKey, cloneRequired(aggregate));
    return Promise.resolve();
  }
}

function key(
  scope: WorkScope | {
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly dealId: string;
  },
  id: string,
): string {
  return `${scope.tenantId}|${scope.workspaceId}|${scope.dealId}|${id}`;
}

function clone<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : structuredClone(value);
}

function cloneRequired<T>(value: T): T {
  return structuredClone(value);
}

function restore<T>(target: Map<string, T>, snapshot: Map<string, T>): void {
  target.clear();
  for (const [key, value] of snapshot) target.set(key, value);
}
