import {
  action,
  type ActorReference,
  type AuthorizationDecision,
} from "../platform/authz/v1.ts";
import {
  createProtectedNotFoundError,
  type ErrorEnvelope,
} from "../platform/api/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import { payloadDigest } from "../platform/persistence/v1.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type { WorkManagementEvent } from "./events.ts";
import {
  approvalEventPayload,
  approvalNotificationPayload,
  createWorkManagementEvent,
  recipientSafeApprovalPayload,
  taskEventPayload,
  workstreamEventPayload,
} from "./events.ts";
import type {
  ApprovalRequestId,
  TaskId,
  WorkScope,
  WorkstreamId,
} from "./ids.ts";
import {
  createApprovalRequest,
  decideApprovalRequest,
  openApprovalRequest,
  withdrawApprovalRequest,
} from "./approval_requests.ts";
import { assertTaskParent, createTask, transitionTask } from "./tasks.ts";
import { createWorkstream, transitionWorkstream } from "./workstreams.ts";
import type { ApprovalRequest, Task, Workstream } from "./model.ts";
import { WorkManagementError } from "./model.ts";
import type {
  WorkManagementRepository,
  WorkManagementTransaction,
} from "./repository.ts";
import {
  InMemoryWorkManagementRepository,
  WorkManagementVersionConflictError,
} from "./repository.ts";

export interface WorkManagementAuthorizationInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: WorkScope;
  readonly resource: { readonly kind: string; readonly id: string };
  readonly action: string;
  readonly humanOnly?: boolean;
}

export interface WorkManagementAuthorizationPort {
  authorize(
    input: WorkManagementAuthorizationInput,
  ): Promise<AuthorizationDecision> | AuthorizationDecision;
}

export interface WorkManagementTransactionRunner {
  run<TResult>(
    callback: (
      transaction: WorkManagementTransaction,
    ) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

export interface WorkManagementEvidencePort {
  append(
    transaction: WorkManagementTransaction,
    event: WorkManagementEvent,
  ): Promise<void>;
}

export interface WorkManagementOutboxPort {
  append(
    transaction: WorkManagementTransaction,
    event: WorkManagementEvent,
  ): Promise<void>;
}

export interface WorkManagementClock {
  now(): string;
}

export interface WorkManagementIdempotencyStore {
  claim(
    key: string,
    digest: string,
  ): Promise<
    { readonly status: "claimed" } | {
      readonly status: "replay";
      readonly result: unknown;
    }
  >;
  complete(key: string, digest: string, result: unknown): Promise<void>;
}

export class WorkManagementIdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT" as const;

  constructor(readonly idempotencyKey: string) {
    super(
      `Work Management idempotency key "${idempotencyKey}" was reused with a different command payload; expected the original actor-command-target identity.`,
    );
    this.name = "WorkManagementIdempotencyConflictError";
  }
}

export class InMemoryWorkManagementIdempotencyStore
  implements WorkManagementIdempotencyStore {
  private readonly entries = new Map<
    string,
    { readonly digest: string; readonly result?: unknown }
  >();

  claim(
    key: string,
    digest: string,
  ): Promise<
    { readonly status: "claimed" } | {
      readonly status: "replay";
      readonly result: unknown;
    }
  > {
    const existing = this.entries.get(key);
    if (existing === undefined) {
      this.entries.set(key, { digest });
      return Promise.resolve({ status: "claimed" });
    }
    if (existing.digest !== digest) {
      throw new WorkManagementIdempotencyConflictError(key);
    }
    if (existing.result === undefined) {
      return Promise.resolve({ status: "claimed" });
    }
    return Promise.resolve({ status: "replay", result: existing.result });
  }

  complete(key: string, digest: string, result: unknown): Promise<void> {
    const existing = this.entries.get(key);
    if (existing === undefined || existing.digest !== digest) {
      throw new WorkManagementError(
        "INVALID_INPUT",
        `Idempotency key "${key}" cannot complete; expected its original digest.`,
      );
    }
    this.entries.set(key, { digest, result });
    return Promise.resolve();
  }
}

export interface WorkManagementCompositionOptions {
  readonly repository?: WorkManagementRepository;
  readonly transactions?: WorkManagementTransactionRunner;
  readonly authorization: WorkManagementAuthorizationPort;
  readonly idempotency?: WorkManagementIdempotencyStore;
  readonly evidence?: WorkManagementEvidencePort;
  readonly outbox?: WorkManagementOutboxPort;
  readonly clock: WorkManagementClock;
}

export interface WorkManagementComposition {
  readonly repository: WorkManagementRepository;
  readonly service: WorkManagementService;
}

export function createWorkManagementComposition(
  options: WorkManagementCompositionOptions,
): WorkManagementComposition {
  const repository = options.repository ??
    new InMemoryWorkManagementRepository();
  return {
    repository,
    service: new WorkManagementService({ ...options, repository }),
  };
}

export type WorkReadResult<T> =
  | { readonly kind: "loaded"; readonly value: T }
  | { readonly kind: "protected_not_found"; readonly response: ErrorEnvelope };

export class WorkManagementService {
  private readonly repository: WorkManagementRepository;
  private readonly authorization: WorkManagementAuthorizationPort;
  private readonly idempotency: WorkManagementIdempotencyStore;
  private readonly evidence?: WorkManagementEvidencePort;
  private readonly outbox?: WorkManagementOutboxPort;
  private readonly clock: WorkManagementClock;

