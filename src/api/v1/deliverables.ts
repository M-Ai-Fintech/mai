import type {
  AggregateVersion,
  IdempotencyKey,
  JobId,
  OperationId,
  RequestContext,
} from "../../platform/api/v1.ts";
import {
  createApiError,
  createProtectedNotFoundError,
  type ErrorEnvelope,
  formatEtag,
  type OpaqueCursor,
  parseAggregateVersion,
} from "../../platform/api/v1.ts";
import type { Clock } from "../../platform/persistence/idempotency.ts";
import type { JobInputVersionReference } from "../../platform/jobs/v1.ts";
import type {
  Deliverable,
  DeliverableScope,
  DeliverableVersion,
  ReleaseAuthorization,
} from "../../deliverables/model.ts";
import { deriveDeliverableIdempotencyKey } from "../../deliverables/jobs.ts";
import { validateDeliverableRelease } from "../../deliverables/preflight.ts";
import {
  IdempotencyConflictError,
  payloadDigest,
} from "../../platform/persistence/v1.ts";
import type {
  DeliverableId,
  DeliverableVersionId,
} from "../../deliverables/ids.ts";

export type DeliverableApiAction =
  | "read"
  | "approve"
  | "release"
  | "export"
  | "distribute";

export interface DeliverableAuthorizationRequest {
  readonly action: DeliverableApiAction;
  readonly context: RequestContext;
  readonly resourceId: string;
  readonly scope: DeliverableScope;
}

export interface DeliverablesAuthorizationPort {
  authorize(request: DeliverableAuthorizationRequest): Promise<boolean>;
}

export interface DeliverablesReadPort {
  findDeliverable(
    scope: DeliverableScope,
    deliverableId: DeliverableId,
  ): Promise<Deliverable | undefined>;
  listDeliverables(
    scope: DeliverableScope,
    limit: number,
  ): Promise<readonly Deliverable[]>;
  findVersion(
    scope: DeliverableScope,
    versionId: DeliverableVersionId,
  ): Promise<DeliverableVersion | undefined>;
  findReleaseAuthorization(
    scope: DeliverableScope,
    versionId: DeliverableVersionId,
    authorizationId: string,
  ): Promise<ReleaseAuthorization | undefined>;
}

export interface AcceptedDeliverableJob {
  readonly jobId: JobId;
  readonly operationId: OperationId;
}

export interface DeliverableScheduleInput {
  readonly action: Exclude<DeliverableApiAction, "read">;
  readonly commandType: `deliverables.${string}`;
  readonly context: RequestContext;
  readonly targetId: DeliverableVersionId;
  readonly scope: DeliverableScope;
  readonly expectedVersion: AggregateVersion;
  readonly idempotencyKey: IdempotencyKey;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly payloadDigest: string;
  readonly inputVersionReferences: readonly JobInputVersionReference[];
}

export type DeliverablesScheduleResult =
  | {
    readonly status: "accepted" | "replayed";
    readonly job: AcceptedDeliverableJob;
  }
  | { readonly status: "in_progress" };

export interface DeliverableCommandScheduler {
  schedule(
    input: DeliverableScheduleInput,
  ): Promise<DeliverablesScheduleResult>;
}

export type DeliverablesApiResult<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "error"; readonly error: ErrorEnvelope };

export interface DeliverableReadView {
  readonly deliverable: Deliverable;
  readonly etag: string;
}

export interface DeliverableListView {
  readonly deliverables: readonly Deliverable[];
  readonly nextCursor?: OpaqueCursor;
}

export interface DeliverableCommandInput {
  readonly action: Exclude<DeliverableApiAction, "read">;
  readonly commandType: `deliverables.${string}`;
  readonly targetId: DeliverableVersionId;
  readonly expectedVersion: AggregateVersion;
  readonly idempotencyKey: IdempotencyKey;
  readonly payload: Readonly<Record<string, unknown>>;
}

const SYSTEM_CLOCK: Clock = { now: () => new Date() };

