import type {
  GovernedProvenanceVerificationRequest,
} from "./governed_agent.ts";
import type { ResultRecord, RunRecord } from "../agent_runtime/model.ts";

export function sameRuntimeModel(
  left: NonNullable<RunRecord["model"]>,
  right: NonNullable<RunRecord["model"]>,
): boolean {
  return left.provider === right.provider && left.model === right.model &&
    left.modelVersion === right.modelVersion;
}

export function sameDefinitionModel(
  model: NonNullable<RunRecord["model"]>,
  definition: GovernedProvenanceVerificationRequest["definition"],
): boolean {
  return model.provider === definition.modelPolicy.provider &&
    model.model === definition.modelPolicy.model &&
    model.modelVersion === definition.modelPolicy.modelVersion;
}

export function samePrompt(
  prompt: NonNullable<ResultRecord["lineage"]["prompt"]>,
  definition: GovernedProvenanceVerificationRequest["definition"],
): boolean {
  return prompt.templateReference === definition.prompt.templateReference &&
    prompt.templateVersion === definition.prompt.templateVersion &&
    prompt.promptDigest === definition.prompt.promptDigest;
}
