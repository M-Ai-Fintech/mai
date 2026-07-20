import { z } from "zod";
import { domainAreaSchema } from "../../../../shared/schemas/domain-area.ts";

export const riskmatrixSchema = z.object({
  dealId: z.string().describe("Identificador único do deal/transação."),
  risks: z.array(
    z.object({
      id: z.string().describe("Identificador do risco auditado."),
      category: domainAreaSchema.describe("Categoria principal do risco."),
      description: z.string().describe("Detalhamento literal do risco ou passivo contingente encontrado."),
      severity: z.enum(["low", "medium", "high", "critical"]).describe("Gravidade do impacto do risco."),
      probability: z.enum(["low", "medium", "high"]).describe("Probabilidade de materialização do passivo."),
      valuationImpact: z.number().describe("Impacto financeiro direto ou redução sugerida no Enterprise Value em milhões de reais."),
      mitigationStrategy: z.string().describe("Estratégia ou contingência sugerida para mitigação (ex: Escrow, indenização, renegociação)."),
      isDealBreaker: z.boolean().describe("Marca se o risco viola os critérios Go/No-Go da transação."),
    })
  ).describe("Matriz de riscos unificados e passivos contingentes identificados na auditoria."),
  overallRiskScore: z.number().min(0).max(10).describe("Pontuação geral consolidada de risco da transação (0 a 10)."),
});
