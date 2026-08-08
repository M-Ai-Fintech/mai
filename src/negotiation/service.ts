import type { ActorReference } from "../platform/authz/v1.ts";
import type {
  AggregateVersion,
  IdempotencyKey,
  RequestContext,
} from "../platform/api/v1.ts";
import type { NegotiationAuthorizationPort } from "./authorization.ts";
import type {
  ConsumedNegotiationAuthority,
  NegotiationAuthorityInput,
} from "./authority.ts";
import type { NegotiationEffects } from "./effects.ts";
import type {
  NegotiationDeliveryFeatureGate,
  NegotiationDeliveryJobInput,
} from "./jobs.ts";
import type {
  NegotiationCommandIdentity,
  NegotiationTransaction,
  NegotiationUnitOfWork,
  NegotiationUnitOfWorkResult,
} from "./repository.ts";
import type { ProposalOrigin } from "./model.ts";
import { NegotiationServiceOperations } from "./service_operations.ts";
import type { NegotiationScope } from "./ids.ts";
import type { NormalizedTerms } from "./terms.ts";

export interface NegotiationClock {
  now(): string;
}

export interface NegotiationJobScheduler {
  enqueue(
    transaction: NegotiationTransaction,
    job: NegotiationDeliveryJobInput,
  ): Promise<void>;
}

export interface NegotiationServiceDependencies {
  readonly unitOfWork: NegotiationUnitOfWork;
  readonly clock: NegotiationClock;
  readonly effects?: NegotiationEffects;
  readonly authority?: NegotiationAuthorityPort;
  readonly authorization?: NegotiationAuthorizationPort;
  readonly deliveryFeatureGate?: NegotiationDeliveryFeatureGate;
  readonly jobScheduler?: NegotiationJobScheduler;
}

export interface NegotiationAuthorityPort {
  consume(
    input: NegotiationAuthorityInput,
  ): Promise<ConsumedNegotiationAuthority>;
}

export interface NegotiationCommandInput {
  readonly context: RequestContext;
  readonly scope: NegotiationScope;
  readonly roundId: string;
  readonly actor: ActorReference;
  readonly expectedVersion: AggregateVersion;
  readonly idempotencyKey: IdempotencyKey;
}

export interface NegotiationReadInput {
  readonly context: RequestContext;
  readonly scope: NegotiationScope;
  readonly roundId: string;
  readonly actor: ActorReference;
}

export interface NegotiationAuthorityCommandInput
  extends NegotiationCommandInput {
  readonly authority: Pick<
    NegotiationAuthorityInput,
    "protectedCommand" | "resolver"
  >;
  readonly expectedProposalVersion?: AggregateVersion;
}

export interface NegotiationProposalDraftInput {
  readonly proposalId: string;
  readonly fromParty: "buyer" | "seller";
  readonly terms: NormalizedTerms;
  readonly origin?: ProposalOrigin;
  readonly inReplyToProposalId?: string;
}

export interface NegotiationApprovalRequestInput {
  readonly proposalId: string;
  readonly approvalId: string;
  readonly namedApproverId: string;
}

export interface NegotiationDeliveryInput {
  readonly proposalId: string;
  readonly approvalId: string;
  readonly deliveryRequestId?: string;
}

export type NegotiationCommandResult = NegotiationUnitOfWorkResult;

export class NegotiationService extends NegotiationServiceOperations {
  constructor(dependencies: NegotiationServiceDependencies) {
    super(dependencies);
  }
}

export type { NegotiationCommandIdentity };
