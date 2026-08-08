import type {
  ClaimedJob,
  JobAuditAppendPort,
  JobExecutionContext,
  JobExecutor,
  JobFailurePolicy,
  JobInputVersionChecker,
  JobWorkerOutcome,
  JobWorkerStore,
  JobWorkerTransactions,
} from "../platform/jobs/v1.ts";
import { JobWorker } from "../platform/jobs/v1.ts";
import type { Clock } from "../platform/persistence/v1.ts";
import type { AuthorityProofReference } from "../work_management/authority_proof.ts";
import {
  assertApprovalBasisCurrent,
  assertCurrentReleaseCandidate,
  findApproval,
  findProposal,
} from "./service_support.ts";
import {
  NEGOTIATION_DELIVERY_JOB_TYPE,
  type NegotiationDeliveryFeatureGate,
  type NegotiationDeliveryPayload,
  type NegotiationDeliveryPort,
  parseNegotiationDeliveryPayload,
} from "./jobs.ts";
import {
  type DeliveryReceipt,
  type DeliveryRequest,
  type NegotiationApproval,
  NegotiationError,
  type NegotiationProposal,
  type NegotiationRound,
  type ProposalVersion,
} from "./model.ts";
import type { NegotiationScope } from "./ids.ts";
import type { NegotiationUnitOfWork } from "./repository.ts";
import {
  NegotiationDeliveryStateWriter,
  scopeFromJob,
} from "./delivery_worker_persistence.ts";

export interface NegotiationDeliveryAuthorizationInput {
  readonly scope: NegotiationScope;
  readonly actorId: string;
  readonly roundId: string;
  readonly proposalId: string;
  readonly proposalVersionId: string;
  readonly approvalId: string;
  readonly recipientId: string;
  readonly purpose: string;
  readonly authorityProof: AuthorityProofReference;
}

/**
 * This port is evaluated by the authoritative authorization owner immediately
 * before the provider call. It is intentionally separate from the approval
 * record so a revocation or currentness change can deny a queued job.
 */
export interface NegotiationDeliveryAuthorizationPort {
  assertCurrent(
    input: NegotiationDeliveryAuthorizationInput,
  ): Promise<void> | void;
}

export class FailClosedNegotiationDeliveryAuthorization
  implements NegotiationDeliveryAuthorizationPort {
  assertCurrent(): never {
    throw new NegotiationError(
      "HUMAN_AUTHORITY_REQUIRED",
      "Negotiation delivery has no configured current authorization boundary; external effect denied.",
    );
  }
}

export interface DeliveryExecutionState {
  readonly scope: NegotiationScope;
  readonly round: NegotiationRound;
  readonly proposal: NegotiationProposal;
  readonly version: ProposalVersion;
  readonly approval: NegotiationApproval;
  readonly request: DeliveryRequest;
  readonly receipt: DeliveryReceipt;
}

export interface NegotiationDeliveryRevalidationInput
  extends DeliveryExecutionState {
  readonly job: ClaimedJob;
  readonly payload: NegotiationDeliveryPayload;
}

export class StrictNegotiationDeliveryRevalidator {
  constructor(
    private readonly authorization: NegotiationDeliveryAuthorizationPort,
    private readonly featureGate: NegotiationDeliveryFeatureGate,
  ) {}

