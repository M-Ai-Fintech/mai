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
  parseOpaqueCursor,
} from "../../platform/api/v1.ts";
import type { Document, DocumentScope } from "../../documents/model.ts";
import { type DocumentId, parseDocumentId } from "../../documents/ids.ts";
import type { JobInputVersionReference } from "../../platform/jobs/v1.ts";
import type { DocumentListOptions } from "../../documents/repository.ts";
import { deriveDocumentIdempotencyKey } from "../../documents/jobs.ts";
import { payloadDigest as canonicalPayloadDigest } from "../../platform/persistence/v1.ts";
import { IdempotencyConflictError } from "../../platform/persistence/v1.ts";

export type DocumentApiAction = "read" | "upload" | "sync" | "process";
export type DocumentCommandType =
  | "documents.upload"
  | "documents.sync"
  | "documents.process";

export interface DocumentAuthorizationRequest {
  readonly action: DocumentApiAction;
  readonly context: RequestContext;
  readonly resourceId: string;
  readonly scope: DocumentScope;
}

export interface DocumentsAuthorizationPort {
  authorize(request: DocumentAuthorizationRequest): Promise<boolean>;
}

export interface DocumentsReadPort {
  findDocument(
    scope: DocumentScope,
    documentId: DocumentId,
  ): Promise<Document | undefined>;
  listDocuments(
    scope: DocumentScope,
    options: DocumentListOptions,
  ): Promise<readonly Document[]>;
}

export interface AcceptedDocumentJob {
  readonly jobId: JobId;
  readonly operationId: OperationId;
}

export interface DocumentScheduleInput {
  readonly commandType: DocumentCommandType;
  readonly context: RequestContext;
  readonly documentId: DocumentId;
  readonly scope: DocumentScope;
  readonly expectedVersion: AggregateVersion;
  readonly idempotencyKey: IdempotencyKey;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly payloadDigest: string;
  readonly inputVersionReferences: readonly JobInputVersionReference[];
}

export type DocumentScheduleResult =
  | {
    readonly status: "accepted" | "replayed";
    readonly job: AcceptedDocumentJob;
  }
  | { readonly status: "in_progress" };

export interface DocumentCommandScheduler {
  schedule(input: DocumentScheduleInput): Promise<DocumentScheduleResult>;
}

export type DocumentsApiResult<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "error"; readonly error: ErrorEnvelope };

export interface DocumentReadView {
  readonly document: Document;
  readonly etag: string;
}

export interface DocumentListView {
  readonly documents: readonly Document[];
  readonly nextCursor?: OpaqueCursor;
}

export interface DocumentCommandInput {
  readonly action: Exclude<DocumentApiAction, "read">;
  readonly commandType: DocumentCommandType;
  readonly documentId: DocumentId;
  readonly expectedVersion: AggregateVersion;
  readonly idempotencyKey: IdempotencyKey;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly inputVersionReferences?: readonly JobInputVersionReference[];
}

export class DocumentsV1Application {
  constructor(
    private readonly authorization: DocumentsAuthorizationPort,
    private readonly reads: DocumentsReadPort,
    private readonly scheduler: DocumentCommandScheduler,
  ) {}

  async read(
    context: RequestContext,
    documentId: DocumentId,
  ): Promise<DocumentsApiResult<DocumentReadView>> {
    const scope = scopeFromContext(context);
    if (scope === undefined) return validationScopeError(context);
    const denied = await this.authorize({
      action: "read",
      context,
      resourceId: documentId,
      scope,
    });
    if (denied !== undefined) return denied;
    const document = await this.reads.findDocument(scope, documentId);
    if (document === undefined) return protectedNotFound(context);
    return {
      kind: "ok",
      value: { document, etag: formatEtag(document.aggregateVersion) },
    };
  }

  async list(
    context: RequestContext,
    cursor: OpaqueCursor | undefined,
    limit: number,
  ): Promise<DocumentsApiResult<DocumentListView>> {
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
    const afterDocumentId = cursor === undefined
      ? undefined
      : decodeDocumentCursor(cursor);
    if (cursor !== undefined && afterDocumentId === undefined) {
      return validationError(context, "cursor", "Cursor is invalid.");
    }
    const documents = await this.reads.listDocuments(scope, {
      limit,
      ...(afterDocumentId === undefined ? {} : { afterDocumentId }),
    });
    return {
      kind: "ok",
      value: {
        documents,
        ...(documents.length === limit && documents.at(-1) !== undefined
          ? { nextCursor: encodeDocumentCursor(documents.at(-1)!.documentId) }
          : {}),
      },
    };
  }

