import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import {
  type AuditEventId,
  type AuditFieldClassification,
  type AuditReadQuery,
  type AuditScope,
  type AuthoritySnapshot,
  type RedactionOverlayDraft,
  type StoredRedactionOverlay,
} from "./model.ts";
import type { ActivityProjection } from "./projection.ts";
import { ActivityProjectionBuilder } from "./projection.ts";
import type { AuditEventRepository } from "./repository.ts";

export type AuditAuthorizationAction =
  | "audit.read"
  | "audit.redact"
  | "audit.export";

export interface AuditAuthorizationRequest {
  readonly action: AuditAuthorizationAction;
  readonly context: RequestContext;
  readonly scope: AuditScope;
  readonly targetEventId?: AuditEventId;
}

export interface AuditAuthorizationDecision {
  readonly allowed: boolean;
  readonly reasonCode: string;
  readonly allowedClassifications: readonly AuditFieldClassification[];
  readonly authoritySnapshot?: AuthoritySnapshot;
}

export interface AuditAuthorizationPort {
  authorize(
    request: AuditAuthorizationRequest,
  ): Promise<AuditAuthorizationDecision>;
}

export class AuditAccessDeniedError extends Error {
  readonly code = "AUDIT_ACCESS_DENIED";

  constructor(action: AuditAuthorizationAction) {
    super(
      `Audit action "${action}" was denied; expected an authorized audit scope.`,
    );
    this.name = "AuditAccessDeniedError";
  }
}

export class AuditAccessService {
  constructor(
    private readonly repository: AuditEventRepository,
    private readonly authorization: AuditAuthorizationPort,
    private readonly projections = new ActivityProjectionBuilder(),
  ) {}

  async readActivity(
    transaction: TransactionHandle,
    context: RequestContext,
    query: AuditReadQuery,
  ): Promise<ActivityProjection> {
    assertContextScope(context, query);
    const decision = await this.authorize(context, query, "audit.read");
    const events = await this.repository.list(transaction, query);
    const overlays = await this.repository.listRedactions(
      transaction,
      query.tenantId,
      events.map((event) => event.eventId),
    );
    return this.projections.rebuild({
      scope: query,
      events,
      overlays,
      allowedClassifications: decision.allowedClassifications,
    });
  }

  async appendRedaction(
    transaction: TransactionHandle,
    context: RequestContext,
    overlay: RedactionOverlayDraft,
  ): Promise<StoredRedactionOverlay> {
    assertContextScope(context, overlay);
    await this.authorize(
      context,
      overlay,
      "audit.redact",
      overlay.targetEventId,
    );
    if (overlay.actorId !== context.actorId) {
      throw new Error(
        `Audit redaction overlay "${overlay.overlayId}" actor "${overlay.actorId}" does not match context actor "${context.actorId}"; expected the authenticated actor to be recorded.`,
      );
    }
    return await this.repository.appendRedaction(transaction, overlay);
  }

  async authorizeExport(
    context: RequestContext,
    scope: AuditScope,
  ): Promise<AuditAuthorizationDecision> {
    assertContextScope(context, scope);
    return await this.authorize(context, scope, "audit.export");
  }

  private async authorize(
    context: RequestContext,
    scope: AuditScope,
    action: AuditAuthorizationAction,
    targetEventId?: AuditEventId,
  ): Promise<AuditAuthorizationDecision> {
    const decision = await this.authorization.authorize({
      action,
      context,
      scope,
      ...(targetEventId === undefined ? {} : { targetEventId }),
    });
    if (decision.allowed) return decision;
    throw new AuditAccessDeniedError(action);
  }
}

function assertContextScope(
  context: RequestContext,
  scope: AuditScope,
): void {
  if (context.tenantId !== scope.tenantId) {
    throw new Error(
      `Audit context tenant "${context.tenantId}" does not match requested tenant "${scope.tenantId}"; expected tenant isolation.`,
    );
  }
  if (
    context.workspaceId !== undefined &&
    context.workspaceId !== scope.workspaceId
  ) {
    throw new Error(
      `Audit context workspace "${context.workspaceId}" does not match requested workspace "${scope.workspaceId}"; expected scope containment.`,
    );
  }
  if (context.dealId !== undefined && context.dealId !== scope.dealId) {
    throw new Error(
      `Audit context deal "${context.dealId}" does not match requested deal "${scope.dealId}"; expected scope containment.`,
    );
  }
}