  async assertCurrent(
    input: NegotiationDeliveryRevalidationInput,
  ): Promise<void> {
    const { job, payload, scope, round, proposal, version, approval, request } =
      input;
    if (!this.featureGate.deliveryEnabled()) {
      throw new NegotiationError(
        "FEATURE_DISABLED",
        "Negotiation delivery feature gate is disabled at the external-effect boundary.",
      );
    }
    if (
      job.tenantId !== scope.tenantId ||
      job.workspaceId !== scope.workspaceId ||
      job.dealId !== scope.dealId ||
      payload.roundId !== round.roundId ||
      payload.proposalId !== proposal.proposalId ||
      payload.proposalVersionId !== version.proposalVersionId ||
      payload.approvalId !== approval.approvalId ||
      payload.deliveryRequestId !== request.deliveryRequestId ||
      payload.recipientId !== request.recipientId ||
      payload.purpose !== request.purpose ||
      request.authorityProof?.proofId !== job.authoritySnapshotReference ||
      request.requestedBy !== job.initiatingActorId
    ) {
      throw new NegotiationError(
        "REFERENCE_MISMATCH",
        "Negotiation delivery job metadata is not bound to the exact scoped request, proposal, approval, recipient, purpose, and authority proof.",
      );
    }
    if (round.status === "closed" || round.status === "cancelled") {
      throw new NegotiationError(
        "INVALID_TRANSITION",
        `Negotiation round "${round.roundId}" is terminal in status "${round.status}"; no recipient-visible delivery may execute.`,
      );
    }
    if (request.featureGate !== "enabled") {
      throw new NegotiationError(
        "FEATURE_DISABLED",
        "Negotiation delivery request is not enabled at the external-effect boundary.",
      );
    }
    if (
      input.receipt.state === "revoked" || input.receipt.state === "expired"
    ) {
      throw new NegotiationError(
        "AUTHORIZATION_DENIED",
        `Negotiation delivery receipt "${input.receipt.deliveryReceiptId}" is no longer executable.`,
      );
    }
    assertCurrentReleaseCandidate(round, proposal);
    if (approval.status !== "approved") {
      throw new NegotiationError(
        "HUMAN_AUTHORITY_REQUIRED",
        `Negotiation approval "${approval.approvalId}" is not currently approved.`,
      );
    }
    await assertApprovalBasisCurrent(round, proposal, approval);
    await this.authorization.assertCurrent({
      scope,
      actorId: job.initiatingActorId,
      roundId: round.roundId,
      proposalId: proposal.proposalId,
      proposalVersionId: version.proposalVersionId,
      approvalId: approval.approvalId,
      recipientId: request.recipientId,
      purpose: request.purpose,
      authorityProof: request.authorityProof,
    });
  }
}

export class NegotiationDeliveryExecutor implements JobExecutor {
  private readonly revalidator: StrictNegotiationDeliveryRevalidator;
  private readonly stateWriter: NegotiationDeliveryStateWriter;

  constructor(
    private readonly unitOfWork: NegotiationUnitOfWork,
    private readonly transport: NegotiationDeliveryPort,
    authorization: NegotiationDeliveryAuthorizationPort,
    featureGate: NegotiationDeliveryFeatureGate,
    private readonly clock: Clock,
  ) {
    this.revalidator = new StrictNegotiationDeliveryRevalidator(
      authorization,
      featureGate,
    );
    this.stateWriter = new NegotiationDeliveryStateWriter(unitOfWork, clock);
  }

  async execute(
    job: ClaimedJob,
    context: JobExecutionContext,
  ): Promise<{ readonly resultReference: string }> {
    if (job.jobType !== NEGOTIATION_DELIVERY_JOB_TYPE) {
      throw new Error(`Unsupported Negotiation job type "${job.jobType}".`);
    }
    const payload = parseNegotiationDeliveryPayload(job.payload);
    let state = await this.load(job, payload);
    if (state.receipt.state === "sent" || state.receipt.state === "delivered") {
      return { resultReference: state.receipt.deliveryReceiptId };
    }
    await this.stateWriter.markRunning(job, state);
    state = await this.load(job, payload);

    // The first check detects ordinary stale/revoked work before any provider
    // interaction. The second check is deliberately adjacent to the platform
    // lease fence and provider call, so a revoke/supersession observed before
    // the real effect is denied.
    await this.revalidator.assertCurrent({ ...state, job, payload });
    await context.beforeExternalEffect();
    state = await this.load(job, payload);
    await this.revalidator.assertCurrent({ ...state, job, payload });
    await context.beforeExternalEffect();

    let providerReference: string;
    try {
      const result = await this.transport.send({
        logicalDeliveryId: payload.logicalDeliveryId,
        deliveryRequestId: state.request.deliveryRequestId,
        proposalId: state.proposal.proposalId,
        proposalVersionId: state.version.proposalVersionId,
        recipientId: state.request.recipientId,
        purpose: state.request.purpose,
        idempotencyKey: state.request.idempotencyKey,
        terms: state.version.terms,
      });
      providerReference = result.providerReference;
    } catch (error) {
      await this.stateWriter.persistFailure(job, state, error);
      throw error;
    }
    const completed = await this.stateWriter.persistSent(
      job,
      state,
      providerReference,
    );
    return { resultReference: completed.deliveryReceiptId };
  }

