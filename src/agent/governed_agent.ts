import type {
  AgentDefinition,
  AgentDefinitionId,
  AgentProposalResult,
  DefinitionCatalog,
  HumanOnlyEffect,
} from "./definitions/index.ts";
import {
  createAgentProposalResult,
  createUnavailableAgentResult,
} from "./definitions/index.ts";

export interface GovernedProposalRequest {
  readonly definition: AgentDefinition;
  readonly input: unknown;
  readonly capability: string;
}

export type GovernedProposalResponse =
  | {
    readonly status: "proposed";
    readonly value: Readonly<Record<string, unknown>>;
    readonly kind?: "proposal" | "reversible_draft";
    readonly tools?: readonly {
      readonly name: string;
      readonly activityId?: string;
      readonly capability?: string;
      readonly status?: "succeeded" | "unavailable" | "denied";
    }[];
    readonly evidence?: readonly {
      readonly sourceType: string;
      readonly sourceId: string;
      readonly version: string | number;
      readonly checksum?: string;
    }[];
  }
  | {
    readonly status: "unavailable" | "denied";
    readonly capability: string;
    readonly reason: string;
  };

export interface GovernedProposalPort {
  propose(
    request: GovernedProposalRequest,
  ): Promise<GovernedProposalResponse>;
}

export interface GovernedAgentRequest {
  readonly input: unknown;
  readonly capability: string;
}

export class GovernedSpecialistAgent {
  constructor(
    readonly definition: AgentDefinition,
    private readonly proposals: GovernedProposalPort,
  ) {}

  /** Proposes one validated, non-authoritative artifact. */
  async propose(request: GovernedAgentRequest): Promise<AgentProposalResult> {
    const input = this.definition.inputValidator.parse(request.input);
    const admission = capabilityAdmission(this.definition, request.capability);
    if (admission !== undefined) return admission;
    const response = await this.proposals.propose({
      definition: this.definition,
      input,
      capability: request.capability,
    });
    return resultFromResponse(this.definition, response);
  }
}

export function createGovernedSpecialist(
  catalog: DefinitionCatalog,
  id: AgentDefinitionId,
  proposals: GovernedProposalPort,
  version?: string,
): GovernedSpecialistAgent {
  const definition = version === undefined
    ? catalog.current(id)
    : catalog.select(id, version);
  return new GovernedSpecialistAgent(definition, proposals);
}

function capabilityAdmission(
  definition: AgentDefinition,
  capability: string,
): AgentProposalResult | undefined {
  const unavailable = capabilityEntry(
    definition.unavailableCapabilities,
    capability,
  );
  if (unavailable !== undefined) {
    return createUnavailableAgentResult(
      definition,
      capability,
      unavailable.reason,
    );
  }
  const denied = capabilityEntry(definition.deniedCapabilities, capability);
  if (denied !== undefined) {
    return createUnavailableAgentResult(
      definition,
      capability,
      denied.reason,
      "denied",
    );
  }
  if (
    definition.prohibitedEffects.includes(capability as HumanOnlyEffect)
  ) {
    return createUnavailableAgentResult(
      definition,
      capability,
      "Human-only effects require a separate authorized command.",
      "denied",
    );
  }
  if (definition.allowedCapabilities.includes(capability)) return undefined;
  return createUnavailableAgentResult(
    definition,
    capability,
    "Capability is not present in the selected definition allow-list.",
    "denied",
  );
}

function resultFromResponse(
  definition: AgentDefinition,
  response: GovernedProposalResponse,
): AgentProposalResult {
  if (response.status !== "proposed") {
    return createUnavailableAgentResult(
      definition,
      response.capability,
      response.reason,
      response.status,
    );
  }
  const value = definition.outputValidator.parse(response.value);
  return createAgentProposalResult(definition, {
    value,
    ...(response.kind === undefined ? {} : { kind: response.kind }),
    tools: response.tools ?? [],
    evidence: response.evidence ?? [],
  });
}

function capabilityEntry(
  entries: readonly { capability: string; reason: string }[],
  capability: string,
): { capability: string; reason: string } | undefined {
  return entries.find((entry) => entry.capability === capability);
}
