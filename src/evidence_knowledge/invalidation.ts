import type { IndexId } from "./ids.ts";
import type { EvidenceInvalidationEvent } from "./events.ts";
import { eventSourceId, eventSourceKind } from "./events.ts";
import type { EvidenceScope } from "./model.ts";
import type { EvidenceVectorPort } from "./vector_port.ts";

export interface InvalidationTarget {
  readonly indexId: IndexId;
  readonly scope: EvidenceScope;
  readonly sourceKind: "evidence" | "fact_version";
  readonly sourceId: string;
}

export interface InvalidationFailure {
  readonly code: string;
  readonly message: string;
}

export interface InvalidationReceiptPort {
  acquire(event: EvidenceInvalidationEvent): Promise<InvalidationAcquisition>;
  complete(eventId: string, ownerToken: string): Promise<void>;
  releaseAfterFailure(
    eventId: string,
    ownerToken: string,
    failure: InvalidationFailure,
  ): Promise<void>;
}

export type InvalidationAcquisition =
  | { readonly kind: "acquired"; readonly ownerToken: string }
  | { readonly kind: "completed" }
  | { readonly kind: "busy" };

export class FakeInvalidationReceiptPort implements InvalidationReceiptPort {
  private readonly states = new Map<
    string,
    { state: "processing" | "completed"; ownerToken?: string }
  >();
  readonly failures: InvalidationFailure[] = [];

  acquire(
    event: EvidenceInvalidationEvent,
  ): Promise<InvalidationAcquisition> {
    const state = this.states.get(event.eventId);
    if (state?.state === "completed") {
      return Promise.resolve({ kind: "completed" });
    }
    if (state?.state === "processing") return Promise.resolve({ kind: "busy" });
    const ownerToken = `fake-${event.eventId}`;
    this.states.set(event.eventId, { state: "processing", ownerToken });
    return Promise.resolve({ kind: "acquired", ownerToken });
  }

  complete(eventId: string, ownerToken: string): Promise<void> {
    const state = this.states.get(eventId);
    if (state?.ownerToken !== ownerToken) {
      throw new Error("Invalidation receipt owner is stale.");
    }
    this.states.set(eventId, { state: "completed" });
    return Promise.resolve();
  }

  releaseAfterFailure(
    eventId: string,
    ownerToken: string,
    failure: InvalidationFailure,
  ): Promise<void> {
    const state = this.states.get(eventId);
    if (state?.ownerToken !== ownerToken) {
      throw new Error("Invalidation receipt owner is stale.");
    }
    this.states.delete(eventId);
    this.failures.push(failure);
    return Promise.resolve();
  }
}

export class TargetedInvalidationConsumer {
  constructor(
    private readonly vector: EvidenceVectorPort,
    private readonly targets: readonly InvalidationTarget[],
    private readonly receipts: InvalidationReceiptPort,
  ) {}

  async consume(
    event: EvidenceInvalidationEvent,
  ): Promise<"processed" | "duplicate" | "busy"> {
    const acquired = await this.receipts.acquire(event);
    if (acquired.kind === "completed") return "duplicate";
    if (acquired.kind === "busy") return "busy";
    const targets = this.targets.filter((target) =>
      target.sourceId === eventSourceId(event) &&
      target.sourceKind === eventSourceKind(event) &&
      sameScope(target.scope, event.scope)
    );
    try {
      for (const target of targets) {
        await this.vector.markStale(target.indexId, event.reason);
      }
      await this.receipts.complete(event.eventId, acquired.ownerToken);
      return "processed";
    } catch (error) {
      await this.receipts.releaseAfterFailure(
        event.eventId,
        acquired.ownerToken,
        {
          code: "VECTOR_INVALIDATION_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}

function sameScope(left: EvidenceScope, right: EvidenceScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}
