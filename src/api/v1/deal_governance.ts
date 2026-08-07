import {
  type AggregateVersion,
  createApiError,
  createProtectedNotFoundError,
  type ErrorEnvelope,
  formatEtag,
} from "../../platform/api/v1.ts";
import type { IdempotencyKey } from "../../shared/contracts/identifiers.ts";
import {
  DealGovernanceError,
  GovernanceAuthorizationError,
  GovernanceIdempotencyConflictError,
  GovernanceVersionConflictError,
} from "../../deal_governance/errors.ts";
import type {
  ConsequencePreview,
  DealGovernanceAggregate,
  GovernanceAction,
  GovernanceScope,
} from "../../deal_governance/model.ts";
import type {
  DeletionImpact,
  DeletionRequest,
} from "../../deal_governance/deletion.ts";
import type { ErasureGate } from "../../deal_governance/orchestration.ts";
import type {
  LegalHold,
  RetentionAssignment,
} from "../../deal_governance/retention.ts";
import type { DealGovernanceService } from "../../deal_governance/service.ts";
import type {
  AssessDeletionImpactCommand,
  AssignRetentionCommand,
  CancelDeletionRequestCommand,
  CreateDeletionRequestCommand,
  CreateGovernanceCommand,
  DecideDeletionRequestCommand,
  GovernanceCommandContext,
  GovernanceReadResult,
  OrchestrationResult,
  PlaceLegalHoldCommand,
  ReleaseLegalHoldCommand,
  ResumeOrchestrationCommand,
  StartOrchestrationCommand,
  SubmitDeletionRequestCommand,
  TransitionGovernanceCommand,
} from "../../deal_governance/service_contracts.ts";
import type {
  DeletionRequestId,
  LegalHoldId,
  OrchestrationId,
} from "../../deal_governance/ids.ts";

export type DealGovernanceApiResult<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "error"; readonly error: ErrorEnvelope };

export interface GovernanceCreateApiCommand {
  readonly kind: "create";
  readonly idempotencyKey: IdempotencyKey;
}

export interface GovernancePreviewApiCommand {
  readonly kind: "preview";
  readonly action: GovernanceAction;
}

export interface GovernanceTransitionApiCommand {
  readonly kind: "transition";
  readonly idempotencyKey: IdempotencyKey;
  readonly action: GovernanceAction;
  readonly expectedVersion: AggregateVersion;
  readonly preview: ConsequencePreview;
}

export interface GovernanceRetentionApiCommand {
  readonly kind: "retention";
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion: AggregateVersion;
  readonly policySource: string;
  readonly policyVersion: string;
  readonly retainedCategories: readonly string[];
  readonly retentionStartEvent: RetentionAssignment["retentionStartEvent"];
  readonly retentionUntil: string;
  readonly disposition: RetentionAssignment["disposition"];
  readonly mandatory?: boolean;
}

export interface GovernancePlaceHoldApiCommand {
  readonly kind: "place_hold";
  readonly idempotencyKey: IdempotencyKey;
  readonly categories: readonly string[];
  readonly reason: string;
  readonly reviewAt?: string;
}

export interface GovernanceReleaseHoldApiCommand {
  readonly kind: "release_hold";
  readonly idempotencyKey: IdempotencyKey;
  readonly holdId: LegalHoldId;
  readonly expectedVersion: AggregateVersion;
}

export interface GovernanceCreateDeletionApiCommand {
  readonly kind: "create_deletion";
  readonly idempotencyKey: IdempotencyKey;
  readonly requestedGovernanceVersion: number;
  readonly reason: string;
  readonly typedConfirmation: string;
  readonly expectedConfirmation: string;
  readonly requiredApprovalCount?: number;
}

export interface GovernanceImpactApiCommand {
  readonly kind: "assess_impact";
  readonly idempotencyKey: IdempotencyKey;
  readonly requestId: DeletionRequestId;
  readonly expectedVersion: AggregateVersion;
  readonly impact: DeletionImpact;
}

export interface GovernanceSubmitApiCommand {
  readonly kind: "submit_deletion";
  readonly idempotencyKey: IdempotencyKey;
  readonly requestId: DeletionRequestId;
  readonly expectedVersion: AggregateVersion;
}

export interface GovernanceDecisionApiCommand {
  readonly kind: "decide_deletion";
  readonly idempotencyKey: IdempotencyKey;
  readonly requestId: DeletionRequestId;
  readonly expectedVersion: AggregateVersion;
  readonly role: string;
  readonly decision: "approve" | "reject";
  readonly waitingPeriodMs?: number;
}

