import type { ActorReference } from "../platform/authz/v1.ts";
import type { IdempotencyKey } from "../platform/api/v1.ts";
import type { ClaimedJob } from "../platform/jobs/v1.ts";
import { type Clock, payloadDigest } from "../platform/persistence/v1.ts";
import { commandIdentity, recordMutation } from "./service_support.ts";
import { assertDeliveryRequestTransition } from "./transitions.ts";
import { transitionNegotiationReceipt } from "./receipts.ts";
import {
  type DeliveryReceipt,
  type DeliveryRequest,
  NegotiationError,
  type NegotiationRound,
} from "./model.ts";
import type { NegotiationScope } from "./ids.ts";
import type { NegotiationUnitOfWork } from "./repository.ts";
import { parseNegotiationDeliveryPayload } from "./jobs.ts";
import type { DeliveryExecutionState } from "./delivery_worker.ts";

export class NegotiationDeliveryStateWriter {
  constructor(
    private readonly unitOfWork: NegotiationUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async markRunning(
    job: ClaimedJob,
    state: DeliveryExecutionState,
  ): Promise<void> {
    if (state.request.status === "running") return;
    if (
      state.request.status === "sent" || state.request.status === "cancelled" ||
      state.request.status === "dead_lettered"
    ) return;
    const target = "running" as const;
    assertDeliveryRequestTransition(state.request.status, target);
    await this.updateRound(
      job,
      "running",
      { deliveryRequestId: state.request.deliveryRequestId },
      (round) => ({
        deliveryRequests: replaceRequest(
          round,
          state.request.deliveryRequestId,
          (request) => ({ ...request, status: target }),
        ),
      }),
    );
  }

  async persistSent(
    job: ClaimedJob,
    state: DeliveryExecutionState,
    providerReference: string,
  ): Promise<DeliveryReceipt> {
    return await this.updateRound(
      job,
      "sent",
      { deliveryRequestId: state.request.deliveryRequestId, providerReference },
      (round) => {
        const request = round.deliveryRequests.find((item) =>
          item.deliveryRequestId === state.request.deliveryRequestId
        );
        const receipt = round.deliveryReceipts.find((item) =>
          item.deliveryRequestId === state.request.deliveryRequestId
        );
        if (request === undefined || receipt === undefined) {
          throw new NegotiationError(
            "PROTECTED_NOT_FOUND",
            "Negotiation delivery completion lost its scoped request or receipt.",
          );
        }
        const nextRequest = request.status === "sent"
          ? request
          : Object.freeze({ ...request, status: "sent" as const });
        if (request.status !== "sent") {
          assertDeliveryRequestTransition(request.status, "sent");
        }
        const nextReceipt =
          receipt.state === "sent" || receipt.state === "delivered"
            ? receipt
            : transitionNegotiationReceipt(
              receipt,
              { state: "sent", providerReference },
              this.clock.now().toISOString(),
            );
        return {
          deliveryRequests: replaceRequest(
            round,
            request.deliveryRequestId,
            () => nextRequest,
          ),
          deliveryReceipts: replaceReceipt(
            round,
            receipt.deliveryReceiptId,
            () => nextReceipt,
          ),
        };
      },
      true,
    ).then((round) => {
      const receipt = round.deliveryReceipts.find((item) =>
        item.deliveryRequestId === state.request.deliveryRequestId
      );
      if (receipt === undefined) {
        throw new Error("Delivery receipt completion disappeared.");
      }
      return receipt;
    });
  }

  async persistFailure(
    job: ClaimedJob,
    state: DeliveryExecutionState,
    error: unknown,
  ): Promise<void> {
    const failureCode = error instanceof Error ? error.message : String(error);
    await this.updateRound(
      job,
      "retry",
      { deliveryRequestId: state.request.deliveryRequestId, failureCode },
      (round) => {
        const request = round.deliveryRequests.find((item) =>
          item.deliveryRequestId === state.request.deliveryRequestId
        );
        const receipt = round.deliveryReceipts.find((item) =>
          item.deliveryRequestId === state.request.deliveryRequestId
        );
        if (request === undefined || receipt === undefined) {
          throw new NegotiationError(
            "PROTECTED_NOT_FOUND",
            "Negotiation delivery failure lost its scoped request or receipt.",
          );
        }
        const nextRequest = request.status === "retry_scheduled"
          ? request
          : Object.freeze({
            ...request,
            status: "retry_scheduled" as const,
          });
        if (request.status !== "retry_scheduled") {
          assertDeliveryRequestTransition(request.status, "retry_scheduled");
        }
        const nextReceipt = transitionNegotiationReceipt(
          receipt,
          {
            state: "retry_scheduled",
            failureCode,
            nextAttemptAt: this.clock.now().toISOString(),
          },
          this.clock.now().toISOString(),
        );
        return {
          deliveryRequests: replaceRequest(
            round,
            request.deliveryRequestId,
            () => nextRequest,
          ),
          deliveryReceipts: replaceReceipt(
            round,
            receipt.deliveryReceiptId,
            () => nextReceipt,
          ),
        };
      },
      true,
    );
  }

  private async updateRound(
    job: ClaimedJob,
    commandSuffix: string,
    payload: Readonly<Record<string, unknown>>,
    changes: (round: NegotiationRound) => Partial<NegotiationRound>,
    allowTerminalEvidence = false,
  ): Promise<NegotiationRound> {
    const scope = scopeFromJob(job);
    const actor: ActorReference = {
      id: job.initiatingActorId,
      kind: "human",
      state: "active",
    };
    const key = await executionIdempotencyKey(job, commandSuffix);
    const now = this.clock.now().toISOString();
    const identity = await commandIdentity(
      scope,
      actor,
      `negotiation_delivery_${commandSuffix}`,
      job.jobId,
      key,
      payload,
      now,
    );
    return (await this.unitOfWork.run(identity, async (transaction) => {
      const round = await transaction.findRound(
        scope,
        parseNegotiationDeliveryPayload(job.payload).roundId,
      );
      if (round === undefined) {
        throw new NegotiationError(
          "PROTECTED_NOT_FOUND",
          "Negotiation delivery round disappeared during execution.",
        );
      }
      if (
        (round.status === "closed" || round.status === "cancelled") &&
        !allowTerminalEvidence
      ) {
        throw new NegotiationError(
          "INVALID_TRANSITION",
          `Negotiation round "${round.roundId}" is terminal in status "${round.status}"; only explicit delivery evidence may be recorded.`,
        );
      }
      const next = recordMutation(
        round,
        changes(round),
        actor,
        `negotiation_delivery_${commandSuffix}`,
        payload,
        now,
      );
      await transaction.replaceRound(next, round.version);
      return next;
    })).round;
  }
}

export function scopeFromJob(job: ClaimedJob): NegotiationScope {
  if (job.workspaceId === undefined || job.dealId === undefined) {
    throw new NegotiationError(
      "SCOPE_MISMATCH",
      `Negotiation delivery job "${job.jobId}" has incomplete tenant/workspace/deal scope.`,
    );
  }
  return {
    tenantId: job.tenantId as never,
    workspaceId: job.workspaceId,
    dealId: job.dealId,
  };
}

async function executionIdempotencyKey(
  job: ClaimedJob,
  suffix: string,
): Promise<IdempotencyKey> {
  // Keep the complete job identity and command phase in the digest. Truncating
  // a job ID can make two distinct delivery executions share one completion
  // command and replay the wrong durable result.
  const digest = await payloadDigest({ jobId: job.jobId, suffix });
  return `idem_${digest.slice(0, 59)}` as IdempotencyKey;
}

function replaceRequest(
  round: NegotiationRound,
  id: string,
  update: (request: DeliveryRequest) => DeliveryRequest,
): readonly DeliveryRequest[] {
  let found = false;
  const requests = round.deliveryRequests.map((request) => {
    if (request.deliveryRequestId !== id) return request;
    found = true;
    return Object.freeze(update(request));
  });
  if (!found) {
    throw new NegotiationError(
      "PROTECTED_NOT_FOUND",
      `Delivery request "${id}" was not found.`,
    );
  }
  return requests;
}

function replaceReceipt(
  round: NegotiationRound,
  id: string,
  update: (receipt: DeliveryReceipt) => DeliveryReceipt,
): readonly DeliveryReceipt[] {
  let found = false;
  const receipts = round.deliveryReceipts.map((receipt) => {
    if (receipt.deliveryReceiptId !== id) return receipt;
    found = true;
    return Object.freeze(update(receipt));
  });
  if (!found) {
    throw new NegotiationError(
      "PROTECTED_NOT_FOUND",
      `Delivery receipt "${id}" was not found.`,
    );
  }
  return receipts;
}
