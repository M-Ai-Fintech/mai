import {
  assertReceiptIdempotency,
  createDeliveryReceipt,
  type ReceiptOutcome,
  transitionReceipt,
} from "./receipts.ts";
import { assertDistributionAuthorized } from "./authorization.ts";
import type {
  DeliverableVersion,
  DeliveryReceipt,
  ExportFormat,
  ReleaseAuthorization,
  ReleasePurpose,
} from "./model.ts";
import type { Clock } from "../platform/persistence/idempotency.ts";

export interface DistributionTransport {
  deliver(input: {
    readonly exportId: string;
    readonly recipientId: string;
    readonly purpose: ReleasePurpose;
    readonly idempotencyKey: string;
  }): Promise<void>;
}

export interface ReceiptStore {
  find(
    exportId: string,
    recipientId: string,
    purpose: ReleasePurpose,
  ): Promise<DeliveryReceipt | undefined>;
  insert(receipt: DeliveryReceipt): Promise<void>;
  update(receipt: DeliveryReceipt, expectedAttemptCount: number): Promise<void>;
}

export class DistributionReceiptService {
  constructor(
    private readonly receipts: ReceiptStore,
    private readonly transport: DistributionTransport,
    private readonly clock: Clock,
  ) {}

  async attempt(input: {
    readonly receiptId: string;
    readonly exportId: string;
    readonly recipientId: string;
    readonly purpose: ReleasePurpose;
    readonly format: ExportFormat;
    readonly idempotencyKey: string;
    readonly nextAttemptAt: Date;
    readonly version: DeliverableVersion;
    readonly authorization: ReleaseAuthorization;
  }): Promise<DeliveryReceipt> {
    const existing = await this.receipts.find(
      input.exportId,
      input.recipientId,
      input.purpose,
    );
    const decision = assertReceiptIdempotency(existing, input.idempotencyKey);
    if (decision === "conflict") {
      throw new Error(
        `Receipt for export "${input.exportId}" has a different idempotency key; expected one stable delivery command.`,
      );
    }
    if (existing !== undefined && existing.state !== "retry_scheduled") {
      return existing;
    }
    assertDistributionAuthorized(
      input.version,
      input.authorization,
      input.recipientId,
      input.purpose,
      input.format,
      this.clock.now(),
    );
    const receipt = existing ?? createDeliveryReceipt(input);
    if (existing === undefined) await this.receipts.insert(receipt);
    try {
      await this.transport.deliver({
        exportId: input.exportId,
        recipientId: input.recipientId,
        purpose: input.purpose,
        idempotencyKey: input.idempotencyKey,
      });
      return await this.saveTransition(receipt, { state: "sent" });
    } catch (_error) {
      return await this.saveTransition(receipt, {
        state: "retry_scheduled",
        failureCode: "PROVIDER_UNAVAILABLE",
        nextAttemptAt: input.nextAttemptAt,
      });
    }
  }

  private async saveTransition(
    receipt: DeliveryReceipt,
    outcome: ReceiptOutcome,
  ): Promise<DeliveryReceipt> {
    const next = transitionReceipt(receipt, outcome);
    await this.receipts.update(next, receipt.attemptCount);
    return next;
  }
}