  constructor(
    options: WorkManagementCompositionOptions & {
      readonly repository: WorkManagementRepository;
    },
  ) {
    this.repository = options.repository;
    this.authorization = options.authorization;
    this.idempotency = options.idempotency ??
      new InMemoryWorkManagementIdempotencyStore();
    this.evidence = options.evidence;
    this.outbox = options.outbox;
    this.clock = options.clock;
  }

  async getWorkstream(
    input: ReadInput<WorkstreamId>,
  ): Promise<WorkReadResult<Workstream>> {
    const decision = await this.authorize(input, "read", "workstream");
    if (decision.outcome === "deny") return protectedNotFound(input.context);
    const value = await this.repository.findWorkstream(input.scope, input.id);
    return value === undefined
      ? protectedNotFound(input.context)
      : { kind: "loaded", value };
  }

  async getTask(input: ReadInput<TaskId>): Promise<WorkReadResult<Task>> {
    const decision = await this.authorize(input, "read", "task");
    if (decision.outcome === "deny") return protectedNotFound(input.context);
    const value = await this.repository.findTask(input.scope, input.id);
    return value === undefined
      ? protectedNotFound(input.context)
      : { kind: "loaded", value };
  }

  async getApprovalRequest(
    input: ReadInput<ApprovalRequestId>,
  ): Promise<WorkReadResult<ApprovalRequest>> {
    const decision = await this.authorize(input, "read", "approval_request");
    if (decision.outcome === "deny") return protectedNotFound(input.context);
    const value = await this.repository.findApprovalRequest(
      input.scope,
      input.id,
    );
    return value === undefined
      ? protectedNotFound(input.context)
      : { kind: "loaded", value };
  }

  async createWorkstream(
    input: CreateCommand<WorkstreamId> & {
      readonly name: string;
      readonly ownerId: Workstream["ownerId"];
    },
  ): Promise<Workstream> {
    await this.requireAllowed(input, "create", "workstream");
    const workstream = createWorkstream({
      ...input.scope,
      id: input.id,
      name: input.name,
      ownerId: input.ownerId,
      now: this.clock.now(),
    });
    return await this.commit(
      withCommandPayload(input, { name: input.name, ownerId: input.ownerId }),
      "create_workstream",
      workstream,
      (transaction) => transaction.saveWorkstream(workstream, 0),
    );
  }

  async transitionWorkstream(
    input: CommandInput<WorkstreamId> & {
      readonly toState: Workstream["state"];
    },
  ): Promise<Workstream> {
    await this.requireAllowed(input, "transition", "workstream");
    return await this.command(
      withCommandPayload(input, { toState: input.toState }),
      "transition_workstream",
      "workstream",
      async (transaction) => {
        const current = await transaction.findWorkstream(input.scope, input.id);
        if (current === undefined) {
          throw new WorkManagementError(
            "SCOPE_MISMATCH",
            `Workstream "${input.id}" was not found in the requested scope; expected a protected resource.`,
          );
        }
        assertExpectedVersion(input.id, current.version, input.expectedVersion);
        const tasks = await Promise.all(
          current.taskIds.map((taskId) =>
            transaction.findTask(input.scope, taskId)
          ),
        );
        const next = transitionWorkstream(current, {
          toState: input.toState,
          actor: input.actor,
          now: this.clock.now(),
          tasks: tasks.filter((task): task is Task => task !== undefined),
        });
        await transaction.saveWorkstream(
          next,
          input.expectedVersion ?? current.version,
        );
        return next;
      },
    );
  }

