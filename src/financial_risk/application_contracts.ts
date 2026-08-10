import type {
  ActorReference,
  AllowedAuthorizationDecision,
  AuthorizationDecision,
} from "../platform/authz/v1.ts";
import type {
  AggregateVersion,
  IdempotencyKey,
  JobId,
  OperationId,
  RequestContext,
} from "../platform/api/v1.ts";
import type { DurableJob } from "../platform/jobs/v1.ts";
import type {
  FinancialRiskInput,
  FinancialRiskReferences,
  FinancialRiskResult,
  FinancialRiskScope,
} from "./model.ts";
import type {
  FinancialRiskAssessmentId,
  FinancialRiskInvalidationId,
  FinancialRiskResultId,
} from "./ids.ts";

export interface FinancialRiskAuthorizationPort {
  authorize(input: {
    readonly context: RequestContext;
    readonly actor: ActorReference;
    readonly scope: FinancialRiskScope;
    readonly resource: { readonly kind: string; readonly id: string };
    readonly action: string;
  }): Promise<AuthorizationDecision>;
}

export interface FinancialRiskReferenceVerificationPort {
  verify(
    context: RequestContext,
    authorization: AllowedAuthorizationDecision,
    scope: FinancialRiskScope,
    references: FinancialRiskReferences,
  ): Promise<void>;
}

export interface FinancialRiskInputLoader {
  load(
    context: RequestContext,
    authorization: AllowedAuthorizationDecision,
    scope: FinancialRiskScope,
    references: FinancialRiskReferences,
  ): Promise<FinancialRiskInput>;
}

export interface FinancialRiskAuthorizedRead {
  readonly result: FinancialRiskResult;
  readonly authorization: AllowedAuthorizationDecision;
}

export interface FinancialRiskComputeRequest {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly assessmentId: FinancialRiskAssessmentId;
  readonly resultId: FinancialRiskResultId;
  readonly operationId: OperationId;
  readonly jobId: JobId;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion: AggregateVersion;
  readonly references: FinancialRiskReferences;
  readonly loadInput: FinancialRiskInputLoader;
  readonly cancellationRequested?: () => Promise<boolean>;
}

export type FinancialRiskQueuedComputeRequest = Omit<
  FinancialRiskComputeRequest,
  "loadInput" | "cancellationRequested"
>;

export interface FinancialRiskInvalidationRequest {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly assessmentId: FinancialRiskAssessmentId;
  readonly resultId: FinancialRiskResultId;
  readonly invalidationId: FinancialRiskInvalidationId;
  readonly operationId: OperationId;
  readonly jobId: JobId;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion: AggregateVersion;
  readonly reason: string;
}

export type FinancialRiskQueuedCommand =
  | {
    readonly kind: "compute";
    readonly request: FinancialRiskQueuedComputeRequest;
  }
  | {
    readonly kind: "invalidate";
    readonly request: FinancialRiskInvalidationRequest;
  };

export interface FinancialRiskCommandResult {
  readonly status: "accepted" | "replayed";
  readonly result: FinancialRiskResult;
  readonly job: DurableJob;
}

export interface FinancialRiskQueuedCommandResult {
  readonly status: "accepted" | "replayed";
  readonly job: DurableJob;
}

export type FinancialRiskCommandRequest =
  | FinancialRiskComputeRequest
  | FinancialRiskInvalidationRequest;
