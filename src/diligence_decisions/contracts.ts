import type { ActorReference } from "../platform/authz/v1.ts";
import type {
  ActorId,
  AggregateVersion,
  IdempotencyKey,
  RequestContext,
} from "../platform/api/v1.ts";
import type { Clock, TransactionHandle } from "../platform/persistence/v1.ts";
import type { ApprovalAuthoritySnapshotPort } from "../work_management/v1.ts";
import type { ExactEvidenceBasis } from "./basis.ts";
import type { DecisionAuthorizationPort } from "./authority.ts";
import type { DiligenceDecisionEffects } from "./effects.ts";
import type {
  DecisionOutcome,
  DecisionSubject,
  DiligenceScope,
  Impact,
  ProposalState,
} from "./model.ts";
import type { EvidenceBasisVerificationPort } from "./ports.ts";
import type { DiligenceDecisionsRepository } from "./repository.ts";
import type {
  DecisionRecordId,
  DecisionRequestId,
  FindingId,
  ImpactId,
} from "./ids.ts";

export interface DiligenceTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
    metadata?: Readonly<Record<string, string>>,
  ): Promise<TResult>;
}

export interface DiligenceIdempotencyPort {
  claim(
    transaction: TransactionHandle,
    claim: import("../platform/persistence/v1.ts").IdempotencyClaim,
  ): Promise<import("../platform/persistence/v1.ts").IdempotencyClaimResult>;
  complete(
    transaction: TransactionHandle,
    claim: import("../platform/persistence/v1.ts").IdempotencyClaim,
    resultReference: string,
  ): Promise<void>;
}

export interface DiligenceDecisionServiceConfig {
  readonly transactions: DiligenceTransactionRunner;
  readonly repository: DiligenceDecisionsRepository;
  readonly authorization: DecisionAuthorizationPort;
  readonly authority: ApprovalAuthoritySnapshotPort;
  readonly basis: EvidenceBasisVerificationPort;
  readonly effects: DiligenceDecisionEffects;
  readonly idempotency?: DiligenceIdempotencyPort;
  readonly clock?: Clock;
}

export interface CommandResult<T> {
  readonly status: "accepted" | "replayed";
  readonly value: T;
}

export interface CreateFindingCommand {
  readonly context: RequestContext;
  readonly scope: DiligenceScope;
  readonly id: FindingId;
  readonly title: string;
  readonly statement: string;
  readonly basis: ExactEvidenceBasis;
  readonly proposedBy: ActorReference;
  readonly idempotencyKey: IdempotencyKey;
}

export interface CreateImpactCommand {
  readonly context: RequestContext;
  readonly scope: DiligenceScope;
  readonly id: ImpactId;
  readonly findingId: FindingId;
  readonly statement: string;
  readonly severity: Impact["severity"];
  readonly basis: ExactEvidenceBasis;
  readonly proposedBy: ActorReference;
  readonly idempotencyKey: IdempotencyKey;
}

export interface CreateDecisionRequestCommand {
  readonly context: RequestContext;
  readonly scope: DiligenceScope;
  readonly id: DecisionRequestId;
  readonly subject: DecisionSubject;
  readonly question: string;
  readonly basis: ExactEvidenceBasis;
  readonly requester: ActorReference;
  readonly namedApproverId: ActorId;
  readonly idempotencyKey: IdempotencyKey;
}

export interface RequestDecisionCommand {
  readonly context: RequestContext;
  readonly scope: DiligenceScope;
  readonly requestId: DecisionRequestId;
  readonly expectedRequestVersion: AggregateVersion;
  readonly basis: ExactEvidenceBasis;
  readonly idempotencyKey: IdempotencyKey;
}

export interface RecordDecisionCommand {
  readonly context: RequestContext;
  readonly scope: DiligenceScope;
  readonly requestId: DecisionRequestId;
  readonly recordId: DecisionRecordId;
  readonly expectedRequestVersion: AggregateVersion;
  readonly outcome: DecisionOutcome;
  readonly basis: ExactEvidenceBasis;
  readonly actor: ActorReference;
  readonly namedApproverId: ActorId;
  readonly idempotencyKey: IdempotencyKey;
}

export interface ChangeDecisionCommand {
  readonly context: RequestContext;
  readonly scope: DiligenceScope;
  readonly requestId: DecisionRequestId;
  readonly recordId: DecisionRecordId;
  readonly expectedRequestVersion: AggregateVersion;
  readonly expectedProjectionVersion: AggregateVersion;
  readonly basis: ExactEvidenceBasis;
  readonly actor: ActorReference;
  readonly namedApproverId: ActorId;
  readonly reason: string;
  readonly idempotencyKey: IdempotencyKey;
}

export interface SupersedeDecisionCommand extends ChangeDecisionCommand {
  readonly replacementRecordId: DecisionRecordId;
  readonly outcome: DecisionOutcome;
}

interface TransitionProposalFields {
  readonly context: RequestContext;
  readonly scope: DiligenceScope;
  readonly expectedVersion: AggregateVersion;
  readonly next: Exclude<ProposalState, "proposed">;
  readonly basis: ExactEvidenceBasis;
  readonly actor: ActorReference;
  readonly idempotencyKey: IdempotencyKey;
}

export type TransitionFindingCommand = TransitionProposalFields & {
  readonly aggregateType: "finding";
  readonly id: FindingId;
};

export type TransitionImpactCommand = TransitionProposalFields & {
  readonly aggregateType: "impact";
  readonly id: ImpactId;
};

export type TransitionProposalCommand =
  | TransitionFindingCommand
  | TransitionImpactCommand;

export type CommandInput = {
  readonly context: RequestContext;
  readonly scope: DiligenceScope;
  readonly idempotencyKey: IdempotencyKey;
  readonly actor?: ActorReference;
};

export type ProposalCommandInput =
  | CreateFindingCommand
  | CreateImpactCommand
  | CreateDecisionRequestCommand;

export type ClaimResult = {
  readonly status: "claimed";
  readonly claim: import("../platform/persistence/v1.ts").IdempotencyClaim;
} | {
  readonly status: "replayed";
  readonly resultReference?: string;
};

export interface CommandDependencies {
  readonly config: DiligenceDecisionServiceConfig;
  readonly clock: Clock;
  readonly idempotency: DiligenceIdempotencyPort;
}
