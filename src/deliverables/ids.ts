declare const deliverableIdBrand: unique symbol;
declare const deliverableVersionIdBrand: unique symbol;
declare const sourceSnapshotIdBrand: unique symbol;
declare const approvalIdBrand: unique symbol;
declare const releaseAuthorizationIdBrand: unique symbol;
declare const redactionOverlayIdBrand: unique symbol;
declare const exportIdBrand: unique symbol;
declare const manifestIdBrand: unique symbol;
declare const distributionIdBrand: unique symbol;
declare const receiptIdBrand: unique symbol;

export type DeliverableId = string & {
  readonly [deliverableIdBrand]: "DeliverableId";
};
export type DeliverableVersionId = string & {
  readonly [deliverableVersionIdBrand]: "DeliverableVersionId";
};
export type SourceSnapshotId = string & {
  readonly [sourceSnapshotIdBrand]: "SourceSnapshotId";
};
export type ApprovalId = string & { readonly [approvalIdBrand]: "ApprovalId" };
export type ReleaseAuthorizationId = string & {
  readonly [releaseAuthorizationIdBrand]: "ReleaseAuthorizationId";
};
export type RedactionOverlayId = string & {
  readonly [redactionOverlayIdBrand]: "RedactionOverlayId";
};
export type ExportId = string & { readonly [exportIdBrand]: "ExportId" };
export type ManifestId = string & {
  readonly [manifestIdBrand]: "ManifestId";
};
export type DistributionId = string & {
  readonly [distributionIdBrand]: "DistributionId";
};
export type ReceiptId = string & { readonly [receiptIdBrand]: "ReceiptId" };

export type IdentifierResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issue: "INVALID_FORMAT" };

export function parseDeliverableId(
  value: unknown,
): IdentifierResult<DeliverableId> {
  return parse(value, "deliverable_");
}

export function parseDeliverableVersionId(
  value: unknown,
): IdentifierResult<DeliverableVersionId> {
  return parse(value, "delivver_");
}

export function parseSourceSnapshotId(
  value: unknown,
): IdentifierResult<SourceSnapshotId> {
  return parse(value, "snapshot_");
}

export function parseApprovalId(value: unknown): IdentifierResult<ApprovalId> {
  return parse(value, "approval_");
}

export function parseReleaseAuthorizationId(
  value: unknown,
): IdentifierResult<ReleaseAuthorizationId> {
  return parse(value, "release_");
}

export function parseRedactionOverlayId(
  value: unknown,
): IdentifierResult<RedactionOverlayId> {
  return parse(value, "redaction_");
}

export function parseExportId(value: unknown): IdentifierResult<ExportId> {
  return parse(value, "export_");
}

export function parseManifestId(value: unknown): IdentifierResult<ManifestId> {
  return parse(value, "manifest_");
}

export function parseDistributionId(
  value: unknown,
): IdentifierResult<DistributionId> {
  return parse(value, "distribution_");
}

export function parseReceiptId(value: unknown): IdentifierResult<ReceiptId> {
  return parse(value, "receipt_");
}

function parse<T>(value: unknown, prefix: string): IdentifierResult<T> {
  if (
    typeof value === "string" &&
    value.startsWith(prefix) &&
    /^[a-z][a-z0-9_-]{1,127}$/.test(value.slice(prefix.length))
  ) {
    return { ok: true, value: value as T };
  }
  return { ok: false, issue: "INVALID_FORMAT" };
}
