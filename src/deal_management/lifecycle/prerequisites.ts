import type {
  DealLifecycleAggregate,
  DealMilestone,
  LifecyclePrerequisite,
  LifecyclePrerequisiteCheck,
} from "./contracts.ts";
import { DealLifecycleError } from "./contracts.ts";
import type { LifecycleTransitionRule } from "./transition_tables.ts";

export function evaluateLifecyclePrerequisites(
  aggregate: DealLifecycleAggregate,
  rule: LifecycleTransitionRule,
): readonly LifecyclePrerequisiteCheck[] {
  return rule.requiredMilestoneKeys.map((key) =>
    milestoneCheck(aggregate, {
      key,
      state: "completed",
    })
  );
}

export function evaluateMilestonePrerequisites(
  aggregate: DealLifecycleAggregate,
  milestone: DealMilestone,
): readonly LifecyclePrerequisiteCheck[] {
  return milestone.prerequisites.map((prerequisite) =>
    milestoneCheck(aggregate, prerequisite)
  );
}

export function assertPrerequisites(
  subject: string,
  checks: readonly LifecyclePrerequisiteCheck[],
): void {
  const blocked = checks.filter((check) => !check.satisfied);
  if (blocked.length === 0) return;
  throw new DealLifecycleError(
    "PREREQUISITE_BLOCKED",
    `Lifecycle subject "${subject}" is blocked; expected every prerequisite to be completed.`,
    blocked,
  );
}

function milestoneCheck(
  aggregate: DealLifecycleAggregate,
  prerequisite: LifecyclePrerequisite,
): LifecyclePrerequisiteCheck {
  const milestone = aggregate.milestones.find((candidate) =>
    candidate.key === prerequisite.key
  );
  const actualState = milestone?.state ?? "missing";
  return {
    key: prerequisite.key,
    requiredState: prerequisite.state,
    actualState,
    satisfied: actualState === prerequisite.state,
  };
}
