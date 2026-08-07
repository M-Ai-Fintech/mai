import type {
  Action,
  ActorReference,
  AuthorizationDecision,
} from "../platform/authz/v1.ts";
import type { AggregateVersion, RequestContext } from "../platform/api/v1.ts";
import type { ApprovalAuthoritySnapshotPort } from "../work_management/v1.ts";
import type {
  AuthorityRequirement,
  AuthoritySnapshot,
  TargetCommandType,
  TargetReference,
  WorkScope,
} from "../work_management/v1.ts";
import type { DecisionAuthoritySnapshot, DiligenceScope } from "./model.ts";
import { DiligenceDecisionError } from "./errors.ts";

export interface DecisionAuthorizationPort {
  authorize(input: {
    readonly context: RequestContext;
    readonly scope: DiligenceScope;
    readonly resource: { readonly kind: string; readonly id: string };
    readonly action: Action;
  }): Promise<AuthorizationDecision>;
}

export interface DecisionAuthorityResolutionInput {
  readonly scope: DiligenceScope;
  readonly requester: ActorReference;
  readonly namedApproverId: import("../platform/api/v1.ts").ActorId;
  readonly target: TargetReference;
  readonly requestedAction: TargetCommandType;
  readonly authorization: AuthorizationDecision;
}

export async function resolveDecisionAuthority(
  port: ApprovalAuthoritySnapshotPort,
  input: DecisionAuthorityResolutionInput,
): Promise<DecisionAuthoritySnapshot> {
  const resolved = await port.resolve({
    ...input,
    scope: input.scope as WorkScope,
  });
  assertAuthorityResponse(input, resolved.requirement, resolved.snapshot);
  return Object.freeze({
    snapshotId: resolved.snapshot.snapshotId,
    actorId: resolved.snapshot.actorId,
    policyVersion: resolved.snapshot.policyVersion,
    scope: Object.freeze({ ...input.scope }),
    capturedAt: new Date(resolved.snapshot.capturedAt),
  });
}

function assertAuthorityResponse(
  input: DecisionAuthorityResolutionInput,
  requirement: AuthorityRequirement,
  snapshot: AuthoritySnapshot,
): void {
  if (snapshot.actorKind !== "human") {
    throw authorityFailure(snapshot.snapshotId, "expected a human authority");
  }
  if (snapshot.actorId !== input.namedApproverId) {
    throw authorityFailure(
      snapshot.snapshotId,
      `actor "${snapshot.actorId}" does not match named approver "${input.namedApproverId}"`,
    );
  }
  assertAuthorityTarget(input, requirement, snapshot);
  assertAuthorityWindow(input, requirement, snapshot);
}

function assertAuthorityTarget(
  input: DecisionAuthorityResolutionInput,
  requirement: AuthorityRequirement,
  snapshot: AuthoritySnapshot,
): void {
  if (
    !sameScope(input.scope, snapshot.scope) ||
    !sameScope(input.scope, requirement.scope)
  ) {
    throw authorityFailure(
      snapshot.snapshotId,
      "scope does not match the command",
    );
  }
  if (requirement.commandType !== input.requestedAction) {
    throw authorityFailure(snapshot.snapshotId, "command type does not match");
  }
  if (
    requirement.target.aggregateType !== input.target.aggregateType ||
    requirement.target.aggregateId !== input.target.aggregateId ||
    requirement.target.expectedVersion !== input.target.expectedVersion
  ) {
    throw authorityFailure(
      snapshot.snapshotId,
      "target identity or version does not match",
    );
  }
  if (
    requirement.namedApproverId !== input.namedApproverId ||
    requirement.snapshotReference !== snapshot.snapshotId ||
    requirement.policyVersion !== snapshot.policyVersion ||
    requirement.humanOnly !== true
  ) {
    throw authorityFailure(
      snapshot.snapshotId,
      "authority requirement is not exact",
    );
  }
}

function assertAuthorityWindow(
  input: DecisionAuthorityResolutionInput,
  requirement: AuthorityRequirement,
  snapshot: AuthoritySnapshot,
): void {
  if (input.authorization.outcome !== "allow") {
    throw new DiligenceDecisionError(
      "ACTOR_DENIED",
      `Authorization denied for authority snapshot "${snapshot.snapshotId}"; expected an allowed decision command.`,
    );
  }
  const capturedAt = Date.parse(snapshot.capturedAt);
  const effectiveAt = Date.parse(requirement.effectiveAt);
  const expiresAt = Date.parse(requirement.expiresAt);
  if (
    !Number.isFinite(capturedAt) || capturedAt < effectiveAt ||
    capturedAt >= expiresAt
  ) {
    throw authorityFailure(
      snapshot.snapshotId,
      "is outside the active authority window",
    );
  }
}

function sameScope(left: WorkScope, right: WorkScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function authorityFailure(
  snapshotId: string,
  detail: string,
): DiligenceDecisionError {
  return new DiligenceDecisionError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Authority snapshot "${snapshotId}" ${detail}; expected one exact active human authority.`,
  );
}

export function decisionTarget(
  scope: DiligenceScope,
  requestId: string,
  expectedVersion: AggregateVersion,
): TargetReference {
  return {
    aggregateType: "decision_request",
    aggregateId: requestId,
    expectedVersion,
    scope: scope as WorkScope,
  };
}
