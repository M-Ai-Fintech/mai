import type { ManifestId } from "./ids.ts";
import type {
  ExportManifest,
  RecipientScope,
  SourceSnapshot,
} from "./model.ts";

export async function createManifest(input: {
  readonly manifestId: ManifestId;
  readonly exportId: string;
  readonly versionId: ExportManifest["versionId"];
  readonly sourceSnapshotId: ExportManifest["sourceSnapshotId"];
  readonly artifactReference: string;
  readonly artifactChecksum: string;
  readonly audience: RecipientScope;
  readonly redactedFields: readonly string[];
  readonly createdAt: Date;
}): Promise<ExportManifest> {
  assertArtifact(input.artifactReference, input.artifactChecksum);
  const contentDigest = await digest({
    exportId: input.exportId,
    versionId: input.versionId,
    sourceSnapshotId: input.sourceSnapshotId,
    artifactReference: input.artifactReference,
    artifactChecksum: input.artifactChecksum,
    audience: input.audience,
    redactedFields: [...input.redactedFields].sort(),
  });
  return Object.freeze({
    ...input,
    redactedFields: Object.freeze([...input.redactedFields]),
    contentDigest,
  });
}

function assertArtifact(reference: string, checksum: string): void {
  if (!reference.trim()) {
    throw new Error(
      `Export manifest artifact reference "${reference}" is invalid; expected an immutable object reference.`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(checksum)) {
    throw new Error(
      `Export manifest artifact checksum "${checksum}" is invalid; expected lowercase SHA-256.`,
    );
  }
}

export function manifestSourceMatches(
  manifest: ExportManifest,
  snapshot: SourceSnapshot,
): boolean {
  return manifest.sourceSnapshotId === snapshot.snapshotId;
}

async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableSerialize(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(hash),
    (item) => item.toString(16).padStart(2, "0"),
  ).join("");
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${stableSerialize(record[key])}`
    );
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}