export class DeliverablesV1Application {
  constructor(
    private readonly authorization: DeliverablesAuthorizationPort,
    private readonly reads: DeliverablesReadPort,
    private readonly scheduler: DeliverableCommandScheduler,
    private readonly clock: Clock = SYSTEM_CLOCK,
  ) {}

  async read(
    context: RequestContext,
    deliverableId: DeliverableId,
  ): Promise<DeliverablesApiResult<DeliverableReadView>> {
    const scope = scopeFromContext(context);
    if (scope === undefined) return validationScopeError(context);
    const denied = await this.authorize({
      action: "read",
      context,
      resourceId: deliverableId,
      scope,
    });
    if (denied !== undefined) return denied;
    const deliverable = await this.reads.findDeliverable(scope, deliverableId);
    if (deliverable === undefined) return protectedNotFound(context);
    return {
      kind: "ok",
      value: { deliverable, etag: formatEtag(deliverable.aggregateVersion) },
    };
  }

  async list(
    context: RequestContext,
    limit: number,
  ): Promise<DeliverablesApiResult<DeliverableListView>> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      return validationError(
        context,
        "limit",
        "Expected an integer from 1 to 100.",
      );
    }
    const scope = scopeFromContext(context);
    if (scope === undefined) return validationScopeError(context);
    const denied = await this.authorize({
      action: "read",
      context,
      resourceId: "scope",
      scope,
    });
    if (denied !== undefined) return denied;
    const deliverables = await this.reads.listDeliverables(scope, limit);
    return {
      kind: "ok",
      value: {
        deliverables,
        ...(deliverables.length === limit
          ? {
            nextCursor: encodeDeliverableCursor(
              deliverables.at(-1)!.deliverableId,
            ),
          }
          : {}),
      },
    };
  }

  async command(
    context: RequestContext,
    input: DeliverableCommandInput,
  ): Promise<DeliverablesApiResult<DeliverablesScheduleResult>> {
    const scope = scopeFromContext(context);
    if (scope === undefined) return validationScopeError(context);
    const denied = await this.authorize({
      action: input.action,
      context,
      resourceId: input.targetId,
      scope,
    });
    if (denied !== undefined) return denied;
    const version = await this.reads.findVersion(scope, input.targetId);
    if (version === undefined) return protectedNotFound(context);
    const currentVersion = parseAggregateVersion(version.aggregateVersion);
    if (!currentVersion.ok) return dependencyUnavailable(context);
    if (currentVersion.value !== input.expectedVersion) {
      return versionConflict(
        context,
        input.expectedVersion,
        currentVersion.value,
      );
    }
    if (
      (input.action === "release" || input.action === "export" ||
        input.action === "distribute") &&
      version.contentApprovalState !== "approved"
    ) {
      return invalidTransition(
        context,
        "Content approval is required before release or distribution.",
      );
    }
    if (
      (input.action === "release" || input.action === "export" ||
        input.action === "distribute") && version.freshnessState !== "current"
    ) return staleVersion(context);
    if (input.action === "export" || input.action === "distribute") {
      const preflight = await this.checkReleasePreflight(
        context,
        scope,
        version,
        input,
      );
      if (preflight !== undefined) return preflight;
    }
    const expectedKey = await deriveDeliverableIdempotencyKey({
      actorId: context.actorId,
      commandType: input.commandType,
      targetType: "DeliverableVersion",
      targetId: input.targetId,
    });
    if (expectedKey !== input.idempotencyKey) {
      return idempotencyConflict(context);
    }
    try {
      const result = await this.scheduler.schedule({
        ...input,
        context,
        scope,
        payloadDigest: await payloadDigest(input.payload),
        inputVersionReferences: [{
          aggregateType: "DeliverableVersion",
          aggregateId: input.targetId,
          version: input.expectedVersion,
        }],
      });
      return { kind: "ok", value: result };
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        return idempotencyConflict(context);
      }
      return dependencyUnavailable(context);
    }
  }

  private async authorize(
    request: DeliverableAuthorizationRequest,
  ): Promise<DeliverablesApiResult<never> | undefined> {
    if (await this.authorization.authorize(request)) return undefined;
    if (request.action === "read") return protectedNotFound(request.context);
    return {
      kind: "error",
      error: createApiError({
        code: "ACTION_FORBIDDEN",
        message: "The requested deliverable action is not authorized.",
        correlationId: request.context.correlationId,
        retryable: false,
      }),
    };
  }

  private async checkReleasePreflight(
    context: RequestContext,
    scope: DeliverableScope,
    version: DeliverableVersion,
    input: DeliverableCommandInput,
  ): Promise<DeliverablesApiResult<never> | undefined> {
    if (input.action !== "export" && input.action !== "distribute") {
      return undefined;
    }
    const failure = await validateDeliverableRelease({
      action: input.action,
      scope,
      version,
      payload: input.payload,
      findAuthorization: (lookupScope, versionId, authorizationId) =>
        this.reads.findReleaseAuthorization(
          lookupScope,
          versionId,
          authorizationId,
        ),
      now: () => this.clock.now(),
    });
    if (failure === undefined) return undefined;
    const message = failure === "missing_authorization"
      ? "The release authorization is missing or does not cover this version."
      : failure === "format"
      ? "The requested export format is not release-authorized."
      : "The recipient and purpose are outside the release authorization scope.";
    return invalidTransition(context, message);
  }
}

