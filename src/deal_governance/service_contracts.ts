import type {
  ActorReference,
  AuthorizationDecision,
} from "../platform/authz/v1.ts";
import type {
  ActorId,
  CorrelationId,
  IdempotencyKey,
} from "../shared/contracts/identifiers.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type {
  ConsequencePreview,
  DealGovernanceAggregate,
  GovernanceAction,
  GovernanceScope,
} from "./model.ts";
import type { LegalHold, RetentionAssignment } from "./retention.ts";
import type { DeletionImpact, DeletionRequest } from "./deletion.ts";
import type {
  ErasureGate,
  ErasureManifest,
  ErasureOrchestration,
} from "./orchestration.ts";
import type {
  ConsequencePreviewId,
  DeletionApprovalId,
  DeletionRequestId,
  ErasureManifestId,
  GovernanceId,
  LegalHoldId,
  OrchestrationId,
  RetentionAssignmentId,
} from "./ids.ts";

export interface GovernanceCommandContext {
  readonly actor: ActorReference;
  readonly request: RequestContext;
  readonly now: string;
}

export type GovernanceAuthorizationAction =
  | GovernanceAction
  | "create"
  | "read"
  | "manage_retention"
  | "place_legal_hold"
  | "release_legal_hold"
  | "request_deletion"
  | "approve_deletion"
  | "execute_deletion";

export interface GovernanceAuthorizationInput {
  readonly context: GovernanceCommandContext;
  readonly scope: GovernanceScope;
  readonly action: GovernanceAuthorizationAction;
  readonly humanOnly: boolean;
}

export interface GovernanceAuthorizationPort {
  authorize(
    input: GovernanceAuthorizationInput,
  ): Promise<AuthorizationDecision | boolean> | AuthorizationDecision | boolean;
}

export interface GovernanceClock {
  now(): string;
}

export interface DealGovernanceIdFactory {
  nextGovernanceId(): GovernanceId;
  nextPreviewId(): ConsequencePreviewId;
  nextRetentionAssignmentId(): RetentionAssignmentId;
  nextLegalHoldId(): LegalHoldId;
  nextDeletionRequestId(): DeletionRequestId;
  nextDeletionApprovalId(): DeletionApprovalId;
  nextOrchestrationId(): OrchestrationId;
  nextManifestId(): ErasureManifestId;
  nextEventId(): string;
}

export interface ErasureExecutor {
  erase(input: {
    readonly scope: GovernanceScope;
    readonly category: string;
    readonly requestId: DeletionRequestId;
    readonly actorId: ActorId;
    readonly correlationId: CorrelationId;
  }): Promise<{ readonly proofReference: string }>;
}

export interface CreateGovernanceCommand {
  readonly type: "create_governance";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
}

export interface TransitionGovernanceCommand {
  readonly type: "transition_governance";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly action: GovernanceAction;
  readonly expectedVersion: number;
  readonly preview: ConsequencePreview;
}

export interface AssignRetentionCommand {
  readonly type: "assign_retention";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion: number;
  readonly policySource: string;
  readonly policyVersion: string;
  readonly retainedCategories: readonly string[];
  readonly retentionStartEvent: RetentionAssignment["retentionStartEvent"];
  readonly retentionUntil: string;
  readonly disposition: RetentionAssignment["disposition"];
  readonly mandatory?: boolean;
}

export interface PlaceLegalHoldCommand {
  readonly type: "place_legal_hold";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly categories: readonly string[];
  readonly reason: string;
  readonly reviewAt?: string;
}

export interface ReleaseLegalHoldCommand {
  readonly type: "release_legal_hold";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly holdId: LegalHoldId;
  readonly expectedVersion: number;
}

export interface CreateDeletionRequestCommand {
  readonly type: "create_deletion_request";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly requestedGovernanceVersion: number;
  readonly reason: string;
  readonly typedConfirmation: string;
  readonly expectedConfirmation: string;
  readonly requiredApprovalCount?: number;
}

export interface AssessDeletionImpactCommand {
  readonly type: "assess_deletion_impact";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly requestId: DeletionRequestId;
  readonly expectedVersion: number;
  readonly impact: DeletionImpact;
}

export interface SubmitDeletionRequestCommand {
  readonly type: "submit_deletion_request";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly requestId: DeletionRequestId;
  readonly expectedVersion: number;
}

export interface DecideDeletionRequestCommand {
  readonly type: "decide_deletion_request";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly requestId: DeletionRequestId;
  readonly expectedVersion: number;
  readonly role: string;
  readonly decision: "approve" | "reject";
  readonly waitingPeriodMs?: number;
}

export interface CancelDeletionRequestCommand {
  readonly type: "cancel_deletion_request";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly requestId: DeletionRequestId;
  readonly expectedVersion: number;
}

export interface StartOrchestrationCommand {
  readonly type: "start_erasure_orchestration";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly requestId: DeletionRequestId;
  readonly categories: readonly string[];
  readonly gate?: ErasureGate;
}

export interface ResumeOrchestrationCommand {
  readonly type: "resume_erasure_orchestration";
  readonly context: GovernanceCommandContext;
  readonly idempotencyKey: IdempotencyKey;
  readonly orchestrationId: OrchestrationId;
  readonly expectedVersion: number;
}

export type GovernanceCommand =
  | CreateGovernanceCommand
  | TransitionGovernanceCommand
  | AssignRetentionCommand
  | PlaceLegalHoldCommand
  | ReleaseLegalHoldCommand
  | CreateDeletionRequestCommand
  | AssessDeletionImpactCommand
  | SubmitDeletionRequestCommand
  | DecideDeletionRequestCommand
  | CancelDeletionRequestCommand
  | StartOrchestrationCommand
  | ResumeOrchestrationCommand;

export interface GovernanceReadResult {
  readonly governance: DealGovernanceAggregate;
  readonly retention?: RetentionAssignment;
  readonly holds: readonly LegalHold[];
  readonly deletionRequest?: DeletionRequest;
  readonly orchestration?: ErasureOrchestration;
  readonly manifest?: ErasureManifest;
}

export interface OrchestrationResult {
  readonly orchestration: ErasureOrchestration;
  readonly manifest: ErasureManifest;
  readonly deletionRequest: DeletionRequest;
}

export type GovernanceCommandResult =
  | GovernanceReadResult
  | ConsequencePreview
  | DealGovernanceAggregate
  | RetentionAssignment
  | LegalHold
  | DeletionRequest
  | ErasureOrchestration
  | ErasureManifest
  | OrchestrationResult;