  async createTask(
    input: CreateCommand<TaskId> & {
      readonly workstreamId: Workstream["id"];
      readonly title: string;
      readonly assigneeId: Task["assigneeId"];
      readonly parentTaskId?: Task["parentTaskId"];
      readonly target?: Task["target"];
    },
  ): Promise<Task> {
    await this.requireAllowed(input, "create", "task");
    const task = createTask({
      ...input.scope,
      id: input.id,
      workstreamId: input.workstreamId,
      parentTaskId: input.parentTaskId,
      title: input.title,
      assigneeId: input.assigneeId,
      target: input.target,
      now: this.clock.now(),
    });
    return await this.commit(
      withCommandPayload(input, {
        workstreamId: input.workstreamId,
        parentTaskId: input.parentTaskId,
        title: input.title,
        assigneeId: input.assigneeId,
        target: input.target,
      }),
      "create_task",
      task,
      async (transaction) => {
        const workstream = await transaction.findWorkstream(
          input.scope,
          input.workstreamId,
        );
        if (workstream === undefined) {
          throw new WorkManagementError(
            "REFERENCE_MISMATCH",
            `Task "${input.id}" references Workstream "${input.workstreamId}" outside the requested scope; expected an existing owned Workstream.`,
          );
        }
        if (input.parentTaskId !== undefined) {
          const parent = await transaction.findTask(
            input.scope,
            input.parentTaskId,
          );
          if (parent === undefined) {
            throw new WorkManagementError(
              "REFERENCE_MISMATCH",
              `Task "${input.id}" parent "${input.parentTaskId}" is missing in the requested scope; expected an existing parent Task.`,
            );
          }
          assertTaskParent(task, parent);
        }
        await transaction.saveTask(task, 0);
      },
    );
  }

  async transitionTask(
    input: CommandInput<TaskId> & { readonly toState: Task["state"] },
  ): Promise<Task> {
    await this.requireAllowed(input, "transition", "task");
    return await this.command(
      withCommandPayload(input, { toState: input.toState }),
      "transition_task",
      "task",
      async (transaction) => {
        const current = await transaction.findTask(input.scope, input.id);
        if (current === undefined) {
          throw new WorkManagementError(
            "SCOPE_MISMATCH",
            `Task "${input.id}" was not found in the requested scope; expected a protected resource.`,
          );
        }
        assertExpectedVersion(input.id, current.version, input.expectedVersion);
        const next = transitionTask(current, {
          toState: input.toState,
          actor: input.actor,
          now: this.clock.now(),
        });
        await transaction.saveTask(
          next,
          input.expectedVersion ?? current.version,
        );
        return next;
      },
    );
  }

  async createApprovalRequest(
    input: CreateCommand<ApprovalRequestId> & {
      readonly requesterId: ApprovalRequest["requesterId"];
      readonly namedApproverId: ApprovalRequest["namedApproverId"];
      readonly package: ApprovalRequest["package"];
    },
  ): Promise<ApprovalRequest> {
    await this.requireAllowed(input, "create", "approval_request");
    const request = createApprovalRequest({
      ...input.scope,
      id: input.id,
      requesterId: input.requesterId,
      namedApproverId: input.namedApproverId,
      package: input.package,
      now: this.clock.now(),
    });
    return await this.commit(
      withCommandPayload(input, {
        requesterId: input.requesterId,
        namedApproverId: input.namedApproverId,
        package: input.package,
      }),
      "create_approval_request",
      request,
      (transaction) => transaction.saveApprovalRequest(request, 0),
    );
  }

  async openApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    await this.requireAllowed(input, "open", "approval_request");
    return await this.command(
      withCommandPayload(input, {}),
      "open_approval_request",
      "approval_request",
      async (transaction) => {
        const current = await this.requireApproval(transaction, input);
        assertExpectedVersion(input.id, current.version, input.expectedVersion);
        const next = openApprovalRequest(current, {
          actor: input.actor,
          now: this.clock.now(),
        });
        await transaction.saveApprovalRequest(
          next,
          input.expectedVersion ?? current.version,
        );
        return next;
      },
    );
  }

