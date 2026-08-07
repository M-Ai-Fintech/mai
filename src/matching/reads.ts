import { field } from "../platform/authz/v1.ts";
import type { AuthorizationDecision } from "../platform/authz/v1.ts";
import type {
  CandidateReadInput,
  CandidateReadView,
  ConflictReadInput,
  ConflictReadView,
} from "./service_contracts.ts";
import type { MatchingRuntime } from "./runtime.ts";
import { ACTIONS, assertScope, authorizeRead, RESOURCES } from "./runtime.ts";
import { protectedNotFound } from "./errors.ts";
import type { CandidateProjection, MatchingConflict } from "./model.ts";

export async function readCandidate(
  runtime: MatchingRuntime,
  input: CandidateReadInput,
): Promise<CandidateReadView> {
  assertScope(input.context, input.scope);
  const decision = await authorizeRead(
    runtime,
    input,
    RESOURCES.candidate,
    ACTIONS.candidateRead,
  );
  return await runtime.transactions.run(async (transaction) => {
    const candidate = await runtime.repository.findCandidate(
      transaction,
      input.scope,
      input.id,
    );
    if (candidate === undefined) throw protectedNotFound(input.id);
    return projectCandidate(candidate, decision);
  });
}

export async function readConflict(
  runtime: MatchingRuntime,
  input: ConflictReadInput,
): Promise<ConflictReadView> {
  assertScope(input.context, input.scope);
  const decision = await authorizeRead(
    runtime,
    input,
    RESOURCES.conflict,
    ACTIONS.conflictRead,
  );
  return await runtime.transactions.run(async (transaction) => {
    const conflict = await runtime.repository.findConflict(
      transaction,
      input.scope,
      input.id,
    );
    if (conflict === undefined) throw protectedNotFound(input.id);
    return projectConflict(conflict, decision);
  });
}

function projectCandidate(
  candidate: CandidateProjection,
  decision: AuthorizationDecision,
): CandidateReadView {
  const view: CandidateReadView = {
    id: candidate.id,
    runId: candidate.runId,
    version: candidate.version,
    restrictionState: candidate.restrictionState,
    conflictState: candidate.conflictState,
  };
  return {
    ...view,
    ...(approved(decision, "candidate_metrics", "public")
      ? { metrics: candidate.metrics, eligibility: candidate.eligibility }
      : {}),
    ...(approved(decision, "candidate_source", "restricted")
      ? { sourceReference: candidate.sourceReference }
      : {}),
    ...(approved(decision, "candidate_identity", "restricted")
      ? { restrictedIdentityReference: candidate.restrictedIdentityReference }
      : {}),
  };
}

function projectConflict(
  conflict: MatchingConflict,
  decision: AuthorizationDecision,
): ConflictReadView {
  return {
    id: conflict.id,
    candidateId: conflict.candidateId,
    kind: conflict.kind,
    state: conflict.state,
    version: conflict.version,
    ...(approved(decision, "conflict_rationale", "conflict_rationale")
      ? { rationale: conflict.rationale }
      : {}),
  };
}

function approved(
  decision: AuthorizationDecision,
  name: string,
  classification: "public" | "restricted" | "conflict_rationale",
): boolean {
  if (decision.outcome === "deny") return false;
  const requested = field(name);
  return decision.fieldMask.include.includes(requested) &&
    decision.fieldMask.approvedClassifications.some((item) =>
      item.name === requested && item.classification === classification
    );
}
