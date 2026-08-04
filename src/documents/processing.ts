import type {
  DerivedArtifactId,
  DocumentVersionId,
  ObjectReferenceId,
  ProcessingRunId,
} from "./ids.ts";
import {
  assertChecksum,
  assertDocumentScope,
  type Checksum,
  type DocumentScope,
} from "./model.ts";

export type ProcessingState =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "retry_scheduled"
  | "cancelled"
  | "timed_out"
  | "dead_lettered";

export interface DerivedArtifact {
  readonly derivedArtifactId: DerivedArtifactId;
  readonly scope: DocumentScope;
  readonly documentVersionId: DocumentVersionId;
  readonly artifactVersion: number;
  readonly artifactType: string;
  readonly objectReferenceId: ObjectReferenceId;
  readonly checksum: Checksum;
  readonly processor: string;
  readonly processorVersion: string;
  readonly createdAt: Date;
}

export interface ProcessingRun {
  readonly processingRunId: ProcessingRunId;
  readonly scope: DocumentScope;
  readonly documentVersionId: DocumentVersionId;
  readonly inputChecksum: Checksum;
  readonly processor: string;
  readonly processorVersion: string;
  readonly state: ProcessingState;
  readonly attemptCount: number;
  readonly derivedArtifacts: readonly DerivedArtifact[];
  readonly failureCode?: string;
  readonly createdAt: Date;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
}

export interface ProcessingRunInput
  extends Omit<ProcessingRun, "derivedArtifacts"> {
  readonly derivedArtifacts?: readonly DerivedArtifact[];
}

export function createProcessingRun(
  input: ProcessingRunInput,
): ProcessingRun {
  assertText(input.processingRunId, "Processing run ID", 96);
  assertText(input.documentVersionId, "Processing document version ID", 96);
  assertDocumentScope(input.scope, input.scope);
  assertChecksum(input.inputChecksum);
  assertText(input.processor, "Processing processor", 128);
  assertText(input.processorVersion, "Processing processor version", 128);
  if (!Number.isSafeInteger(input.attemptCount) || input.attemptCount < 0) {
    throw new Error(
      `Processing run attempt count "${input.attemptCount}" is invalid; expected a non-negative safe integer.`,
    );
  }
  assertProcessingDates(input);
  const artifacts = input.derivedArtifacts ?? [];
  for (const artifact of artifacts) {
    assertDocumentScope(input.scope, artifact.scope);
  }
  return Object.freeze({
    ...input,
    derivedArtifacts: Object.freeze([...artifacts]),
  });
}

export function createDerivedArtifact(
  input: DerivedArtifact,
): DerivedArtifact {
  assertDocumentScope(input.scope, input.scope);
  assertText(input.derivedArtifactId, "Derived artifact ID", 96);
  assertText(input.documentVersionId, "Derived artifact version ID", 96);
  if (
    !Number.isSafeInteger(input.artifactVersion) || input.artifactVersion < 1
  ) {
    throw new Error(
      `Derived artifact version "${input.artifactVersion}" is invalid; expected a positive safe integer.`,
    );
  }
  assertText(input.artifactType, "Derived artifact type", 128);
  assertText(input.objectReferenceId, "Derived object reference ID", 96);
  assertChecksum(input.checksum);
  assertText(input.processor, "Derived artifact processor", 128);
  assertText(input.processorVersion, "Derived artifact processor version", 128);
  assertDate(input.createdAt, "Derived artifact created timestamp");
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
  });
}

export function isTerminalProcessingState(state: ProcessingState): boolean {
  return [
    "succeeded",
    "failed",
    "cancelled",
    "timed_out",
    "dead_lettered",
  ].includes(state);
}

export function appendDerivedArtifact(
  run: ProcessingRun,
  artifact: DerivedArtifact,
): ProcessingRun {
  assertDocumentScope(run.scope, artifact.scope);
  if (artifact.documentVersionId !== run.documentVersionId) {
    throw new Error(
      `Derived artifact document version "${artifact.documentVersionId}" does not match processing input "${run.documentVersionId}".`,
    );
  }
  return createProcessingRun({
    ...run,
    state: "succeeded",
    derivedArtifacts: [...run.derivedArtifacts, artifact],
    completedAt: artifact.createdAt,
  });
}

function assertProcessingDates(
  input: Pick<ProcessingRun, "createdAt" | "startedAt" | "completedAt">,
): void {
  assertDate(input.createdAt, "Processing run created timestamp");
  if (input.startedAt !== undefined) {
    assertDate(input.startedAt, "Processing run started timestamp");
  }
  if (input.completedAt !== undefined) {
    assertDate(input.completedAt, "Processing run completed timestamp");
  }
}

function assertText(value: string, label: string, maximum: number): void {
  if (typeof value === "string" && value.trim() && value.length <= maximum) {
    return;
  }
  throw new Error(
    `${label} "${value}" is invalid; expected 1-${maximum} characters.`,
  );
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `${label} "${
      String(value)
    }" is invalid; expected a valid Date supplied by the caller.`,
  );
}
