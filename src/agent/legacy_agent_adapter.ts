export const LEGACY_RAW_AGENT_EXECUTION_DISABLED =
  "LEGACY_RAW_AGENT_EXECUTION_DISABLED" as const;

export interface LegacyAgentAdapter {
  readonly id: string;
  readonly name: string;
  generate(prompt: string): Promise<never>;
}

/**
 * Creates a compatibility surface for a retired raw agent without loading a
 * model, provider, instructions, or tool catalog.
 *
 * @example const agent = createLegacyAgentAdapter("NegotiationAgent");
 */
export function createLegacyAgentAdapter(name: string): LegacyAgentAdapter {
  return Object.freeze({
    id: name,
    name,
    generate: (_prompt: string) =>
      Promise.reject(new Error(LEGACY_RAW_AGENT_EXECUTION_DISABLED)),
  });
}
