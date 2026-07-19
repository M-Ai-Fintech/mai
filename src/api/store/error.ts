export type MvpStoreErrorCode =
  | "ENTITY_NOT_FOUND"
  | "ENTITY_TAX_ID_CONFLICT"
  | "ENTITY_HAS_ACTIVE_DEALS"
  | "TEAM_MEMBER_NOT_FOUND"
  | "TEAM_ASSIGNMENT_INVALID"
  | "DEAL_NOT_FOUND"
  | "DEAL_PHASE_TRANSITION_INVALID"
  | "RESOURCE_VERSION_CONFLICT"
  | "CHAT_THREAD_NOT_FOUND"
  | "CHAT_MESSAGE_NOT_FOUND"
  | "ENGINE_RUN_NOT_FOUND"
  | "NOTIFICATION_NOT_FOUND"
  | "DASHBOARD_LAYOUT_NOT_FOUND"
  | "LAYOUT_VERSION_CONFLICT";

export class MvpStoreError extends Error {
  constructor(
    public readonly code: MvpStoreErrorCode,
    message: string,
    public readonly status: 404 | 409 | 422,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "MvpStoreError";
  }
}
