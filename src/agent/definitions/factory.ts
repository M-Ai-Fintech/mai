import { type ZodTypeAny } from "zod";
import {
  AGENT_DEFINITION_VERSION,
  type AgentDefinition,
  DEFINITION_ENVELOPE_SCHEMA_VERSION,
  type GovernedToolName,
  HUMAN_ONLY_EFFECTS,
} from "./contract.ts";

const MODEL_POLICY = {
  policyReference: "agent-model-policy/v1",
  policyVersion: AGENT_DEFINITION_VERSION,
  provider: "google",
  model: "gemini-3.5-flash",
  modelVersion: "3.5",
  fallback: "unavailable" as const,
};

const PROHIBITED_EFFECTS = [...HUMAN_ONLY_EFFECTS];

const GOVERNED_DENIAL = {
  capability: "legacy.vdr-structured-access",
  reason:
    "Legacy direct VDR access is denied; use an authorized exact-version ToolGateway capability.",
};

const LEGACY_DENIALS = [
  GOVERNED_DENIAL,
  {
    capability: "legacy.direct-database",
    reason:
      "Legacy direct database access is denied; protected reads must use the scoped ToolGateway.",
  },
  {
    capability: "legacy.local-pubsub",
    reason:
      "Legacy local PubSub is denied; governed tools cannot publish or trigger external effects.",
  },
  {
    capability: "legacy.memory-service",
    reason:
      "Legacy memory service access is denied; authoritative memory mutation is not an agent capability.",
  },
  {
    capability: "legacy.filesystem",
    reason:
      "Legacy filesystem access is denied; governed definitions never expose paths or file effects.",
  },
  {
    capability: "legacy.lora-adapter",
    reason:
      "LoRA adapter loading is unsupported; return an explicit unavailable result.",
  },
  {
    capability: "legacy.fine-tuned-inference",
    reason:
      "Fine-tuned inference is unsupported; return an explicit unavailable result.",
  },
];

export const PROVIDER_UNAVAILABLE = {
  capability: "provider.external-search",
  reason:
    "Provider readiness is not certified by this definition lane; return unavailable rather than using a fallback.",
};

export const MODEL_ADAPTATION_UNAVAILABLE = {
  capability: "provider.model-adaptation",
  reason:
    "Model adaptation is outside this definition lane; return unavailable rather than claiming a fine-tuned model.",
};

const LEGACY_TOOL_NAMES = [
  "load_lora_adapter",
  "fine_tuned_inference",
];

export interface SpecialistOptions {
  readonly id: AgentDefinition["id"];
  readonly name: string;
  readonly inputSchema: ZodTypeAny;
  readonly outputSchema: ZodTypeAny;
  readonly promptDigest: string;
  readonly allowedCapabilities: readonly string[];
  readonly unavailableCapabilities?: readonly {
    capability: string;
    reason: string;
  }[];
  readonly deniedCapabilities?: readonly {
    capability: string;
    reason: string;
  }[];
  readonly knowledgeAssets: readonly {
    reference: string;
    kind: "knowledge" | "checklist" | "template" | "playbook" | "rules";
  }[];
  readonly toolReferences: readonly GovernedToolName[];
  readonly purePorts: readonly {
    name: string;
    reference: string;
    contractVersion: string;
    deterministic: true;
  }[];
  readonly legacyToolReferences: readonly string[];
  readonly defaultArtifactKind?: "proposal" | "reversible_draft";
}

export function defineSpecialist(options: SpecialistOptions): AgentDefinition {
  const deniedCapabilities = [
    ...(options.deniedCapabilities ?? LEGACY_DENIALS),
  ];
  const unavailableCapabilities = [
    ...(options.unavailableCapabilities ?? [
      PROVIDER_UNAVAILABLE,
      MODEL_ADAPTATION_UNAVAILABLE,
    ]),
  ];
  return {
    schemaVersion: DEFINITION_ENVELOPE_SCHEMA_VERSION,
    id: options.id,
    version: AGENT_DEFINITION_VERSION,
    name: options.name,
    inputSchemaReference: schemaReference(options.id, "input"),
    outputSchemaReference: schemaReference(options.id, "output"),
    inputValidator: options.inputSchema,
    outputValidator: options.outputSchema,
    inputSchema: options.inputSchema,
    outputSchema: options.outputSchema,
    allowedCapabilities: [...options.allowedCapabilities],
    unavailableCapabilities,
    deniedCapabilities,
    capabilities: {
      allowed: [...options.allowedCapabilities],
      unavailable: [...unavailableCapabilities],
      denied: [...deniedCapabilities],
    },
    prohibitedEffects: PROHIBITED_EFFECTS,
    prompt: {
      templateReference: `src/agent/agents/${
        agentDirectory(options.id)
      }/instructions.md`,
      templateVersion: AGENT_DEFINITION_VERSION,
      promptDigest: options.promptDigest,
    },
    promptTemplateDigest: options.promptDigest,
    modelPolicy: MODEL_POLICY,
    modelPolicyReference: MODEL_POLICY.policyReference,
    knowledgeAssets: [...options.knowledgeAssets],
    toolReferences: [...options.toolReferences],
    purePorts: [...options.purePorts],
    legacyToolReferences: [
      ...new Set([...options.legacyToolReferences, ...LEGACY_TOOL_NAMES]),
    ],
    artifactPolicy: {
      defaultKind: options.defaultArtifactKind ?? "proposal",
      reversible: true,
      authoritative: false,
      providerReadiness: "not_claimed",
      humanAcceptanceRequired: true,
    },
    lifecycle: { status: "approved", rollout: "pinned" },
  };
}

function schemaReference(
  id: AgentDefinition["id"],
  kind: "input" | "output",
) {
  return {
    reference: `src/agent/agents/${agentDirectory(id)}/schemas/${kind}.ts`,
    version: AGENT_DEFINITION_VERSION,
  };
}

function agentDirectory(id: AgentDefinition["id"]): string {
  return id.replace(/-agent$/, "");
}

export function asset(
  reference: string,
  kind: "knowledge" | "checklist" | "template" | "playbook" | "rules" =
    "knowledge",
) {
  return { reference, kind };
}

export function purePort(name: string, reference: string) {
  return {
    name,
    reference,
    contractVersion: AGENT_DEFINITION_VERSION,
    deterministic: true as const,
  };
}
