import type {
  DeliverableVersion,
  ReleaseAuthorization,
  ReleasePurpose,
} from "./model.ts";
import { scopeContainsRecipient } from "./recipients.ts";

export function assertExportAuthorized(
  version: DeliverableVersion,
  authorization: ReleaseAuthorization,
  format: string,
  now: Date,
): void {
  assertAuthorization(version, authorization, now);
  if (!authorization.approvedFormats.includes(format as never)) {
    throw new Error(
      `Export format "${format}" is not authorized for release "${authorization.authorizationId}"; expected an approved format.`,
    );
  }
}

export function assertDistributionAuthorized(
  version: DeliverableVersion,
  authorization: ReleaseAuthorization,
  recipientId: string,
  purpose: ReleasePurpose,
  format: string,
  now: Date,
): void {
  assertExportAuthorized(version, authorization, format, now);
  if (!scopeContainsRecipient(authorization.audience, recipientId, purpose)) {
    throw new Error(
      `Recipient "${recipientId}" and purpose "${purpose}" are outside release authorization "${authorization.authorizationId}"; expected an explicit recipient scope.`,
    );
  }
}

function assertAuthorization(
  version: DeliverableVersion,
  authorization: ReleaseAuthorization,
  now: Date,
): void {
  if (authorization.versionId !== version.versionId) {
    throw new Error(
      `Release authorization "${authorization.authorizationId}" covers version "${authorization.versionId}" instead of "${version.versionId}".`,
    );
  }
  if (authorization.actorKind !== "human") {
    throw new Error(
      `Release authorization actor kind "${authorization.actorKind}" is unauthorized; expected human authority.`,
    );
  }
  if (version.contentApprovalState !== "approved") {
    throw new Error(
      `Deliverable version "${version.versionId}" has no approved content; expected content approval before release.`,
    );
  }
  if (version.freshnessState !== "current") {
    throw new Error(
      `Deliverable version "${version.versionId}" is "${version.freshnessState}"; expected a current version.`,
    );
  }
  if (
    version.releaseState !== "authorized" && version.releaseState !== "released"
  ) {
    throw new Error(
      `Deliverable version "${version.versionId}" has release state "${version.releaseState}"; expected human release authorization before export.`,
    );
  }
  if (
    authorization.authorizedAt > now ||
    authorization.expiresAt !== undefined && authorization.expiresAt <= now
  ) {
    throw new Error(
      `Release authorization "${authorization.authorizationId}" is not current at "${now.toISOString()}"; expected an active authorization window.`,
    );
  }
}
