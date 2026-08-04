import {
  createAcceptedJobEnvelope,
  createApiError,
  createProtectedNotFoundError,
  createSuccessEnvelope,
  formatEtag,
  type OpaqueCursor,
} from "../../platform/api/v1.ts";
import {
  type CorrelationId,
  type DealId,
  type JobId,
  parseCorrelationId,
  parseDealId,
  parseIdempotencyKey,
} from "../../shared/contracts/identifiers.ts";
import type { RequestContext } from "../../shared/contracts/request_context.ts";
import type { NotificationScope } from "../../notifications/model.ts";
import {
  parseNotificationId,
  parseSubscriptionId,
} from "../../notifications/model.ts";
import {
  type DeliveryReferenceResult,
  NotificationAuthenticationError,
  NotificationDeliveryUnavailableError,
  NotificationIdempotencyConflictError,
  type NotificationV1Dependencies,
  NotificationV1Service,
  NotificationValidationError,
} from "./notifications.ts";
import { NotificationAuthorizationError } from "../../notifications/projection.ts";
import { SubscriptionVersionConflictError } from "../../notifications/subscriptions.ts";
import { NotificationRepositoryNotFoundError } from "../../notifications/repository.ts";

export interface NotificationV1RouteDependencies
  extends NotificationV1Dependencies {
  authenticate(request: Request): Promise<RequestContext>;
}

