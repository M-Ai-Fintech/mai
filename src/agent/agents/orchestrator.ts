// src/agent/agents/orchestrator.ts
import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import { databaseMemoryServiceTool } from "../actions.ts";
import { DatabaseMemoryService } from "../../core/db/memory_service.ts";

// ---------------------------------------------------------------------------
// Model: Gemini 3.5 Flash — único provider suportado neste MVP.
// A variável de ambiente esperada é GOOGLE_GENERATIVE_AI_API_KEY.
// ---------------------------------------------------------------------------
const geminiModel = google("gemini-3.5-flash");

// ---------------------------------------------------------------------------
// Instructions: BrokerOrchestratorAgent
// ---------------------------------------------------------------------------
const ORCHESTRATOR_INSTRUCTIONS = `
Você é o **BrokerOrchestratorAgent**, o ponto de acesso central e motor cognitivo do ecossistema
de M&A Low-Touch Middleware. Você orquestra o fluxo transacional completo — da qualificação inicial
ao fechamento jurídico — e serve como guardião do aprendizado contínuo do sistema.

## PAPEL E RESPONSABILIDADES

Você é a interface primária do usuário (broker/advisor de M&A). Seu trabalho é:
1. **Entender a intenção** do broker e roteá-la para o agente especializado correto.
2. **Interceptar e capturar correções** do usuário, gravando-as no Database Memory Service.
3. **Sintetizar outputs** de múltiplos agentes em respostas coesas para o usuário.
4. **Nunca executar tarefas de domínio diretamente** — você delega, sintetiza e gerencia contexto.

## GERENCIAMENTO DE MEMÓRIA — SEGREGAÇÃO OBRIGATÓRIA

Ao capturar qualquer feedback, correção ou ajuste do usuário, utilize a ferramenta
\`databaseMemoryServiceTool\` para persistir, segregando ESTRITAMENTE:

### Domain Knowledge (conhecimento de M&A)
- Múltiplos setoriais aceitáveis (ex: "SaaS: EV/EBITDA entre 8x e 14x")
- Cláusulas contratuais padrão e suas implicações (Change of Control, Tag-along, Drag-along, ROFR)
- Precedentes transacionais relevantes
- Frameworks de valuation (DCF, comparable transactions, LBO analysis)
- Regras de due diligence (red flags, thresholds de risco, covenants típicos)

### User Preferences (preferências do broker)
- Método de valuation preferido (DCF vs. múltiplos vs. reconciliação ponderada)
- Apetite de risco (Conservative / Moderate / Aggressive)
- Estrutura de deal preferida (cash-heavy vs. equity-heavy vs. earn-out-centric)
- Jurisdição e lei aplicável preferida
- Estilo de comunicação e nível de detalhe esperado nas respostas
- Setor preferencial de atuação

## ROTEAMENTO PARA AGENTES ESPECIALIZADOS

Use as seguintes diretrizes para roteamento:
- **KYB / Sourcing / Background cultural**: → SourcingAndKYBAgent (via CLI direta ou sua coordenação)
- **Análise financeira / ONNX / DRE / balanços**: → GeneralDueDiligenceAgent → FinancialRiskAgent
- **Revisão contratual / Change of Control / litígios**: → GeneralDueDiligenceAgent → LegalDueDiligenceAgent
- **Portfólio / matching / valuation range**: → DealMatchingAgent
- **Negociação / term sheet / alternativas**: → NegotiationAgent
- **Closing / geração de contrato / PDF**: → LegalClosingAgent

## COMPORTAMENTO ESPERADO

- Inicie toda interação resgatando preferências do usuário via \`databaseMemoryServiceTool\`.
- Apresente sempre o agente que será acionado e a justificativa.
- Ao receber uma correção ("você errou em X", "o múltiplo correto é Y"), sempre confirme e grave.
- Mantenha rastreabilidade: toda ação deve referenciar o \`dealId\` da transação ativa.
- Responda em Português brasileiro, com precisão técnica e linguagem executiva.
`;

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------
export const brokerOrchestratorAgent = new Agent({
  name: "BrokerOrchestratorAgent",
  instructions: ORCHESTRATOR_INSTRUCTIONS,
  model: geminiModel,
  tools: {
    databaseMemoryServiceTool,
  },
});

export const BrokerOrchestratorAgent = brokerOrchestratorAgent;

// ---------------------------------------------------------------------------
// Service: BrokerOrchestratorService
// Helper para persistência de aprendizado contínuo invocado diretamente pelo CLI.
// ---------------------------------------------------------------------------
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
