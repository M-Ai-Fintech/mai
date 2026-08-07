import type { DeliverableVersion, ExportFormat } from "./model.ts";

export interface DeliverableRenderInput {
  readonly version: DeliverableVersion;
  readonly format: ExportFormat;
  readonly filename: string;
}

export interface RenderedExportArtifact {
  readonly format: ExportFormat;
  readonly filename: string;
  readonly artifactReference: string;
  readonly artifactChecksum: string;
}

export interface DeliverableRenderer {
  render(input: DeliverableRenderInput): Promise<RenderedExportArtifact>;
}

export function assertRenderedExport(
  input: DeliverableRenderInput,
  artifact: RenderedExportArtifact,
): void {
  if (artifact.format !== input.format) {
    throw new Error(
      `Rendered export format "${artifact.format}" does not match requested format "${input.format}"; expected the authorized format.`,
    );
  }
  if (artifact.filename !== input.filename || !artifact.filename.trim()) {
    throw new Error(
      `Rendered export filename "${artifact.filename}" does not match requested filename "${input.filename}"; expected stable export identity.`,
    );
  }
  if (!artifact.artifactReference.trim()) {
    throw new Error(
      `Rendered export artifact reference "${artifact.artifactReference}" is invalid; expected a stored artifact reference.`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(artifact.artifactChecksum)) {
    throw new Error(
      `Rendered export artifact checksum "${artifact.artifactChecksum}" is invalid; expected lowercase SHA-256.`,
    );
  }
}
