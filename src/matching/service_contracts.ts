import type {
  Action,
  ActorReference,
  AuthorizationDecision,
} from "../platform/authz/v1.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import type { IdempotencyKey } from "../shared/contracts/identifiers.ts";
import type {
  CandidateProjection,
  MatchingConflict,
  MatchingCriteria,
  MatchingRun,
  MatchingScope,
  ShortlistDecisionState,
} from "./model.ts";
import type {
  CandidateId,
  ConflictId,
  CriteriaId,
  RestrictionId,
  RunId,
  ShortlistDecisionId,
} from "./ids.ts";
import type { MatchingComputePort } from "./compute.ts";
import type { MatchingEffects } from "./effects.ts";
import type { MatchingJobReceipt, MatchingRunScheduler } from "./jobs.ts";
import type { MatchingRepository } from "./repository.ts";
import type { MatchingTransactionRunner } from "./transaction.ts";

export interface MatchingAuthorizationPort {
  authorize(input: {
    readonly context: RequestContext;
    readonly actor: ActorReference;
    readonly scope: MatchingScope;
    readonly resource: { readonly kind: string; readonly id: string };
    readonly action: Action;
    readonly humanOnly?: boolean;
  }): Promise<AuthorizationDecision>;
}

export interface MatchingClock {
  now(): Date;
}

export interface CreateCriteriaInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
  readonly id: CriteriaId;
  readonly selection: MatchingCriteria["selection"];
  readonly optimizerContractVersion: string;
}

export interface StartRunInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
  readonly id: RunId;
  readonly criteriaId: CriteriaId;
  readonly idempotencyKey: IdempotencyKey;
  readonly candidateInputs: readonly CandidateProjectionInput[];
}

export interface ActivateCriteriaInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
  readonly id: CriteriaId;
  readonly expectedVersion: number;
}

export interface CandidateProjectionInput {
  readonly id: CandidateId;
  readonly restrictedIdentityReference: string;
  readonly sourceReference: string;
  readonly candidate:
    import("../engines/optimization/matching/types.ts").MatchingCandidate;
}

export interface RunExecutionInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
  readonly id: RunId;
}

export interface CandidateReadInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
  readonly id: CandidateId;
}

export interface ConflictReadInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
  readonly id: ConflictId;
}

export interface ConflictCommandInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
  readonly id: ConflictId;
  readonly expectedVersion: number;
}

export interface CreateConflictInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
  readonly id: ConflictId;
  readonly candidateId: CandidateId;
  readonly kind: MatchingConflict["kind"];
  readonly rationale?: string;
}

export interface RestrictionCommandInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
  readonly id: RestrictionId;
  readonly candidateId: CandidateId;
  readonly category: string;
  readonly expectedVersion?: number;
}

export interface ClearRestrictionInput
  extends Omit<RestrictionCommandInput, "category"> {
  readonly expectedVersion: number;
}

export interface ShortlistCommandInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
  readonly id: ShortlistDecisionId;
  readonly runId: RunId;
  readonly candidateId: CandidateId;
  readonly state: ShortlistDecisionState;
  readonly authoritySnapshotReference: string;
  readonly expectedVersion?: number;
}

export interface OutreachCommandInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: MatchingScope;
  readonly id: import("./ids.ts").OutreachAuthorizationId;
  readonly shortlistDecisionId: ShortlistDecisionId;
  readonly candidateId: CandidateId;
  readonly authoritySnapshotReference: string;
}

export interface RevokeOutreachInput extends OutreachCommandInput {
  readonly expectedVersion: number;
}

export interface StartRunResult {
  readonly run: MatchingRun;
  readonly job: MatchingJobReceipt;
}

export interface CandidateReadView {
  readonly id: CandidateId;
  readonly runId: RunId;
  readonly version: number;
  readonly metrics?: CandidateProjection["metrics"];
  readonly eligibility?: CandidateProjection["eligibility"];
  readonly restrictionState: CandidateProjection["restrictionState"];
  readonly conflictState: CandidateProjection["conflictState"];
  readonly sourceReference?: string;
  readonly restrictedIdentityReference?: string;
}

export interface ConflictReadView {
  readonly id: ConflictId;
  readonly candidateId: CandidateId;
  readonly kind: MatchingConflict["kind"];
  readonly state: MatchingConflict["state"];
  readonly version: number;
  readonly rationale?: string;
}

export interface MatchingServiceConfig {
  readonly transactions: MatchingTransactionRunner;
  readonly repository: MatchingRepository;
  readonly authorization: MatchingAuthorizationPort;
  readonly compute: MatchingComputePort;
  readonly scheduler: MatchingRunScheduler;
  readonly effects: MatchingEffects;
  readonly clock: MatchingClock;
}
