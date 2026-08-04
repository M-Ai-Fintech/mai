import type { OpaqueCursor } from "../../platform/api/v1.ts";
import type { TransactionHandle } from "../../platform/persistence/transaction.ts";
import { payloadDigest } from "../../platform/persistence/v1.ts";
import type { RequestContext } from "../../shared/contracts/request_context.ts";
import type {
  AggregateVersion,
} from "../../shared/contracts/aggregate_version.ts";
import type {
  IdempotencyKey,
  OperationId,
} from "../../shared/contracts/identifiers.ts";
import {
  type AuthorizedNotificationScope,
  createNotificationCursor,
  type NotificationReadProjection,
  parseNotificationCursor,
  projectNotification,
  requireAuthorizedNotificationScope,
} from "../../notifications/v1.ts";
import {
  createSubscription,
  freezeSubscription,
  type Subscription,
  type SubscriptionPreferences,
  updateSubscription,
} from "../../notifications/subscriptions.ts";
import type { NotificationScope } from "../../notifications/model.ts";
import { parseSubscriptionId } from "../../notifications/model.ts";
import type { ActorId } from "../../shared/contracts/identifiers.ts";
import {
  type NotificationIdempotencyLookup,
  type NotificationIdempotencyRecord,
  type NotificationProjectionLookup,
  NotificationRepositoryNotFoundError,
  type SubscriptionIdLookup,
} from "../../notifications/repository.ts";
import {
  NotificationDeliveryUnavailableError,
  NotificationIdempotencyConflictError,
  NotificationValidationError,
} from "./notifications_contracts.ts";
import type {
  DeliveryReferenceResult,
  NotificationListInput,
  NotificationListResult,
  NotificationV1Dependencies,
  SubscriptionCommandInput,
  SubscriptionCommandResult,
} from "./notifications_contracts.ts";

export * from "./notifications_contracts.ts";

export class NotificationV1Service {
  constructor(private readonly dependencies: NotificationV1Dependencies) {}

  async listNotifications(
    input: NotificationListInput,
  ): Promise<NotificationListResult> {
    assertLimit(input.limit);
    const access = await this.authorize(input.context, input.scope, "read");
    const after = input.cursor === undefined
      ? undefined
      : cursorAfter(input.cursor);
    const rows = await this.dependencies.transactions.run((transaction) =>
      this.dependencies.repository.listProjections(transaction, {
        access,
        after,
        limit: input.limit,
      })
    );
    const data = rows.map((row) => projectNotification(row, access));
    const last = rows.at(-1);
    return {
      data,
      access,
      ...(last === undefined || rows.length < input.limit ? {} : {
        nextCursor: createNotificationCursor({
          createdAt: last.createdAt.toISOString(),
          notificationId: last.notificationId,
        }),
      }),
    };
  }

  async getNotification(input: {
    readonly context: RequestContext;
    readonly scope: NotificationScope;
    readonly notificationId:
      import("../../notifications/model.ts").NotificationId;
  }): Promise<
    {
      readonly data: NotificationReadProjection;
      readonly access: AuthorizedNotificationScope;
    }
  > {
    const access = await this.authorize(input.context, input.scope, "read");
    const row = await this.dependencies.transactions.run((transaction) =>
      this.dependencies.repository.findProjection(transaction, {
        access,
        notificationId: input.notificationId,
      })
    );
    if (row === undefined) throw new NotificationRepositoryNotFoundError();
    return { data: projectNotification(row, access), access };
  }

  async saveSubscription(
    input: SubscriptionCommandInput,
  ): Promise<SubscriptionCommandResult> {
    const access = await this.authorize(
      input.context,
      input.scope,
      "manage_subscription",
    );
    const digest = await payloadDigest(commandPayload(input));
    return await this.dependencies.transactions.run(async (transaction) => {
      const lookup = idempotencyLookup(input, "subscription");
      await this.dependencies.repository.lockIdempotency(transaction, lookup);
      const existing = await this.dependencies.repository.findIdempotency(
        transaction,
        lookup,
      );
      if (existing !== undefined) {
        assertMatchingDigest(existing, digest, input.idempotencyKey);
        return { subscription: replayedSubscription(existing), replayed: true };
      }
      const current = await this.dependencies.repository.findSubscriptionById(
        transaction,
        subscriptionLookup(input, access),
      );
      const subscription = current === undefined
        ? createSubscription({
          subscriptionId: input.subscriptionId,
          scope: input.scope,
          recipientId: input.context.actorId,
          eventType: input.eventType,
          preferences: input.preferences,
          now: this.dependencies.clock.now(),
        })
        : updateSubscription(current, {
          expectedVersion: requireExpectedVersion(input.expectedVersion),
          preferences: input.preferences,
          now: this.dependencies.clock.now(),
        });
      if (current === undefined) {
        await this.dependencies.repository.insertSubscription(
          transaction,
          subscription,
        );
      } else {
        await this.dependencies.repository.replaceSubscription(
          transaction,
          subscription,
          input.expectedVersion!,
        );
      }
      await storeIdempotency(
        transaction,
        lookup,
        digest,
        subscription,
        this.dependencies,
      );
      return { subscription, replayed: false };
    });
  }

