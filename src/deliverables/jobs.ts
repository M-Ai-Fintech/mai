import {
  payloadDigest,
  type TransactionHandle,
} from "../platform/persistence/v1.ts";
import {
  assertJobDefinition,
  type DurableJob,
  type JobRepository,
} from "../platform/jobs/v1.ts";
import type { ActorId, IdempotencyKey } from "../platform/api/v1.ts";
import { parseIdempotencyKey } from "../platform/api/v1.ts";

export type DeliverableJobType =
  | "deliverables.export"
  | "deliverables.distribute";

export interface DeliverableJobInput extends DurableJob {
  readonly jobType: DeliverableJobType;
}

export function createDeliverableJob(
  input: DeliverableJobInput,
): DeliverableJobInput {
  if (
    input.jobType !== "deliverables.export" &&
    input.jobType !== "deliverables.distribute"
  ) {
    throw new Error(
      `Deliverable job type "${input.jobType}" is invalid; expected export or distribution work.`,
    );
  }
  assertJobDefinition(input);
  const reference = input.inputVersionReferences.find((item) =>
    item.aggregateType === "DeliverableVersion"
  );
  if (reference === undefined) {
    throw new Error(
      `Deliverable job "${input.jobId}" has no DeliverableVersion input; expected an exact version reference.`,
    );
  }
  return Object.freeze({
    ...input,
    inputVersionReferences: Object.freeze([...input.inputVersionReferences]),
  });
}

export async function deriveDeliverableIdempotencyKey(input: {
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetType: string;
  readonly targetId: string;
}): Promise<IdempotencyKey> {
  const digest = await payloadDigest(input);
  const result = parseIdempotencyKey(`idem_${digest.slice(0, 56)}`);
  if (result.ok) return result.value;
  throw new Error(
    `Derived deliverable idempotency key for "${input.targetId}" was invalid; expected an idem_ identifier.`,
  );
}

export interface DeliverableJobSchedule {
  readonly jobs: JobRepository;
}

export async function enqueueDeliverableJob(
  transaction: TransactionHandle,
  schedule: DeliverableJobSchedule,
  input: DeliverableJobInput,
): Promise<void> {
  await schedule.jobs.enqueue(transaction, createDeliverableJob(input));
}