export interface GovernanceCancelApiCommand {
  readonly kind: "cancel_deletion";
  readonly idempotencyKey: IdempotencyKey;
  readonly requestId: DeletionRequestId;
  readonly expectedVersion: AggregateVersion;
}

export interface GovernanceStartOrchestrationApiCommand {
  readonly kind: "start_orchestration";
  readonly idempotencyKey: IdempotencyKey;
  readonly requestId: DeletionRequestId;
  readonly categories: readonly string[];
  readonly gate?: ErasureGate;
}

export interface GovernanceResumeOrchestrationApiCommand {
  readonly kind: "resume_orchestration";
  readonly idempotencyKey: IdempotencyKey;
  readonly orchestrationId: OrchestrationId;
  readonly expectedVersion: AggregateVersion;
}

export type DealGovernanceApiCommand =
  | GovernanceCreateApiCommand
  | GovernancePreviewApiCommand
  | GovernanceTransitionApiCommand
  | GovernanceRetentionApiCommand
  | GovernancePlaceHoldApiCommand
  | GovernanceReleaseHoldApiCommand
  | GovernanceCreateDeletionApiCommand
  | GovernanceImpactApiCommand
  | GovernanceSubmitApiCommand
  | GovernanceDecisionApiCommand
  | GovernanceCancelApiCommand
  | GovernanceStartOrchestrationApiCommand
  | GovernanceResumeOrchestrationApiCommand;

export type DealGovernanceCommandValue =
  | ConsequencePreview
  | DealGovernanceAggregate
  | GovernanceReadResult
  | RetentionAssignment
  | LegalHold
  | DeletionRequest
  | OrchestrationResult;

export class DealGovernanceV1Application {
  constructor(private readonly service: DealGovernanceService) {}

  async read(
    context: GovernanceCommandContext,
  ): Promise<DealGovernanceApiResult<GovernanceReadResult>> {
    try {
      return { kind: "ok", value: await this.service.read(context) };
    } catch (error) {
      if (error instanceof GovernanceAuthorizationError) {
        return {
          kind: "error",
          error: createProtectedNotFoundError(context.request.correlationId),
        };
      }
      return { kind: "error", error: mapGovernanceError(error, context) };
    }
  }

  async command(
    context: GovernanceCommandContext,
    input: DealGovernanceApiCommand,
  ): Promise<DealGovernanceApiResult<DealGovernanceCommandValue>> {
    return await this.execute(context, () => this.runCommand(context, input));
  }

  private async runCommand(
    context: GovernanceCommandContext,
    input: DealGovernanceApiCommand,
  ): Promise<DealGovernanceCommandValue> {
    switch (input.kind) {
      case "create":
        return await this.service.createGovernance(
          toCreateCommand(context, input),
        );
      case "preview":
        return await this.service.previewTransition(context, input.action);
      case "transition":
        return await this.service.transitionGovernance(
          toTransitionCommand(context, input),
        );
      case "retention":
        return await this.service.assignRetention(
          toRetentionCommand(context, input),
        );
      case "place_hold":
        return await this.service.placeLegalHold(
          toPlaceHoldCommand(context, input),
        );
      case "release_hold":
        return await this.service.releaseLegalHold(
          toReleaseHoldCommand(context, input),
        );
      case "create_deletion":
        return await this.service.createDeletionRequest(
          toCreateDeletionCommand(context, input),
        );
      case "assess_impact":
        return await this.service.assessDeletionImpact(
          toImpactCommand(context, input),
        );
      case "submit_deletion":
        return await this.service.submitDeletionRequest(
          toSubmitCommand(context, input),
        );
      case "decide_deletion":
        return await this.service.decideDeletionRequest(
          toDecisionCommand(context, input),
        );
      case "cancel_deletion":
        return await this.service.cancelDeletionRequest(
          toCancelCommand(context, input),
        );
      case "start_orchestration":
        return await this.service.startOrchestration(
          toStartCommand(context, input),
        );
      case "resume_orchestration":
        return await this.service.resumeOrchestration(
          toResumeCommand(context, input),
        );
    }
  }

  private async execute<T>(
    context: GovernanceCommandContext,
    callback: () => Promise<T>,
  ): Promise<DealGovernanceApiResult<T>> {
    try {
      return { kind: "ok", value: await callback() };
    } catch (error) {
      return { kind: "error", error: mapGovernanceError(error, context) };
    }
  }
}