export function encodeDeliverableCursor(
  deliverableId: DeliverableId,
): OpaqueCursor {
  return btoa(deliverableId).replaceAll("=", "").replaceAll("+", "-")
    .replaceAll("/", "_") as OpaqueCursor;
}

function scopeFromContext(
  context: RequestContext,
): DeliverableScope | undefined {
  if (context.workspaceId === undefined || context.dealId === undefined) {
    return undefined;
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}

function validationScopeError(
  context: RequestContext,
): DeliverablesApiResult<never> {
  return validationError(
    context,
    "scope",
    "Workspace and deal scope are required.",
  );
}

function validationError(
  context: RequestContext,
  field: string,
  message: string,
): DeliverablesApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "VALIDATION_FAILED",
      message: "The deliverable request is invalid.",
      correlationId: context.correlationId,
      retryable: false,
      fieldErrors: { [field]: [{ field, code: "INVALID_TYPE", message }] },
    }),
  };
}

function protectedNotFound(
  context: RequestContext,
): DeliverablesApiResult<never> {
  return {
    kind: "error",
    error: createProtectedNotFoundError(context.correlationId),
  };
}

function dependencyUnavailable(
  context: RequestContext,
): DeliverablesApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "DEPENDENCY_UNAVAILABLE",
      message: "Deliverable persistence is unavailable.",
      correlationId: context.correlationId,
      retryable: true,
    }),
  };
}

function versionConflict(
  context: RequestContext,
  expectedVersion: AggregateVersion,
  currentVersion: AggregateVersion,
): DeliverablesApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "VERSION_CONFLICT",
      message: "The deliverable version is stale.",
      correlationId: context.correlationId,
      retryable: true,
      expectedVersion,
      currentVersion,
    }),
  };
}

function staleVersion(context: RequestContext): DeliverablesApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "STALE_VERSION",
      message: "The deliverable version is stale and must be regenerated.",
      correlationId: context.correlationId,
      retryable: false,
    }),
  };
}

function invalidTransition(
  context: RequestContext,
  message: string,
): DeliverablesApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "INVALID_TRANSITION",
      message,
      correlationId: context.correlationId,
      retryable: false,
    }),
  };
}

function idempotencyConflict(
  context: RequestContext,
): DeliverablesApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "IDEMPOTENCY_CONFLICT",
      message:
        "An equivalent deliverable command is already in progress or used a different payload.",
      correlationId: context.correlationId,
      retryable: true,
    }),
  };
}
