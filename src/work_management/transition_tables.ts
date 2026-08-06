import type {
  ApprovalRequestState,
  TaskState,
  WorkstreamState,
} from "./model.ts";

export interface WorkstreamTransitionRule {
  readonly from: WorkstreamState;
  readonly to: WorkstreamState;
  readonly humanOnly: boolean;
}

export interface TaskTransitionRule {
  readonly from: TaskState;
  readonly to: TaskState;
  readonly humanOnly: boolean;
}

export interface ApprovalTransitionRule {
  readonly from: ApprovalRequestState;
  readonly to: ApprovalRequestState;
  readonly humanOnly: boolean;
}

export const WORKSTREAM_TRANSITIONS: readonly WorkstreamTransitionRule[] =
  Object.freeze([
    rule("planned", "active", true),
    rule("planned", "cancelled", true),
    rule("active", "blocked", true),
    rule("active", "completed", true),
    rule("active", "cancelled", true),
    rule("blocked", "active", true),
    rule("blocked", "cancelled", true),
  ]);

export const TASK_TRANSITIONS: readonly TaskTransitionRule[] = Object.freeze([
  makeTaskRule("open", "in_progress", true),
  makeTaskRule("open", "blocked", true),
  makeTaskRule("open", "cancelled", true),
  makeTaskRule("in_progress", "blocked", true),
  makeTaskRule("in_progress", "completed", true),
  makeTaskRule("in_progress", "cancelled", true),
  makeTaskRule("blocked", "in_progress", true),
  makeTaskRule("blocked", "cancelled", true),
]);

export const APPROVAL_TRANSITIONS: readonly ApprovalTransitionRule[] = Object
  .freeze([
    makeApprovalRule("draft", "open", true),
    makeApprovalRule("open", "decided", true),
    makeApprovalRule("open", "withdrawn", true),
    makeApprovalRule("open", "expired", false),
    makeApprovalRule("open", "invalidated", false),
  ]);

export function workstreamRule(
  from: WorkstreamState,
  to: WorkstreamState,
): WorkstreamTransitionRule | undefined {
  return WORKSTREAM_TRANSITIONS.find((candidate) =>
    candidate.from === from && candidate.to === to
  );
}

export function taskRule(
  from: TaskState,
  to: TaskState,
): TaskTransitionRule | undefined {
  return TASK_TRANSITIONS.find((candidate) =>
    candidate.from === from && candidate.to === to
  );
}

export function approvalRule(
  from: ApprovalRequestState,
  to: ApprovalRequestState,
): ApprovalTransitionRule | undefined {
  return APPROVAL_TRANSITIONS.find((candidate) =>
    candidate.from === from && candidate.to === to
  );
}

function rule(
  from: WorkstreamState,
  to: WorkstreamState,
  humanOnly: boolean,
): WorkstreamTransitionRule {
  return Object.freeze({ from, to, humanOnly });
}

function makeTaskRule(
  from: TaskState,
  to: TaskState,
  humanOnly: boolean,
): TaskTransitionRule {
  return Object.freeze({ from, to, humanOnly });
}

function makeApprovalRule(
  from: ApprovalRequestState,
  to: ApprovalRequestState,
  humanOnly: boolean,
): ApprovalTransitionRule {
  return Object.freeze({ from, to, humanOnly });
}
