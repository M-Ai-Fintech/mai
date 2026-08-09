import type { SourceVersionReference } from "./model.ts";

const SHA256_CHECKSUM_PATTERN = /^[0-9a-f]{64}$/;

export function isLowercaseSha256Checksum(value: unknown): value is string {
  return typeof value === "string" && SHA256_CHECKSUM_PATTERN.test(value);
}

export function sourceVersionKey(reference: SourceVersionReference): string {
  return [
    reference.sourceType,
    reference.sourceId,
    reference.version,
    reference.checksum ?? "",
  ].join(":");
}

export function assertSourceVersionReceipt(
  reference: SourceVersionReference,
): void {
  const candidate = reference as unknown as Record<string, unknown>;
  const sourceType = candidate.sourceType;
  const sourceId = candidate.sourceId;
  const version = candidate.version;
  const checksum = candidate.checksum;
  const label = `${String(sourceType)}:${String(sourceId)}@${String(version)}`;
  const validVersion = typeof version === "string"
    ? version.trim().length > 0
    : Number.isSafeInteger(version) && (version as number) > 0;
  if (
    typeof sourceType !== "string" || sourceType.trim() === "" ||
    typeof sourceId !== "string" || sourceId.trim() === "" ||
    !validVersion
  ) {
    throw new Error(
      `Source version receipt "${label}" is malformed; expected non-empty source type and ID with a non-empty string or positive safe integer version.`,
    );
  }
  if (sourceType === "document_version" && checksum === undefined) {
    throw new Error(
      `Source version receipt "${label}" is missing a checksum; expected a lowercase 64-hex SHA-256 checksum for document_version.`,
    );
  }
  if (checksum !== undefined && !isLowercaseSha256Checksum(checksum)) {
    throw new Error(
      `Source version receipt "${label}" has checksum "${
        String(checksum)
      }"; expected a lowercase 64-hex SHA-256 checksum.`,
    );
  }
}
