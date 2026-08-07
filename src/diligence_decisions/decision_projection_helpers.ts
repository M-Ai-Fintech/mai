import {
  createDecisionHistoryEntry,
  createDecisionProjection,
  type DecisionHistoryEntry,
  type DecisionProjection,
  type DecisionRecord,
  type DecisionRequest,
  decisionRequestToInvalidated,
  type DiligenceScope,
} from "./model.ts";
import type {
  ChangeDecisionCommand,
  CommandDependencies,
  CommandResult,
  RecordDecisionCommand,
} from "./contracts.ts";
import { DiligenceDecisionError } from "./errors.ts";
import { appendEffect, historyId } from "./command_support.ts";
import type { DecisionAuthoritySnapshot } from "./model.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { DecisionRecordId, DecisionRequestId } from "./ids.ts";
import type { ExactEvidenceBasis } from "./basis.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";

export async function invalidateRequest(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  input: ChangeDecisionCommand,
  request: DecisionRequest,
  authority: DecisionAuthoritySnapshot,
): Promise<DecisionRequest> {
  const updated = decisionRequestToInvalidated(
    request,
    dependencies.clock.now(),
  );
  await dependencies.config.repository.updateDecisionRequest(
    transaction,
    updated,
    input.expectedRequestVersion,
  );
  await appendEffect(
    dependencies,
    transaction,
    input,
    updated,
    "decision_request_invalidated",
    input.basis,
    authority,
    input.actor,
  );
  return updated;
}

export function assertDecisionRequestReady(
  request: DecisionRequest,
  input: RecordDecisionCommand,
): void {
  if (
    request.state === "requested" &&
    request.namedApproverId === input.namedApproverId
  ) return;
  throw new DiligenceDecisionError(
    "INVALID_TRANSITION",
    `Decision request "${request.id}" is not ready for the named approver; expected requested state and exact approver identity.`,
  );
}

export function createInitialProjection(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  scope: DiligenceScope,
  requestId: DecisionRequestId,
  record: DecisionRecord,
  basis: ExactEvidenceBasis,
): Promise<void> {
  const projection = createDecisionProjection({
    requestId,
    currentRecordId: record.id,
    state: "active",
    version: 1 as AggregateVersion,
    updatedAt: dependencies.clock.now(),
  });
  return insertInitialProjection(
    dependencies,
    transaction,
    scope,
    projection,
    record,
    basis,
  );
}

async function insertInitialProjection(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  scope: DiligenceScope,
  projection: DecisionProjection,
  record: DecisionRecord,
  basis: ExactEvidenceBasis,
): Promise<void> {
  await dependencies.config.repository.insertProjection(
    transaction,
    projection,
    scope,
  );
  await dependencies.config.repository.insertHistory(
    transaction,
    createDecisionHistoryEntry({
      id: historyId(record.id),
      requestId: projection.requestId,
      recordId: record.id,
      kind: "recorded",
      scope,
      actor: record.actor,
      authority: record.authority,
      basisDigest: basis.basisDigest,
      expectedProjectionVersion: 0,
      createdAt: record.recordedAt,
    }),
  );
}

export function historyEntry(
  dependencies: CommandDependencies,
  input: ChangeDecisionCommand,
  record: DecisionRecord,
  authority: DecisionAuthoritySnapshot,
  kind: DecisionHistoryEntry["kind"],
  replacementRecordId?: DecisionRecordId,
): DecisionHistoryEntry {
  return createDecisionHistoryEntry({
    id: historyId(input.recordId, kind),
    requestId: input.requestId,
    recordId: record.id,
    ...(replacementRecordId === undefined ? {} : { replacementRecordId }),
    kind,
    scope: input.scope,
    actor: input.actor,
    authority,
    basisDigest: input.basis.basisDigest,
    expectedProjectionVersion: input.expectedProjectionVersion,
    reason: input.reason,
    createdAt: dependencies.clock.now(),
  });
}

export function replayProjection(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  input: ChangeDecisionCommand,
): Promise<CommandResult<DecisionProjection>> {
  // Replays return the current representation; immutable history retains the
  // original transition response and its exact evidence provenance.
  return dependencies.config.repository.findProjection(
    transaction,
    input.scope,
    input.requestId,
  ).then((value) => {
    if (value === undefined) {
      throw new DiligenceDecisionError(
        "PROTECTED_NOT_FOUND",
        `Protected Diligence projection "${input.requestId}" was not found; expected one replayable result.`,
      );
    }
    return { status: "replayed", value };
  });
}
