import type { DecisionRequestState, ProposalState } from "./model.ts";

export interface ProposalTransitionRule {
  readonly from: ProposalState;
  readonly to: ProposalState;
  readonly humanOnly: boolean;
}

export interface DecisionRequestTransitionRule {
  readonly from: DecisionRequestState;
  readonly to: DecisionRequestState;
  readonly humanOnly: boolean;
}

export const PROPOSAL_TRANSITIONS: readonly ProposalTransitionRule[] = Object
  .freeze([
    makeProposalRule("proposed", "approved", true),
    makeProposalRule("proposed", "superseded", false),
    makeProposalRule("proposed", "invalidated", true),
    makeProposalRule("approved", "superseded", true),
    makeProposalRule("approved", "invalidated", true),
  ]);

export const DECISION_REQUEST_TRANSITIONS:
  readonly DecisionRequestTransitionRule[] = Object.freeze([
    makeRequestRule("draft", "requested", false),
    makeRequestRule("requested", "decided", true),
    makeRequestRule("requested", "withdrawn", true),
    makeRequestRule("requested", "expired", false),
    makeRequestRule("requested", "invalidated", false),
    makeRequestRule("decided", "invalidated", true),
  ]);

export function proposalRule(
  from: ProposalState,
  to: ProposalState,
): ProposalTransitionRule | undefined {
  return PROPOSAL_TRANSITIONS.find((rule) =>
    rule.from === from && rule.to === to
  );
}

export function decisionRequestRule(
  from: DecisionRequestState,
  to: DecisionRequestState,
): DecisionRequestTransitionRule | undefined {
  return DECISION_REQUEST_TRANSITIONS.find((rule) =>
    rule.from === from && rule.to === to
  );
}

function makeProposalRule(
  from: ProposalState,
  to: ProposalState,
  humanOnly: boolean,
): ProposalTransitionRule {
  return Object.freeze({ from, to, humanOnly });
}

function makeRequestRule(
  from: DecisionRequestState,
  to: DecisionRequestState,
  humanOnly: boolean,
): DecisionRequestTransitionRule {
  return Object.freeze({ from, to, humanOnly });
}
