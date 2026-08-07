import type { AggregateVersion } from "../platform/api/v1.ts";
import type { DecisionProjection, DecisionRequest } from "./model.ts";
import type { DecisionRecordId } from "./ids.ts";
import { DiligenceDecisionError } from "./errors.ts";

/**
 * The request and projection expose one current immutable decision record.
 * Supersession advances both references in the same transaction.
 */
export function advanceDecisionRequestReference(
  request: DecisionRequest,
  expectedRecordId: DecisionRecordId,
  replacementRecordId: DecisionRecordId,
  now: Date,
): DecisionRequest {
  assertSupersedableRequest(request, expectedRecordId, replacementRecordId);
  return Object.freeze({
    ...request,
    decisionRecordId: replacementRecordId,
    version: (Number(request.version) + 1) as AggregateVersion,
    updatedAt: new Date(now),
  });
}

/**
 * Enforces the public current-decision contract before either reference is read.
 */
export function assertDecisionReferencesConsistent(
  request: DecisionRequest,
  projection: DecisionProjection | undefined,
): void {
  const expectsCurrentRecord = request.state === "decided" ||
    request.state === "invalidated";
  const hasRequestRecord = request.decisionRecordId !== undefined;
  const hasProjection = projection !== undefined;
  if (!expectsCurrentRecord && !hasRequestRecord && !hasProjection) {
    return;
  }
  if (
    expectsCurrentRecord &&
    projection !== undefined &&
    request.decisionRecordId === projection.currentRecordId &&
    projection.requestId === request.id &&
    projectionStateMatchesRequest(request, projection)
  ) return;
  const requestRecordId = request.decisionRecordId ?? "none";
  const projectionRecordId = projection?.currentRecordId ?? "none";
  const projectionState = projection?.state ?? "none";
  const expectedProjectionState = request.state === "invalidated"
    ? "invalidated"
    : "active or superseded";
  throw new DiligenceDecisionError(
    "REFERENCE_MISMATCH",
    `Decision request "${request.id}" in state "${request.state}" references current record "${requestRecordId}", but its projection references "${projectionRecordId}" in state "${projectionState}"; expected both references to be absent before a decision or to identify one shared current record with projection state "${expectedProjectionState}".`,
  );
}

function projectionStateMatchesRequest(
  request: DecisionRequest,
  projection: DecisionProjection,
): boolean {
  if (request.state === "invalidated") {
    return projection.state === "invalidated";
  }
  return projection.state === "active" || projection.state === "superseded";
}

function assertSupersedableRequest(
  request: DecisionRequest,
  expectedRecordId: DecisionRecordId,
  replacementRecordId: DecisionRecordId,
): void {
  if (request.state !== "decided") {
    throw new DiligenceDecisionError(
      "INVALID_TRANSITION",
      `Decision request "${request.id}" is "${request.state}"; expected a decided request before supersession.`,
    );
  }
  if (request.decisionRecordId !== expectedRecordId) {
    throw new DiligenceDecisionError(
      "REFERENCE_MISMATCH",
      `Decision request "${request.id}" references "${
        request.decisionRecordId ?? "none"
      }"; expected current record "${expectedRecordId}" before replacing it with "${replacementRecordId}".`,
    );
  }
  if (expectedRecordId === replacementRecordId) {
    throw new DiligenceDecisionError(
      "INVALID_INPUT",
      `Decision request "${request.id}" cannot supersede record "${expectedRecordId}" with itself; expected a distinct replacement record ID.`,
    );
  }
}
