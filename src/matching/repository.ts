import type { TransactionHandle } from "../platform/persistence/v1.ts";
import { assertMatchingVersion, protectedNotFound } from "./errors.ts";
import type {
  CandidateProjection,
  CandidateRestriction,
  MatchingConflict,
  MatchingCriteria,
  MatchingRun,
  MatchingScope,
  OutreachAuthorization,
  ShortlistDecision,
} from "./model.ts";
import { sameMatchingScope } from "./model.ts";
import type {
  CandidateId,
  ConflictId,
  CriteriaId,
  OutreachAuthorizationId,
  RestrictionId,
  RunId,
  ShortlistDecisionId,
} from "./ids.ts";

export interface MatchingRepository {
  createCriteria(tx: TransactionHandle, value: MatchingCriteria): Promise<void>;
  findCriteria(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: CriteriaId,
  ): Promise<MatchingCriteria | undefined>;
  updateCriteria(
    tx: TransactionHandle,
    value: MatchingCriteria,
    expectedVersion: number,
  ): Promise<void>;
  createRun(tx: TransactionHandle, value: MatchingRun): Promise<void>;
  findRun(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: RunId,
  ): Promise<MatchingRun | undefined>;
  updateRun(
    tx: TransactionHandle,
    value: MatchingRun,
    expectedVersion: number,
  ): Promise<void>;
  replaceCandidates(
    tx: TransactionHandle,
    scope: MatchingScope,
    runId: RunId,
    values: readonly CandidateProjection[],
  ): Promise<void>;
  findCandidate(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: CandidateId,
  ): Promise<CandidateProjection | undefined>;
  listCandidates(
    tx: TransactionHandle,
    scope: MatchingScope,
    runId: RunId,
  ): Promise<readonly CandidateProjection[]>;
  updateCandidate(
    tx: TransactionHandle,
    value: CandidateProjection,
    expectedVersion: number,
  ): Promise<void>;
  createConflict(tx: TransactionHandle, value: MatchingConflict): Promise<void>;
  findConflict(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: ConflictId,
  ): Promise<MatchingConflict | undefined>;
  updateConflict(
    tx: TransactionHandle,
    value: MatchingConflict,
    expectedVersion: number,
  ): Promise<void>;
  createRestriction(
    tx: TransactionHandle,
    value: CandidateRestriction,
  ): Promise<void>;
  findRestriction(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: RestrictionId,
  ): Promise<CandidateRestriction | undefined>;
  updateRestriction(
    tx: TransactionHandle,
    value: CandidateRestriction,
    expectedVersion: number,
  ): Promise<void>;
  createShortlistDecision(
    tx: TransactionHandle,
    value: ShortlistDecision,
  ): Promise<void>;
  findShortlistDecision(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: ShortlistDecisionId,
  ): Promise<ShortlistDecision | undefined>;
  updateShortlistDecision(
    tx: TransactionHandle,
    value: ShortlistDecision,
    expectedVersion: number,
  ): Promise<void>;
  createOutreachAuthorization(
    tx: TransactionHandle,
    value: OutreachAuthorization,
  ): Promise<void>;
  findOutreachAuthorization(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: OutreachAuthorizationId,
  ): Promise<OutreachAuthorization | undefined>;
  updateOutreachAuthorization(
    tx: TransactionHandle,
    value: OutreachAuthorization,
    expectedVersion: number,
  ): Promise<void>;
}

export type MatchingStoredAggregate =
  | MatchingCriteria
  | MatchingRun
  | CandidateProjection
  | MatchingConflict
  | CandidateRestriction
  | ShortlistDecision
  | OutreachAuthorization;

/** Process-local repository used only by named matching tests. */
export class InMemoryMatchingRepository implements MatchingRepository {
  private readonly values = new Map<string, MatchingStoredAggregate>();

  createCriteria(
    _tx: TransactionHandle,
    value: MatchingCriteria,
  ): Promise<void> {
    return Promise.resolve(this.create(value));
  }
  findCriteria(
    _tx: TransactionHandle,
    scope: MatchingScope,
    id: CriteriaId,
  ): Promise<MatchingCriteria | undefined> {
    return Promise.resolve(
      this.find(scope, id, "matching_criteria") as MatchingCriteria | undefined,
    );
  }
  updateCriteria(
    _tx: TransactionHandle,
    value: MatchingCriteria,
    expectedVersion: number,
  ): Promise<void> {
    return Promise.resolve(this.update(value, expectedVersion));
  }
  createRun(_tx: TransactionHandle, value: MatchingRun): Promise<void> {
    return Promise.resolve(this.create(value));
  }
  findRun(
    _tx: TransactionHandle,
    scope: MatchingScope,
    id: RunId,
  ): Promise<MatchingRun | undefined> {
    return Promise.resolve(
      this.find(scope, id, "matching_run") as MatchingRun | undefined,
    );
  }
  updateRun(
    _tx: TransactionHandle,
    value: MatchingRun,
    expectedVersion: number,
  ): Promise<void> {
    return Promise.resolve(this.update(value, expectedVersion));
  }

  replaceCandidates(
    _tx: TransactionHandle,
    scope: MatchingScope,
    runId: RunId,
    values: readonly CandidateProjection[],
  ): Promise<void> {
    for (const value of values) {
      assertCandidateScope(value, scope, runId);
      const existing = this.find(scope, value.id, "candidate_projection");
      this.values.set(
        this.key(scope, value.id, value.aggregateType),
        existing === undefined
          ? value
          : preserveCandidateState(existing as CandidateProjection, value),
      );
    }
    return Promise.resolve();
  }