  async command(
    context: RequestContext,
    input: DocumentCommandInput,
  ): Promise<DocumentsApiResult<DocumentScheduleResult>> {
    const scope = scopeFromContext(context);
    if (scope === undefined) return validationScopeError(context);
    const denied = await this.authorize({
      action: input.action,
      context,
      resourceId: input.documentId,
      scope,
    });
    if (denied !== undefined) return denied;
    const document = await this.reads.findDocument(scope, input.documentId);
    if (document === undefined) return protectedNotFound(context);
    const currentVersion = parseAggregateVersion(document.aggregateVersion);
    if (!currentVersion.ok) return dependencyUnavailable(context);
    if (currentVersion.value !== input.expectedVersion) {
      return versionConflict(
        context,
        input.expectedVersion,
        currentVersion.value,
      );
    }
    const expectedKey = await deriveDocumentIdempotencyKey({
      actorId: context.actorId,
      commandType: input.commandType,
      targetType: "document",
      targetId: input.documentId,
    });
    if (expectedKey !== input.idempotencyKey) {
      return idempotencyConflict(context);
    }
    const payloadDigest = await commandDigest(context, scope, input);
    try {
      const result = await this.scheduler.schedule({
        ...input,
        context,
        scope,
        payloadDigest,
        inputVersionReferences: input.inputVersionReferences ?? [{
          aggregateType: "Document",
          aggregateId: input.documentId,
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
    request: DocumentAuthorizationRequest,
  ): Promise<DocumentsApiResult<never> | undefined> {
    if (await this.authorization.authorize(request)) return undefined;
    if (request.action === "read") return protectedNotFound(request.context);
    return {
      kind: "error",
      error: createApiError({
        code: "ACTION_FORBIDDEN",
        message: "The requested document action is not authorized.",
        correlationId: request.context.correlationId,
        retryable: false,
      }),
    };
  }
}

export function encodeDocumentCursor(documentId: DocumentId): OpaqueCursor {
  return btoa(documentId).replaceAll("=", "").replaceAll("+", "-")
    .replaceAll("/", "_") as OpaqueCursor;
}

function decodeDocumentCursor(cursor: OpaqueCursor): DocumentId | undefined {
  const parsed = parseOpaqueCursor(cursor);
  if (!parsed.ok) return undefined;
  try {
    const encoded = parsed.value.replaceAll("-", "+").replaceAll("_", "/");
    const padding = "=".repeat((4 - encoded.length % 4) % 4);
    const documentId = atob(`${encoded}${padding}`);
    const parsedId = parseDocumentId(documentId);
    return parsedId.ok ? parsedId.value : undefined;
  } catch (_error) {
    return undefined;
  }
}

function scopeFromContext(context: RequestContext): DocumentScope | undefined {
  if (context.workspaceId === undefined || context.dealId === undefined) {
    return undefined;
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}

async function commandDigest(
  context: RequestContext,
  scope: DocumentScope,
  input: DocumentCommandInput,
): Promise<string> {
  const commandPayloadDigest = await canonicalPayloadDigest({
    action: input.action,
    commandType: input.commandType,
    documentId: input.documentId,
    expectedVersion: input.expectedVersion,
    payload: input.payload,
  });
  return await canonicalPayloadDigest({
    tenantId: context.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    actorId: context.actorId,
    commandType: input.commandType,
    documentId: input.documentId,
    idempotencyKey: input.idempotencyKey,
    payloadDigest: commandPayloadDigest,
  });
}

function validationScopeError(
  context: RequestContext,
): DocumentsApiResult<never> {
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
): DocumentsApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "VALIDATION_FAILED",
      message: "The document request is invalid.",
      correlationId: context.correlationId,
      retryable: false,
      fieldErrors: {
        [field]: [{ field, code: "INVALID_TYPE", message }],
      },
    }),
  };
}

function protectedNotFound(
  context: RequestContext,
): DocumentsApiResult<never> {
  return {
    kind: "error",
    error: createProtectedNotFoundError(context.correlationId),
  };
}

function versionConflict(
  context: RequestContext,
  expectedVersion: AggregateVersion,
  currentVersion: AggregateVersion,
): DocumentsApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "VERSION_CONFLICT",
      message: "The document changed after the supplied If-Match version.",
      correlationId: context.correlationId,
      retryable: false,
      expectedVersion,
      currentVersion,
    }),
  };
}

function idempotencyConflict(
  context: RequestContext,
): DocumentsApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "IDEMPOTENCY_CONFLICT",
      message:
        "The idempotency key does not match the deterministic document command target.",
      correlationId: context.correlationId,
      retryable: false,
    }),
  };
}

function dependencyUnavailable(
  context: RequestContext,
): DocumentsApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "DEPENDENCY_UNAVAILABLE",
      message: "The durable document job could not be scheduled.",
      correlationId: context.correlationId,
      retryable: true,
    }),
  };
}
