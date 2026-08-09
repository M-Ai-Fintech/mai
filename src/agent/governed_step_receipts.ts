import {
  type AgentDefinitionId,
  type CalculationBinding,
  calculationBindingSchema,
  capabilitySchema,
  promptTemplateSchema,
} from "./definitions/index.ts";
import type { PromptLineage, StepRecord } from "../agent_runtime/model.ts";

export const GOVERNED_STEP_CLAIMS_KEY = "governed";

export interface DurableStepClaims {
  readonly definition: {
    readonly id: AgentDefinitionId;
    readonly version: string;
  };
  readonly prompt: PromptLineage;
  readonly modelPolicyReference: string;
  readonly capability: string;
  readonly calculation?: CalculationBinding;
}

export function readDurableStepClaims(step: StepRecord): DurableStepClaims {
  const candidate = step.input[GOVERNED_STEP_CLAIMS_KEY];
  if (!isRecord(candidate)) throw new Error("governed step claims are missing");
  const definition = readDefinition(candidate.definition);
  const prompt = readPrompt(candidate.prompt);
  const modelPolicyReference = text(candidate.modelPolicyReference);
  const capability = parseCapability(candidate.capability);
  const calculation = readCalculation(candidate.calculation);
  return {
    definition,
    prompt,
    modelPolicyReference,
    capability,
    ...(calculation === undefined ? {} : { calculation }),
  };
}

function readDefinition(value: unknown): DurableStepClaims["definition"] {
  if (!isRecord(value)) {
    throw new Error("governed step definition claim is malformed");
  }
  const id = text(value.id) as AgentDefinitionId;
  const version = text(value.version);
  return { id, version };
}

function readPrompt(value: unknown): PromptLineage {
  const parsed = promptTemplateSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Error("governed step prompt claim is malformed");
}

function readCalculation(value: unknown): CalculationBinding | undefined {
  if (value === undefined) return undefined;
  const parsed = calculationBindingSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Error("governed step calculation claim is malformed");
}

function parseCapability(value: unknown): string {
  const parsed = capabilitySchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Error("governed step capability claim is malformed");
}

function text(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  throw new Error("governed step text claim is malformed");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
