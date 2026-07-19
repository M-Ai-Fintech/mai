import { Notification, NotificationListResponse } from "../contracts.ts";
import { MvpStoreError } from "./error.ts";
import { MvpStoreState } from "./state.ts";
import { clone, cursorPage } from "./utils.ts";

export interface NotificationListQuery {
  unreadOnly?: boolean;
  cursor?: string;
  limit?: number;
}

export class NotificationRepository {
  constructor(private readonly state: MvpStoreState) {}

  list(query: NotificationListQuery = {}): NotificationListResponse {
    const all = [...this.state.notifications.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    const rows = query.unreadOnly
      ? all.filter((notification) => !notification.readAt)
      : all;
    return {
      ...cursorPage(rows, query.cursor, query.limit ?? 20),
      unreadCount: all.filter((notification) => !notification.readAt).length,
    };
  }

  markRead(id: string, read: boolean): Notification {
    const notification = this.state.notifications.get(id);
    if (!notification) {
      throw new MvpStoreError(
        "NOTIFICATION_NOT_FOUND",
        "Notification not found",
        404,
      );
    }
    notification.readAt = read
      ? (notification.readAt ?? this.state.now())
      : null;
    return clone(notification);
  }
}
