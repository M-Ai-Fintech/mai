import {
  assertJobDefinition,
  type DurableJob,
  type JobRepository,
} from "../platform/jobs/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { NormalizedTerms } from "./terms.ts";

export const NEGOTIATION_DELIVERY_JOB_TYPE = "negotiation.delivery" as const;

export interface NegotiationDeliveryJob extends DurableJob {
  readonly jobType: typeof NEGOTIATION_DELIVERY_JOB_TYPE;
}

export interface NegotiationDeliveryJobInput extends NegotiationDeliveryJob {
  readonly deliveryRequestId: string;
  readonly proposalId: string;
  readonly proposalVersionId: string;
  readonly approvalId: string;
  readonly authorityProofId: string;
  readonly featureGate: "enabled";
}

export interface NegotiationDeliveryFeatureGate {
  readonly deliveryEnabled: () => boolean;
}

export interface NegotiationDeliveryPort {
  send(input: {
    readonly deliveryRequestId: string;
    readonly proposalId: string;
    readonly proposalVersionId: string;
    readonly terms: NormalizedTerms;
  }): Promise<{ readonly providerReference: string }>;
}

/** A named, non-provider transport for local and contract tests. */
export class NamedFakeNegotiationTransport implements NegotiationDeliveryPort {
  readonly sent: Array<{
    readonly deliveryRequestId: string;
    readonly proposalId: string;
    readonly proposalVersionId: string;
    readonly terms: NormalizedTerms;
  }> = [];

  constructor(
    private readonly result: {
      readonly providerReference?: string;
      readonly failureCode?: string;
    } = {},
  ) {}

  send(input: {
    readonly deliveryRequestId: string;
    readonly proposalId: string;
    readonly proposalVersionId: string;
    readonly terms: NormalizedTerms;
  }): Promise<{ readonly providerReference: string }> {
    if (this.result.failureCode !== undefined) {
      return Promise.reject(new Error(this.result.failureCode));
    }
    this.sent.push(Object.freeze({ ...input }));
    return Promise.resolve({
      providerReference: this.result.providerReference ??
        `fake:${input.deliveryRequestId}`,
    });
  }
}

export function createNegotiationDeliveryJob(
  input: NegotiationDeliveryJobInput,
): NegotiationDeliveryJobInput {
  if (input.jobType !== NEGOTIATION_DELIVERY_JOB_TYPE) {
    throw new Error(
      `Negotiation job type "${input.jobType}" is invalid; expected ${NEGOTIATION_DELIVERY_JOB_TYPE}.`,
    );
  }
  if (input.featureGate !== "enabled") {
    throw new Error(
      "Negotiation delivery job is disabled; expected an explicit enabled feature gate.",
    );
  }
  assertJobDefinition(input);
  const references = input.inputVersionReferences.filter((reference) =>
    reference.aggregateType === "negotiation_proposal"
  );
  if (
    references.length !== 1 ||
    references[0]?.aggregateId !== input.proposalId ||
    references[0]?.documentId !== input.proposalVersionId
  ) {
    throw new Error(
      `Negotiation delivery job "${input.jobId}" must contain exactly one proposal version reference bound to the requested proposal.`,
    );
  }
  assertNonEmpty(input.deliveryRequestId, "delivery request ID");
  assertNonEmpty(input.approvalId, "approval ID");
  assertNonEmpty(input.authorityProofId, "authority proof ID");
  return Object.freeze({
    ...input,
    inputVersionReferences: Object.freeze([...input.inputVersionReferences]),
    payload: Object.freeze({ ...input.payload }),
  });
}

export async function enqueueNegotiationDeliveryJob(
  transaction: TransactionHandle,
  jobs: {
    readonly enqueue: (
      transaction: TransactionHandle,
      job: DurableJob,
    ) => Promise<void>;
  },
  input: NegotiationDeliveryJobInput,
  featureGate: NegotiationDeliveryFeatureGate,
): Promise<NegotiationDeliveryJobInput> {
  if (!featureGate.deliveryEnabled()) {
    throw new Error(
      "Negotiation delivery feature gate is disabled; no delivery job may be enqueued.",
    );
  }
  const job = createNegotiationDeliveryJob(input);
  await jobs.enqueue(transaction, job);
  return job;
}

/** Convenience adapter for the shared durable job repository. */
export function enqueueNegotiationDeliveryJobWithRepository(
  transaction: TransactionHandle,
  jobs: JobRepository,
  input: NegotiationDeliveryJobInput,
  featureGate: NegotiationDeliveryFeatureGate,
): Promise<NegotiationDeliveryJobInput> {
  return enqueueNegotiationDeliveryJob(transaction, jobs, input, featureGate);
}

export function sanitizedNegotiationFailure(value: unknown): string {
  const candidate = value instanceof Error ? value.message : String(value);
  const normalized = candidate.trim().toUpperCase().replace(
    /[^A-Z0-9_:-]+/g,
    "_",
  );
  return /^[A-Z][A-Z0-9_:-]{0,127}$/.test(normalized)
    ? normalized
    : "DELIVERY_EXECUTOR_FAILED";
}

function assertNonEmpty(value: string, label: string): void {
  if (
    typeof value === "string" && value.trim().length > 0 && value.length <= 255
  ) return;
  throw new Error(
    `Negotiation ${label} is invalid; expected bounded non-empty text.`,
  );
}
