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
  readonly roundId: string;
  readonly deliveryRequestId: string;
  readonly proposalId: string;
  readonly proposalVersionId: string;
  readonly approvalId: string;
  readonly featureGate: "enabled";
  readonly recipientId: string;
  readonly purpose: string;
  readonly logicalDeliveryId: string;
}

export interface NegotiationDeliveryPayload {
  readonly roundId: string;
  readonly deliveryRequestId: string;
  readonly proposalId: string;
  readonly proposalVersionId: string;
  readonly approvalId: string;
  readonly featureGate: "enabled";
  readonly recipientId: string;
  readonly purpose: string;
  readonly logicalDeliveryId: string;
}

export function parseNegotiationDeliveryPayload(
  value: unknown,
): NegotiationDeliveryPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Negotiation delivery job payload must be an object.");
  }
  const record = value as Record<string, unknown>;
  const keys = [
    "roundId",
    "deliveryRequestId",
    "proposalId",
    "proposalVersionId",
    "approvalId",
    "featureGate",
    "recipientId",
    "purpose",
    "logicalDeliveryId",
  ];
  if (
    Object.keys(record).length !== keys.length ||
    Object.keys(record).some((key) => !keys.includes(key))
  ) {
    throw new Error(
      `Negotiation delivery job payload must contain exactly ${
        keys.join(", ")
      }.`,
    );
  }
  for (const key of keys) {
    if (typeof record[key] !== "string") {
      throw new Error(
        `Negotiation delivery payload field "${key}" is invalid.`,
      );
    }
  }
  if (record.featureGate !== "enabled") {
    throw new Error("Negotiation delivery job feature gate is not enabled.");
  }
  const payload = record as unknown as NegotiationDeliveryPayload;
  if (payload.logicalDeliveryId !== payload.deliveryRequestId) {
    throw new Error(
      "Negotiation delivery payload logical identity must equal the delivery request ID.",
    );
  }
  return Object.freeze({ ...payload });
}

export interface NegotiationDeliveryFeatureGate {
  readonly deliveryEnabled: () => boolean;
}

export interface NegotiationDeliveryPort {
  /**
   * Adapters must treat logicalDeliveryId/idempotencyKey as a durable
   * at-least-once deduplication key. The Negotiation worker never claims
   * exactly-once physical delivery unless the adapter enforces this contract.
   */
  send(input: {
    readonly logicalDeliveryId: string;
    readonly deliveryRequestId: string;
    readonly proposalId: string;
    readonly proposalVersionId: string;
    readonly recipientId: string;
    readonly purpose: string;
    readonly idempotencyKey: string;
    readonly terms: NormalizedTerms;
  }): Promise<{ readonly providerReference: string }>;
}

/** A named, non-provider transport for local and contract tests. */
export class NamedFakeNegotiationTransport implements NegotiationDeliveryPort {
  readonly sent: Array<{
    readonly logicalDeliveryId: string;
    readonly deliveryRequestId: string;
    readonly proposalId: string;
    readonly proposalVersionId: string;
    readonly recipientId: string;
    readonly purpose: string;
    readonly idempotencyKey: string;
    readonly terms: NormalizedTerms;
  }> = [];
  private readonly providerReferences = new Map<string, string>();

  constructor(
    private readonly result: {
      readonly providerReference?: string;
      readonly failureCode?: string;
    } = {},
  ) {}

  send(input: {
    readonly logicalDeliveryId: string;
    readonly deliveryRequestId: string;
    readonly proposalId: string;
    readonly proposalVersionId: string;
    readonly recipientId: string;
    readonly purpose: string;
    readonly idempotencyKey: string;
    readonly terms: NormalizedTerms;
  }): Promise<{ readonly providerReference: string }> {
    if (this.result.failureCode !== undefined) {
      return Promise.reject(new Error(this.result.failureCode));
    }
    const existing = this.providerReferences.get(input.logicalDeliveryId);
    if (existing !== undefined) {
      return Promise.resolve({ providerReference: existing });
    }
    const providerReference = this.result.providerReference ??
      `fake:${input.logicalDeliveryId}`;
    this.providerReferences.set(input.logicalDeliveryId, providerReference);
    this.sent.push(Object.freeze({
      logicalDeliveryId: input.logicalDeliveryId,
      deliveryRequestId: input.deliveryRequestId,
      proposalId: input.proposalId,
      proposalVersionId: input.proposalVersionId,
      recipientId: input.recipientId,
      purpose: input.purpose,
      idempotencyKey: input.idempotencyKey,
      terms: input.terms,
    }));
    return Promise.resolve({
      providerReference,
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
  assertNonEmpty(input.roundId, "round ID");
  assertNonEmpty(input.approvalId, "approval ID");
  assertNonEmpty(
    input.authoritySnapshotReference ?? "",
    "authority snapshot reference",
  );
  assertNonEmpty(input.recipientId, "recipient ID");
  assertNonEmpty(input.purpose, "delivery purpose");
  if (input.logicalDeliveryId !== input.deliveryRequestId) {
    throw new Error(
      "Negotiation delivery job logical identity must equal the durable delivery request ID.",
    );
  }
  const payload = input.payload as Record<string, unknown>;
  const allowedPayloadKeys = new Set([
    "roundId",
    "deliveryRequestId",
    "proposalId",
    "proposalVersionId",
    "approvalId",
    "featureGate",
    "recipientId",
    "purpose",
    "logicalDeliveryId",
  ]);
  for (const key of Object.keys(payload)) {
    if (!allowedPayloadKeys.has(key)) {
      throw new Error(
        `Negotiation delivery job payload contains unknown field "${key}".`,
      );
    }
  }
  const canonicalPayload: NegotiationDeliveryPayload = {
    roundId: input.roundId,
    deliveryRequestId: input.deliveryRequestId,
    proposalId: input.proposalId,
    proposalVersionId: input.proposalVersionId,
    approvalId: input.approvalId,
    featureGate: input.featureGate,
    recipientId: input.recipientId,
    purpose: input.purpose,
    logicalDeliveryId: input.logicalDeliveryId,
  };
  return Object.freeze({
    jobId: input.jobId,
    ...(input.operationId === undefined
      ? {}
      : { operationId: input.operationId }),
    jobType: input.jobType,
    schemaVersion: input.schemaVersion,
    tenantId: input.tenantId,
    ...(input.workspaceId === undefined
      ? {}
      : { workspaceId: input.workspaceId }),
    ...(input.dealId === undefined ? {} : { dealId: input.dealId }),
    initiatingActorId: input.initiatingActorId,
    ...(input.authoritySnapshotReference === undefined
      ? {}
      : { authoritySnapshotReference: input.authoritySnapshotReference }),
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    timeoutAt: input.timeoutAt,
    createdAt: input.createdAt,
    inputVersionReferences: Object.freeze([...input.inputVersionReferences]),
    payload: Object.freeze(canonicalPayload),
    roundId: input.roundId,
    deliveryRequestId: input.deliveryRequestId,
    proposalId: input.proposalId,
    proposalVersionId: input.proposalVersionId,
    approvalId: input.approvalId,
    featureGate: input.featureGate,
    recipientId: input.recipientId,
    purpose: input.purpose,
    logicalDeliveryId: input.logicalDeliveryId,
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