  async decideApprovalRequest(
    input: CommandInput<ApprovalRequestId> & {
      readonly package: ApprovalRequest["package"];
      readonly outcome: "approved" | "rejected";
    },
  ): Promise<ApprovalRequest> {
    if (input.decisionId === undefined) {
      throw new WorkManagementError(
        "INVALID_INPUT",
        `Approval request "${input.id}" decision is missing a decision ID; expected a stable decision identifier.`,
      );
    }
    const decisionId = input.decisionId;
    await this.requireAllowed(
      input,
      input.outcome === "approved" ? "approve" : "reject",
      "approval_request",
      true,
    );
    return await this.command(
      withCommandPayload(input, {
        package: input.package,
        outcome: input.outcome,
        decisionId,
        reason: input.reason,
        currentTargetVersion: input.currentTargetVersion,
      }),
      "decide_approval_request",
      "approval_request",
      async (transaction) => {
        const current = await this.requireApproval(transaction, input);
        assertExpectedVersion(input.id, current.version, input.expectedVersion);
        const next = decideApprovalRequest(current, {
          actor: input.actor,
          expectedPackage: input.package,
          outcome: input.outcome,
          decisionId,
          currentTargetVersion: input.currentTargetVersion,
          reason: input.reason,
          now: this.clock.now(),
        });
        await transaction.saveApprovalRequest(
          next,
          input.expectedVersion ?? current.version,
        );
        return next;
      },
    );
  }

  async withdrawApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    await this.requireAllowed(input, "withdraw", "approval_request", true);
    return await this.command(
      withCommandPayload(input, {}),
      "withdraw_approval_request",
      "approval_request",
      async (transaction) => {
        const current = await this.requireApproval(transaction, input);
        assertExpectedVersion(input.id, current.version, input.expectedVersion);
        const next = withdrawApprovalRequest(current, {
          actor: input.actor,
          now: this.clock.now(),
        });
        await transaction.saveApprovalRequest(
          next,
          input.expectedVersion ?? current.version,
        );
        return next;
      },
    );
  }

  private async requireApproval(
    transaction: WorkManagementTransaction,
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    const current = await transaction.findApprovalRequest(
      input.scope,
      input.id,
    );
    if (current === undefined) {
      throw new WorkManagementError(
        "SCOPE_MISMATCH",
        `Approval Request "${input.id}" was not found in the requested scope; expected a protected resource.`,
      );
    }
    return current;
  }

  private async command<T extends Workstream | Task | ApprovalRequest>(
    input: CommandInput<string>,
    type: string,
    aggregateType: string,
    operation: (transaction: WorkManagementTransaction) => Promise<T>,
  ): Promise<T> {
    const digest = await payloadDigest(commandDigest(type, input));
    const claimKey = idempotencyIdentity(input, type);
    const claim = await this.idempotency.claim(claimKey, digest);
    if (claim.status === "replay") return claim.result as T;
    const result = await this.repository.run(async (transaction) => {
      const value = await operation(transaction);
      const event = createWorkManagementEvent({
        eventId: input.eventId,
        aggregateType: aggregateType as
          | "workstream"
          | "task"
          | "approval_request",
        aggregateId: input.id,
        aggregateVersion: value.version,
        tenantId: value.tenantId,
        workspaceId: value.workspaceId,
        dealId: value.dealId,
        eventType: input.eventType,
        actor: input.actor,
        correlationId: input.context.correlationId,
        payload: eventPayload(value),
        occurredAt: new Date(this.clock.now()),
      });
      await transaction.appendHistory(event);
      if (
        value.aggregateType === "approval_request" &&
        value.decision !== undefined
      ) {
        await transaction.appendApprovalDecision(value, value.decision);
      }
      if (this.evidence !== undefined) {
        await this.evidence.append(transaction, event);
      }
      if (this.outbox !== undefined) {
        await this.outbox.append(transaction, event);
      }
      return value;
    });
    await this.idempotency.complete(claimKey, digest, result);
    return result;
  }

  private async commit<T extends Workstream | Task | ApprovalRequest>(
    input: CreateCommand<string>,
    type: string,
    value: T,
    save: (transaction: WorkManagementTransaction) => Promise<void>,
  ): Promise<T> {
    const digest = await payloadDigest(commandDigest(type, input));
    const claimKey = idempotencyIdentity(input, type);
    const claim = await this.idempotency.claim(claimKey, digest);
    if (claim.status === "replay") return claim.result as T;
    await this.repository.run(async (transaction) => {
      await save(transaction);
      const event = createWorkManagementEvent({
        eventId: input.eventId,
        aggregateType: value.aggregateType,
        aggregateId: value.id,
        aggregateVersion: value.version,
        tenantId: value.tenantId,
        workspaceId: value.workspaceId,
        dealId: value.dealId,
        eventType: input.eventType,
        actor: input.actor,
        correlationId: input.context.correlationId,
        payload: eventPayload(value),
        occurredAt: new Date(this.clock.now()),
      });
      await transaction.appendHistory(event);
      if (this.evidence !== undefined) {
        await this.evidence.append(transaction, event);
      }
      if (this.outbox !== undefined) {
        await this.outbox.append(transaction, event);
      }
    });
    await this.idempotency.complete(claimKey, digest, value);
    return value;
  }

  private async authorize(
    input: {
      readonly context: RequestContext;
      readonly actor: ActorReference;
      readonly scope: WorkScope;
      readonly id: string;
    },
    actionName: string,
    kind: string,
    humanOnly = false,
  ): Promise<AuthorizationDecision> {
    return await this.authorization.authorize({
      context: input.context,
      actor: input.actor,
      scope: input.scope,
      resource: { kind, id: input.id },
      action: action(actionName),
      humanOnly,
    });
  }

  private async requireAllowed(
    input: {
      readonly context: RequestContext;
      readonly actor: ActorReference;
      readonly scope: WorkScope;
      readonly id: string;
    },
    actionName: string,
    kind: string,
    humanOnly = false,
  ): Promise<void> {
    const decision = await this.authorize(input, actionName, kind, humanOnly);
    if (decision.outcome === "allow") return;
    throw new WorkManagementError(
      "HUMAN_AUTHORITY_REQUIRED",
      `Actor "${input.actor.id}" is not authorized to ${actionName} ${kind}; expected an allowed scoped command.`,
    );
  }
}

