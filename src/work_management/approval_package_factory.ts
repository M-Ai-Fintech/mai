import type {
  ActorReference,
  AuthorizationDecision,
} from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import { createApprovalPackage } from "./approval_requests.ts";
import {
  type ActorId,
  approvalPackageId,
  type ApprovalRequestId,
  type TargetCommandType,
  type WorkScope,
} from "./ids.ts";
import {
  type ApprovalPackage,
  assertDifferentActors,
  assertHumanActor,
  assertScope,
  type AuthorityRequirement,
  type AuthoritySnapshot,
  type EvidenceSnapshotReference,
  type TargetReference,
  WorkManagementError,
} from "./model.ts";
import type { AuthorityFacts } from "./authority_facts.ts";
import { parseAuthorityFacts } from "./authority_facts.ts";
import {
  AuthorityDenialError,
  createAuthorityDenial,
  GovernedAuthorityDenialError,
  InvalidTrustedAuthorityResponseError,
} from "./authority_denial.ts";

export interface ApprovalTargetPort {
  /** True only for PostgreSQL transaction-local adapters. */
  readonly transactionSafe?: true;
  readonly transactionMode?: "postgres_transaction_local";
  validate(
    scope: WorkScope,
    target: TargetReference,
  ): Promise<TargetReference>;
  currentVersion(target: TargetReference): Promise<AggregateVersion>;
}

export interface ApprovalEvidencePort {
  /** True only for PostgreSQL transaction-local adapters. */
  readonly transactionSafe?: true;
  readonly transactionMode?: "postgres_transaction_local";
  validate(
    scope: WorkScope,
    evidence: readonly EvidenceSnapshotReference[],
  ): Promise<readonly EvidenceSnapshotReference[]>;
}

export interface ApprovalAuthoritySnapshotPort {
  /** True only for PostgreSQL transaction-local adapters. */
  readonly transactionSafe?: true;
  readonly transactionMode?: "postgres_transaction_local";
  resolve(input: {
    readonly scope: WorkScope;
    readonly requester: ActorReference;
    readonly namedApproverId: ActorId;
    readonly target: TargetReference;
    readonly requestedAction: TargetCommandType;
    readonly authorization: AuthorizationDecision;
  }): Promise<ResolvedApprovalAuthority>;
}

export interface ResolvedApprovalAuthority {
  readonly requirement: AuthorityRequirement;
  readonly snapshot: AuthoritySnapshot;
  /** Facts returned by a trusted server adapter, never from the HTTP body. */
  readonly facts?: unknown;
}

export interface ServerApprovalPackageResult {
  readonly packageValue: ApprovalPackage;
  readonly facts?: AuthorityFacts;
}

