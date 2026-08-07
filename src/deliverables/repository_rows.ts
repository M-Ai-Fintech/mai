import {
  parseActorId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../platform/api/v1.ts";
import {
  parseDeliverableId,
  parseDeliverableVersionId,
  parseSourceSnapshotId,
} from "./ids.ts";
import type {
  ContentClassification,
  ContentPayload,
  Deliverable,
  DeliverableScope,
  DeliverableVersion,
  RecipientScope,
  ReleaseAuthorization,
  SourceReference,
  SourceSnapshot,
} from "./model.ts";

export function rowToDeliverable(row: Record<string, unknown>): Deliverable {
  return {
    deliverableId: identifier(row, "deliverableId", parseDeliverableId),
    scope: rowScope(row),
    deliverableType: text(row, "deliverableType"),
    title: text(row, "title"),
    ownerId: identifier(row, "ownerId", parseActorId),
    defaultAudienceType: text(
      row,
      "defaultAudienceType",
    ) as Deliverable["defaultAudienceType"],
    confidentiality: text(
      row,
      "confidentiality",
    ) as Deliverable["confidentiality"],
    status: text(row, "status") as Deliverable["status"],
    aggregateVersion: positiveNumber(row, "aggregateVersion"),
    currentApprovedVersionId: optionalIdentifier(
      row,
      "currentApprovedVersionId",
      parseDeliverableVersionId,
    ),
    latestDraftVersionId: optionalIdentifier(
      row,
      "latestDraftVersionId",
      parseDeliverableVersionId,
    ),
    createdBy: identifier(row, "createdBy", parseActorId),
    createdAt: date(row, "createdAt"),
    updatedAt: date(row, "updatedAt"),
  };
}

export function rowToSourceSnapshot(
  row: Record<string, unknown>,
): SourceSnapshot {
  return {
    snapshotId: identifier(row, "snapshotId", parseSourceSnapshotId),
    scope: rowScope(row),
    sourceCutoffAt: date(row, "sourceCutoffAt"),
    references: jsonValue(row, "references") as readonly SourceReference[],
    createdBy: identifier(row, "createdBy", parseActorId),
    createdAt: date(row, "createdAt"),
  };
}

export function rowToVersion(row: Record<string, unknown>): DeliverableVersion {
  const snapshot = rowToSourceSnapshot(
    jsonValue(row, "sourceSnapshot") as Record<string, unknown>,
  );
  return {
    versionId: identifier(row, "versionId", parseDeliverableVersionId),
    deliverableId: identifier(row, "deliverableId", parseDeliverableId),
    scope: rowScope(row),
    versionNumber: positiveNumber(row, "versionNumber"),
    versionLabel: text(row, "versionLabel"),
    sourceSnapshot: snapshot,
    content: jsonValue(row, "content") as ContentPayload,
    classifications: jsonValue(row, "classifications") as ContentClassification,
    preparationState: text(
      row,
      "preparationState",
    ) as DeliverableVersion["preparationState"],
    contentApprovalState: text(
      row,
      "contentApprovalState",
    ) as DeliverableVersion["contentApprovalState"],
    releaseState: text(
      row,
      "releaseState",
    ) as DeliverableVersion["releaseState"],
    freshnessState: text(
      row,
      "freshnessState",
    ) as DeliverableVersion["freshnessState"],
    aggregateVersion: positiveNumber(row, "aggregateVersion"),
    reviewSubmittedBy: optionalIdentifier(
      row,
      "reviewSubmittedBy",
      parseActorId,
    ),
    createdBy: identifier(row, "createdBy", parseActorId),
    createdAt: date(row, "createdAt"),
    approvedAt: optionalDate(row, "approvedAt"),
  };
}

export function rowToReleaseAuthorization(
  row: Record<string, unknown>,
): ReleaseAuthorization {
  const audience = jsonValue(row, "audience");
  const approvedFormats = jsonValue(row, "approvedFormats");
  if (!isRecipientScope(audience) || !isStringArray(approvedFormats)) {
    throw new Error(
      `Deliverables release authorization "${
        String(row.authorizationId)
      }" has invalid audience or format JSON; expected scoped release data.`,
    );
  }
  return {
    authorizationId: text(row, "authorizationId"),
    versionId: identifier(row, "versionId", parseDeliverableVersionId),
    actorId: identifier(row, "actorId", parseActorId),
    actorKind: text(row, "actorKind") as ReleaseAuthorization["actorKind"],
    audience,
    approvedFormats: approvedFormats as ReleaseAuthorization["approvedFormats"],
    confidentiality: text(
      row,
      "confidentiality",
    ) as ReleaseAuthorization["confidentiality"],
    authorizedAt: date(row, "authorizedAt"),
    expiresAt: optionalDate(row, "expiresAt"),
  };
}

function rowScope(row: Record<string, unknown>): DeliverableScope {
  return {
    tenantId: identifier(row, "tenantId", parseTenantId),
    workspaceId: identifier(row, "workspaceId", parseWorkspaceId),
    dealId: identifier(row, "dealId", parseDealId),
  };
}

function identifier<T>(
  row: Record<string, unknown>,
  key: string,
  parser: (value: unknown) =>
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false },
): T {
  const result = parser(row[key]);
  if (result.ok) return result.value;
  throw new Error(
    `Deliverables row field "${key}" value "${
      String(row[key])
    }" is invalid; expected a scoped identifier.`,
  );
}

function optionalIdentifier<T>(
  row: Record<string, unknown>,
  key: string,
  parser: (value: unknown) =>
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false },
): T | undefined {
  if (row[key] === null || row[key] === undefined) return undefined;
  return identifier(row, key, parser);
}

function text(row: Record<string, unknown>, key: string): string {
  if (typeof row[key] === "string") return row[key] as string;
  throw new Error(
    `Deliverables row field "${key}" value "${
      String(row[key])
    }" is invalid; expected text.`,
  );
}

function positiveNumber(row: Record<string, unknown>, key: string): number {
  const value = typeof row[key] === "string" ? Number(row[key]) : row[key];
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value;
  }
  throw new Error(
    `Deliverables row field "${key}" value "${
      String(row[key])
    }" is invalid; expected a positive integer.`,
  );
}

function date(row: Record<string, unknown>, key: string): Date {
  const value = row[key] instanceof Date
    ? row[key] as Date
    : new Date(String(row[key]));
  if (!Number.isNaN(value.getTime())) return value;
  throw new Error(
    `Deliverables row field "${key}" value "${
      String(row[key])
    }" is invalid; expected a timestamp.`,
  );
}

function optionalDate(
  row: Record<string, unknown>,
  key: string,
): Date | undefined {
  if (row[key] === null || row[key] === undefined) return undefined;
  return date(row, key);
}

function jsonValue(row: Record<string, unknown>, key: string): unknown {
  if (typeof row[key] === "string") return JSON.parse(row[key] as string);
  if (row[key] !== null && typeof row[key] === "object") return row[key];
  throw new Error(
    `Deliverables row field "${key}" value "${
      String(row[key])
    }" is invalid; expected JSON.`,
  );
}

function isRecipientScope(value: unknown): value is RecipientScope {
  if (!isRecord(value)) return false;
  return typeof value.audienceType === "string" &&
    typeof value.purpose === "string";
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