  async requestDelivery(input: {
    readonly context: RequestContext;
    readonly scope: NotificationScope;
    readonly notificationId:
      import("../../notifications/model.ts").NotificationId;
    readonly idempotencyKey: IdempotencyKey;
  }): Promise<DeliveryReferenceResult> {
    const access = await this.authorize(input.context, input.scope, "deliver");
    const digest = await payloadDigest({
      command: "deliver",
      notificationId: input.notificationId,
    });
    return await this.dependencies.transactions.run(async (transaction) => {
      const lookup = idempotencyLookup(input, "delivery");
      await this.dependencies.repository.lockIdempotency(transaction, lookup);
      const existing = await this.dependencies.repository.findIdempotency(
        transaction,
        lookup,
      );
      if (existing !== undefined) {
        assertMatchingDigest(existing, digest, input.idempotencyKey);
        return deliveryResult(existing.result, true);
      }
      const lookupProjection: NotificationProjectionLookup = {
        access,
        notificationId: input.notificationId,
      };
      const projection = await this.dependencies.repository.findProjection(
        transaction,
        lookupProjection,
      );
      if (projection === undefined) {
        throw new NotificationRepositoryNotFoundError();
      }
      if (
        projection.jobId === undefined || projection.operationId === undefined
      ) {
        throw new NotificationDeliveryUnavailableError(input.notificationId);
      }
      await storeIdempotency(transaction, lookup, digest, {
        jobId: projection.jobId,
        operationId: projection.operationId,
      }, this.dependencies);
      return {
        jobId: projection.jobId,
        operationId: projection.operationId,
        replayed: false,
      };
    });
  }

  private async authorize(
    context: RequestContext,
    scope: NotificationScope,
    action: "read" | "manage_subscription" | "deliver",
  ): Promise<AuthorizedNotificationScope> {
    assertContextScope(context, scope);
    const decision = await this.dependencies.authorization.authorize({
      context,
      scope,
      recipientId: context.actorId,
      action,
    });
    return requireAuthorizedNotificationScope({
      scope,
      recipientId: context.actorId,
      action,
      decision,
    });
  }
}

function cursorAfter(
  cursor: OpaqueCursor,
): {
  readonly createdAt: Date;
  readonly notificationId:
    import("../../notifications/model.ts").NotificationId;
} {
  const parsed = parseNotificationCursor(cursor);
  if (parsed === undefined) {
    throw new NotificationValidationError(
      "Notification cursor is invalid; expected an opaque v1 cursor.",
    );
  }
  return {
    createdAt: new Date(parsed.createdAt),
    notificationId: parsed.notificationId,
  };
}

function idempotencyLookup(
  input: {
    readonly context: RequestContext;
    readonly scope: NotificationScope;
    readonly idempotencyKey: IdempotencyKey;
    readonly subscriptionId?: string;
    readonly notificationId?: string;
  },
  commandType: string,
): NotificationIdempotencyLookup {
  return {
    tenantId: input.scope.tenantId,
    workspaceId: input.scope.workspaceId,
    ...(input.scope.dealId === undefined ? {} : { dealId: input.scope.dealId }),
    actorId: input.context.actorId,
    commandType,
    targetId: input.subscriptionId ?? input.notificationId ?? "collection",
    idempotencyKey: input.idempotencyKey,
  };
}

function commandPayload(
  input: SubscriptionCommandInput,
): Record<string, unknown> {
  return {
    command: "subscription",
    subscriptionId: input.subscriptionId,
    eventType: input.eventType,
    preferences: input.preferences,
    ...(input.expectedVersion === undefined
      ? {}
      : { expectedVersion: input.expectedVersion }),
  };
}