  findCandidate(
    _tx: TransactionHandle,
    scope: MatchingScope,
    id: CandidateId,
  ): Promise<CandidateProjection | undefined> {
    return Promise.resolve(
      this.find(scope, id, "candidate_projection") as
        | CandidateProjection
        | undefined,
    );
  }
  listCandidates(
    _tx: TransactionHandle,
    scope: MatchingScope,
    runId: RunId,
  ): Promise<readonly CandidateProjection[]> {
    const values = [...this.values.values()].filter((
      value,
    ): value is CandidateProjection =>
      value.aggregateType === "candidate_projection" && value.runId === runId &&
      sameMatchingScope(value.scope, scope)
    );
    return Promise.resolve(
      values.sort((left, right) => left.id.localeCompare(right.id)),
    );
  }
  updateCandidate(
    _tx: TransactionHandle,
    value: CandidateProjection,
    expectedVersion: number,
  ): Promise<void> {
    return Promise.resolve(this.update(value, expectedVersion));
  }
  createConflict(
    _tx: TransactionHandle,
    value: MatchingConflict,
  ): Promise<void> {
    return Promise.resolve(this.create(value));
  }
  findConflict(
    _tx: TransactionHandle,
    scope: MatchingScope,
    id: ConflictId,
  ): Promise<MatchingConflict | undefined> {
    return Promise.resolve(
      this.find(scope, id, "matching_conflict") as MatchingConflict | undefined,
    );
  }
  updateConflict(
    _tx: TransactionHandle,
    value: MatchingConflict,
    expectedVersion: number,
  ): Promise<void> {
    return Promise.resolve(this.update(value, expectedVersion));
  }
  createRestriction(
    _tx: TransactionHandle,
    value: CandidateRestriction,
  ): Promise<void> {
    return Promise.resolve(this.create(value));
  }
  findRestriction(
    _tx: TransactionHandle,
    scope: MatchingScope,
    id: RestrictionId,
  ): Promise<CandidateRestriction | undefined> {
    return Promise.resolve(
      this.find(scope, id, "candidate_restriction") as
        | CandidateRestriction
        | undefined,
    );
  }
  updateRestriction(
    _tx: TransactionHandle,
    value: CandidateRestriction,
    expectedVersion: number,
  ): Promise<void> {
    return Promise.resolve(this.update(value, expectedVersion));
  }
  createShortlistDecision(
    _tx: TransactionHandle,
    value: ShortlistDecision,
  ): Promise<void> {
    return Promise.resolve(this.create(value));
  }
  findShortlistDecision(
    _tx: TransactionHandle,
    scope: MatchingScope,
    id: ShortlistDecisionId,
  ): Promise<ShortlistDecision | undefined> {
    return Promise.resolve(
      this.find(scope, id, "shortlist_decision") as
        | ShortlistDecision
        | undefined,
    );
  }
  updateShortlistDecision(
    _tx: TransactionHandle,
    value: ShortlistDecision,
    expectedVersion: number,
  ): Promise<void> {
    return Promise.resolve(this.update(value, expectedVersion));
  }
  createOutreachAuthorization(
    _tx: TransactionHandle,
    value: OutreachAuthorization,
  ): Promise<void> {
    return Promise.resolve(this.create(value));
  }
  findOutreachAuthorization(
    _tx: TransactionHandle,
    scope: MatchingScope,
    id: OutreachAuthorizationId,
  ): Promise<OutreachAuthorization | undefined> {
    return Promise.resolve(
      this.find(scope, id, "outreach_authorization") as
        | OutreachAuthorization
        | undefined,
    );
  }
  updateOutreachAuthorization(
    _tx: TransactionHandle,
    value: OutreachAuthorization,
    expectedVersion: number,
  ): Promise<void> {
    return Promise.resolve(this.update(value, expectedVersion));
  }

  private create(value: MatchingStoredAggregate): void {
    const key = this.key(value.scope, value.id, value.aggregateType);
    if (this.values.has(key)) {
      throw new Error(
        `Matching aggregate "${value.id}" already exists; expected a unique semantic identifier.`,
      );
    }
    this.values.set(key, value);
  }

  private update(
    value: MatchingStoredAggregate,
    expectedVersion: number,
  ): void {
    const key = this.key(value.scope, value.id, value.aggregateType);
    const current = this.values.get(key);
    if (current === undefined) throw protectedNotFound(value.id);
    assertMatchingVersion(value.id, expectedVersion, current.version);
    this.values.set(key, value);
  }

  private find(
    scope: MatchingScope,
    id: string,
    aggregateType: string,
  ): MatchingStoredAggregate | undefined {
    return this.values.get(this.key(scope, id, aggregateType));
  }

  private key(scope: MatchingScope, id: string, aggregateType: string): string {
    return `${aggregateType}:${scope.tenantId}:${scope.workspaceId}:${scope.dealId}:${id}`;
  }
}

function assertCandidateScope(
  value: CandidateProjection,
  scope: MatchingScope,
  runId: RunId,
): void {
  if (sameMatchingScope(value.scope, scope) && value.runId === runId) return;
  throw new Error(
    `Candidate projection "${value.id}" is outside run "${runId}" scope; expected one matching scope.`,
  );
}

function preserveCandidateState(
  existing: CandidateProjection,
  replacement: CandidateProjection,
): CandidateProjection {
  return {
    ...replacement,
    restrictionState: existing.restrictionState,
    conflictState: existing.conflictState,
  };
}

export { PostgresMatchingRepository } from "./postgres_repository.ts";
