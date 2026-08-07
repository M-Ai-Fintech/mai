export type ClosingStatus =
  | "setup"
  | "preparing_signing"
  | "signing_ready"
  | "signed"
  | "gap_period"
  | "preparing_closing"
  | "closing_review"
  | "authorized_to_close"
  | "closing_in_progress"
  | "closed_pending_evidence"
  | "closed"
  | "post_closing"
  | "completed"
  | "aborted"
  | "archived";

const ALLOWED_TRANSITIONS: Readonly<
  Record<ClosingStatus, readonly ClosingStatus[]>
> = {
  setup: ["preparing_signing", "aborted"],
  preparing_signing: ["setup", "signing_ready", "aborted"],
  signing_ready: ["preparing_signing", "signed", "aborted"],
  signed: ["gap_period", "preparing_closing", "aborted"],
  gap_period: ["signed", "preparing_closing", "aborted"],
  preparing_closing: ["gap_period", "closing_review", "aborted"],
  closing_review: ["preparing_closing", "authorized_to_close", "aborted"],
  authorized_to_close: ["closing_review", "closing_in_progress", "aborted"],
  closing_in_progress: ["closed_pending_evidence", "closed", "aborted"],
  closed_pending_evidence: ["closed"],
  closed: ["post_closing", "archived"],
  post_closing: ["completed", "archived"],
  completed: ["archived"],
  aborted: ["archived"],
  archived: [],
};

export function assertClosingTransition(
  from: ClosingStatus,
  to: ClosingStatus,
): void {
  if (ALLOWED_TRANSITIONS[from].includes(to)) return;
  throw new Error(
    `Closing transition "${from}" -> "${to}" is invalid; expected an allowed lifecycle transition.`,
  );
}

export function isIrreversibleStatus(status: ClosingStatus): boolean {
  return ["closed_pending_evidence", "closed", "post_closing", "completed"]
    .includes(status);
}
