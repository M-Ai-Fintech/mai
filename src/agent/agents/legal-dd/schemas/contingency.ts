import { z } from "zod";

export const contingencySchema = z.object({
  contingencyTitle: z.string().describe("Título resumido do processo civil, trabalhista ou fiscal."),
  category: z.enum(["Civil", "Labor", "Tax", "Regulatory", "Environmental"]).describe("Categoria jurídica do passivo."),
  severity: z.enum(["low", "medium", "high", "critical"]).describe("Severidade estimada do risco legal."),
  legalBasis: z.string().describe("Dispositivo legal violado ou tese jurídica aplicável (ex: Art. 2 da CLT)."),
  probabilityOfLoss: z.enum(["Probable", "Possible", "Remote"]).describe("Probabilidade de perda do processo (classificação CPC 25)."),
  estimatedFinancialImpact: z.number().describe("Estimativa de impacto financeiro direto em milhões."),
  escrowRetentionRecommended: z.boolean().describe("Se deve ser retido valor em conta de Escrow para esta contingência."),
  recommendedEscrowAmount: z.number().describe("Valor recomendado para retenção em Escrow em milhões."),
  redFlags: z.array(z.string()).describe("Alertas ou comentários específicos de mitigação/defesa processual."),
});
