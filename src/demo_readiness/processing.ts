import {
  type DocumentIdentifierResult,
  parseDerivedArtifactId,
  parseObjectReferenceId,
  parseProcessingRunId,
} from "../documents/ids.ts";
import {
  createDerivedArtifact,
  createProcessingRun,
  type DerivedArtifact,
  type ProcessingRun,
} from "../documents/processing.ts";
import type { DocumentVersion } from "../documents/version.ts";

const processedAt = new Date("2026-08-10T12:00:00.000Z");

/** Produces deterministic content-preserving processing evidence for fixtures.
 *
 * @example processDemoDocumentVersions(documentVersions)
 */
export function processDemoDocumentVersions(
  versions: readonly DocumentVersion[],
): readonly ProcessingRun[] {
  return versions.map(processVersion);
}

function processVersion(version: DocumentVersion): ProcessingRun {
  const suffix = version.documentId.slice("doc_".length);
  const artifact = plaintextArtifact(version, suffix);
  return createProcessingRun({
    processingRunId: required(parseProcessingRunId(`run_${suffix}-v1`)),
    scope: version.scope,
    documentVersionId: version.documentVersionId,
    inputChecksum: version.checksum,
    processor: artifact.processor,
    processorVersion: artifact.processorVersion,
    state: "succeeded",
    attemptCount: 1,
    derivedArtifacts: [artifact],
    createdAt: processedAt,
    startedAt: processedAt,
    completedAt: processedAt,
  });
}

function plaintextArtifact(
  version: DocumentVersion,
  suffix: string,
): DerivedArtifact {
  return createDerivedArtifact({
    derivedArtifactId: required(
      parseDerivedArtifactId(`artifact_${suffix}-text-v1`),
    ),
    scope: version.scope,
    documentVersionId: version.documentVersionId,
    artifactVersion: 1,
    artifactType: "normalized_plaintext",
    objectReferenceId: required(
      parseObjectReferenceId(`object_${suffix}-text-v1`),
    ),
    checksum: version.checksum,
    processor: "mai-managed-local",
    processorVersion: "synthetic-plaintext-v1",
    createdAt: processedAt,
  });
}

function required<T>(result: DocumentIdentifierResult<T>): T {
  if (result.ok) return result.value;
  throw new Error(
    `Demo processing identifier failed with "${result.issue.code}"; expected a canonical document identifier.`,
  );
}
