import type { TransactionHandle } from "../../src/platform/persistence/v1.ts";
import type {
  DecisionHistoryEntry,
  DecisionProjection,
  DecisionRecord,
  DecisionRequest,
  DiligenceScope,
  Finding,
  Impact,
} from "../../src/diligence_decisions/v1.ts";
import type { DiligenceDecisionsRepository } from "../../src/diligence_decisions/v1.ts";

export class MemoryRepository implements DiligenceDecisionsRepository {
  readonly findings = new Map<string, Finding>();
  readonly impacts = new Map<string, Impact>();
  readonly requests = new Map<string, DecisionRequest>();
  readonly records = new Map<string, DecisionRecord>();
  readonly projections = new Map<string, DecisionProjection>();
  readonly history = new Map<string, DecisionHistoryEntry>();
  findingInsertCount = 0;
  loadCount = 0;

  insertFinding(
    _transaction: TransactionHandle,
    value: Finding,
  ): Promise<void> {
    this.findingInsertCount += 1;
    this.findings.set(value.id, value);
    return Promise.resolve();
  }

  findFinding(
    _transaction: TransactionHandle,
    _scope: DiligenceScope,
    id: never,
  ): Promise<Finding | undefined> {
    this.loadCount += 1;
    return Promise.resolve(this.findings.get(id));
  }

  updateFinding(
    _transaction: TransactionHandle,
    value: Finding,
  ): Promise<void> {
    this.findings.set(value.id, value);
    return Promise.resolve();
  }

  insertImpact(_transaction: TransactionHandle, value: Impact): Promise<void> {
    this.impacts.set(value.id, value);
    return Promise.resolve();
  }

  findImpact(
    _transaction: TransactionHandle,
    _scope: DiligenceScope,
    id: never,
  ): Promise<Impact | undefined> {
    return Promise.resolve(this.impacts.get(id));
  }

  updateImpact(_transaction: TransactionHandle, value: Impact): Promise<void> {
    this.impacts.set(value.id, value);
    return Promise.resolve();
  }

  insertDecisionRequest(
    _transaction: TransactionHandle,
    value: DecisionRequest,
  ): Promise<void> {
    this.requests.set(value.id, value);
    return Promise.resolve();
  }

  findDecisionRequest(
    _transaction: TransactionHandle,
    _scope: DiligenceScope,
    id: never,
  ): Promise<DecisionRequest | undefined> {
    this.loadCount += 1;
    return Promise.resolve(this.requests.get(id));
  }

  updateDecisionRequest(
    _transaction: TransactionHandle,
    value: DecisionRequest,
  ): Promise<void> {
    this.requests.set(value.id, value);
    return Promise.resolve();
  }

  insertDecisionRecord(
    _transaction: TransactionHandle,
    value: DecisionRecord,
  ): Promise<void> {
    this.records.set(value.id, value);
    return Promise.resolve();
  }

  findDecisionRecord(
    _transaction: TransactionHandle,
    _scope: DiligenceScope,
    id: never,
  ): Promise<DecisionRecord | undefined> {
    return Promise.resolve(this.records.get(id));
  }

  insertProjection(
    _transaction: TransactionHandle,
    value: DecisionProjection,
  ): Promise<void> {
    this.projections.set(value.requestId, value);
    return Promise.resolve();
  }

  findProjection(
    _transaction: TransactionHandle,
    _scope: DiligenceScope,
    id: never,
  ): Promise<DecisionProjection | undefined> {
    return Promise.resolve(this.projections.get(id));
  }

  updateProjection(
    _transaction: TransactionHandle,
    value: DecisionProjection,
  ): Promise<void> {
    this.projections.set(value.requestId, value);
    return Promise.resolve();
  }

  insertHistory(
    _transaction: TransactionHandle,
    value: DecisionHistoryEntry,
  ): Promise<void> {
    this.history.set(value.id, value);
    return Promise.resolve();
  }

  findHistory(
    _transaction: TransactionHandle,
    _scope: DiligenceScope,
    id: never,
  ): Promise<DecisionHistoryEntry | undefined> {
    return Promise.resolve(this.history.get(id));
  }
}
