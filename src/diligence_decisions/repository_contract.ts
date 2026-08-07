import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type {
  DecisionHistoryEntry,
  DecisionProjection,
  DecisionRecord,
  DecisionRequest,
  DiligenceScope,
  Finding,
  Impact,
} from "./model.ts";
import type {
  DecisionHistoryId,
  DecisionRecordId,
  DecisionRequestId,
  FindingId,
  ImpactId,
} from "./ids.ts";

export interface DiligenceDecisionsRepository {
  insertFinding(
    transaction: TransactionHandle,
    finding: Finding,
  ): Promise<void>;
  findFinding(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    id: FindingId,
  ): Promise<Finding | undefined>;
  updateFinding(
    transaction: TransactionHandle,
    finding: Finding,
    expectedVersion: number,
  ): Promise<void>;
  insertImpact(transaction: TransactionHandle, impact: Impact): Promise<void>;
  findImpact(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    id: ImpactId,
  ): Promise<Impact | undefined>;
  updateImpact(
    transaction: TransactionHandle,
    impact: Impact,
    expectedVersion: number,
  ): Promise<void>;
  insertDecisionRequest(
    transaction: TransactionHandle,
    request: DecisionRequest,
  ): Promise<void>;
  findDecisionRequest(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    id: DecisionRequestId,
    forUpdate?: boolean,
  ): Promise<DecisionRequest | undefined>;
  updateDecisionRequest(
    transaction: TransactionHandle,
    request: DecisionRequest,
    expectedVersion: number,
  ): Promise<void>;
  insertDecisionRecord(
    transaction: TransactionHandle,
    record: DecisionRecord,
  ): Promise<void>;
  findDecisionRecord(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    id: DecisionRecordId,
  ): Promise<DecisionRecord | undefined>;
  insertProjection(
    transaction: TransactionHandle,
    projection: DecisionProjection,
    scope: DiligenceScope,
  ): Promise<void>;
  findProjection(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    requestId: DecisionRequestId,
    forUpdate?: boolean,
  ): Promise<DecisionProjection | undefined>;
  updateProjection(
    transaction: TransactionHandle,
    projection: DecisionProjection,
    scope: DiligenceScope,
    expectedVersion: number,
  ): Promise<void>;
  insertHistory(
    transaction: TransactionHandle,
    entry: DecisionHistoryEntry,
  ): Promise<void>;
  findHistory(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    id: DecisionHistoryId,
  ): Promise<DecisionHistoryEntry | undefined>;
}