function subscriptionLookup(
  input: SubscriptionCommandInput,
  access: AuthorizedNotificationScope,
): SubscriptionIdLookup {
  return {
    scope: input.scope,
    recipientId: access.recipientId,
    subscriptionId: input.subscriptionId as Subscription["subscriptionId"],
  };
}

async function storeIdempotency(
  transaction: TransactionHandle,
  lookup: NotificationIdempotencyLookup,
  digest: string,
  result: Readonly<Record<string, unknown>> | Subscription,
  dependencies: NotificationV1Dependencies,
): Promise<void> {
  const storedResult = isSubscription(result)
    ? { subscription: serializedSubscription(result) }
    : result;
  const record: NotificationIdempotencyRecord = {
    ...lookup,
    payloadDigest: digest,
    result: storedResult,
    createdAt: dependencies.clock.now(),
  };
  const inserted = await dependencies.repository.insertIdempotency(
    transaction,
    record,
  );
  if (inserted === "inserted") return;
  const existing = await dependencies.repository.findIdempotency(
    transaction,
    lookup,
  );
  if (existing === undefined) {
    throw new Error(
      "Notification idempotency record disappeared; expected replay evidence.",
    );
  }
  assertMatchingDigest(existing, digest, lookup.idempotencyKey);
}

function serializedSubscription(
  subscription: Subscription,
): Record<string, unknown> {
  return {
    subscriptionId: subscription.subscriptionId,
    scope: subscription.scope,
    recipientId: subscription.recipientId,
    eventType: subscription.eventType,
    preferences: subscription.preferences,
    version: subscription.version,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}

function replayedSubscription(
  record: NotificationIdempotencyRecord,
): Subscription {
  const value = record.result.subscription;
  if (!isRecord(value)) {
    throw new NotificationValidationError(
      "Stored subscription idempotency result is invalid; expected a subscription snapshot.",
    );
  }
  const id = parseSubscriptionId(value.subscriptionId);
  if (
    !id.ok || !isRecord(value.scope) || typeof value.recipientId !== "string" ||
    typeof value.eventType !== "string" ||
    !isSubscriptionPreferences(value.preferences) ||
    typeof value.version !== "number" || typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    throw new NotificationValidationError(
      "Stored subscription idempotency result is malformed; expected the versioned subscription shape.",
    );
  }
  return freezeSubscription({
    subscriptionId: id.value,
    scope: value.scope as unknown as NotificationScope,
    recipientId: value.recipientId as ActorId,
    eventType: value.eventType,
    preferences: value.preferences,
    version: value.version as AggregateVersion,
    createdAt: new Date(value.createdAt),
    updatedAt: new Date(value.updatedAt),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSubscriptionPreferences(
  value: unknown,
): value is SubscriptionPreferences {
  if (!isRecord(value) || !isRecord(value.channels)) return false;
  return typeof value.channels.in_app === "boolean" &&
    typeof value.channels.email === "boolean";
}

function isSubscription(
  value: Readonly<Record<string, unknown>> | Subscription,
): value is Subscription {
  return "subscriptionId" in value && "version" in value &&
    value.subscriptionId !== undefined;
}

function assertMatchingDigest(
  record: NotificationIdempotencyRecord,
  digest: string,
  key: IdempotencyKey,
): void {
  if (record.payloadDigest === digest) return;
  throw new NotificationIdempotencyConflictError(key);
}

function deliveryResult(
  result: Readonly<Record<string, unknown>>,
  replayed: boolean,
): DeliveryReferenceResult {
  if (
    typeof result.jobId !== "string" || typeof result.operationId !== "string"
  ) {
    throw new NotificationValidationError(
      "Stored delivery idempotency result is invalid; expected job and operation references.",
    );
  }
  return {
    jobId: result.jobId,
    operationId: result.operationId as OperationId,
    replayed,
  };
}

function assertLimit(limit: number): void {
  if (Number.isSafeInteger(limit) && limit > 0 && limit <= 100) return;
  throw new NotificationValidationError(
    `Notification limit "${limit}" is invalid; expected an integer from 1 to 100.`,
  );
}

function requireExpectedVersion(
  version: AggregateVersion | undefined,
): AggregateVersion {
  if (version !== undefined) return version;
  throw new NotificationValidationError(
    "Subscription update requires If-Match; expected the current version ETag.",
  );
}

function assertContextScope(
  context: RequestContext,
  scope: NotificationScope,
): void {
  if (
    context.tenantId === scope.tenantId &&
    context.workspaceId === scope.workspaceId &&
    context.dealId === scope.dealId
  ) return;
  throw new NotificationRepositoryNotFoundError();
}
