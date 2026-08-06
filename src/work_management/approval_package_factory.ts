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
  type WorkScope,
} from "./ids.ts";
import {
  type ApprovalPackage,
  assertAuthorityEffective,
  assertDifferentActors,
  assertHumanActor,
  assertScope,
  type AuthorityRequirement,
  type AuthoritySnapshot,
  type EvidenceSnapshotReference,
  stableSerialize,
  type TargetReference,
  WorkManagementError,
} from "./model.ts";
import type { AuthorityFacts } from "./authority_facts.ts";
import { parseAuthorityFacts } from "./authority_facts.ts";

export interface ApprovalTargetPort {
  /** True only for MAI-106 transaction-local adapters. */
  readonly transactionSafe?: true;
  readonly transactionMode?: "mai106_local";
  validate(
    scope: WorkScope,
    target: TargetReference,
  ): Promise<TargetReference>;
  currentVersion(target: TargetReference): Promise<AggregateVersion>;
}

export interface ApprovalEvidencePort {
  /** True only for MAI-106 transaction-local adapters. */
  readonly transactionSafe?: true;
  readonly transactionMode?: "mai106_local";
  validate(
    scope: WorkScope,
    evidence: readonly EvidenceSnapshotReference[],
  ): Promise<readonly EvidenceSnapshotReference[]>;
}

export interface ApprovalAuthoritySnapshotPort {
  /** True only for MAI-106 transaction-local adapters. */
  readonly transactionSafe?: true;
  readonly transactionMode?: "mai106_local";
  resolve(input: {
    readonly scope: WorkScope;
    readonly requester: ActorReference;
    readonly namedApproverId: ActorId;
    readonly target: TargetReference;
    readonly requestedAction?: string;
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
  readonly requestedAction?: string;
  readonly target: TargetReference;
  readonly evidence: readonly EvidenceSnapshotReference[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly claimedDigest?: string;
  readonly authorization: AuthorizationDecision;
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
    throw new WorkManagementError(
      "NAMED_APPROVER_REQUIRED",
      `Authority snapshot "${snapshot.snapshotId}" actor "${snapshot.actorId}" does not match named approver "${input.namedApproverId}"; expected one active human authority.`,
    );
  }
  assertScope(
    input.scope,
    snapshot.scope,
    `Authority snapshot "${snapshot.snapshotId}"`,
  );
  assertScope(
    input.scope,
    requirement.scope,
    `Authority requirement "${snapshot.snapshotId}"`,
  );
  if (
    requirement.namedApproverId !== input.namedApproverId ||
    requirement.policyVersion !== snapshot.policyVersion ||
    requirement.snapshotReference !== snapshot.snapshotId ||
    requirement.humanOnly !== true
  ) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Authority requirement "${snapshot.snapshotId}" does not match its named approver, policy, snapshot, or human-only contract; expected one server-verified authority.`,
    );
  }
  if (
    input.requestedAction !== undefined &&
    requirement.commandType !== input.requestedAction
  ) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Requested approval action "${input.requestedAction}" differs from server-approved command "${requirement.commandType}"; expected the governed authority requirement.`,
    );
  }
  if (stableSerialize(requirement.target) !== stableSerialize(target)) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Authority requirement "${snapshot.snapshotId}" target differs from the validated target; expected exact aggregate, ID, scope, and version.`,
    );
  }
  assertAuthorityEffective(
    requirement,
    input.now,
    String(packageIdFor(input.requestId)),
  );
  const authorizedReference = input.authorization.authoritySnapshotReference;
  if (
    authorizedReference !== undefined &&
    authorizedReference !== snapshot.snapshotId
  ) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Authority snapshot "${snapshot.snapshotId}" differs from authorization reference "${authorizedReference}"; expected the governed authorization snapshot.`,
    );
  }
}

function packageIdFor(requestId: ApprovalRequestId) {
  return approvalPackageId(`package_${requestId.slice("approval_".length)}`);
}
