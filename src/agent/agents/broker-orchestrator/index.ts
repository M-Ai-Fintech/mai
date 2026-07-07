// src/agent/agents/broker-orchestrator/index.ts
import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import * as tools from "./tools/index.ts";
import { DatabaseMemoryService } from "../../../core/db/memory_service.ts";

const instructions = Deno.readTextFileSync(
  new URL("./instructions.md", import.meta.url)
);

export const BrokerOrchestratorAgent = new Agent({
  id: "broker-orchestrator-agent",
  name: "BrokerOrchestratorAgent",
  model: google("gemini-3.5-flash"),
  instructions: instructions,
  tools: tools,
});

export const brokerOrchestratorAgent = BrokerOrchestratorAgent;

export class BrokerOrchestratorService {
  private memoryService: DatabaseMemoryService;

  constructor() {
    this.memoryService = new DatabaseMemoryService();
  }

  /**
   * Intercepta uma correção do usuário e persiste de forma segregada no
   * Database Memory Service: Domain Knowledge vs. User Preferences.
   */
  public async processUserCorrection(
    userId: string,
    correctionType: "domain_knowledge" | "user_preference",
    categoryOrKey: string,
    data: Record<string, unknown>,
    embedding?: number[],
  ): Promise<boolean> {
    if (correctionType === "domain_knowledge") {
      await this.memoryService.saveDomainKnowledge(categoryOrKey, data, embedding);
    } else {
      await this.memoryService.saveUserPreferences(userId, data, embedding);
    }
    return true;
  }

  /**
   * Recupera o contexto completo do broker (preferências + conhecimento de domínio)
   * para ser injetado no prompt de qualquer agente antes da execução.
   */
  public async getOrchestratorContext(userId: string, domainCategory: string) {
    const [preferences, domainKnowledge] = await Promise.all([
      this.memoryService.getUserPreferences(userId),
      this.memoryService.getDomainKnowledge(domainCategory),
    ]);
    return { preferences, domainKnowledge };
  }
}
