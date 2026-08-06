import type { ActorReference } from "../platform/authz/v1.ts";
import type { IdempotencyKey, RequestContext } from "../platform/api/v1.ts";
import { payloadDigest } from "../platform/persistence/v1.ts";
import type {
  WorkCommandExecutionIdentity,
  WorkManagementCommandUnitOfWork,
} from "./command_unit_of_work.ts";
import {
  approvalEventPayload,
  createWorkManagementEvent,
  recipientSafeApprovalPayload,
  taskEventPayload,
  type WorkManagementEventType,
  workstreamEventPayload,
} from "./events.ts";
import { workEventId, type WorkScope } from "./ids.ts";
import {
  type ApprovalRequest,
  type TargetReference,
  type WorkAggregate,
  WorkManagementError,
} from "./model.ts";
import { approvalNotificationProjection } from "./notification_projections.ts";
import type { WorkManagementTransaction } from "./repository.ts";
import {
  workRecordIdentity,
  type WorkRecordNamespace,
} from "./record_identity.ts";
import { targetCommandDispatch } from "./target_commands.ts";
import type { WorkManagementTransactionalEffects } from "./transactional_effects.ts";

export interface WorkManagementClock {
  now(): string;
}

export interface CommandInput<Id extends string> {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: WorkScope;
  readonly id: Id;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion?: number;
  readonly reason?: string;
  readonly commandPayload?: Readonly<Record<string, unknown>>;
}

export type CreateCommand<Id extends string> = CommandInput<Id>;

export interface EventChange {
  readonly aggregate: WorkAggregate;
  readonly eventType: WorkManagementEventType;
}

export interface CommandOutcome<T extends WorkAggregate> {
  readonly value: T;
  readonly events: readonly EventChange[];
  readonly dispatchRequest?: ApprovalRequest;
}

export class WorkManagementCommandExecutor {
  constructor(
    private readonly unitOfWork: WorkManagementCommandUnitOfWork,
    private readonly effects: WorkManagementTransactionalEffects,
    private readonly clock: WorkManagementClock,
  ) {}

  async execute<T extends WorkAggregate>(
    input: CommandInput<string>,
    commandType: string,
    aggregateType: WorkAggregate["aggregateType"],
    operation: (
      transaction: WorkManagementTransaction,
      digest: string,
    ) => Promise<CommandOutcome<T>>,
  ): Promise<T> {
    const digest = await payloadDigest(
      commandDigest(commandType, aggregateType, input),
    );
    const identity = await executionIdentity(
      input,
      commandType,
      aggregateType,
      digest,
      this.clock.now(),
    );
    const result = await this.unitOfWork.run(identity, async (transaction) => {
      const command = await operation(transaction, digest);
      const eventIds = await this.persistEvents(
        transaction,
        input,
        commandType,
        digest,
        command.events,
      );
      if (command.dispatchRequest !== undefined) {
        await this.persistDispatch(
          transaction,
          input,
          commandType,
          digest,
          command.dispatchRequest,
          eventIds[0],
        );
      }
      return command.value;
    });
    return result.value;
  }

  private async persistEvents(
    transaction: WorkManagementTransaction,
    input: CommandInput<string>,
    commandType: string,
    digest: string,
    changes: readonly EventChange[],
  ): Promise<readonly string[]> {
    const ids: string[] = [];
    for (const change of changes) {
      const id = await semanticId(
        "history",
        input,
        commandType,
        change.aggregate.aggregateType,
        digest,
        `${change.eventType}:${change.aggregate.id}:${change.aggregate.version}`,
      );
      const event = createWorkManagementEvent({
        eventId: workEventId(id),
        aggregateType: change.aggregate.aggregateType,
        aggregateId: change.aggregate.id,
        aggregateVersion: change.aggregate.version,
        tenantId: change.aggregate.tenantId,
        workspaceId: change.aggregate.workspaceId,
        dealId: change.aggregate.dealId,
        eventType: change.eventType,
        actor: input.actor,
        correlationId: input.context.correlationId,
        payload: eventPayload(change.aggregate, change.eventType),
        occurredAt: new Date(this.clock.now()),
      });
      await transaction.appendHistory(event);
      await this.effects.appendDomainEvent(transaction, event);
      ids.push(event.eventId);
    }
    return ids;
  }