function subscriptionResponse(
  subscription: import("../../notifications/subscriptions.ts").Subscription,
): Record<string, unknown> {
  return {
    id: subscription.subscriptionId,
    scope: subscription.scope,
    recipientId: subscription.recipientId,
    eventType: subscription.eventType,
    preferences: subscription.preferences,
    version: subscription.version,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}

function acceptedDeliveryResponse(
  result: DeliveryReferenceResult,
  correlationId: CorrelationId,
) {
  return createAcceptedJobEnvelope({
    operationId: result.operationId,
    jobId: result.jobId as JobId,
    status: "accepted",
    correlationId,
  });
}

function mapNotificationError(
  error: unknown,
  correlationId: CorrelationId,
): {
  readonly body: unknown;
  readonly status: number;
  readonly headers?: Headers;
} {
  if (
    error instanceof NotificationRepositoryNotFoundError ||
    error instanceof NotificationAuthorizationError
  ) {
    return { body: createProtectedNotFoundError(correlationId), status: 404 };
  }
  if (error instanceof NotificationIdempotencyConflictError) {
    return {
      body: createApiError({
        code: "IDEMPOTENCY_CONFLICT",
        message: error.message,
        correlationId,
        retryable: false,
      }),
      status: 409,
    };
  }
  if (error instanceof SubscriptionVersionConflictError) {
    return {
      body: createApiError({
        code: "VERSION_CONFLICT",
        message: error.message,
        correlationId,
        retryable: false,
        expectedVersion: error.expectedVersion,
        currentVersion: error.currentVersion,
      }),
      status: 409,
    };
  }
  if (error instanceof NotificationDeliveryUnavailableError) {
    return {
      body: createApiError({
        code: "DEPENDENCY_UNAVAILABLE",
        message: error.message,
        correlationId,
        retryable: true,
      }),
      status: 503,
    };
  }
  const message = error instanceof Error
    ? error.message
    : "Invalid notification request.";
  return {
    body: createApiError({
      code: "VALIDATION_FAILED",
      message,
      correlationId,
      retryable: false,
      fieldErrors: {
        request: [{ field: "request", code: "INVALID_TYPE", message }],
      },
    }),
    status: error instanceof NotificationValidationError ? 422 : 404,
  };
}

export async function handleNotificationV1Route(
  request: Request,
  dependencies: NotificationV1RouteDependencies,
  baseHeaders = new Headers(),
): Promise<Response | undefined> {
  const route = parseRoute(request.url);
  if (route === undefined) return undefined;
  const correlationId = requestCorrelation(request);
  if (correlationId === undefined) {
    return writeError(
      createApiError({
        code: "VALIDATION_FAILED",
        message: "X-Correlation-Id is invalid; expected a cor_ identifier.",
        correlationId: "cor_notifications" as CorrelationId,
        retryable: false,
        fieldErrors: {
          correlationId: [{
            field: "X-Correlation-Id",
            code: "INVALID_TYPE",
            message: "Expected a correlation identifier.",
          }],
        },
      }),
      422,
      baseHeaders,
    );
  }
  try {
    const context = await dependencies.authenticate(request);
    const service = new NotificationV1Service(dependencies);
    return await dispatch(
      request,
      route,
      context,
      service,
      correlationId,
      baseHeaders,
    );
  } catch (error) {
    if (error instanceof NotificationAuthenticationError) {
      return writeError(
        createApiError({
          code: "UNAUTHENTICATED",
          message: error.message,
          correlationId,
          retryable: false,
        }),
        401,
        baseHeaders,
      );
    }
    const mapped = mapNotificationError(error, correlationId);
    return writeError(mapped.body, mapped.status, baseHeaders, mapped.headers);
  }
}

type NotificationRoute =
  | { readonly kind: "collection" }
  | { readonly kind: "item"; readonly notificationId: string }
  | { readonly kind: "subscriptions" }
  | { readonly kind: "subscription"; readonly subscriptionId: string }
  | { readonly kind: "delivery"; readonly notificationId: string };

async function dispatch(
  request: Request,
  route: NotificationRoute,
  context: RequestContext,
  service: NotificationV1Service,
  correlationId: CorrelationId,
  baseHeaders: Headers,
): Promise<Response> {
  const scope = requestScope(context, request.url);
  if (route.kind === "collection" && request.method === "GET") {
    const result = await service.listNotifications({
      context,
      scope,
      cursor: readCursor(request.url),
      limit: readLimit(request.url),
    });
    return writeSuccess(
      { notifications: result.data },
      correlationId,
      200,
      baseHeaders,
      {
        nextCursor: result.nextCursor,
      },
    );
  }
  if (route.kind === "item" && request.method === "GET") {
    const notificationId = requiredNotificationId(route.notificationId);
    const result = await service.getNotification({
      context,
      scope,
      notificationId,
    });
    return writeSuccess(result.data, correlationId, 200, baseHeaders);
  }
  if (route.kind === "subscriptions" && request.method === "POST") {
    const body = await jsonBody(request);
    const command = subscriptionCommand(
      body,
      context,
      scope,
      idempotency(request),
    );
    const result = await service.saveSubscription(command);
    return writeSuccess(
      subscriptionResponse(result.subscription),
      correlationId,
      201,
      baseHeaders,
      { version: result.subscription.version },
    );
  }
  if (route.kind === "subscription" && request.method === "PUT") {
    const body = await jsonBody(request);
    const subscriptionId = requiredSubscriptionId(route.subscriptionId);
    const command = subscriptionCommand(
      body,
      context,
      scope,
      idempotency(request),
      subscriptionId,
      parseIfMatch(request.headers.get("If-Match")),
    );
    const result = await service.saveSubscription(command);
    return writeSuccess(
      subscriptionResponse(result.subscription),
      correlationId,
      200,
      baseHeaders,
      { version: result.subscription.version },
    );
  }
  if (route.kind === "delivery" && request.method === "POST") {
    const notificationId = requiredNotificationId(route.notificationId);
    const result = await service.requestDelivery({
      context,
      scope,
      notificationId,
      idempotencyKey: idempotency(request),
    });
    return writeAccepted(result, correlationId, baseHeaders);
  }
  return new Response("Not Found", { status: 404, headers: baseHeaders });
}

function parseRoute(urlValue: string): NotificationRoute | undefined {
  const url = new URL(urlValue);
  if (url.pathname === "/api/v1/notifications") return { kind: "collection" };
  const parts = url.pathname.split("/").filter(Boolean);
  if (
    parts.length < 4 || parts.length > 5 || parts[0] !== "api" ||
    parts[1] !== "v1"
  ) return undefined;
  if (parts[2] !== "notifications") return undefined;
  if (parts.length === 4 && parts[3] === "subscriptions") {
    return { kind: "subscriptions" };
  }
  if (parts.length === 5 && parts[3] === "subscriptions") {
    return { kind: "subscription", subscriptionId: parts[4] };
  }
  if (parts.length === 5 && parts[4] === "deliver") {
    return { kind: "delivery", notificationId: parts[3] };
  }
  if (parts.length === 4) return { kind: "item", notificationId: parts[3] };
  return undefined;
}

function requestScope(
  context: RequestContext,
  urlValue: string,
): NotificationScope {
  if (context.workspaceId === undefined) {
    throw new NotificationValidationError(
      "Notification requests require workspace scope; expected an authenticated workspace context.",
    );
  }
  const url = new URL(urlValue);
  const dealValue = url.searchParams.get("dealId");
  let dealId: DealId | undefined = context.dealId;
  if (dealValue !== null) {
    const parsed = parseDealId(dealValue);
    if (!parsed.ok || parsed.value !== context.dealId) {
      throw new NotificationValidationError(
        `Notification deal scope "${dealValue}" does not match the authenticated context; expected the protected deal scope.`,
      );
    }
    dealId = parsed.value;
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    ...(dealId === undefined ? {} : { dealId }),
  };
}

function subscriptionCommand(
  body: Record<string, unknown>,
  context: RequestContext,
  scope: NotificationScope,
  idempotencyKey: ReturnType<typeof requiredIdempotencyKey>,
  subscriptionId = String(body.subscriptionId ?? body.id ?? ""),
  expectedVersion?: ReturnType<typeof parseIfMatch>,
) {
  const preferences = body.preferences;
  const eventType = body.eventType;
  if (
    typeof subscriptionId !== "string" ||
    typeof eventType !== "string" && expectedVersion === undefined ||
    !isPreferences(preferences)
  ) {
    throw new NotificationValidationError(
      "Subscription command is invalid; expected subscriptionId, eventType, and boolean channel preferences.",
    );
  }
  return {
    context,
    scope,
    subscriptionId,
    eventType: typeof eventType === "string" ? eventType : "",
    preferences,
    idempotencyKey,
    ...(expectedVersion === undefined ? {} : { expectedVersion }),
  };
}

function isPreferences(
  value: unknown,
): value is { channels: { in_app: boolean; email: boolean } } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const channels = (value as Record<string, unknown>).channels;
  if (
    typeof channels !== "object" || channels === null || Array.isArray(channels)
  ) return false;
  const values = channels as Record<string, unknown>;
  return typeof values.in_app === "boolean" &&
    typeof values.email === "boolean";
}

