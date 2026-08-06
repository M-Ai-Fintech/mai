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
  assertDifferentActors,
  assertHumanActor,
  assertScope,
  type AuthoritySnapshot,
  type EvidenceSnapshotReference,
  type TargetReference,
  WorkManagementError,
} from "./model.ts";

export interface ApprovalTargetPort {
  validate(
    scope: WorkScope,
    target: TargetReference,
  ): Promise<TargetReference>;
  currentVersion(target: TargetReference): Promise<AggregateVersion>;
}

export interface ApprovalEvidencePort {
  validate(
    scope: WorkScope,
    evidence: readonly EvidenceSnapshotReference[],
  ): Promise<readonly EvidenceSnapshotReference[]>;
}

export interface ApprovalAuthoritySnapshotPort {
  resolve(input: {
    readonly scope: WorkScope;
    readonly requester: ActorReference;
    readonly namedApproverId: ActorId;
    readonly action: string;
    readonly authorization: AuthorizationDecision;
  }): Promise<AuthoritySnapshot>;
}

export interface ServerApprovalPackageInput {
  readonly requestId: ApprovalRequestId;
  readonly scope: WorkScope;
  readonly requester: ActorReference;
  readonly namedApproverId: ActorId;
  readonly action: string;
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
  const snapshot = await ports.authority.resolve({
    scope: input.scope,
    requester: input.requester,
    namedApproverId: input.namedApproverId,
    action: input.action,
    authorization: input.authorization,
  });
  assertTrustedSnapshot(input, snapshot);
  const packageValue = await createApprovalPackage({
    id: packageIdFor(input.requestId),
    version: 1,
    target,
    evidence,
    authority: {
      action: input.action,
      namedApproverId: input.namedApproverId,
      policyVersion: snapshot.policyVersion,
      snapshotReference: snapshot.snapshotId,
      humanOnly: true,
    },
    authoritySnapshot: snapshot,
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
  return packageValue;
}

function assertTrustedSnapshot(
  input: ServerApprovalPackageInput,
  snapshot: AuthoritySnapshot,
): void {
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
