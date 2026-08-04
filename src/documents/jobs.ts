import {
  payloadDigest,
  type TransactionHandle,
} from "../platform/persistence/v1.ts";
import {
  assertJobDefinition,
  type DurableJob,
  JobRepository,
} from "../platform/jobs/v1.ts";
import { type OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  IdempotencyKey,
  JobId,
  OperationId,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import { parseIdempotencyKey } from "../platform/api/v1.ts";

export type DocumentJobType =
  | "documents.upload"
  | "documents.sync"
  | "documents.download"
  | "documents.checksum"
  | "documents.storage"
  | "documents.process";

export interface DocumentJobInput extends DurableJob {
  readonly jobType: DocumentJobType;
}

export interface DocumentJobSchedule {
  readonly jobs: JobRepository;
  readonly outbox: OutboxRepository;
}

const DOCUMENT_JOB_TYPES: readonly DocumentJobType[] = [
  "documents.upload",
  "documents.sync",
  "documents.download",
  "documents.checksum",
  "documents.storage",
  "documents.process",
];

export function createDocumentJob(input: DocumentJobInput): DocumentJobInput {
  if (!DOCUMENT_JOB_TYPES.includes(input.jobType)) {
    throw new Error(
      `Document job type "${input.jobType}" is invalid; expected one of the supported documents durable jobs.`,
    );
  }
  assertJobDefinition(input);
  return Object.freeze({
    ...input,
    inputVersionReferences: Object.freeze([...input.inputVersionReferences]),
  });
}

export async function deriveDocumentIdempotencyKey(input: {
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetType: string;
  readonly targetId: string;
}): Promise<IdempotencyKey> {
  const digest = await payloadDigest({
    actorId: input.actorId,
    commandType: input.commandType,
    targetType: input.targetType,
    targetId: input.targetId,
  });
  const parsed = parseIdempotencyKey(`idem_${digest.slice(0, 56)}`);
  if (parsed.ok) return parsed.value;
  throw new Error(
    `Derived document idempotency key for "${input.targetId}" was invalid; expected an idem_ identifier.`,
  );
}

export async function enqueueDocumentJob(
  transaction: TransactionHandle,
  schedule: DocumentJobSchedule,
  job: DocumentJobInput,
  event: OutboxEvent,
): Promise<void> {
  await schedule.jobs.enqueue(transaction, job);
  await schedule.outbox.append(transaction, event);
}

export interface DocumentJobFixtureFields {
  readonly jobId: JobId;
  readonly operationId?: OperationId;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly dealId?: DealId;
  readonly initiatingActorId: ActorId;
  readonly correlationId: CorrelationId;
  readonly idempotencyKey: IdempotencyKey;
  readonly timeoutAt: Date;
  readonly createdAt: Date;
  readonly inputVersionReferences: DurableJob["inputVersionReferences"];
  readonly payload: Readonly<Record<string, unknown>>;
}

export function documentJobAggregateVersion(value: number): AggregateVersion {
  if (Number.isSafeInteger(value) && value > 0) {
    return value as AggregateVersion;
  }
  throw new Error(
    `Document job aggregate version "${value}" is invalid; expected a positive safe integer.`,
  );
}
