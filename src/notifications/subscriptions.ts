import {
  type AggregateVersion,
  isAggregateVersion,
  parseAggregateVersion,
} from "../shared/contracts/aggregate_version.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
import {
  createSubscriptionId,
  type NotificationChannel,
  type NotificationScope,
  type SubscriptionId,
} from "./model.ts";

export interface SubscriptionPreferences {
  readonly channels: Readonly<Record<NotificationChannel, boolean>>;
}

export interface Subscription {
  readonly subscriptionId: SubscriptionId;
  readonly scope: NotificationScope;
  readonly recipientId: ActorId;
  readonly eventType: string;
  readonly preferences: SubscriptionPreferences;
  readonly version: AggregateVersion;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NewSubscription {
  readonly subscriptionId: string;
  readonly scope: NotificationScope;
  readonly recipientId: ActorId;
  readonly eventType: string;
  readonly preferences: SubscriptionPreferences;
  readonly now: Date;
}

export interface SubscriptionUpdate {
  readonly expectedVersion: AggregateVersion;
  readonly preferences: SubscriptionPreferences;
  readonly now: Date;
}

export class SubscriptionVersionConflictError extends Error {
  readonly code = "SUBSCRIPTION_VERSION_CONFLICT";

  constructor(
    readonly subscriptionId: SubscriptionId,
    readonly expectedVersion: AggregateVersion,
    readonly currentVersion: AggregateVersion,
  ) {
    super(
      `Subscription "${subscriptionId}" expected version "${expectedVersion}" but is at version "${currentVersion}".`,
    );
    this.name = "SubscriptionVersionConflictError";
  }
}

export function createSubscription(input: NewSubscription): Subscription {
  const subscriptionId = createSubscriptionId(input.subscriptionId);
  assertSubscriptionInput(input);
  return freezeSubscription({
    subscriptionId,
    scope: input.scope,
    recipientId: input.recipientId,
    eventType: input.eventType,
    preferences: input.preferences,
    version: initialVersion(),
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function updateSubscription(
  current: Subscription,
  update: SubscriptionUpdate,
): Subscription {
  assertSubscription(current);
  assertSubscriptionInput({
    ...current,
    preferences: update.preferences,
    now: update.now,
  });
  if (current.version !== update.expectedVersion) {
    throw new SubscriptionVersionConflictError(
      current.subscriptionId,
      update.expectedVersion,
      current.version,
    );
  }
  return freezeSubscription({
    ...current,
    preferences: clonePreferences(update.preferences),
    version: nextVersion(current.version),
    updatedAt: new Date(update.now),
  });
}

export function freezeSubscription(subscription: Subscription): Subscription {
  assertSubscription(subscription);
  return Object.freeze({
    ...subscription,
    scope: Object.freeze({ ...subscription.scope }),
    preferences: clonePreferences(subscription.preferences),
    createdAt: new Date(subscription.createdAt),
    updatedAt: new Date(subscription.updatedAt),
  });
}

export function subscriptionChannelEnabled(
  subscription: Subscription,
  channel: NotificationChannel,
): boolean {
  return subscription.preferences.channels[channel] === true;
}

export function subscriptionKey(
  scope: NotificationScope,
  recipientId: ActorId,
  eventType: string,
): string {
  return [
    scope.tenantId,
    scope.workspaceId,
    scope.dealId ?? "-",
    recipientId,
    eventType,
  ].join("|");
}

function assertSubscription(subscription: Subscription): void {
  if (!isAggregateVersion(subscription.version)) {
    throw new Error(
      `Subscription "${subscription.subscriptionId}" version "${subscription.version}" is invalid; expected a positive integer.`,
    );
  }
  assertSubscriptionInput({
    ...subscription,
    now: subscription.updatedAt,
  });
}

function assertSubscriptionInput(input: {
  readonly scope: NotificationScope;
  readonly recipientId: ActorId;
  readonly eventType: string;
  readonly preferences: SubscriptionPreferences;
  readonly now: Date;
}): void {
  if (!input.scope.tenantId || !input.scope.workspaceId || !input.recipientId) {
    throw new Error(
      "Subscription scope is incomplete; expected tenant, workspace, and recipient identifiers.",
    );
  }
  if (!input.eventType.trim() || input.eventType.length > 128) {
    throw new Error(
      `Subscription event type "${input.eventType}" is invalid; expected 1-128 characters.`,
    );
  }
  assertPreferences(input.preferences);
  assertDate(input.now, "subscription timestamp");
}

function assertPreferences(preferences: SubscriptionPreferences): void {
  const channels = preferences.channels;
  if (
    typeof channels !== "object" || channels === null ||
    typeof channels.in_app !== "boolean" || typeof channels.email !== "boolean"
  ) {
    throw new Error(
      "Subscription preferences are invalid; expected boolean in_app and email channel flags.",
    );
  }
  if (
    Object.keys(channels).some((key) => key !== "in_app" && key !== "email")
  ) {
    throw new Error(
      `Subscription preferences contain an unknown channel; expected only "in_app" and "email".`,
    );
  }
}

function clonePreferences(
  preferences: SubscriptionPreferences,
): SubscriptionPreferences {
  assertPreferences(preferences);
  return Object.freeze({
    channels: Object.freeze({
      in_app: preferences.channels.in_app,
      email: preferences.channels.email,
    }),
  });
}

function initialVersion(): AggregateVersion {
  const parsed = parseAggregateVersion(1);
  if (parsed.ok) return parsed.value;
  throw new Error("Subscription initial version is invalid; expected one.");
}

function nextVersion(current: AggregateVersion): AggregateVersion {
  const parsed = parseAggregateVersion(current + 1);
  if (parsed.ok) return parsed.value;
  throw new Error(
    `Subscription version "${current}" cannot advance; expected a safe positive integer.`,
  );
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && Number.isFinite(value.getTime())) return;
  throw new Error(
    `${label} "${String(value)}" is invalid; expected a valid Date value.`,
  );
}
