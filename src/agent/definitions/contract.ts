import { z, type ZodTypeAny } from "zod";
import {
  calculationBindingSchema,
  type CalculationLineage,
  calculationLineageSchema,
  validateCalculationBindings,
} from "./calculation_contract.ts";
import type { AgentProposalInput } from "./proposal_contract.ts";
import { sourceVersionReferenceSchema } from "./source_version_reference.ts";
import type { AgentSourceVersionReference } from "./source_version_reference.ts";
import { validatorSchema } from "./validator_schema.ts";
export type { AgentProposalInput } from "./proposal_contract.ts";
export { sourceVersionReferenceSchema } from "./source_version_reference.ts";
export type { AgentSourceVersionReference } from "./source_version_reference.ts";

export const DEFINITION_ENVELOPE_SCHEMA_VERSION = 1 as const;
export const AGENT_DEFINITION_VERSION = "1.0.0" as const;

export const AGENT_DEFINITION_IDS = [
  "broker-orchestrator-agent",
  "deal-matching-agent",
  "financial-risk-agent",
  "general-dd-agent",
  "legal-closing-agent",
  "legal-dd-agent",
  "negotiation-agent",
  "sourcing-kyb-agent",
] as const;
export type AgentDefinitionId = typeof AGENT_DEFINITION_IDS[number];

export const CURRENT_DEFINITION_VERSIONS: Readonly<
  Record<AgentDefinitionId, string>
> = Object.freeze(
  Object.fromEntries(
    AGENT_DEFINITION_IDS.map((id) => [id, AGENT_DEFINITION_VERSION]),
  ) as Record<AgentDefinitionId, string>,
);
export const CURRENT_VERSION_PINS = CURRENT_DEFINITION_VERSIONS;

export const HUMAN_ONLY_EFFECTS = [
  "approve",
  "reject",
  "set_price",
  "send",
  "communicate_externally",
  "waive",
  "sign",
  "invite",
  "offboard",
  "grant",
  "revoke",
  "release",
  "archive",
  "restore",
  "terminate",
  "delete",
  "equivalent_human_effect",
] as const;
export type HumanOnlyEffect = typeof HUMAN_ONLY_EFFECTS[number];

export const PROHIBITED_EFFECTS = HUMAN_ONLY_EFFECTS;

export const GOVERNED_TOOL_NAMES = [
  "governed.documents.list",
  "governed.documents.version_metadata",
  "governed.documents.version_content",
  "governed.evidence.search",
  "governed.evidence.citation_proposal",
  "governed.evidence.missing_document_finding_proposal",
] as const;
export type GovernedToolName = typeof GOVERNED_TOOL_NAMES[number];
export const GOVERNED_TOOL_CAPABILITIES = GOVERNED_TOOL_NAMES;

const versionSchema = z.string().regex(
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/,
  "expected a semantic definition version such as 1.0.0",
);
const textSchema = z.string().trim().min(1);
const digestSchema = z.string().regex(
  /^sha256:[0-9a-f]{64}$/,
  "expected a lowercase SHA-256 digest with the sha256: prefix",
);
export const capabilitySchema = z.string().regex(
  /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/,
  "expected a bounded lowercase capability name",
);
const governedToolNameSchema = z.enum(GOVERNED_TOOL_NAMES);
const effectSchema = z.enum(HUMAN_ONLY_EFFECTS);

export const schemaReferenceSchema = z.object({
  reference: textSchema,
  version: versionSchema,
  digest: digestSchema.optional(),
}).strict();

export const promptTemplateSchema = z.object({
  templateReference: textSchema,
  templateVersion: versionSchema,
  promptDigest: digestSchema,
}).strict();

export const modelPolicySchema = z.object({
  policyReference: textSchema,
  policyVersion: versionSchema,
  provider: textSchema,
  model: textSchema,
  modelVersion: textSchema,
  fallback: z.literal("unavailable"),
}).strict();