export function mapGovernanceError(
  error: unknown,
  context: GovernanceCommandContext,
): ErrorEnvelope {
  if (isNotFound(error)) {
    return createProtectedNotFoundError(context.request.correlationId);
  }
  if (error instanceof GovernanceAuthorizationError) {
    return createApiError({
      code: "ACTION_FORBIDDEN",
      message: error.message,
      correlationId: context.request.correlationId,
      retryable: false,
    });
  }
  if (error instanceof GovernanceVersionConflictError) {
    return createApiError({
      code: "VERSION_CONFLICT",
      message: error.message,
      correlationId: context.request.correlationId,
      retryable: false,
      expectedVersion: error.expectedVersion as AggregateVersion,
      currentVersion: error.currentVersion as AggregateVersion,
    });
  }
  if (error instanceof GovernanceIdempotencyConflictError) {
    return createApiError({
      code: "IDEMPOTENCY_CONFLICT",
      message: error.message,
      correlationId: context.request.correlationId,
      retryable: false,
    });
  }
  if (error instanceof DealGovernanceError) {
    return mapDomainError(error, context);
  }
  const message = error instanceof Error
    ? error.message
    : "Deal Governance request failed.";
  return createApiError({
    code: "VALIDATION_FAILED",
    message,
    correlationId: context.request.correlationId,
    retryable: false,
    fieldErrors: {
      request: [{ field: "request", code: "INVALID_TYPE", message }],
    },
  });
}

function mapDomainError(
  error: DealGovernanceError,
  context: GovernanceCommandContext,
): ErrorEnvelope {
  const common = {
    message: error.message,
    correlationId: context.request.correlationId,
  } as const;
  if (
    error.code === "GOVERNANCE_AUTHORIZATION_DENIED" ||
    error.code === "DELETION_AUTHORITY_REQUIRED"
  ) {
    return createApiError({
      ...common,
      code: "ACTION_FORBIDDEN",
      retryable: false,
    });
  }
  if (error.code === "GOVERNANCE_IDEMPOTENCY_CONFLICT") {
    return createApiError({
      ...common,
      code: "IDEMPOTENCY_CONFLICT",
      retryable: false,
    });
  }
  if (error.code === "GOVERNANCE_VERSION_CONFLICT") {
    return createApiError({
      ...common,
      code: "STALE_VERSION",
      retryable: false,
    });
  }
  if (
    error.code === "INVALID_STATE_TRANSITION" ||
    error.code === "CHECKPOINT_CONFLICT"
  ) {
    return createApiError({
      ...common,
      code: "INVALID_TRANSITION",
      retryable: false,
    });
  }
  if (
    error.code === "RETENTION_BLOCKED" || error.code === "LEGAL_HOLD_ACTIVE" ||
    error.code === "DELETION_REQUEST_BLOCKED"
  ) {
    return createApiError({
      ...common,
      code: "RETENTION_OR_LEGAL_HOLD",
      retryable: false,
    });
  }
  if (
    error.code === "ORCHESTRATION_BLOCKED" ||
    error.code === "ERASURE_PROOF_REQUIRED"
  ) {
    return createApiError({
      ...common,
      code: "ASYNC_OPERATION_FAILED",
      retryable: true,
    });
  }
  return createApiError({
    ...common,
    code: "VALIDATION_FAILED",
    retryable: false,
    fieldErrors: {
      request: [{
        field: "request",
        code: "INVALID_TYPE",
        message: error.message,
      }],
    },
  });
}

function isNotFound(error: unknown): boolean {
  return error instanceof DealGovernanceError &&
    /was not found|not found in/.test(error.message);
}

function toCreateCommand(
  context: GovernanceCommandContext,
  input: GovernanceCreateApiCommand,
): CreateGovernanceCommand {
  return {
    type: "create_governance",
    context,
    idempotencyKey: input.idempotencyKey,
  };
}

function toTransitionCommand(
  context: GovernanceCommandContext,
  input: GovernanceTransitionApiCommand,
): TransitionGovernanceCommand {
  return {
    type: "transition_governance",
    context,
    idempotencyKey: input.idempotencyKey,
    action: input.action,
    expectedVersion: input.expectedVersion,
    preview: input.preview,
  };
}

