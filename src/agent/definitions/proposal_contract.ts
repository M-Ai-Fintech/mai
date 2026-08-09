export interface AgentProposalInput {
  readonly kind?: "proposal" | "reversible_draft";
  readonly value: Readonly<Record<string, unknown>>;
}