export const knowledgeAssetSchema = z.object({
  reference: textSchema,
  kind: z.enum(["knowledge", "checklist", "template", "playbook", "rules"]),
}).strict();

export const purePortSchema = z.object({
  name: textSchema,
  reference: textSchema,
  contractVersion: versionSchema,
  deterministic: z.literal(true),
}).strict();

export const unavailableCapabilitySchema = z.object({
  capability: capabilitySchema,
  reason: textSchema,
}).strict();

export const artifactPolicySchema = z.object({
  defaultKind: z.enum(["proposal", "reversible_draft"]),
  reversible: z.literal(true),
  authoritative: z.literal(false),
  providerReadiness: z.literal("not_claimed"),
  humanAcceptanceRequired: z.literal(true),
}).strict();

const definitionIdSchema = z.enum(AGENT_DEFINITION_IDS);

const agentDefinitionEnvelopeBaseSchema = z.object({
  schemaVersion: z.literal(DEFINITION_ENVELOPE_SCHEMA_VERSION),
  id: definitionIdSchema,
  version: versionSchema,
  name: textSchema,
  inputSchemaReference: schemaReferenceSchema,
  outputSchemaReference: schemaReferenceSchema,
  inputValidator: validatorSchema,
  outputValidator: validatorSchema,
  inputSchema: validatorSchema,
  outputSchema: validatorSchema,
  allowedCapabilities: z.array(capabilitySchema),
  unavailableCapabilities: z.array(unavailableCapabilitySchema),
  deniedCapabilities: z.array(unavailableCapabilitySchema),
  capabilities: z.object({
    allowed: z.array(capabilitySchema),
    unavailable: z.array(unavailableCapabilitySchema),
    denied: z.array(unavailableCapabilitySchema),
  }).strict(),
  prohibitedEffects: z.array(effectSchema),
  prompt: promptTemplateSchema,
  promptTemplateDigest: digestSchema,
  modelPolicy: modelPolicySchema,
  modelPolicyReference: textSchema,
  knowledgeAssets: z.array(knowledgeAssetSchema).min(1),
  toolReferences: z.array(governedToolNameSchema),
  purePorts: z.array(purePortSchema),
  calculationBindings: z.array(calculationBindingSchema),
  legacyToolReferences: z.array(textSchema),
  artifactPolicy: artifactPolicySchema,
  lifecycle: z.object({
    status: z.literal("approved"),
    rollout: z.literal("pinned"),
  }).strict(),
}).strict();

type AgentDefinitionEnvelopeBase = z.infer<
  typeof agentDefinitionEnvelopeBaseSchema
>;

export const agentDefinitionEnvelopeSchema = agentDefinitionEnvelopeBaseSchema
  .superRefine(validateDefinitionLists);

export type AgentDefinitionEnvelope = AgentDefinitionEnvelopeBase;

export interface AgentDefinition extends AgentDefinitionEnvelope {
  readonly inputValidator: ZodTypeAny;
  readonly outputValidator: ZodTypeAny;
  readonly inputSchema: ZodTypeAny;
  readonly outputSchema: ZodTypeAny;
}

/**
 * Validates a definition and returns the strict parsed envelope.
 *
 * ```ts
 * const definition = parseAgentDefinitionEnvelope(candidate);
 * ```
 */
export function parseAgentDefinitionEnvelope(
  value: unknown,
): AgentDefinition {
  return agentDefinitionEnvelopeSchema.parse(value);
}

export const toolLineageSchema = z.object({
  name: capabilitySchema,
  activityId: textSchema.optional(),
  capability: capabilitySchema.optional(),
  status: z.enum(["succeeded", "unavailable", "denied"]).optional(),
});

