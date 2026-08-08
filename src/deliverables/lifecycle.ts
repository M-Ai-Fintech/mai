import type { ActorId } from "../platform/api/v1.ts";
import {
  type ContentApproval,
  type DeliverableVersion,
  type RecipientScope,
  type ReleaseAuthorization,
  type StaleMark,
} from "./model.ts";
import { isSameDeliverableScope } from "./model.ts";

export function submitForReview(
  version: DeliverableVersion,
  actorId: ActorId,
): DeliverableVersion {
  assertFreshVersion(version);
  return Object.freeze({
    ...version,
    preparationState: "in_review" as const,
    aggregateVersion: version.aggregateVersion + 1,
    reviewSubmittedBy: actorId,
  });
}

export function approveContent(
  version: DeliverableVersion,
  input: Omit<ContentApproval, "versionId">,
): {
  readonly version: DeliverableVersion;
  readonly approval: ContentApproval;
} {
  assertHuman(input.actorKind, "content approval");
  if (version.preparationState !== "in_review") {
    throw new Error(
      `Deliverable version "${version.versionId}" cannot be approved from "${version.preparationState}"; expected in_review.`,
    );
  }
  assertFreshVersion(version);
  if (input.decision === "rejected") {
    return {
      version: Object.freeze({
        ...version,
        preparationState: "changes_requested" as const,
        contentApprovalState: "rejected" as const,
        aggregateVersion: version.aggregateVersion + 1,
      }),
      approval: Object.freeze({ ...input, versionId: version.versionId }),
    };
  }
  return {
    version: Object.freeze({
      ...version,
      preparationState: "draft_prepared" as const,
      contentApprovalState: "approved" as const,
      releaseState: "pending" as const,
      aggregateVersion: version.aggregateVersion + 1,
      approvedAt: input.decidedAt,
    }),
    approval: Object.freeze({ ...input, versionId: version.versionId }),
  };
}

export function authorizeRelease(
  version: DeliverableVersion,
  input: Omit<ReleaseAuthorization, "versionId" | "scope">,
): ReleaseAuthorization {
  assertHuman(input.actorKind, "release authorization");
  if (version.contentApprovalState !== "approved") {
    throw new Error(
      `Deliverable version "${version.versionId}" has no content approval; release authorization requires content approval.`,
    );
  }
  assertFreshVersion(version);
  assertRecipientScope(input.audience);
  if (input.approvedFormats.length === 0) {
    throw new Error(
      `Release authorization "${input.authorizationId}" has no formats; expected at least one approved export format.`,
    );
  }
  if (input.expiresAt !== undefined && input.expiresAt <= input.authorizedAt) {
    throw new Error(
      `Release authorization "${input.authorizationId}" expires before authorization; expected a later timestamp.`,
    );
  }
  return Object.freeze({
    ...input,
    versionId: version.versionId,
    scope: version.scope,
  });
}

export function recordReleaseAuthorization(
  version: DeliverableVersion,
  authorization: ReleaseAuthorization,
): DeliverableVersion {
  assertHuman(authorization.actorKind, "release authorization");
  if (authorization.versionId !== version.versionId) {
    throw new Error(
      `Release authorization "${authorization.authorizationId}" covers version "${authorization.versionId}" instead of "${version.versionId}".`,
    );
  }
  if (!isSameDeliverableScope(authorization.scope, version.scope)) {
    throw new Error(
      `Release authorization "${authorization.authorizationId}" is outside version "${version.versionId}" scope; expected the same tenant, workspace, and deal.`,
    );
  }
  assertFreshVersion(version);
  if (version.contentApprovalState !== "approved") {
    throw new Error(
      `Deliverable version "${version.versionId}" has no content approval; release authorization requires content approval.`,
    );
  }
  if (
    version.releaseState !== "pending" && version.releaseState !== "required"
  ) {
    throw new Error(
      `Deliverable version "${version.versionId}" cannot record release authorization from "${version.releaseState}"; expected pending release.`,
    );
  }
  return Object.freeze({
    ...version,
    releaseState: "authorized" as const,
    aggregateVersion: version.aggregateVersion + 1,
  });
}

export function markReleased(version: DeliverableVersion): DeliverableVersion {
  if (version.releaseState !== "authorized") {
    throw new Error(
      `Deliverable version "${version.versionId}" cannot be released from "${version.releaseState}"; expected authorized release.`,
    );
  }
  return Object.freeze({
    ...version,
    releaseState: "released" as const,
    aggregateVersion: version.aggregateVersion + 1,
  });
}

export function markSourceStale(
  version: DeliverableVersion,
  input: Omit<StaleMark, "versionId">,
): StaleMark {
  if (input.changedSourceIds.length === 0) {
    throw new Error(
      `Stale mark "${input.staleMarkId}" has no changed sources; expected at least one source identifier.`,
    );
  }
  return Object.freeze({
    ...input,
    versionId: version.versionId,
    changedSourceIds: Object.freeze([...input.changedSourceIds]),
  });
}

export function isVersionStale(
  version: DeliverableVersion,
  marks: readonly StaleMark[],
): boolean {
  return marks.some((mark) => mark.versionId === version.versionId);
}

export function invalidateApprovalForRedaction(
  version: DeliverableVersion,
  reason: string,
): DeliverableVersion {
  if (version.contentApprovalState !== "approved") return version;
  if (!reason.trim()) {
    throw new Error(
      `Deliverable version "${version.versionId}" redaction invalidation reason is empty; expected an audit reason.`,
    );
  }
  return Object.freeze({
    ...version,
    contentApprovalState: "invalidated" as const,
    releaseState: "invalidated" as const,
    aggregateVersion: version.aggregateVersion + 1,
  });
}

function assertFreshVersion(version: DeliverableVersion): void {
  if (version.freshnessState === "current") return;
  throw new Error(
    `Deliverable version "${version.versionId}" is "${version.freshnessState}"; expected a current version.`,
  );
}

function assertHuman(
  actorKind: "human" | "agent" | "system",
  action: string,
): void {
  if (actorKind === "human") return;
  throw new Error(
    `${action} actor kind "${actorKind}" is unauthorized; expected human authority.`,
  );
}

function assertRecipientScope(scope: RecipientScope): void {
  if (scope.recipientIds?.length || scope.groupId?.trim()) return;
  throw new Error(
    `Release recipient scope for audience "${scope.audienceType}" is empty; expected recipient IDs or a named group.`,
  );
}