export interface ServerApprovalPackageInput {
  readonly requestId: ApprovalRequestId;
  readonly scope: WorkScope;
  readonly requester: ActorReference;
  readonly now: string;
  readonly namedApproverId: ActorId;
  readonly requestedAction: TargetCommandType;
  readonly target: TargetReference;
  readonly evidence: readonly EvidenceSnapshotReference[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly claimedDigest?: string;
  readonly authorization: AuthorizationDecision;
  readonly idempotencyIdentity?: string;
}

/** Builds an immutable package only from trusted, server-validated evidence. */
export async function buildServerApprovalPackage(
  input: ServerApprovalPackageInput,
  ports: {
    readonly targets: ApprovalTargetPort;
    readonly evidence: ApprovalEvidencePort;
    readonly authority: ApprovalAuthoritySnapshotPort;
  },
): Promise<ApprovalPackage> {
  return (await buildServerApprovalPackageWithAuthority(input, ports))
    .packageValue;
}

/** Builds the package and returns validated server-owned authority facts. */
export async function buildServerApprovalPackageWithAuthority(
  input: ServerApprovalPackageInput,
  ports: {
    readonly targets: ApprovalTargetPort;
    readonly evidence: ApprovalEvidencePort;
    readonly authority: ApprovalAuthoritySnapshotPort;
  },
): Promise<ServerApprovalPackageResult> {
  try {
    return await buildServerApprovalPackageWithAuthorityCore(input, ports);
  } catch (error) {
    if (!(error instanceof GovernedAuthorityDenialError)) throw error;
    const denial = await createAuthorityDenial({
      stage: "pre_package",
      scope: input.scope,
      requesterId: input.requester.id,
      namedApproverId: input.namedApproverId,
      requestedAction: input.requestedAction,
      targetAggregateType: input.target.aggregateType,
      targetAggregateId: input.target.aggregateId,
      expectedTargetVersion: input.target.expectedVersion,
      authorizationSnapshotReference:
        input.authorization.authoritySnapshotReference,
      reasons: [error.reason],
      evaluatedAt: input.now,
      idempotencyIdentity: input.idempotencyIdentity ??
        `create_approval_request|${input.requestId}|${input.requester.id}`,
    });
    throw new AuthorityDenialError(denial);
  }
}

async function buildServerApprovalPackageWithAuthorityCore(
  input: ServerApprovalPackageInput,
  ports: {
    readonly targets: ApprovalTargetPort;
    readonly evidence: ApprovalEvidencePort;
    readonly authority: ApprovalAuthoritySnapshotPort;
  },
): Promise<ServerApprovalPackageResult> {
  assertHumanActor(
    input.requester,
    `create Approval Request "${input.requestId}"`,
  );
  assertDifferentActors(input.requester.id, input.namedApproverId);
  const target = await ports.targets.validate(input.scope, input.target);
  assertScope(
    input.scope,
    target.scope,
    `Approval Request "${input.requestId}" target`,
  );
  const evidence = await ports.evidence.validate(input.scope, input.evidence);
  const resolved = await ports.authority.resolve({
    scope: input.scope,
    requester: input.requester,
    namedApproverId: input.namedApproverId,
    target,
    requestedAction: input.requestedAction,
    authorization: input.authorization,
  });
  assertTrustedAuthorityResponse(resolved);
  const facts = resolved.facts === undefined
    ? undefined
    : parseAuthorityFacts(resolved.facts);
  assertTrustedAuthority(input, target, resolved);
  const packageValue = await createApprovalPackage({
    id: packageIdFor(input.requestId),
    version: 1,
    target,
    evidence,
    authority: resolved.requirement,
    authoritySnapshot: resolved.snapshot,
    payload: input.payload,
  });
  if (
    input.claimedDigest !== undefined &&
    input.claimedDigest !== packageValue.contentDigest
  ) {
    throw new WorkManagementError(
      "STALE_APPROVAL_PACKAGE",
      `Approval Request "${input.requestId}" claimed digest "${input.claimedDigest}" does not match the server digest; expected exact package content.`,
    );
  }
  return {
    packageValue,
    ...(facts === undefined ? {} : { facts }),
  };
}

function assertTrustedAuthority(
  input: ServerApprovalPackageInput,
  target: TargetReference,
  resolved: ResolvedApprovalAuthority,
): void {
  const { requirement, snapshot } = resolved;
  if (
    snapshot.actorId !== input.namedApproverId || snapshot.actorKind !== "human"
  ) {
    throw new GovernedAuthorityDenialError(
      snapshot.actorKind === "human"
        ? "NAMED_APPROVER_MISMATCH"
        : "HUMAN_ONLY_AUTHORITY_REQUIRED",
      `Authority snapshot "${snapshot.snapshotId}" actor "${snapshot.actorId}" does not match named approver "${input.namedApproverId}"; expected one active human authority.`,
    );
  }
  if (
    !sameScope(input.scope, snapshot.scope) ||
    !sameScope(input.scope, requirement.scope)
  ) {
    throw new GovernedAuthorityDenialError(
      "DEAL_SCOPE_MISMATCH",
      `Authority snapshot "${snapshot.snapshotId}" does not match the request scope; expected the same tenant, workspace, and Deal.`,
    );
  }
  if (requirement.namedApproverId !== input.namedApproverId) {
    throw new GovernedAuthorityDenialError(
      "NAMED_APPROVER_MISMATCH",
      `Authority requirement "${snapshot.snapshotId}" named approver differs from the requested approver; expected exact identity equality.`,
    );
  }
  if (requirement.policyVersion !== snapshot.policyVersion) {
    throw new GovernedAuthorityDenialError(
      "POLICY_VERSION_MISMATCH",
      `Authority requirement "${snapshot.snapshotId}" policy version differs from its snapshot; expected exact version equality.`,
    );
  }
  if (requirement.snapshotReference !== snapshot.snapshotId) {
    throw new GovernedAuthorityDenialError(
      "SNAPSHOT_REFERENCE_MISMATCH",
      `Authority requirement snapshot reference differs from "${snapshot.snapshotId}"; expected exact reference equality.`,
    );
  }
  if (requirement.humanOnly !== true) {
    throw new GovernedAuthorityDenialError(
      "HUMAN_ONLY_AUTHORITY_REQUIRED",
      `Authority requirement "${snapshot.snapshotId}" is not human-only; expected an active human approver.`,
    );
  }
  if (requirement.commandType !== input.requestedAction) {
    throw new GovernedAuthorityDenialError(
      "REQUESTED_ACTION_MISMATCH",
      `Requested approval action "${input.requestedAction}" differs from server-approved command "${requirement.commandType}"; expected exact command equality.`,
    );
  }
  if (requirement.target.aggregateType !== target.aggregateType) {
    throw new GovernedAuthorityDenialError(
      "TARGET_TYPE_MISMATCH",
      `Authority requirement target type "${requirement.target.aggregateType}" differs from validated target type "${target.aggregateType}"; expected exact target identity.`,
    );
  }
  if (requirement.target.aggregateId !== target.aggregateId) {
    throw new GovernedAuthorityDenialError(
      "TARGET_ID_MISMATCH",
      `Authority requirement target ID "${requirement.target.aggregateId}" differs from validated target ID "${target.aggregateId}"; expected exact target identity.`,
    );
  }
  if (requirement.target.expectedVersion !== target.expectedVersion) {
    throw new GovernedAuthorityDenialError(
      "TARGET_VERSION_MISMATCH",
      `Authority requirement target version "${requirement.target.expectedVersion}" differs from validated target version "${target.expectedVersion}"; expected exact version equality.`,
    );
  }
  if (requirement.target.scope.dealId !== target.scope.dealId) {
    throw new GovernedAuthorityDenialError(
      "DEAL_SCOPE_MISMATCH",
      `Authority requirement target Deal "${requirement.target.scope.dealId}" differs from validated target Deal "${target.scope.dealId}"; expected exact scope equality.`,
    );
  }
  const evaluatedAt = Date.parse(input.now);
  const effectiveAt = Date.parse(requirement.effectiveAt);
  const expiresAt = Date.parse(requirement.expiresAt);
  if (evaluatedAt < effectiveAt) {
    throw new GovernedAuthorityDenialError(
      "AUTHORITY_NOT_YET_EFFECTIVE",
      `Authority requirement "${snapshot.snapshotId}" is not effective at "${input.now}"; expected the active authority window.`,
    );
  }
  if (evaluatedAt >= expiresAt) {
    throw new GovernedAuthorityDenialError(
      "AUTHORITY_EXPIRED",
      `Authority requirement "${snapshot.snapshotId}" expired at "${requirement.expiresAt}"; expected the active authority window.`,
    );
  }
  if (
    input.authorization.authoritySnapshotReference !== undefined &&
    input.authorization.authoritySnapshotReference !== snapshot.snapshotId
  ) {
    throw new GovernedAuthorityDenialError(
      "AUTHORIZATION_SNAPSHOT_MISMATCH",
      `Authority snapshot "${snapshot.snapshotId}" differs from authorization reference "${input.authorization.authoritySnapshotReference}"; expected exact snapshot equality.`,
    );
  }
}

function sameScope(
  left: WorkScope,
  right: WorkScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function assertTrustedAuthorityResponse(
  value: unknown,
): asserts value is ResolvedApprovalAuthority {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidTrustedAuthorityResponseError(
      `Trusted authority response was not an object; expected requirement and snapshot fields.`,
    );
  }
  const response = value as Record<string, unknown>;
  if (
    typeof response.requirement !== "object" || response.requirement === null ||
    typeof response.snapshot !== "object" || response.snapshot === null
  ) {
    throw new InvalidTrustedAuthorityResponseError(
      `Trusted authority response was incomplete; expected requirement and snapshot objects.`,
    );
  }
}

function packageIdFor(requestId: ApprovalRequestId) {
  return approvalPackageId(`package_${requestId.slice("approval_".length)}`);
}
