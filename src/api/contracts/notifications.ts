/** Notification feed contracts. */

import type { ISODateTime, UUID } from "./common.ts";
import type { ApiCursorSuccess } from "./http.ts";

export enum NotificationType {
  Deal = "deal",
  Engine = "engine",
  Document = "document",
  System = "system",
}

export interface Notification {
  id: UUID;
  type: NotificationType;
  title: string;
  body: string;
  dealId: UUID | null;
  createdAt: ISODateTime;
  readAt: ISODateTime | null;
}

export interface NotificationListQuery {
  unreadOnly?: boolean;
  cursor?: string;
}

export interface NotificationListResponse
  extends ApiCursorSuccess<Notification> {
  unreadCount: number;
}

export interface UpdateNotificationRequest {
  read: true;
}