  private async persistDispatch(
    transaction: WorkManagementTransaction,
    input: CommandInput<string>,
    commandType: string,
    digest: string,
    request: ApprovalRequest,
    causationId: string,
  ): Promise<void> {
    const dispatchId = await semanticId(
      "target_command",
      input,
      commandType,
      "approval_request",
      digest,
      `target:${request.decision!.id}`,
    );
    const dispatch = targetCommandDispatch({
      dispatchId,
      request,
      actor: input.actor,
      commandType: request.package.authority.action,
      correlationId: input.context.correlationId,
      causationId,
      idempotencyIdentity: identityKey(input, commandType),
      recordedAt: this.clock.now(),
    });
    if (dispatch === undefined) return;
    await transaction.appendTargetCommand(dispatch);
    await this.effects.appendTargetCommand(transaction, dispatch);
  }
}

export function outcome<T extends WorkAggregate>(
  value: T,
  eventType: WorkManagementEventType,
): CommandOutcome<T> {
  return { value, events: [{ aggregate: value, eventType }] };
}

export function withPayload<T extends CommandInput<string>>(
  input: T,
  payload: Readonly<Record<string, unknown>>,
): T {
  return {
    ...input,
    commandPayload: Object.fromEntries(
      Object.entries({ ...input.commandPayload, ...payload }).filter((
        [, value],
      ) => value !== undefined),
    ),
  };
}

export function taskPayload(input: {
  readonly workstreamId: string;
  readonly parentTaskId?: string;
  readonly title: string;
  readonly assigneeId: string;
  readonly target?: TargetReference;
}): Readonly<Record<string, unknown>> {
  return {
    workstreamId: input.workstreamId,
    parentTaskId: input.parentTaskId,
    title: input.title,
    assigneeId: input.assigneeId,
    target: input.target,
  };
}

function eventPayload(
  value: WorkAggregate,
  eventType: WorkManagementEventType,
): Readonly<Record<string, unknown>> {
  if (value.aggregateType === "workstream") {
    return workstreamEventPayload(value);
  }
  if (value.aggregateType === "task") return taskEventPayload(value);
  const notification = approvalNotificationProjection(value, eventType);
  if (
    notification !== undefined && !recipientSafeApprovalPayload(notification)
  ) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Approval Request "${value.id}" notification is unsafe; expected no protected package, evidence, authority, rationale, or target content.`,
    );
  }
  return {
    ...approvalEventPayload(value, value.decision?.outcome),
    ...(notification === undefined ? {} : { notification }),
  };
}

function commandDigest(
  commandType: string,
  aggregateType: string,
  input: CommandInput<string>,
): Readonly<Record<string, unknown>> {
  return {
    tenantId: input.scope.tenantId,
    workspaceId: input.scope.workspaceId,
    dealId: input.scope.dealId,
    actorId: input.actor.id,
    commandType,
    aggregateType,
    aggregateId: input.id,
    expectedVersion: input.expectedVersion ?? 0,
    idempotencyKey: input.idempotencyKey,
    commandPayload: input.commandPayload ?? {},
  };
}

async function executionIdentity(
  input: CommandInput<string>,
  commandType: string,
  aggregateType: WorkAggregate["aggregateType"],
  digest: string,
  recordedAt: string,
): Promise<WorkCommandExecutionIdentity> {
  return {
    ...input.scope,
    actorId: input.actor.id,
    commandType,
    aggregateType,
    aggregateId: input.id,
    idempotencyKey: input.idempotencyKey,
    payloadDigest: digest,
    resultId: await semanticId(
      "command_result",
      input,
      commandType,
      aggregateType,
      digest,
      "result",
    ),
    recordedAt,
  };
}

export function semanticId(
  namespace: WorkRecordNamespace,
  input: CommandInput<string>,
  commandType: string,
  aggregateType: string,
  digest: string,
  purpose: string,
): Promise<string> {
  return workRecordIdentity({
    namespace,
    ...input.scope,
    actorId: input.actor.id,
    commandType,
    aggregateType,
    aggregateId: input.id,
    expectedVersion: input.expectedVersion ?? 0,
    idempotencyKey: input.idempotencyKey,
    payloadDigest: digest,
    purpose,
  });
}

function identityKey(input: CommandInput<string>, commandType: string): string {
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
