import { type AgentDefinition, capabilitySchema } from "./definitions/index.ts";
import type {
  AgentToolLineage,
  CalculationBinding,
} from "./definitions/index.ts";
import type { ResultRecord } from "../agent_runtime/model.ts";

export interface DurableCapabilityBinding {
  readonly toolName: string;
  readonly action: string;
}

export type RuntimeToolReceipt = AgentToolLineage & { readonly action: string };

export function calculationBindingFor(
  definition: Pick<AgentDefinition, "calculationBindings">,
  capability: string,
): CalculationBinding | undefined {
  return definition.calculationBindings.find((binding) =>
    binding.capability === capability
  );
}

export const DURABLE_CAPABILITY_BINDINGS: Readonly<
  Record<string, DurableCapabilityBinding>
> = Object.freeze({
  "document.list": {
    toolName: "governed.documents.list",
    action: "list_documents",
  },
  "document.metadata.read": {
    toolName: "governed.documents.version_metadata",
    action: "read_document_metadata",
  },
  "document.content.read": {
    toolName: "governed.documents.version_content",
    action: "read_document_content",
  },
  "evidence.search": {
    toolName: "governed.evidence.search",
    action: "search_evidence",
  },
  "citation.propose": {
    toolName: "governed.evidence.citation_proposal",
    action: "propose_citation",
  },
  "finding.propose": {
    toolName: "governed.evidence.missing_document_finding_proposal",
    action: "propose_missing_document_finding",
  },
  "financial-risk.read": {
    toolName: "governed.financial-risk.assessment",
    action: "read_financial_risk_assessment",
  },
  "financial-risk.finding-propose": {
    toolName: "governed.financial-risk.finding-proposal",
    action: "propose_financial_risk_finding",
  },
});

export function capabilityBindingForTool(
  toolName: string,
): DurableCapabilityBinding | undefined {
  return Object.values(DURABLE_CAPABILITY_BINDINGS).find((entry) =>
    entry.toolName === toolName
  );
}

export function capabilityForTool(
  toolName: string,
  action: string,
): { readonly capability?: string } {
  const binding = capabilityBindingForTool(toolName);
  if (binding !== undefined) {
    return {
      capability: toolName.includes("proposal") || toolName.includes("finding")
        ? "proposal"
        : "read",
    };
  }
  return capabilitySchema.safeParse(action).success
    ? { capability: action }
    : {};
}

export function requestedCapabilityMismatch(
  capability: string,
  result: Pick<ResultRecord, "resultId" | "lineage">,
  tools: readonly RuntimeToolReceipt[],
): string | undefined {
  const binding = DURABLE_CAPABILITY_BINDINGS[capability];
  if (binding === undefined) {
    return `durable result "${result.resultId}" lacks a durable receipt for requested capability "${capability}"`;
  }
  return tools.some((tool) =>
      tool.name === binding.toolName && tool.action === binding.action
    )
    ? undefined
    : `durable result "${result.resultId}" is not bound to requested capability "${capability}"; expected tool "${binding.toolName}" with action "${binding.action}"`;
}
