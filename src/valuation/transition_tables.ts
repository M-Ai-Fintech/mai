import type { ScenarioState, ValuationModelState } from "./model.ts";

export interface ScenarioTransitionRule {
  readonly from: ScenarioState;
  readonly to: ScenarioState;
  readonly humanOnly: boolean;
}

export const SCENARIO_TRANSITIONS: readonly ScenarioTransitionRule[] = Object
  .freeze([
    rule("draft", "ready", false),
    rule("ready", "queued", false),
    rule("queued", "computing", false),
    rule("computing", "computed", false),
    rule("computed", "approved", true),
    rule("approved", "stale", false),
    rule("computed", "stale", false),
    rule("computing", "stale", false),
    rule("queued", "stale", false),
    rule("ready", "stale", false),
    rule("stale", "ready", false),
    rule("computed", "invalidated", true),
    rule("approved", "invalidated", true),
  ]);

export const MODEL_TRANSITIONS: readonly [
  ValuationModelState,
  ValuationModelState,
][] = [
  ["draft", "active"],
  ["active", "retired"],
];

export function scenarioRule(
  from: ScenarioState,
  to: ScenarioState,
): ScenarioTransitionRule | undefined {
  return SCENARIO_TRANSITIONS.find((candidate) =>
    candidate.from === from && candidate.to === to
  );
}

export function modelTransitionAllowed(
  from: ValuationModelState,
  to: ValuationModelState,
): boolean {
  return MODEL_TRANSITIONS.some(([source, target]) =>
    source === from && target === to
  );
}

function rule(
  from: ScenarioState,
  to: ScenarioState,
  humanOnly: boolean,
): ScenarioTransitionRule {
  return { from, to, humanOnly };
}
