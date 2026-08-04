import type {
  AllowedAuthorizationDecision,
  AuthorizationDecision,
} from "../platform/authz/v1.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
import {
  type NotificationProjection,
  type NotificationScope,
  type RecipientScope,
  sameNotificationScope,
} from "./model.ts";

export type NotificationAuthorizationAction =
  | "read"
  | "manage_subscription"
  | "deliver";

export interface NotificationAuthorizationRequest {
  readonly context: RequestContext;
  readonly scope: NotificationScope;
  readonly recipientId: ActorId;
  readonly action: NotificationAuthorizationAction;
}

export interface NotificationAuthorizationPort {
  authorize(
    request: NotificationAuthorizationRequest,
  ): Promise<AuthorizationDecision>;
}

export interface AuthorizedNotificationScope extends RecipientScope {
  readonly action: NotificationAuthorizationAction;
  readonly decision: AllowedAuthorizationDecision;
}

export interface NotificationReadProjection {
  readonly id: NotificationProjection["notificationId"];
  readonly dealId?: NotificationScope["dealId"];
  readonly notificationType: string;
  readonly title: string;
  readonly body: string;
  readonly createdAt: string;
  readonly expiresAt?: string;
  readonly deliveryState: NotificationProjection["deliveryState"];
}

export class NotificationProtectedNotFoundError extends Error {
  readonly code = "PROTECTED_NOT_FOUND";

  constructor() {
    super("The protected notification was not found.");
    this.name = "NotificationProtectedNotFoundError";
  }
}

export class NotificationAuthorizationError extends Error {
  readonly code = "NOTIFICATION_AUTHORIZATION_DENIED";

  constructor(action: NotificationAuthorizationAction) {
    super(
      `Notification action "${action}" was denied; expected an approved recipient scope.`,
    );
    this.name = "NotificationAuthorizationError";
  }
}

export function requireAuthorizedNotificationScope(input: {
  readonly scope: NotificationScope;
  readonly recipientId: ActorId;
  readonly action: NotificationAuthorizationAction;
  readonly decision: AuthorizationDecision;
}): AuthorizedNotificationScope {
  if (input.decision.outcome !== "allow") {
    throw new NotificationAuthorizationError(input.action);
  }
  return Object.freeze({
    ...input.scope,
    recipientId: input.recipientId,
    action: input.action,
    decision: input.decision,
  });
}

export function projectNotification(
  projection: NotificationProjection,
  access: AuthorizedNotificationScope,
): NotificationReadProjection {
  assertProjectionScope(projection, access);
  return Object.freeze({
    id: projection.notificationId,
    ...(projection.scope.dealId === undefined
      ? {}
      : { dealId: projection.scope.dealId }),
    notificationType: projection.notificationType,
    title: projection.title,
    body: projection.body,
    createdAt: projection.createdAt.toISOString(),
    ...(projection.expiresAt === undefined
      ? {}
      : { expiresAt: projection.expiresAt.toISOString() }),
    deliveryState: projection.deliveryState,
  });
}

export function projectNotifications(
  projections: readonly NotificationProjection[],
  access: AuthorizedNotificationScope,
): readonly NotificationReadProjection[] {
  return Object.freeze(
    projections.map((projection) => projectNotification(projection, access)),
  );
}

export function assertProjectionScope(
  projection: NotificationProjection,
  access: AuthorizedNotificationScope,
): void {
  if (
    sameNotificationScope(projection.scope, access) &&
    projection.recipientId === access.recipientId
  ) return;
  throw new NotificationProtectedNotFoundError();
}