export const resultLineageSchema = z.object({
  definition: z.object({
    id: definitionIdSchema,
    version: versionSchema,
  }),
  definitionId: definitionIdSchema,
  definitionVersion: versionSchema,
  prompt: promptTemplateSchema,
  promptDigest: digestSchema,
  model: z.object({
    policyReference: textSchema,
    provider: textSchema,
    model: textSchema,
    modelVersion: textSchema,
  }),
  modelPolicyReference: textSchema,
  tools: z.array(toolLineageSchema),
  toolActivityIds: z.array(textSchema),
  calculation: calculationLineageSchema.optional(),
  evidence: z.array(sourceVersionReferenceSchema),
});

export type AgentToolLineage = z.infer<typeof toolLineageSchema>;
export type AgentModelLineage = z.infer<typeof resultLineageSchema>["model"];

/**
 * Lineage returned by a trusted runtime receipt verifier.
 *
 * Proposal/model output must never construct this value directly. The
 * governed agent only accepts it from its separately injected verifier.
 */
export interface VerifiedAgentLineage {
  readonly definition: {
    readonly id: AgentDefinitionId;
    readonly version: string;
  };
  readonly prompt: AgentDefinition["prompt"];
  readonly modelPolicyReference: string;
  readonly model: AgentModelLineage;
  readonly tools: readonly AgentToolLineage[];
  readonly calculation?: CalculationLineage;
  readonly evidence: readonly AgentSourceVersionReference[];
}

export const agentProposalResultSchema = z.object({
  status: z.enum(["proposed", "unavailable", "denied"]),
  artifact: z.object({
    kind: z.enum(["proposal", "reversible_draft"]),
    value: z.record(z.unknown()),
    reversible: z.literal(true),
    authoritative: z.literal(false),
    providerReadiness: z.literal("not_claimed"),
  }),
  lineage: resultLineageSchema,
  providerReadinessClaimed: z.literal(false),
});

export type AgentProposalResult = z.infer<typeof agentProposalResultSchema>;

export function createAgentProposalResult(
  definition: AgentDefinition,
  input: AgentProposalInput,
  lineage: VerifiedAgentLineage,
): AgentProposalResult {
  return agentProposalResultSchema.parse({
    status: "proposed",
    artifact: {
      kind: input.kind ?? definition.artifactPolicy.defaultKind,
      value: input.value,
      reversible: true,
      authoritative: false,
      providerReadiness: "not_claimed",
    },
    lineage: lineageFor(lineage),
    providerReadinessClaimed: false,
  });
}

export function createUnavailableAgentResult(
  definition: AgentDefinition,
  capability: string,
  reason: string,
  status: "unavailable" | "denied" = "unavailable",
): AgentProposalResult {
  return agentProposalResultSchema.parse({
    status,
    artifact: {
      kind: "proposal",
      value: { capability, reason, status },
      reversible: true,
      authoritative: false,
      providerReadiness: "not_claimed",
    },
    lineage: lineageFor(
      definitionLineage(definition, [{ name: capability, status }], []),
    ),
    providerReadinessClaimed: false,
  });
}

function definitionLineage(
  definition: AgentDefinition,
  tools: readonly z.input<typeof toolLineageSchema>[],
  evidence: readonly z.input<typeof sourceVersionReferenceSchema>[],
): VerifiedAgentLineage {
  return {
    definition: { id: definition.id, version: definition.version },
    prompt: definition.prompt,
    modelPolicyReference: definition.modelPolicy.policyReference,
    model: {
      policyReference: definition.modelPolicy.policyReference,
      provider: definition.modelPolicy.provider,
      model: definition.modelPolicy.model,
      modelVersion: definition.modelPolicy.modelVersion,
    },
    tools,
    evidence,
  };
}

function lineageFor(lineage: VerifiedAgentLineage) {
  return {
    definition: lineage.definition,
    definitionId: lineage.definition.id,
    definitionVersion: lineage.definition.version,
    prompt: lineage.prompt,
    promptDigest: lineage.prompt.promptDigest,
    model: lineage.model,
    modelPolicyReference: lineage.modelPolicyReference,
    tools: lineage.tools,
    ...(lineage.calculation === undefined
      ? {}
      : { calculation: lineage.calculation }),
    toolActivityIds: lineage.tools.flatMap((tool) =>
      tool.activityId === undefined ? [] : [tool.activityId]
    ),
    evidence: lineage.evidence,
  };
}

