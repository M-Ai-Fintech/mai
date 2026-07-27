import type { ChatMessage, DealDetail, EngineRun } from "@/lib/api-client";
import {
  type AgentId,
  AGENTS,
  formatCompactMoney,
  type StreamedReply,
} from "./agentic-workspace-model";
import type { FinancialRiskSummary } from "./agentic-workspace-types";

export const agentLabels: Record<AgentId, string> = {
  BrokerOrchestratorAgent: "BrokerOrchestrator",
  FinancialRiskAgent: "FinancialRisk",
  LegalDueDiligenceAgent: "LegalDD",
  NegotiationAgent: "Negotiation",
};

export function isAgentId(value: string): value is AgentId {
  return (AGENTS as readonly string[]).includes(value);
}

export function messageContent(message: ChatMessage): string {
  if (
    message.role === "user" || message.role === "assistant" ||
    message.role === "system"
  ) {
    return message.content;
  }
  return `${message.toolName}: ${message.status}`;
}

export function initialStreamReply(): StreamedReply {
  return { content: "", status: "idle" };
}

export function threadTabs() {
  return AGENTS.map((agent) => ({
    id: agent,
    label: agentLabels[agent],
    disabled: agent !== AGENTS[0],
  }));
}

export function dealValuationLabel(deal: DealDetail | null): string {
  if (!deal) return "—";
  const minimum = formatCompactMoney(
    deal.valuationRange.min.amountMinor,
    deal.valuationRange.min.currency,
  );
  const maximum = formatCompactMoney(
    deal.valuationRange.max.amountMinor,
    deal.valuationRange.max.currency,
  );
  return `${minimum}–${maximum}`;
}

export function financialRiskSummary(
  engineRuns: EngineRun[],
  engineStarting: boolean,
  engineError: string | null,
): FinancialRiskSummary {
  const run = engineRuns.find((item) => item.engine === "financial_risk");
  const running = engineStarting ||
    run?.status === "queued" || run?.status === "running";
  const failure = engineError ?? failedFinancialRiskMessage(run);
  const score = typeof run?.result?.score === "number"
    ? run.result.score.toFixed(1)
    : "2.4";
  return { run, running, failure, score };
}

function failedFinancialRiskMessage(run: EngineRun | undefined): string | null {
  if (run?.status !== "failed") return null;
  return run.error?.message ?? "Financial risk analysis failed.";
}