export interface ReadInput<Id extends string> {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: WorkScope;
  readonly id: Id;
}

export interface CreateCommand<Id extends string> extends CommandInput<Id> {
  readonly commandPayload?: Readonly<Record<string, unknown>>;
}

export interface CommandInput<Id extends string> extends ReadInput<Id> {
  readonly idempotencyKey: string;
  readonly eventId: WorkManagementEvent["eventId"];
  readonly eventType: WorkManagementEvent["eventType"];
  readonly decisionId?: import("./ids.ts").ApprovalDecisionId;
  readonly reason?: string;
  readonly expectedVersion?: number;
  readonly currentTargetVersion?: AggregateVersion;
  readonly commandPayload?: Readonly<Record<string, unknown>>;
}

function protectedNotFound(
  context: RequestContext,
): { readonly kind: "protected_not_found"; readonly response: ErrorEnvelope } {
  return {
    kind: "protected_not_found",
    response: createProtectedNotFoundError(context.correlationId),
  };
}

function commandDigest(
  type: string,
  input: {
    readonly id: string;
    readonly scope: WorkScope;
    readonly expectedVersion?: number;
    readonly commandPayload?: Readonly<Record<string, unknown>>;
  },
): Readonly<Record<string, unknown>> {
  return {
    type,
    id: input.id,
    scope: input.scope,
    ...(input.expectedVersion === undefined
      ? {}
      : { expectedVersion: input.expectedVersion }),
    ...(input.commandPayload === undefined
      ? {}
      : { command: input.commandPayload }),
  };
}

function eventPayload(
  value: Workstream | Task | ApprovalRequest,
): Readonly<Record<string, unknown>> {
  if (value.aggregateType === "workstream") {
    return {
      ...workstreamEventPayload(value),
    };
  }
  if (value.aggregateType === "task") {
    return {
      ...taskEventPayload(value),
    };
  }
  const notification = approvalNotificationPayload(value);
  if (!recipientSafeApprovalPayload(notification)) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Approval Request "${value.id}" notification payload is not recipient-safe; expected no evidence, rationale, or target details.`,
    );
  }
  return {
    ...approvalEventPayload(value, value.decision?.outcome),
    notification,
  };
}

function idempotencyIdentity(
  input: {
    readonly id: string;
    readonly scope: WorkScope;
    readonly actor: ActorReference;
    readonly idempotencyKey: string;
  },
  commandType: string,
): string {
  return [
    input.scope.tenantId,
    input.scope.workspaceId,
    input.scope.dealId,
    input.actor.id,
    commandType,
    input.id,
    input.idempotencyKey,
  ].join("|");
}

function withCommandPayload<
  T extends {
    readonly commandPayload?: Readonly<Record<string, unknown>>;
  },
>(
  input: T,
  payload: Readonly<Record<string, unknown>>,
): T {
  const merged = { ...input.commandPayload, ...payload };
  const commandPayload = Object.fromEntries(
    Object.entries(merged).filter(([, value]) => value !== undefined),
  );
  return { ...input, commandPayload };
}

function assertExpectedVersion(
  aggregateId: string,
  currentVersion: number,
  expectedVersion: number | undefined,
): void {
  if (expectedVersion === undefined || expectedVersion === currentVersion) {
    return;
  }
  throw new WorkManagementVersionConflictError(
    aggregateId,
    expectedVersion,
    currentVersion,
  );
}