  private async load(
    job: ClaimedJob,
    payload: NegotiationDeliveryPayload,
  ): Promise<DeliveryExecutionState> {
    const scope = scopeFromJob(job);
    return await this.unitOfWork.read(async (transaction) => {
      const round = await transaction.findRound(scope, payload.roundId);
      if (round === undefined) {
        throw new NegotiationError(
          "PROTECTED_NOT_FOUND",
          `Negotiation round "${payload.roundId}" was not found in the job scope.`,
        );
      }
      const proposal = findProposal(round, payload.proposalId);
      const version = proposal.versions.find((item) =>
        item.proposalVersionId === payload.proposalVersionId
      );
      if (version === undefined) {
        throw new NegotiationError(
          "REFERENCE_MISMATCH",
          "Negotiation delivery job proposal version is not a historical version of the requested proposal.",
        );
      }
      const approval = findApproval(round, payload.approvalId);
      const request = round.deliveryRequests.find((item) =>
        item.deliveryRequestId === payload.deliveryRequestId
      );
      if (request === undefined) {
        throw new NegotiationError(
          "PROTECTED_NOT_FOUND",
          `Negotiation delivery request "${payload.deliveryRequestId}" was not found in the job scope.`,
        );
      }
      const receipt = round.deliveryReceipts.find((item) =>
        item.deliveryRequestId === request.deliveryRequestId
      );
      if (receipt === undefined) {
        throw new NegotiationError(
          "PROTECTED_NOT_FOUND",
          `Negotiation delivery receipt for request "${request.deliveryRequestId}" was not found in the job scope.`,
        );
      }
      if (
        request.proposalId !== proposal.proposalId ||
        request.proposalVersionId !== version.proposalVersionId ||
        request.approvalId !== approval.approvalId ||
        approval.proposalId !== proposal.proposalId ||
        approval.proposalVersionId !== version.proposalVersionId ||
        receipt.idempotencyKey !== request.idempotencyKey ||
        receipt.recipientId !== request.recipientId ||
        receipt.purpose !== request.purpose ||
        receipt.scope.tenantId !== scope.tenantId ||
        receipt.scope.workspaceId !== scope.workspaceId ||
        receipt.scope.dealId !== scope.dealId
      ) {
        throw new NegotiationError(
          "REFERENCE_MISMATCH",
          "Negotiation delivery request, receipt, proposal, and approval lineage do not match exactly.",
        );
      }
      return { scope, round, proposal, version, approval, request, receipt };
    });
  }
}

export class NegotiationDeliveryVersionChecker
  implements JobInputVersionChecker {
  constructor(private readonly unitOfWork: NegotiationUnitOfWork) {}

  async recheck(job: ClaimedJob): Promise<boolean> {
    try {
      if (
        job.jobType !== NEGOTIATION_DELIVERY_JOB_TYPE ||
        job.workspaceId === undefined || job.dealId === undefined
      ) return false;
      const payload = parseNegotiationDeliveryPayload(job.payload);
      const scope = scopeFromJob(job);
      return await this.unitOfWork.read(async (transaction) => {
        const round = await transaction.findRound(scope, payload.roundId);
        const reference = job.inputVersionReferences.find((item) =>
          item.aggregateType === "negotiation_proposal"
        );
        if (round === undefined || reference === undefined) return false;
        const proposal = round.proposals.find((item) =>
          item.proposalId === payload.proposalId
        );
        const version = proposal?.versions.find((item) =>
          item.proposalVersionId === payload.proposalVersionId
        );
        return proposal !== undefined && version !== undefined &&
          round.currentProposalId === proposal.proposalId &&
          proposal.version === reference.version &&
          reference.documentId === version.proposalVersionId;
      });
    } catch {
      return false;
    }
  }
}

export interface NegotiationDeliveryWorkerDependencies {
  readonly transactions: JobWorkerTransactions;
  readonly store: JobWorkerStore;
  readonly unitOfWork: NegotiationUnitOfWork;
  readonly transport: NegotiationDeliveryPort;
  readonly authorization: NegotiationDeliveryAuthorizationPort;
  readonly featureGate: NegotiationDeliveryFeatureGate;
  readonly clock: Clock;
  readonly failurePolicy: JobFailurePolicy;
  readonly audit: JobAuditAppendPort;
}

export class NegotiationDeliveryWorker {
  private readonly worker: JobWorker;

  constructor(dependencies: NegotiationDeliveryWorkerDependencies) {
    const executor = new NegotiationDeliveryExecutor(
      dependencies.unitOfWork,
      dependencies.transport,
      dependencies.authorization,
      dependencies.featureGate,
      dependencies.clock,
    );
    const versions = new NegotiationDeliveryVersionChecker(
      dependencies.unitOfWork,
    );
    this.worker = new JobWorker({
      transactions: dependencies.transactions,
      store: dependencies.store,
      executor,
      versions,
      clock: dependencies.clock,
      failurePolicy: dependencies.failurePolicy,
      audit: dependencies.audit,
      allowedJobTypes: [NEGOTIATION_DELIVERY_JOB_TYPE],
    });
  }

  executeOne(
    workerId: string,
    leaseMilliseconds: number,
  ): Promise<JobWorkerOutcome> {
    return this.worker.executeOne(workerId, leaseMilliseconds);
  }
}
