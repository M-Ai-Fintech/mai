import {
  AggregateVersion,
  isAggregateVersion,
} from "../../shared/contracts/aggregate_version.ts";
import {
  ActorId,
  CorrelationId,
  DealId,
  IdempotencyKey,
  JobId,
  OperationId,
  TenantId,
  WorkspaceId,
} from "../../shared/contracts/identifiers.ts";

export type JobState =
  | "queued"
  | "running"
  | "retry_scheduled"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "dead_lettered";

export interface JobInputVersionReference {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly version: AggregateVersion;
  readonly documentId?: string;
}

export interface DurableJob {
  readonly jobId: JobId;
  readonly operationId?: OperationId;
  readonly jobType: string;
  readonly schemaVersion: number;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly dealId?: DealId;
  readonly initiatingActorId: ActorId;
  readonly authoritySnapshotReference?: string;
  readonly correlationId: CorrelationId;
  readonly idempotencyKey: IdempotencyKey;
  readonly inputVersionReferences: readonly JobInputVersionReference[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timeoutAt: Date;
  readonly createdAt: Date;
}

export class JobStateTransitionError extends Error {
  readonly code = "INVALID_JOB_TRANSITION";

  constructor(from: JobState, to: JobState) {
    super(
      `Job transition "${from}" -> "${to}" is invalid; expected an allowed durable state transition.`,
    );
    this.name = "JobStateTransitionError";
  }
}

const ALLOWED_TRANSITIONS: Readonly<Record<JobState, readonly JobState[]>> = {
  queued: ["running", "cancelled"],
  running: [
    "retry_scheduled",
    "succeeded",
    "failed",
    "cancelled",
    "timed_out",
    "dead_lettered",
  ],
  retry_scheduled: ["running", "cancelled", "dead_lettered"],
  succeeded: [],
  failed: [],
  cancelled: [],
  timed_out: [],
  dead_lettered: [],
};

/**
 * Rejects state changes outside the approved durable job state machine.
 *
 * @example assertJobTransition("queued", "running")
 */
export function assertJobTransition(from: JobState, to: JobState): void {
  if (ALLOWED_TRANSITIONS[from].includes(to)) return;
  throw new JobStateTransitionError(from, to);
}

/**
 * Distinguishes immutable terminal job outcomes from runnable states.
 *
 * @example isTerminalJobState("succeeded")
 */
export function isTerminalJobState(state: JobState): boolean {
  return ALLOWED_TRANSITIONS[state].length === 0;
}

/**
 * Validates durable job metadata before it enters the repository.
 *
 * @example assertJobDefinition(job)
 */
export function assertJobDefinition(job: DurableJob): void {
  assertText(job.jobType, "job type", 128);
  assertPositiveInteger(job.schemaVersion, "schema version");
  assertText(
    job.authoritySnapshotReference,
    "authority snapshot reference",
    255,
  );
  assertJobScope(job);
  assertInputVersionReferences(job);
  if (job.timeoutAt > job.createdAt) return;
  throw new Error(
    `Job "${job.jobId}" timeout "${job.timeoutAt.toISOString()}" is invalid; expected after creation.`,
  );
}

function assertJobScope(job: DurableJob): void {
  if (job.dealId !== undefined && job.workspaceId === undefined) {
    throw new Error(
      `Job "${job.jobId}" deal "${job.dealId}" has no workspace; expected deal scope to include workspace scope.`,
    );
  }
}

function assertInputVersionReferences(job: DurableJob): void {
  for (const reference of job.inputVersionReferences) {
    assertText(reference.aggregateType, "input aggregate type", 128);
    assertText(reference.aggregateId, "input aggregate ID", 128);
    if (!isAggregateVersion(reference.version)) {
      throw new Error(
        `Job "${job.jobId}" input version "${reference.version}" is invalid; expected a positive aggregate version.`,
      );
    }
  }
}

function assertText(
  value: string | undefined,
  label: string,
  maximum: number,
): void {
  if (value === undefined || value.trim() && value.length <= maximum) return;
  throw new Error(
    `Job ${label} "${value}" is invalid; expected 1-${maximum} characters.`,
  );
}

function assertPositiveInteger(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new Error(
    `Job ${label} "${value}" is invalid; expected a positive integer.`,
  );
}