function validateDefinitionLists(
  definition: AgentDefinitionEnvelopeBase,
  context: z.RefinementCtx,
): void {
  assertUnique(definition.allowedCapabilities, "allowed capability", context);
  assertUnique(
    definition.prohibitedEffects,
    "prohibited human effect",
    context,
  );
  assertUnique(
    definition.knowledgeAssets.map(({ reference }) => reference),
    "knowledge asset",
    context,
  );
  for (const effect of HUMAN_ONLY_EFFECTS) {
    if (definition.prohibitedEffects.includes(effect)) continue;
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prohibitedEffects"],
      message:
        `Human-only effect list is missing "${effect}"; expected every equivalent effect to remain prohibited.`,
    });
  }
  for (const capability of definition.allowedCapabilities) {
    if (HUMAN_ONLY_EFFECTS.includes(capability as HumanOnlyEffect)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowedCapabilities"],
        message:
          `Capability "${capability}" is a prohibited human effect; expected the agent to remain proposal-only.`,
      });
    }
  }
  const unavailable = new Set([
    ...definition.unavailableCapabilities.map(({ capability }) => capability),
    ...definition.deniedCapabilities.map(({ capability }) => capability),
  ]);
  for (const capability of definition.allowedCapabilities) {
    if (!unavailable.has(capability)) continue;
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["allowedCapabilities"],
      message:
        `Capability "${capability}" is both allowed and unavailable; expected an explicit single admission state.`,
    });
  }
  if (definition.promptTemplateDigest !== definition.prompt.promptDigest) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["promptTemplateDigest"],
      message:
        "Prompt template digest must match prompt.promptDigest; expected one stable digest.",
    });
  }
  if (
    definition.modelPolicyReference !== definition.modelPolicy.policyReference
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["modelPolicyReference"],
      message:
        "Model policy reference must match modelPolicy.policyReference; expected one stable policy lineage.",
    });
  }
  if (
    !sameEntries(
      definition.allowedCapabilities,
      definition.capabilities.allowed,
    )
  ) {
    addAliasIssue(context, "capabilities.allowed", "allowedCapabilities");
  }
  if (
    !sameCapabilityEntries(
      definition.unavailableCapabilities,
      definition.capabilities.unavailable,
    )
  ) {
    addAliasIssue(
      context,
      "capabilities.unavailable",
      "unavailableCapabilities",
    );
  }
  if (
    !sameCapabilityEntries(
      definition.deniedCapabilities,
      definition.capabilities.denied,
    )
  ) {
    addAliasIssue(context, "capabilities.denied", "deniedCapabilities");
  }
  validateCalculationBindings(
    definition.calculationBindings,
    definition.allowedCapabilities,
    definition.purePorts,
    context,
  );
}

function assertUnique(
  values: readonly string[],
  label: string,
  context: z.RefinementCtx,
): void {
  if (new Set(values).size === values.length) return;
  context.addIssue({
    code: z.ZodIssueCode.custom,
    message: `${label} list contains a duplicate; expected each entry once.`,
  });
}

function sameEntries(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

function sameCapabilityEntries(
  left: readonly { capability: string; reason: string }[],
  right: readonly { capability: string; reason: string }[],
): boolean {
  return left.length === right.length &&
    left.every((value, index) =>
      value.capability === right[index].capability &&
      value.reason === right[index].reason
    );
}

function addAliasIssue(
  context: z.RefinementCtx,
  path: string,
  canonical: string,
): void {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message:
      `Capability alias "${path}" does not match ${canonical}; expected one stable allow-list.`,
  });
}
