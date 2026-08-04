import type { DealLifecycleState, DealMilestoneState } from "./contracts.ts";

export interface LifecycleTransitionRule {
  readonly from: DealLifecycleState;
  readonly to: DealLifecycleState;
  readonly requiredMilestoneKeys: readonly string[];
}

export interface MilestoneTransitionRule {
  readonly from: DealMilestoneState;
  readonly to: DealMilestoneState;
  readonly requiresPrerequisites: boolean;
}

export const DEAL_LIFECYCLE_TRANSITIONS: readonly LifecycleTransitionRule[] =
  Object.freeze([
    rule("draft", "sourcing"),
    rule("sourcing", "due_diligence", ["target_identified"]),
    rule("due_diligence", "negotiation", ["diligence_complete"]),
    rule("negotiation", "closing", ["negotiation_complete"]),
    rule("closing", "completed", ["closing_complete"]),
    rule("draft", "archived"),
    rule("sourcing", "archived"),
    rule("due_diligence", "archived"),
    rule("negotiation", "archived"),
    rule("closing", "archived"),
    rule("completed", "archived"),
  ]);

export const MILESTONE_TRANSITIONS: readonly MilestoneTransitionRule[] = Object
  .freeze([
    makeMilestoneRule("planned", "active", true),
    makeMilestoneRule("planned", "blocked", false),
    makeMilestoneRule("planned", "cancelled", false),
    makeMilestoneRule("active", "completed", true),
    makeMilestoneRule("active", "blocked", false),
    makeMilestoneRule("active", "cancelled", false),
    makeMilestoneRule("blocked", "active", true),
    makeMilestoneRule("blocked", "cancelled", false),
  ]);

export function lifecycleRule(
  from: DealLifecycleState,
  to: DealLifecycleState,
): LifecycleTransitionRule | undefined {
  return DEAL_LIFECYCLE_TRANSITIONS.find((rule) =>
    rule.from === from && rule.to === to
  );
}

export function milestoneRule(
  from: DealMilestoneState,
  to: DealMilestoneState,
): MilestoneTransitionRule | undefined {
  return MILESTONE_TRANSITIONS.find((rule) =>
    rule.from === from && rule.to === to
  );
}

function rule(
  from: DealLifecycleState,
  to: DealLifecycleState,
  requiredMilestoneKeys: readonly string[] = [],
): LifecycleTransitionRule {
  return Object.freeze({ from, to, requiredMilestoneKeys });
}

function makeMilestoneRule(
  from: DealMilestoneState,
  to: DealMilestoneState,
  requiresPrerequisites: boolean,
): MilestoneTransitionRule {
  return Object.freeze({ from, to, requiresPrerequisites });
}