function jsonBody(request: Request): Promise<Record<string, unknown>> {
  return request.json().then((value: unknown) => {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    throw new NotificationValidationError(
      "Request body is invalid; expected a JSON object.",
    );
  });
}

function requestCorrelation(request: Request): CorrelationId | undefined {
  const value = request.headers.get("X-Correlation-Id") ?? "cor_notifications";
  const parsed = parseCorrelationId(value);
  return parsed.ok ? parsed.value : undefined;
}

function readCursor(urlValue: string): OpaqueCursor | undefined {
  const value = new URL(urlValue).searchParams.get("cursor");
  if (value === null) return undefined;
  return value as OpaqueCursor;
}

function readLimit(urlValue: string): number {
  const value = new URL(urlValue).searchParams.get("limit");
  if (value === null) return 20;
  const limit = Number(value);
  if (Number.isSafeInteger(limit)) return limit;
  throw new NotificationValidationError(
    `Notification limit "${value}" is invalid; expected an integer.`,
  );
}

function idempotency(request: Request) {
  const value = request.headers.get("Idempotency-Key");
  const parsed = parseIdempotencyKey(value);
  if (parsed.ok) return parsed.value;
  throw new NotificationValidationError(
    `Idempotency-Key "${
      value ?? ""
    }" is invalid; expected an idem_ identifier.`,
  );
}

function requiredIdempotencyKey(
  value: ReturnType<typeof parseIdempotencyKey>,
) {
  if (value.ok) return value.value;
  throw new NotificationValidationError(
    "Idempotency-Key is invalid; expected an idem_ identifier.",
  );
}

function parseIfMatch(value: string | null) {
  if (value === null) {
    throw new NotificationValidationError(
      "If-Match is required for subscription updates; expected a strong version ETag.",
    );
  }
  const match = /^"v([1-9][0-9]*)"$/.exec(value);
  if (match === null) {
    throw new NotificationValidationError(
      `If-Match "${value}" is invalid; expected a strong \"v<version>\" ETag.`,
    );
  }
  return Number(
    match[1],
  ) as import("../../shared/contracts/aggregate_version.ts").AggregateVersion;
}

function requiredNotificationId(value: string) {
  const parsed = parseNotificationId(value);
  if (parsed.ok) return parsed.value;
  throw new NotificationValidationError(
    `Notification ID "${value}" is invalid; expected a notif_ identifier.`,
  );
}

function requiredSubscriptionId(value: string) {
  const parsed = parseSubscriptionId(value);
  if (parsed.ok) return parsed.value;
  throw new NotificationValidationError(
    `Subscription ID "${value}" is invalid; expected a sub_ identifier.`,
  );
}

function writeSuccess(
  data: unknown,
  correlationId: CorrelationId,
  status: number,
  baseHeaders: Headers,
  options: { readonly version?: number; readonly nextCursor?: OpaqueCursor } =
    {},
): Response {
  const headers = new Headers(baseHeaders);
  headers.set("Content-Type", "application/json");
  if (options.version !== undefined) {
    headers.set("ETag", formatEtag(options.version));
  }
  return Response.json(
    createSuccessEnvelope(data, {
      correlationId,
      ...(options.nextCursor === undefined
        ? {}
        : { nextCursor: options.nextCursor }),
    }),
    { status, headers },
  );
}

function writeAccepted(
  result: Parameters<typeof acceptedDeliveryResponse>[0],
  correlationId: CorrelationId,
  baseHeaders: Headers,
): Response {
  const headers = new Headers(baseHeaders);
  headers.set("Content-Type", "application/json");
  return Response.json(acceptedDeliveryResponse(result, correlationId), {
    status: 202,
    headers,
  });
}

function writeError(
  body: unknown,
  status: number,
  baseHeaders: Headers,
  extraHeaders?: Headers,
): Response {
  const headers = new Headers(baseHeaders);
  if (extraHeaders !== undefined) {
    for (const [key, value] of extraHeaders.entries()) headers.set(key, value);
  }
  headers.set("Content-Type", "application/json");
  return Response.json(body, { status, headers });
}
