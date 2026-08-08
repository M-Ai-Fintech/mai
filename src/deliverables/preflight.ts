import {
  assertDistributionAuthorized,
  assertExportAuthorized,
} from "./authorization.ts";
import { isExportFormat, isReleasePurpose } from "./model.ts";
import type {
  DeliverableScope,
  DeliverableVersion,
  ReleaseAuthorization,
} from "./model.ts";

export type DeliverableReleaseAction = "export" | "distribute";

export type DeliverableReleasePreflightFailure =
  | "missing_authorization"
  | "format"
  | "recipient";

export async function validateDeliverableRelease(
  input: {
    readonly action: DeliverableReleaseAction;
    readonly scope: DeliverableScope;
    readonly version: DeliverableVersion;
    readonly payload: Readonly<Record<string, unknown>>;
    readonly findAuthorization: (
      scope: DeliverableScope,
      versionId: DeliverableVersion["versionId"],
      authorizationId: string,
    ) => Promise<ReleaseAuthorization | undefined>;
    readonly now: () => Date;
  },
): Promise<DeliverableReleasePreflightFailure | undefined> {
  const releaseId = payloadText(input.payload, "releaseAuthorizationId");
  if (releaseId === undefined) return "missing_authorization";
  const authorization = await input.findAuthorization(
    input.scope,
    input.version.versionId,
    releaseId,
  );
  if (authorization === undefined) return "missing_authorization";
  const format = payloadText(input.payload, "format");
  if (format === undefined || !isExportFormat(format)) return "format";
  if (input.action === "export") {
    try {
      assertExportAuthorized(
        input.version,
        authorization,
        format,
        input.now(),
      );
    } catch (_error) {
      return "format";
    }
    return undefined;
  }
  const recipientId = payloadText(input.payload, "recipientId");
  const purpose = payloadText(input.payload, "purpose");
  if (
    recipientId === undefined || purpose === undefined ||
    !isReleasePurpose(purpose)
  ) return "recipient";
  try {
    assertDistributionAuthorized(
      input.version,
      authorization,
      recipientId,
      purpose,
      format,
      input.now(),
    );
  } catch (_error) {
    return "recipient";
  }
  return undefined;
}

function payloadText(
  payload: Readonly<Record<string, unknown>>,
  field: string,
): string | undefined {
  const value = payload[field];
  return typeof value === "string" && value.trim() ? value : undefined;
}