function toRetentionCommand(
  context: GovernanceCommandContext,
  input: GovernanceRetentionApiCommand,
): AssignRetentionCommand {
  return {
    type: "assign_retention",
    context,
    idempotencyKey: input.idempotencyKey,
    expectedVersion: input.expectedVersion,
    policySource: input.policySource,
    policyVersion: input.policyVersion,
    retainedCategories: input.retainedCategories,
    retentionStartEvent: input.retentionStartEvent,
    retentionUntil: input.retentionUntil,
    disposition: input.disposition,
    mandatory: input.mandatory,
  };
}

function toPlaceHoldCommand(
  context: GovernanceCommandContext,
  input: GovernancePlaceHoldApiCommand,
): PlaceLegalHoldCommand {
  return {
    type: "place_legal_hold",
    context,
    idempotencyKey: input.idempotencyKey,
    categories: input.categories,
    reason: input.reason,
    reviewAt: input.reviewAt,
  };
}

function toReleaseHoldCommand(
  context: GovernanceCommandContext,
  input: GovernanceReleaseHoldApiCommand,
): ReleaseLegalHoldCommand {
  return {
    type: "release_legal_hold",
    context,
    idempotencyKey: input.idempotencyKey,
    holdId: input.holdId,
    expectedVersion: input.expectedVersion,
  };
}

function toCreateDeletionCommand(
  context: GovernanceCommandContext,
  input: GovernanceCreateDeletionApiCommand,
): CreateDeletionRequestCommand {
  return {
    type: "create_deletion_request",
    context,
    idempotencyKey: input.idempotencyKey,
    requestedGovernanceVersion: input.requestedGovernanceVersion,
    reason: input.reason,
    typedConfirmation: input.typedConfirmation,
    expectedConfirmation: input.expectedConfirmation,
    requiredApprovalCount: input.requiredApprovalCount,
  };
}

function toImpactCommand(
  context: GovernanceCommandContext,
  input: GovernanceImpactApiCommand,
): AssessDeletionImpactCommand {
  return {
    type: "assess_deletion_impact",
    context,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    expectedVersion: input.expectedVersion,
    impact: input.impact,
  };
}

function toSubmitCommand(
  context: GovernanceCommandContext,
  input: GovernanceSubmitApiCommand,
): SubmitDeletionRequestCommand {
  return {
    type: "submit_deletion_request",
    context,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    expectedVersion: input.expectedVersion,
  };
}

function toDecisionCommand(
  context: GovernanceCommandContext,
  input: GovernanceDecisionApiCommand,
): DecideDeletionRequestCommand {
  return {
    type: "decide_deletion_request",
    context,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    expectedVersion: input.expectedVersion,
    role: input.role,
    decision: input.decision,
    waitingPeriodMs: input.waitingPeriodMs,
  };
}

function toCancelCommand(
  context: GovernanceCommandContext,
  input: GovernanceCancelApiCommand,
): CancelDeletionRequestCommand {
  return {
    type: "cancel_deletion_request",
    context,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    expectedVersion: input.expectedVersion,
  };
}

function toStartCommand(
  context: GovernanceCommandContext,
  input: GovernanceStartOrchestrationApiCommand,
): StartOrchestrationCommand {
  return {
    type: "start_erasure_orchestration",
    context,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    categories: input.categories,
    gate: input.gate,
  };
}

function toResumeCommand(
  context: GovernanceCommandContext,
  input: GovernanceResumeOrchestrationApiCommand,
): ResumeOrchestrationCommand {
  return {
    type: "resume_erasure_orchestration",
    context,
    idempotencyKey: input.idempotencyKey,
    orchestrationId: input.orchestrationId,
    expectedVersion: input.expectedVersion,
  };
}

export function scopeForGovernanceContext(
  context: GovernanceCommandContext,
): GovernanceScope {
  if (
    context.request.workspaceId === undefined ||
    context.request.dealId === undefined
  ) {
    throw new Error(
      `Governance request for tenant "${context.request.tenantId}" lacks workspace or deal scope; expected both identifiers.`,
    );
  }
  return {
    tenantId: context.request.tenantId,
    workspaceId: context.request.workspaceId,
    dealId: context.request.dealId,
  };
}

export function etagForGovernanceValue(value: unknown): string | undefined {
  if (isVersioned(value)) return formatEtag(value.version as AggregateVersion);
  if (!isRecord(value) || !isVersioned(value.governance)) return undefined;
  return formatEtag(value.governance.version as AggregateVersion);
}

function isVersioned(value: unknown): value is { readonly version: number } {
  return typeof value === "object" && value !== null && "version" in value &&
    typeof value.version === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
