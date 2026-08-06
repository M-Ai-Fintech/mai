import type { ActorId } from "./ids.ts";
import type { ApprovalRequest } from "./model.ts";
import type { WorkManagementEventType } from "./events.ts";

export interface ApprovalNotificationProjection {
  readonly notificationType: "approval_request_opened";
  readonly eventType: "approval.requested";
  readonly approvalRequestId: ApprovalRequest["id"];
  readonly approvalRequestVersion: ApprovalRequest["version"];
  readonly recipientId: ActorId;
  readonly title: "Approval request requires review";
  readonly body: string;
}

/** Returns a recipient-safe notification only when review is requested. */
export function approvalNotificationProjection(
  request: ApprovalRequest,
  eventType: WorkManagementEventType,
): ApprovalNotificationProjection | undefined {
  if (eventType !== "approval.requested") return;
  return Object.freeze({
    notificationType: "approval_request_opened",
    eventType,
    approvalRequestId: request.id,
    approvalRequestVersion: request.version,
    recipientId: request.namedApproverId,
    title: "Approval request requires review",
    body: `Approval request ${request.id} is ready for review.`,
  });
}
